import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HINDI_MONTHS: Record<string, number> = {
  'जनवरी': 0, 'फ़रवरी': 1, 'फरवरी': 1, 'मार्च': 2, 'अप्रैल': 3, 'मई': 4, 'जून': 5,
  'जुलाई': 6, 'अगस्त': 7, 'सितंबर': 8, 'सितम्बर': 8, 'अक्टूबर': 9, 'नवंबर': 10, 'नवम्बर': 10, 'दिसंबर': 11, 'दिसम्बर': 11,
  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

function extractDatesFromHtml(html: string): { startDate: Date | null; lastDate: Date | null } {
  if (!html) return { startDate: null, lastDate: null };

  let startDate: Date | null = null;
  let lastDate: Date | null = null;

  const cleanText = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/tr>/gi, '\n<\/tr>\n');
  const lines = cleanText.split('\n');

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isStartLine = lower.includes('प्रारंभ') || lower.includes('शुरू') || lower.includes('start') || lower.includes('जारी');
    const isLastLine = lower.includes('अंतिम') || lower.includes('last') || lower.includes('closing') || lower.includes('deadline');

    // Look for Day Month Year: e.g. 25 अगस्त 2026 or 5 August 2026
    const dateMatch = line.match(/(\d{1,2})\s+([^\s\d<>,()]+)\s+(\d{4})/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const monthWord = dateMatch[2].toLowerCase().trim();
      const year = parseInt(dateMatch[3], 10);

      if (HINDI_MONTHS[monthWord] !== undefined && year >= 2024 && year <= 2030 && day >= 1 && day <= 31) {
        const parsed = new Date(Date.UTC(year, HINDI_MONTHS[monthWord], day, 23, 59, 59));
        if (!isNaN(parsed.getTime())) {
          if (isLastLine && !lastDate) {
            lastDate = parsed;
          } else if (isStartLine && !startDate) {
            startDate = new Date(Date.UTC(year, HINDI_MONTHS[monthWord], day, 0, 0, 0));
          } else if (!lastDate) {
            lastDate = parsed;
          }
        }
      }
    }

    // Look for DD/MM/YYYY or DD-MM-YYYY
    const slashMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      const year = parseInt(slashMatch[3], 10);

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2024 && year <= 2030) {
        const parsed = new Date(Date.UTC(year, month, day, 23, 59, 59));
        if (!isNaN(parsed.getTime())) {
          if (isLastLine && !lastDate) {
            lastDate = parsed;
          } else if (isStartLine && !startDate) {
            startDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
          } else if (!lastDate) {
            lastDate = parsed;
          }
        }
      }
    }
  }

  // Fallback
  if (!lastDate || !startDate) {
    const globalMatch = html.match(/(\d{1,2})\s+([^\s\d<>,()]+)\s+(\d{4})/gi);
    if (globalMatch) {
      const validDates: Date[] = [];
      for (const m of globalMatch) {
        const parts = m.match(/(\d{1,2})\s+([^\s\d<>,()]+)\s+(\d{4})/i);
        if (parts) {
          const d = parseInt(parts[1], 10);
          const mW = parts[2].toLowerCase().trim();
          const y = parseInt(parts[3], 10);
          if (HINDI_MONTHS[mW] !== undefined && y >= 2024 && y <= 2030 && d >= 1 && d <= 31) {
            validDates.push(new Date(Date.UTC(y, HINDI_MONTHS[mW], d, 23, 59, 59)));
          }
        }
      }
      if (validDates.length > 0) {
        validDates.sort((a, b) => a.getTime() - b.getTime());
        if (!startDate && validDates.length > 1) {
          startDate = validDates[0];
        }
        if (!lastDate) {
          lastDate = validDates[validDates.length - 1];
        }
      }
    }
  }

  return { startDate, lastDate };
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
        applyStartDate: true,
        applyLastDate: true,
        expiryDate: true,
        gridBox: true,
        publishedAt: true
      }
    });

    const now = new Date();
    let updatedCount = 0;
    let fixedSlugsCount = 0;
    let activeJobsCount = 0;
    let expiredJobsCount = 0;
    const details: any[] = [];

    for (const post of posts) {
      let needsUpdate = false;
      const updateData: any = {};

      const cleanSlug = post.slug.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '');
      if (cleanSlug && cleanSlug !== post.slug) {
        const existing = await prisma.blogPost.findUnique({ where: { slug: cleanSlug } });
        if (!existing) {
          updateData.slug = cleanSlug;
          needsUpdate = true;
          fixedSlugsCount++;
        }
      }

      if (post.status !== 'Published') {
        updateData.status = 'Published';
        if (!post.publishedAt) {
          updateData.publishedAt = new Date();
        }
        needsUpdate = true;
      }

      const { startDate, lastDate } = extractDatesFromHtml(post.content);

      if (startDate && (!post.applyStartDate || post.applyStartDate.getTime() !== startDate.getTime())) {
        updateData.applyStartDate = startDate;
        needsUpdate = true;
      }

      if (lastDate) {
        if (!post.applyLastDate || post.applyLastDate.getTime() !== lastDate.getTime()) {
          updateData.applyLastDate = lastDate;
          updateData.expiryDate = lastDate;
          needsUpdate = true;
        }
      } else if (post.applyLastDate && !post.expiryDate) {
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

      const effectiveStart = updateData.applyStartDate || post.applyStartDate;
      const effectiveLast = updateData.applyLastDate || post.applyLastDate || updateData.expiryDate || post.expiryDate;
      const isExpired = effectiveLast ? new Date(effectiveLast).getTime() < now.getTime() : false;

      if (isExpired) {
        expiredJobsCount++;
      } else {
        activeJobsCount++;
      }

      details.push({
        id: post.id,
        title: post.title.slice(0, 50) + '...',
        slug: updateData.slug || post.slug,
        startDate: effectiveStart ? new Date(effectiveStart).toLocaleDateString('en-IN') : 'N/A',
        lastDate: effectiveLast ? new Date(effectiveLast).toLocaleDateString('en-IN') : 'N/A',
        status: isExpired ? '🔴 EXPIRED (आवेदन समाप्त)' : '🟢 ACTIVE (सक्रिय भर्ती)'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'सभी ब्लॉग्स की प्रारंभ और अंतिम तिथियां सफलतापूर्वक सिंक कर दी गई हैं!',
      totalPosts: posts.length,
      updatedPostsCount: updatedCount,
      fixedSlugsCount,
      activeJobsCount,
      expiredJobsCount,
      syncedAt: now.toISOString(),
      details
    });
  } catch (error: any) {
    console.error('Error syncing job dates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
