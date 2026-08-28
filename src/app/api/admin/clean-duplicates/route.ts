import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function cleanString(str: string): string {
  return (str || '')
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

// Extract core topic key e.g. "ssc cgl", "rrb ntpc", "tanuvas ug", etc.
function extractCoreKey(title: string, slug: string): string {
  const t = (slug + ' ' + title).toLowerCase();
  
  const knownKeywords = [
    'ssc-cgl', 'ssc cgl',
    'rrb-ntpc', 'rrb ntpc',
    'upsc-civil-services', 'upsc cse', 'upsc civil services',
    'sbi-po', 'sbi po',
    'ibps-po', 'ibps po',
    'rpsc-ras', 'rpsc ras',
    'upsssc-pet', 'upsssc pet',
    'army-agniveer', 'army agniveer',
    'cbse-board', 'cbse board',
    'tanuvas-ug', 'tanuvas ug',
    'hamirpur-college', 'hamirpur college',
    'hazaribagh-chc', 'hazaribagh chc',
    'iit-madras-ai', 'iit madras ai',
    'realme-14-pro', 'realme 14 pro',
    'samsung-galaxy-s26', 'samsung galaxy s26',
    'epfo-higher-pension', 'epfo higher pension',
    'up-police-constable', 'up police constable',
    'du-ug-admission', 'du ug admission',
    'iti-yamunanagar', 'iti yamunanagar',
    'neki-ram-college', 'neki ram college',
    'jnv-mandi', 'jnv mandi',
    'jnv-kothipura', 'jnv kothipura',
    'mandi-iti', 'mandi iti',
    'bhiwani-iti', 'bhiwani iti',
    'pspcl-je', 'pspcl je'
  ];

  for (const kw of knownKeywords) {
    if (t.includes(kw)) {
      return kw.replace(/-/g, ' ');
    }
  }

  // Fallback: first 3 alphanumeric words of slug
  const cleanSlug = slug.replace(/-\d+$/, '').replace(/[^a-z0-9]+/g, '-');
  return cleanSlug.split('-').slice(0, 3).join(' ');
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

    // 1. Group by extracted core topic key
    const groups: Record<string, typeof allPosts> = {};

    for (const post of allPosts) {
      const wordCount = post.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
      if (wordCount < 150) {
        await prisma.blogPost.delete({ where: { id: post.id } }).catch(() => {});
        thinDeletedIds.push(post.id);
        continue;
      }

      const coreKey = extractCoreKey(post.title, post.slug);
      if (!groups[coreKey]) groups[coreKey] = [];
      groups[coreKey].push(post);
    }

    // 2. Process duplicate groups: Keep best, delete extra copies
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Sort by content length (descending) then viewCount (descending)
        group.sort((a, b) => {
          const lenA = a.content.length;
          const lenB = b.content.length;
          if (lenB !== lenA) return lenB - lenA;
          return b.viewCount - a.viewCount;
        });

        // Keep group[0], delete rest
        const duplicates = group.slice(1);
        for (const dup of duplicates) {
          await prisma.blogPost.delete({ where: { id: dup.id } }).catch(() => {});
          deletedIds.push(dup.id);
        }
      }
    }

    // 3. Clean clickbait phrases from all remaining posts
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
      const cleanTitle = cleanString(post.title);
      const cleanSeoTitle = post.seoTitle ? cleanString(post.seoTitle) : cleanTitle;
      const cleanExcerpt = post.excerpt ? cleanString(post.excerpt) : null;
      const cleanContent = cleanString(post.content);

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
      deletedIds,
      updatedTitlesCount: updatedIds.length
    });
  } catch (error: any) {
    console.error('Error cleaning duplicates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
