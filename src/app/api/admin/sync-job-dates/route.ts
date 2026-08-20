import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Month names in Hindi and English
const HINDI_MONTHS: Record<string, number> = {
  'जनवरी': 0, 'फ़रवरी': 1, 'फरवरी': 1, 'मार्च': 2, 'अप्रैल': 3, 'मई': 4, 'जून': 5,
  'जुलाई': 6, 'अगस्त': 7, 'सितंबर': 8, 'सितम्बर': 8, 'अक्टूबर': 9, 'नवंबर': 10, 'नवम्बर': 10, 'दिसंबर': 11, 'दिसम्बर': 11,
  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

function parseDateFromContent(content: string): Date | null {
  if (!content) return null;

  // 1. Check for Hindi pattern: e.g. "25 अगस्त 2026" or "15 सितंबर 2026"
  const hindiPattern = /(\d{1,2})\s+([^\s\d<>,]+)\s+(\d{4})/gi;
  let match;
  while ((match = hindiPattern.exec(content)) !== null) {
    const day = parseInt(match[1], 10);
    const monthWord = match[2].toLowerCase().trim();
    const year = parseInt(match[3], 10);

    if (HINDI_MONTHS[monthWord] !== undefined && year >= 2024 && year <= 2030 && day >= 1 && day <= 31) {
      const month = HINDI_MONTHS[monthWord];
      const parsed = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // 2. Check for DD/MM/YYYY pattern
  const slashPattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
  while ((match = slashPattern.exec(content)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2024 && year <= 2030) {
      const parsed = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        status: true,
        applyLastDate: true,
        expiryDate: true,
        gridBox: true,
        publishedAt: true
      }
    });

    const now = new Date();
    let updatedCount = 0;
    let fixedSlugsCount = 0;
    const results: any[] = [];

    for (const post of posts) {
      let needsUpdate = false;
      const updateData: any = {};

      // 1. Fix and normalize slug if needed
      const cleanSlug = post.slug.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '');
      if (cleanSlug && cleanSlug !== post.slug) {
        // Check if cleanSlug is already taken
        const existing = await prisma.blogPost.findUnique({ where: { slug: cleanSlug } });
        if (!existing) {
          updateData.slug = cleanSlug;
          needsUpdate = true;
          fixedSlugsCount++;
        }
      }

      // 2. If status is draft or missing publishedAt, fix it
      if (post.status !== 'Published') {
        updateData.status = 'Published';
        if (!post.publishedAt) {
          updateData.publishedAt = new Date();
        }
        needsUpdate = true;
      }

      // 3. Extract and sync Last Date from content if not already set
      if (!post.applyLastDate) {
        const extractedDate = parseDateFromContent(post.content);
        if (extractedDate) {
          updateData.applyLastDate = extractedDate;
          if (!post.expiryDate) {
            updateData.expiryDate = extractedDate;
          }
          needsUpdate = true;
        }
      } else if (!post.expiryDate) {
        updateData.expiryDate = post.applyLastDate;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: updateData
        });
        updatedCount++;
      }

      const effectiveLastDate = updateData.applyLastDate || post.applyLastDate || updateData.expiryDate || post.expiryDate;
      const isExpired = effectiveLastDate ? new Date(effectiveLastDate).getTime() < now.getTime() : false;

      results.push({
        id: post.id,
        title: post.title.slice(0, 50) + '...',
        slug: updateData.slug || post.slug,
        lastDate: effectiveLastDate ? new Date(effectiveLastDate).toLocaleDateString('en-IN') : 'Not Set',
        status: isExpired ? '🔴 EXPIRED (आवेदन समाप्त)' : '🟢 ACTIVE (सक्रिय)'
      });
    }

    return NextResponse.json({
      success: true,
      totalPosts: posts.length,
      updatedCount,
      fixedSlugsCount,
      now: now.toISOString(),
      results
    });
  } catch (error: any) {
    console.error('Error syncing job dates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
