import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import Parser from 'rss-parser';

export const maxDuration = 60; // Vercel hobby allows up to 60s for serverless
export const dynamic = 'force-dynamic'; // Prevent caching for cron jobs

// -------------------------------------------------------------
// HELPER: Fetch Google Trends RSS for India
// -------------------------------------------------------------
async function getTrendingTopics() {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN');
    return feed.items.map(item => item.title || '').filter(Boolean);
  } catch (e) {
    console.error('RSS Fetch error:', e);
    return [
      'Artificial Intelligence in Education',
      'Stock Market Updates India',
      'New Government Schemes India',
      'Technology Trends 2026',
      'Top Exams in India'
    ];
  }
}

// -------------------------------------------------------------
// HELPER: WhatsApp Auto-Poster
// -------------------------------------------------------------
async function postToWhatsApp(token: string, phoneId: string, groupId: string, text: string, imageUrl: string) {
  try {
    // WhatsApp Cloud API generic message template
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: groupId,
        type: 'image',
        image: {
          link: imageUrl,
          caption: text
        }
      })
    });
    return res.ok;
  } catch(e) {
    console.error('WhatsApp post error:', e);
    return false;
  }
}

// -------------------------------------------------------------
// HELPER: Instagram Auto-Poster
// -------------------------------------------------------------
async function postToInstagram(token: string, accountId: string, imageUrl: string, caption: string) {
  try {
    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`, { method: 'POST' });
    const containerData = await containerRes.json();
    
    if (containerData.id) {
      // Step 2: Publish media
      await fetch(`https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${containerData.id}&access_token=${token}`, { method: 'POST' });
      return true;
    }
    return false;
  } catch(e) {
    console.error('Instagram post error:', e);
    return false;
  }
}

// -------------------------------------------------------------
// HELPER: Twitter Auto-Poster (v2)
// -------------------------------------------------------------
async function postToTwitter(bearerToken: string, text: string) {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return res.ok;
  } catch (e) {
    console.error('Twitter post error:', e);
    return false;
  }
}


export async function POST(request: NextRequest) {
  try {
    // 1. GET SETTINGS
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings || (!settings.isActive && !request.headers.get('x-force-run'))) {
      return NextResponse.json({ success: false, error: 'Auto-blogging is disabled in settings' });
    }

    // 2. FETCH KEYWORD
    let pendingKeyword = await prisma.autoBlogKeyword.findFirst({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    });

    let targetTopic = '';
    let keywordId = null;

    if (pendingKeyword) {
      targetTopic = pendingKeyword.keyword;
      keywordId = pendingKeyword.id;
    } else {
      if (!settings.isNewsActive) {
        return NextResponse.json({ status: 'empty', message: 'No keywords in queue and News Auto-Blogger is disabled.' });
      }
      
      const trends = await getTrendingTopics();
      
      // Prevent duplicate blogs by checking if the trend was already processed
      for (const trend of trends) {
        const existingLog = await prisma.autoBlogLog.findFirst({
          where: { keyword: trend, status: 'success' }
        });
        if (!existingLog) {
          targetTopic = trend;
          break;
        }
      }

      // Fallback if all trends were used
      if (!targetTopic) {
         targetTopic = trends[Math.floor(Math.random() * Math.min(trends.length, 5))];
      }
    }

    // 3. INITIALIZE MULTI-AGENT AI CONFIG
    // Read all saved API keys from SiteSettings.aiApiKey (JSON blob)
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    // Helper: Build an AI config for a specific agent based on its provider and model
    function buildAgentConfig(providerKey: string, modelKey: string, fallbackProvider: string, fallbackModel: string) {
      const provider = savedKeys[providerKey] || fallbackProvider;
      const model = savedKeys[modelKey] || fallbackModel;
      
      // Determine which API key to use based on the provider
      let apiKey = '';
      if (provider === 'openrouter') apiKey = savedKeys.openrouter || '';
      else if (provider === 'openai') apiKey = savedKeys.openai || '';
      else if (provider === 'gemini') apiKey = savedKeys.gemini || '';
      else if (provider === 'anthropic') apiKey = savedKeys.anthropic || '';
      else if (provider === 'deepseek') apiKey = savedKeys.deepseek || '';
      
      // Fallback: if that provider's key is empty, try openrouter as universal fallback
      if (!apiKey && savedKeys.openrouter) {
        apiKey = savedKeys.openrouter;
        return { provider: 'openrouter' as any, apiKey, model };
      }
      // Last resort: try the default config
      if (!apiKey && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) {
        apiKey = siteSettings.aiApiKey;
      }
      
      return { provider: provider as any, apiKey, model };
    }

    const researcherConfig = buildAgentConfig('researcherProvider', 'researcherModel', 'openrouter', settings.researcherModel || 'google/gemini-2.5-flash');
    const writerConfig = buildAgentConfig('writerProvider', 'writerModel', 'openrouter', settings.writerModel || 'openai/gpt-4o-mini');
    const seoConfig = buildAgentConfig('seoProvider', 'seoModel', 'openrouter', settings.seoModel || 'openai/gpt-4o-mini');

    // Verify at least one agent has a valid API key
    if (!researcherConfig.apiKey && !writerConfig.apiKey && !seoConfig.apiKey) {
      return NextResponse.json({ success: false, error: 'AI is not configured. Please add at least one API key in Settings > AI Configuration.' });
    }

    // Set Language Rules
    const langInstructions = "Write completely in Hindi (Devanagari script), but keep technical words in English.";

    // Fetch recent posts for Auto-Internal Linking
    let recentPostsHtml = '';
    try {
      const recentPosts = await prisma.blogPost.findMany({
        where: { status: 'Published' },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { title: true, slug: true }
      });
      if (recentPosts.length > 0) {
        recentPostsHtml = recentPosts.map(p => `- <a href="https://www.knowora.in/blog/${p.slug}">${p.title}</a>`).join('\n');
      }
    } catch (e) {
      console.error('Failed to fetch recent posts for internal linking', e);
    }

    // -------------------------------------------------------------
    // AGENT 1: THE RESEARCHER
    // -------------------------------------------------------------
    const researchPrompt = `You are an expert Internet Researcher. The user wants to write a blog post about: "${targetTopic}".
    Analyze this topic and provide a detailed factual summary, key points, current trends, and structural ideas for the article.
    Ensure facts are accurate. Do not write the article, just provide the research data and an outline.`;
    
    let researchData = '';
    try {
      researchData = await generateAIContent(researcherConfig, "You are a factual research assistant.", researchPrompt, 1500);
    } catch (e) {
      // Fallback if researcher fails (e.g. invalid model)
      researchData = `Topic: ${targetTopic}. Provide a comprehensive overview.`;
    }

    // -------------------------------------------------------------
    // AGENT 2: THE WRITER
    // -------------------------------------------------------------
    const writerPrompt = `You are a Senior Content Writer and SEO Expert.
    Write a highly engaging, beautifully formatted, 1000+ word blog article based on the following research:
    
    RESEARCH DATA:
    ${researchData}
    
    REQUIREMENTS:
    1. ${langInstructions}
    2. Format using strict HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote>, <table>.
    3. Do NOT wrap the output in markdown code blocks like \`\`\`html. Output raw HTML only.
    4. Make the content highly readable and scannable with engaging subheadings.
    5. Add a compelling introduction and a strong conclusion.
    6. IF the topic is about Finance/Earning/Money, you MUST include sections on "How to make money (पैसे कैसे कमाएं)" and "Money Management Tips (पैसे कैसे मैनेज करें)".
    7. IF the topic is about Technology/Gadgets/Mobiles, you MUST embed realistic images of the gadgets using this HTML tag: <img src="https://image.pollinations.ai/prompt/Realistic%20Photo%20Of%20[GADGET_NAME_HERE]?width=800&height=400&nologo=true" alt="Gadget Image" class="w-full rounded-xl my-4" />
    
    ${recentPostsHtml ? `
    AUTO-INTERNAL LINKING:
    You MUST naturally hyperlink the following related articles into the body text of your article. Use exact <a> tags provided below when the topic naturally fits in a sentence:
    ${recentPostsHtml}
    ` : ''}

    ${settings.embedYoutube !== false ? `
    YOUTUBE VIDEO EMBED:
    You MUST embed a highly relevant YouTube video exactly in the middle of the article (after the 2nd or 3rd <h2> tag).
    Use this exact HTML code format, replacing [SEARCH_KEYWORD] with a highly specific English search term related to the blog topic:
    <div class="my-8 aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200/20">
      <iframe width="100%" height="100%" src="https://www.youtube.com/embed?listType=search&list=[SEARCH_KEYWORD]" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    ` : ''}`;

    let articleHtml = await generateAIContent(writerConfig, "You are an expert blog writer.", writerPrompt, 3500);
    articleHtml = articleHtml.replace(/^```html\n?|```$/g, '').trim();

    // -------------------------------------------------------------
    // AGENT 3: THE SEO EXPERT
    // -------------------------------------------------------------
    const seoPrompt = `You are an SEO Expert. Analyze the following article HTML and generate optimized metadata.
    Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or backticks:
    {
      "seoTitle": "Catchy SEO Title (under 60 chars)",
      "seoDescription": "Compelling meta description (under 160 chars)",
      "seoKeywords": "keyword1, keyword2, keyword3",
      "slug": "url-friendly-english-slug"
    }
    
    ARTICLE HTML:
    ${articleHtml.substring(0, 2000)}...`;

    let seoData = {
      seoTitle: targetTopic,
      seoDescription: "An in-depth look at " + targetTopic,
      seoKeywords: targetTopic.toLowerCase().split(' ').join(', '),
      slug: targetTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4)
    };

    try {
      const seoResultRaw = await generateAIContent(seoConfig, "You are an SEO metadata generator that outputs only strict JSON.", seoPrompt, 500);
      const cleanJsonStr = seoResultRaw.replace(/^```json\n?|```$/g, '').trim();
      const parsedSeo = JSON.parse(cleanJsonStr);
      if (parsedSeo.seoTitle) seoData = { ...seoData, ...parsedSeo };
    } catch(e) {
      console.warn("SEO Agent JSON parsing failed, using fallback.", e);
    }

    // -------------------------------------------------------------
    // IMAGE GENERATOR (Agent 4)
    // -------------------------------------------------------------
    let featuredImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(targetTopic.split(' ')[0] || 'tech')}`;
    
    const imgProvider = savedKeys.imageGenProvider || 'pollinations';
    const imgModel = savedKeys.imageGenModel || 'dall-e-3';
    const imgApiKey = savedKeys.imageGenApi || savedKeys.openai || '';
    const imgPrompt = `High quality professional blog header image representing ${targetTopic}. 8k resolution, cinematic lighting, modern design.`;

    if (imgProvider === 'pollinations') {
      featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;
    } else if (imgProvider === 'openai' && imgApiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${imgApiKey}` },
          body: JSON.stringify({ model: imgModel, prompt: imgPrompt, n: 1, size: "1024x1024" })
        });
        const data = await res.json();
        if (data?.data?.[0]?.url) {
          featuredImage = data.data[0].url;
        }
      } catch (e) {
        console.error("OpenAI Image Gen failed", e);
      }
    } else if (imgProvider === 'custom' || imgProvider === 'openrouter') {
       // Placeholder for future APIs. Currently routes to pollinations to ensure an image is always generated
       featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;
    } else if (settings.imageSource === 'none') {
      featuredImage = '';
    }

    // -------------------------------------------------------------
    // SAVE TO DATABASE
    // -------------------------------------------------------------
    const finalSlug = seoData.slug + '-' + Date.now().toString().slice(-4);
    
    const newPost = await prisma.blogPost.create({
      data: {
        title: seoData.seoTitle || targetTopic,
        slug: finalSlug,
        content: articleHtml,
        excerpt: seoData.seoDescription,
        featuredImage: featuredImage,
        status: settings.autoPublish ? 'Published' : 'Draft',
        publishedAt: settings.autoPublish ? new Date() : null,
        autoGenerated: true,
        seoTitle: seoData.seoTitle,
        seoDescription: seoData.seoDescription,
        seoKeywords: seoData.seoKeywords,
        tags: {
          create: [{ tag: { connectOrCreate: { where: { name: pendingKeyword?.niche || 'News' }, create: { name: pendingKeyword?.niche || 'News', slug: (pendingKeyword?.niche || 'News').toLowerCase().replace(/[^a-z0-9]+/g, '-') } } } }]
        }
      }
    });

    if (keywordId) {
      await prisma.autoBlogKeyword.update({
        where: { id: keywordId },
        data: { status: 'used', usedAt: new Date(), postId: newPost.id }
      });
    }

    await prisma.autoBlogLog.create({
      data: {
        keyword: targetTopic,
        title: newPost.title,
        status: 'success',
        postId: newPost.id
      }
    });

    // -------------------------------------------------------------
    // SOCIAL MEDIA BROADCASTER
    // -------------------------------------------------------------
    const socialCaption = newPost.socialCaptions || `Check out our latest article: ${newPost.title}\n\nRead more here: https://www.knowora.in/blog/${newPost.slug}\n\n${newPost.socialHashtags || ''}`;
    
    // Generate dynamic poster URL for social sharing
    const socialImageUrl = `https://www.knowora.in/api/og?title=${encodeURIComponent(newPost.title)}&bg=${encodeURIComponent(newPost.featuredImage)}`;

    // 1. WhatsApp
    if (savedKeys.whatsappToken && savedKeys.whatsappPhoneId && savedKeys.whatsappGroupId) {
      await postToWhatsApp(savedKeys.whatsappToken, savedKeys.whatsappPhoneId, savedKeys.whatsappGroupId, socialCaption, socialImageUrl);
    }

    // 1. Instagram
    if (savedKeys.instagramToken && savedKeys.instagramAccountId) {
      await postToInstagram(savedKeys.instagramToken, savedKeys.instagramAccountId, socialImageUrl, socialCaption);
    }

    // 2.5 Twitter
    if (savedKeys.twitter) {
      await postToTwitter(savedKeys.twitter, socialCaption);
    }

    // 3. Telegram
    if (savedKeys.telegramToken && savedKeys.telegramChatId) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${savedKeys.telegramToken}/sendMessage`;
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: savedKeys.telegramChatId,
            text: socialCaption,
            parse_mode: 'HTML'
          })
        });
      } catch (err) {
        console.error('Telegram broadcast failed:', err);
      }
    }

    return NextResponse.json({ success: true, post: newPost });

  } catch (error: any) {
    console.error('Auto-blog fatal error:', error);
    await prisma.autoBlogLog.create({
      data: {
        keyword: 'Unknown/Crash',
        status: 'failed',
        error: error.message || 'Unknown error'
      }
    });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if this is a cron trigger request
    if (searchParams.get('action') === 'trigger') {
      const cronSecret = searchParams.get('secret');
      // Basic security check (we can rely on the cron-job.org setting this parameter)
      if (cronSecret !== 'auto123') {
        return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
      }
      return POST(request);
    }

    const totalKeywords = await prisma.autoBlogKeyword.count();
    const pendingKeywords = await prisma.autoBlogKeyword.count({ where: { status: 'pending' } });
    const usedKeywords = await prisma.autoBlogKeyword.count({ where: { status: 'used' } });
    const totalAutoPosts = await prisma.blogPost.count({ where: { autoGenerated: true } });
    
    const logs = await prisma.autoBlogLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      stats: { totalKeywords, pendingKeywords, usedKeywords, totalAutoPosts },
      logs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch auto-blog stats' }, { status: 500 });
  }
}
