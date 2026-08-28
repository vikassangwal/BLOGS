import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Helper to normalize title for duplicate detection
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, ' ')
    .replace(/\b(2025|2026|2027|2028)\b/g, '')
    .replace(/\b(notification|online|form|bharti|recruitment|apply|updates|download|news|release)\b/g, '')
    .replace(/(बंपर भर्ती|बंपर मौका|अभी अभी जारी|डायरेक्ट करें|यहाँ से करें|आवेदन|विज्ञप्ति|सूचना)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to sanitize clickbait phrases
function sanitizeClickbait(text: string): string {
  if (!text) return text;
  return text
    .replace(/बंपर भर्ती/g, 'भर्ती')
    .replace(/बंपर मौका/g, 'अवसर')
    .replace(/बंपर दाखिले का मौका/g, 'दाखिले का अवसर')
    .replace(/बंपर प्रवेश का सुनहरा मौका/g, 'प्रवेश प्रक्रिया')
    .replace(/बंपर सर्टिफिकेट कोर्स का मौका/g, 'सर्टिफिकेट कोर्स')
    .replace(/बंपर बदलाव/g, 'महत्वपूर्ण बदलाव')
    .replace(/अभी-अभी जारी हुआ नोटिफिकेशन!/gi, 'अधिसूचना जारी')
    .replace(/अभी-अभी जारी नोटिफिकेशन!/gi, 'अधिसूचना जारी')
    .replace(/अभी-अभी जारी हुई बड़ी खबर!/gi, 'नवीनतम अपडेट')
    .replace(/अभी-अभी जारी हुई/gi, 'जारी हुई')
    .replace(/यहाँ से डायरेक्ट करें आवेदन!/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ से करें डायरेक्ट आवेदन!/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ से करें Direct Apply/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ से डायरेक्ट देखें अपना नाम!/gi, 'लिस्ट देखें')
    .replace(/यहाँ से डायरेक्ट चेक करें स्कोरकार्ड!/gi, 'स्कोरकार्ड देखें')
    .replace(/यहाँ से करें डायरेक्ट चेक/gi, 'जांचें विवरण')
    .replace(/यहाँ से Direct करें आवेदन!/gi, 'आवेदन प्रक्रिया देखें')
    .replace(/यहाँ से Direct Download!/gi, 'डाउनलोड करें')
    .replace(/मचाएगा धूम!/g, 'लॉन्च व फीचर्स')
    .replace(/मचाएगा तहलका!/g, 'फुल स्पेसिफिकेशन्स')
    .replace(/धमाका!/g, 'अपडेट')
    .replace(/सुनहरा मौका!/g, 'महत्वपूर्ण विवरण')
    .replace(/BREAKING:\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const allPosts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        seoTitle: true,
        viewCount: true,
        createdAt: true,
      }
    });

    const deletedIds: string[] = [];
    const updatedIds: string[] = [];
    const thinDeletedIds: string[] = [];

    // 1. Group by normalized title and base slug to find duplicates
    const groups: Record<string, typeof allPosts> = {};

    for (const post of allPosts) {
      // Check for thin content (< 150 words)
      const wordCount = post.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      if (wordCount < 150) {
        await prisma.blogPost.delete({ where: { id: post.id } }).catch(() => {});
        thinDeletedIds.push(post.id);
        continue;
      }

      // Base slug without trailing random numbers (e.g. ssc-cgl-2026-notification-release-3352 -> ssc-cgl-2026-notification-release)
      const baseSlug = post.slug.replace(/-\d{3,5}$/, '');
      const normTitle = normalizeTitle(post.title);
      const key = baseSlug.length > 5 ? `slug:${baseSlug}` : `title:${normTitle}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(post);
    }

    // 2. Process duplicate groups: Keep best, delete rest
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Sort by content length (descending) and viewCount (descending)
        group.sort((a, b) => {
          const lenA = a.content.length;
          const lenB = b.content.length;
          if (lenB !== lenA) return lenB - lenA;
          return b.viewCount - a.viewCount;
        });

        // Keep group[0], delete group[1..n]
        const duplicates = group.slice(1);
        for (const dup of duplicates) {
          await prisma.blogPost.delete({ where: { id: dup.id } }).catch(() => {});
          deletedIds.push(dup.id);
        }
      }
    }

    // 3. Clean clickbait titles and content across all remaining posts
    const remainingPosts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        seoTitle: true,
        excerpt: true,
        content: true,
      }
    });

    for (const post of remainingPosts) {
      const cleanTitle = sanitizeClickbait(post.title);
      const cleanSeoTitle = post.seoTitle ? sanitizeClickbait(post.seoTitle) : cleanTitle;
      const cleanExcerpt = post.excerpt ? sanitizeClickbait(post.excerpt) : null;
      
      // Also clean any h1/h2 tags inside content
      let cleanContent = post.content;
      cleanContent = sanitizeClickbait(cleanContent);

      if (cleanTitle !== post.title || cleanSeoTitle !== post.seoTitle || cleanExcerpt !== post.excerpt || cleanContent !== post.content) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            title: cleanTitle,
            seoTitle: cleanSeoTitle,
            excerpt: cleanExcerpt,
            content: cleanContent,
          }
        }).catch(() => {});
        updatedIds.push(post.id);
      }
    }

    // Revalidate paths
    try {
      revalidatePath('/');
      revalidatePath('/blog');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `सफलतापूर्वक ${deletedIds.length} डुप्लीकेट आर्टिकल्स और ${thinDeletedIds.length} पतले आर्टिकल्स हटाए गए, और ${updatedIds.length} पोस्ट्स के शीर्षकों से क्लिकबेट साफ किया गया!`,
      totalPostsBefore: allPosts.length,
      totalPostsAfter: remainingPosts.length,
      duplicatesDeleted: deletedIds.length,
      thinDeleted: thinDeletedIds.length,
      titlesSanitized: updatedIds.length,
    });
  } catch (error: any) {
    console.error('Error cleaning duplicates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
