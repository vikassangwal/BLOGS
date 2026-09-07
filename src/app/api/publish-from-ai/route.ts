import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SECRET_KEY = 'knowora-secret-2026';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ai-secret',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

function cleanHtmlToText(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, ' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, 15000);
}

function cleanAndFormatContent(raw: string): string {
  if (!raw) return '';

  let text = raw
    .replace(/citeturn\d+search\d+/gi, '')
    .replace(/turn\d+search\d+/gi, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/\[\d+\]/g, '');

  if (text.includes('<h2>') || text.includes('<p>') || text.includes('<table>') || text.includes('<section>')) {
    return text.trim();
  }

  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (inTable) {
        html += '</tbody></table>\n';
        inTable = false;
      }
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      html += `<h3>${line.replace(/^###\s+/, '')}</h3>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      html += `<h2>${line.replace(/^##\s+/, '')}</h2>\n`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      html += `<h2>${line.replace(/^#\s+/, '')}</h2>\n`;
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) {
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        html += '<table><thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>\n';
      } else {
        html += '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>\n';
      }
      continue;
    } else if (inTable) {
      html += '</tbody></table>\n';
      inTable = false;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        html += '<ul>\n';
      }
      html += `<li>${formatInline(line.replace(/^[-*]\s+/, ''))}</li>\n`;
      continue;
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inList) {
        inList = true;
        html += '<ol>\n';
      }
      html += `<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>\n`;
      continue;
    } else if (inList) {
      html += '</ul>\n';
      inList = false;
    }

    html += `<p>${formatInline(line)}</p>\n`;
  }

  if (inList) html += '</ul>\n';
  if (inTable) html += '</tbody></table>\n';

  return html;
}

