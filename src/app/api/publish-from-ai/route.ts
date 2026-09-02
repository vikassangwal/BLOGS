import { resolveOfficialLinks, detectGridBox } from '@/lib/official-portals';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SECRET_KEY = 'knowora-secret-2026';

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

  // 1. Remove raw citation tags from ChatGPT search
  let text = raw
    .replace(/citeturn\d+search\d+/gi, '')
    .replace(/turn\d+search\d+/gi, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/\[\d+\]/g, '');

  // If already HTML with <h2> or <p>, just clean citations and return
  if (text.includes('<h2>') || text.includes('<p>') || text.includes('<table>')) {
    return text.trim();
  }

  // 2. Convert Markdown to clean HTML
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

    // Markdown Headings
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

    // Markdown Tables
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

    // Lists
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

    // Regular Paragraph
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

  // Convert raw URLs not already in markdown
  res = res.replace(/(?<!href=["'])(https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"'()]*)?)/gi, (match) => {
    if (match.startsWith('<a')) return match;
    return `<a href="${match}" target="_blank" rel="nofollow" class="text-blue-500 font-bold underline hover:text-blue-400">${match}</a>`;
  });

  return res;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, action, url, title, content, excerpt, slug, gridBox, officialApplyUrl, jobStates, qualifications, deleteSlugs } = body;

    // 1. Verify Secret Key
    if (secret !== SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid secret key' }, { status: 401 });
    }

    // 2. CLEANUP / DELETE ACTION
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
        deletedCount: delResult.count,
        cleanedCount: cleaned,
        totalActivePosts: total
      });
    }

    // 3. MODE A: Automatic URL Processing
    if (url && (!title || !content)) {
      let scrapedText = '';
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        if (resp.ok) {
          const html = await resp.text();
          scrapedText = cleanHtmlToText(html);
        }
      } catch (e) {}

      if (!scrapedText || scrapedText.length < 50) {
        scrapedText = `URL: ${url} (कृपया इस विषय पर 2026 आधारित संपूर्ण विस्तृत हिंदी ब्लॉग लिखें)`;
      }

      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      let rawApiKey = settings?.aiApiKey || '';
      let savedKeys: Record<string, string> = {};
      try {
        if (rawApiKey.startsWith('{')) savedKeys = JSON.parse(rawApiKey);
      } catch (e) {}

      const selectedProvider = settings?.aiProvider || 'openai';
      const openAiKey = savedKeys.openai || (settings?.aiProvider === 'openai' ? rawApiKey : '') || process.env.OPENAI_API_KEY || '';
      const geminiKey = savedKeys.gemini || (settings?.aiProvider === 'gemini' ? rawApiKey : '') || process.env.GEMINI_API_KEY || '';
      const openRouterKey = savedKeys.openrouter || (settings?.aiProvider === 'openrouter' ? rawApiKey : '') || process.env.OPENROUTER_API_KEY || '';
      const claudeKey = savedKeys.anthropic || (settings?.aiProvider === 'anthropic' ? rawApiKey : '') || process.env.ANTHROPIC_API_KEY || '';
      const groqKey = savedKeys.groq || (settings?.aiProvider === 'groq' ? rawApiKey : '') || process.env.GROQ_API_KEY || '';

      const aiConfig: AIConfig = {
        provider: selectedProvider as any,
        model: settings?.aiModel || 'gpt-4o-mini',
        apiKey: openAiKey || geminiKey || openRouterKey || claudeKey || groqKey,
        openAiKey,
        geminiKey,
        openRouterKey,
        claudeKey,
        groqKey,
      };

      const systemPrompt = `आप Knowora के हेड एडिटर हैं। दी गई सामग्री से 100% संपूर्ण, विस्तृत 2000+ शब्दों का हिंदी ब्लॉग लिखें। 
महत्वपूर्ण नियम:
1. केवल 1 मुख्य विषय पर लिखें।
2. 100% असली सरकारी लिंक्स और टेबल्स दें।
3. कोई अधूरा डिस्क्लेमर न लिखें।
JSON प्रारूप में आउटपुट दें:
{
  "title": "आकर्षक हिंदी शीर्षक",
  "slug": "clean-english-slug-2026",
  "content": "<h2>...</h2>",
  "excerpt": "संक्षिप्त विवरण",
  "gridBox": "latestJobs"
}`;

      const aiResponse = await generateAIContent(systemPrompt, scrapedText, aiConfig);
      let parsed: any = {};
      try {
        const cleanJson = aiResponse.replace(/```json\s*|```\s*$/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        parsed = {
          title: `अपडेट: ${url.split('/').filter(Boolean).pop() || 'सरकारी भर्ती 2026'}`,
          slug: `job-alert-${Date.now()}`,
          content: aiResponse,
          excerpt: `नवीनतम भर्ती और शिक्षा समाचार 2026.`,
          gridBox: 'latestJobs'
        };
      }

      let generatedSlug = parsed.slug || `post-${Date.now()}`;
      const existing = await prisma.blogPost.findUnique({ where: { slug: generatedSlug } });
      if (existing) {
        generatedSlug = `${generatedSlug}-${Date.now().toString().slice(-4)}`;
      }

      const detectedGrid = detectGridBox(parsed.title, parsed.content);
      const resolved = resolveOfficialLinks(parsed.title, parsed.content);
      const imagePrompt = encodeURIComponent(`${parsed.title.slice(0, 50)} India modern official high resolution`);
      const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

      const newPost = await prisma.blogPost.create({
        data: {
          title: parsed.title,
          slug: generatedSlug,
          content: resolved.sanitizedContent,
          excerpt: parsed.excerpt || parsed.title,
          featuredImage,
          status: 'Published',
          publishedAt: new Date(),
          gridBox: detectedGrid,
          seoTitle: parsed.title,
          seoDescription: parsed.excerpt || parsed.title,
          seoKeywords: parsed.title,
          officialApplyUrl: resolved.apply,
          autoGenerated: true,
          allowAutoUpdate: false,
        }
      });

      try {
        revalidatePath('/', 'layout');
        revalidatePath('/blog', 'layout');
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Blog generated and published from URL!',
        url: `https://knowora.in/blog/${newPost.slug}`,
        id: newPost.id,
        title: newPost.title
      });
    }

    // 4. MODE B: Direct Content Submission
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!finalSlug) finalSlug = `blog-${Date.now()}`;

    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const imagePrompt = encodeURIComponent(`${title.slice(0, 50)} India modern official high resolution`);
    const featuredImage = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1600&height=900&nologo=true`;

    const formattedContent = cleanAndFormatContent(content);
    const resolved = resolveOfficialLinks(title, formattedContent);
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: finalSlug,
        content: resolved.sanitizedContent,
        excerpt: excerpt || title,
        featuredImage,
        status: 'Published',
        publishedAt: new Date(),
        gridBox: gridBox || 'latestJobs',
        seoTitle: title,
        seoDescription: excerpt || title,
        seoKeywords: title,
        jobStates: jobStates || [],
        qualifications: qualifications || [],
        officialApplyUrl: officialApplyUrl || resolved.apply,
        autoGenerated: false,
        allowAutoUpdate: false,
      }
    });

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/blog', 'layout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Blog published successfully from AI!',
      url: `https://knowora.in/blog/${post.slug}`,
      id: post.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