function formatInline(text: string): string {
  let res = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline hover:text-blue-400">$1</a>');

  res = res.replace(/(?<!href=["'])(https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"'()]*)?)/gi, (match) => {
    if (match.startsWith('<a')) return match;
    return `<a href="${match}" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline hover:text-blue-400">${match}</a>`;
  });

  return res;
}

function mapGridBox(box?: string, category?: string): string {
  if (box) {
    const b = box.toLowerCase();
    if (b.includes('job') || b === 'latestjobs' || b === 'recruitment' || b === 'latest') return 'latestJobs';
    if (b.includes('result')) return 'examResults';
    if (b.includes('admit')) return 'admitCard';
    if (b.includes('answer')) return 'latestJobs';
    if (b.includes('scholarship')) return 'scholarship';
    if (b.includes('scheme')) return 'scheme';
    if (b.includes('tech') || b === 'ai') return 'tech';
    if (b.includes('finance') || b === 'earning') return 'finance';
    if (b.includes('upcoming')) return 'upcomingJobs';
  }
  if (category) {
    const c = category.toLowerCase();
    if (c.includes('job') || c === 'recruitment' || c === 'government-jobs') return 'latestJobs';
    if (c.includes('result')) return 'examResults';
    if (c.includes('admit')) return 'admitCard';
    if (c.includes('scholarship')) return 'scholarship';
    if (c.includes('scheme') || c === 'government-schemes') return 'scheme';
    if (c.includes('tech') || c === 'ai') return 'tech';
    if (c.includes('finance') || c === 'earning' || c === 'business') return 'finance';
  }
  return 'latestJobs';
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body must be a valid JSON object'
      }, { status: 400, headers: CORS_HEADERS });
    }

    const authHeader = request.headers.get('x-ai-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const providedSecret = body.secret || authHeader;

    if (providedSecret !== SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication failed: Invalid secret key. Please provide secret: "knowora-secret-2026"'
      }, { status: 401, headers: CORS_HEADERS });
    }

    const {
      action,
      url,
      title,
      content,
      excerpt,
      category = 'recruitment',
      status = 'publish',
      slug,
      metaTitle,
      metaDescription,
      keywords,
      tags = [],
      sourceUrls = [],
      featuredImage: customFeaturedImage,
      gridBox,
      officialApplyUrl,
      jobStates,
      qualifications,
      deleteSlugs
    } = body;

    // Cleanup action
    if (action === 'cleanAll' || deleteSlugs) {
      const slugsToDelete = deleteSlugs || [
        '2026',
        '31-2026',
        '2026-3580',
        'india-post-gds-recruitment-2026-10',
        'ibps-clerk-recruitment-2026-crp-csa-xvi-31-2026-27',
        'ibps-clerk-recruitment-2026-crp-csa-xvi-exam-dates-syllabus'
      ];

      const delResult = await prisma.blogPost.deleteMany({
        where: { slug: { in: slugsToDelete } }
      });

      const allPosts = await prisma.blogPost.findMany();
      let cleaned = 0;
      for (const p of allPosts) {
        if (/citeturn\d+search\d+/i.test(p.content) || /turn\d+search\d+/i.test(p.content)) {
          const newContent = cleanAndFormatContent(p.content);
          await prisma.blogPost.update({
            where: { id: p.id },
            data: { content: newContent }
          });
          cleaned++;
        }
      }

      try {
        revalidatePath('/', 'layout');
        revalidatePath('/blog', 'layout');
      } catch (e) {}

      const total = await prisma.blogPost.count({ where: { status: 'Published' } });

      return NextResponse.json({
        success: true,
        message: `Deleted ${delResult.count} bad posts, cleaned ${cleaned} posts. Total active posts: ${total}`,
        postId: 'cleanup',
        url: 'https://knowora.in',
        status: 'completed',
        category: 'maintenance'
      }, { status: 200, headers: CORS_HEADERS });
    }

    // Direct content submission validation
    const validationErrors: string[] = [];
    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      validationErrors.push('title (minimum 5 characters)');
    }
    if (!content || typeof content !== 'string' || content.trim().length < 100) {
      validationErrors.push('content (minimum 100 characters)');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: `Missing or invalid required fields: ${validationErrors.join(', ')}`,
        fields: validationErrors
      }, { status: 422, headers: CORS_HEADERS });
    }

    let finalSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';
    if (!finalSlug) {
      finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (!finalSlug || finalSlug.length < 3) {
      finalSlug = `blog-post-${Date.now()}`;
    }

    const formattedContent = cleanAndFormatContent(content);
    const resolved = resolveOfficialLinks(title, formattedContent);
    const finalGridBox = mapGridBox(gridBox, category);

    const finalApplyUrl = officialApplyUrl || (Array.isArray(sourceUrls) && sourceUrls.length > 0 ? sourceUrls[0] : resolved.apply);

    const imagePrompt = encodeURIComponent(`${title.slice(0, 50)} India modern official high resolution`);
    const featuredImage = customFeaturedImage || `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

    const finalStatus = (status && status.toLowerCase() === 'draft') ? 'Draft' : 'Published';
    const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : (typeof keywords === 'string' ? keywords : title);

    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    let post;
    let isNew = false;

    if (existing) {
      post = await prisma.blogPost.update({
        where: { id: existing.id },
        data: {
          title,
          content: resolved.sanitizedContent,
          excerpt: excerpt || metaDescription || title.slice(0, 150),
          featuredImage,
          status: finalStatus,
          gridBox: finalGridBox,
          seoTitle: metaTitle || title,
          seoDescription: metaDescription || excerpt || title.slice(0, 150),
          seoKeywords: keywordsStr,
          officialApplyUrl: finalApplyUrl,
          jobStates: Array.isArray(jobStates) ? jobStates : existing.jobStates,
          qualifications: Array.isArray(qualifications) ? qualifications : existing.qualifications,
          updatedAt: new Date(),
        }
      });
    } else {
      isNew = true;
      post = await prisma.blogPost.create({
        data: {
          title,
          slug: finalSlug,
          content: resolved.sanitizedContent,
          excerpt: excerpt || metaDescription || title.slice(0, 150),
          featuredImage,
          status: finalStatus,
          publishedAt: new Date(),
          gridBox: finalGridBox,
          seoTitle: metaTitle || title,
          seoDescription: metaDescription || excerpt || title.slice(0, 150),
          seoKeywords: keywordsStr,
          jobStates: Array.isArray(jobStates) ? jobStates : [],
          qualifications: Array.isArray(qualifications) ? qualifications : [],
          officialApplyUrl: finalApplyUrl,
          autoGenerated: false,
          allowAutoUpdate: false,
        }
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        if (!tagName || typeof tagName !== 'string') continue;
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!tagSlug) continue;
        try {
          const tagRecord = await prisma.tag.upsert({
            where: { slug: tagSlug },
            update: { name: tagName },
            create: { name: tagName, slug: tagSlug }
          });
          await prisma.postTag.upsert({
            where: { postId_tagId: { postId: post.id, tagId: tagRecord.id } },
            update: {},
            create: { postId: post.id, tagId: tagRecord.id }
          });
        } catch (e) {}
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: isNew ? 'Article created successfully.' : 'Article updated and published successfully.',
      postId: post.id,
      url: `https://knowora.in/blog/${post.slug}`,
      slug: post.slug,
      status: post.status,
      category: category
    }, {
      status: isNew ? 201 : 200,
      headers: CORS_HEADERS
    });

  } catch (error: any) {
    console.error('Publish API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during publishing.'
    }, { status: 500, headers: CORS_HEADERS });
  }
}
