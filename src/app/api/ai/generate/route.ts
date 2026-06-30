import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('automata_auth_token')?.value;
    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, topic, content, title, providerOverride, modelOverride } = body;

    let aiConfig = await getAIConfig();

    // Handle Task-Specific Override
    if (providerOverride) {
      // First try to grab the key from JSON site settings if available
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      let overrideKey = '';
      if (settings?.aiApiKey?.startsWith('{')) {
        try {
          const parsed = JSON.parse(settings.aiApiKey);
          overrideKey = parsed[providerOverride];
        } catch(e) {}
      }
      
      if (overrideKey) {
        aiConfig = {
          provider: providerOverride as any,
          apiKey: overrideKey,
          model: modelOverride || ''
        };
      } else {
        // Fallback to ApiKey table
        const apiKeyRecord = await prisma.apiKey.findFirst({
          where: { provider: providerOverride, isActive: true },
          orderBy: { createdAt: 'desc' }
        });
        if (apiKeyRecord) {
          const providerMap: Record<string, any> = {
            'openai': 'openai',
            'google_ai': 'gemini',
            'anthropic': 'anthropic',
            'deepseek': 'deepseek',
            'openrouter': 'openrouter'
          };
          aiConfig = {
            provider: providerMap[providerOverride] || 'openai',
            apiKey: apiKeyRecord.apiKey.trim(),
            model: modelOverride || ''
          };
        } else if (aiConfig && aiConfig.provider === providerOverride) {
          // Fallback to default if it matches provider
          if (modelOverride) aiConfig.model = modelOverride;
        }
      }
    }

    if (!aiConfig) {
      // Fallback responses if AI is not configured
      let fallbackText = '';
      if (type === 'title') fallbackText = `1. The Ultimate Guide to ${topic || 'This Topic'}\n2. Why ${topic || 'This'} is Important Now\n3. 10 Tips for ${topic || 'Success'}`;
      else if (type === 'outline') fallbackText = `<h2>Introduction to ${topic}</h2>\n<p>Overview of the topic.</p>\n<h2>Key Concepts</h2>\n<ul><li>Point 1</li><li>Point 2</li></ul>\n<h2>Conclusion</h2>`;
      else if (type === 'article') fallbackText = `<h2>Understanding ${title || topic}</h2>\n<p>This is a placeholder article generated because AI is not configured. Please go to Settings > AI Configuration to add an API key (OpenAI, Gemini, or Claude).</p>\n<h3>Why this matters</h3>\n<p>Configuring AI unlocks the full potential of Our Blog.</p>`;
      else if (type === 'seo') fallbackText = `SEO Title: Guide to ${topic}\nSEO Description: Learn everything about ${topic}.\nKeywords: ${topic}, guide, tutorial`;
      else if (type === 'improve') fallbackText = `[Improved] ${content}`;
      else if (type === 'captions') fallbackText = `🔥 Check out our latest post about ${topic}! #trends #tech`;
      else if (type === 'hashtags') fallbackText = `#${(topic||'blog').replace(/\s+/g,'')} #AI #Technology`;

      return NextResponse.json({ result: fallbackText });
    }

    let systemPrompt = '';
    let userPrompt = '';
    let maxTokens = 2000;

    switch (type) {
      case 'title':
        systemPrompt = 'You are an expert SEO copywriter. Generate 5 highly engaging, click-worthy, SEO-optimized blog post titles for the given topic. Return ONLY the titles, one per line.';
        userPrompt = `Topic: ${topic}`;
        maxTokens = 300;
        break;
      case 'outline':
        systemPrompt = 'You are an expert content strategist. Generate a detailed blog post outline with HTML headings (h2, h3). Return ONLY the HTML outline.';
        userPrompt = `Topic: ${topic}`;
        maxTokens = 800;
        break;
      case 'article':
        systemPrompt = 'You are an expert blog writer. Write a comprehensive, SEO-optimized article (1000+ words). Use appropriate HTML formatting (h2, h3, p, ul, li, strong, em). Ensure the tone is professional yet engaging. Do not include a title tag (h1), start with an h2 or introductory paragraph. Return ONLY the HTML content.';
        userPrompt = `Title: ${title}\nTopic: ${topic}\n\nPlease write the full article.`;
        maxTokens = 4000;
        break;
      case 'seo':
        systemPrompt = 'You are an SEO expert. Given the blog content, generate an SEO title, an SEO description (under 160 characters), and a comma-separated list of keywords. Format the response EXACTLY as:\nSEO Title: [title]\nSEO Description: [description]\nKeywords: [keywords]';
        userPrompt = `Content: ${content?.substring(0, 3000)}`;
        maxTokens = 300;
        break;
      case 'improve':
        systemPrompt = `तुम एक Professional SEO Content Writer हो।
दिए गए Text/Blog को पूरी तरह से Rewrite करो और एक बेहतरीन Hindi/Hinglish SEO ब्लॉग बनाओ। 

नियम:
1. पूरी तरह से Professional HTML Format का प्रयोग करें (<h2>, <h3>, <p>, <ul>, <li>, <table>)। Markdown Code Blocks (\`\`\`html) का प्रयोग बिल्कुल न करें।
2. महत्वपूर्ण जानकारी (Table): सबसे पहले एक Professional HTML <table> बनानी है, जिसमें निम्नलिखित 2 कॉलम (विवरण और जानकारी) और पंक्तियाँ (Rows) होनी चाहिए:
Rows: विभाग/संस्था, पद/विषय, कुल पद, आवेदन का माध्यम, आधिकारिक वेबसाइट, ऑफिशियल नोटिफिकेशन, ऑनलाइन आवेदन, एडमिट कार्ड, रिजल्ट, आवेदन शुरू, अंतिम तिथि, परीक्षा तिथि, चयन प्रक्रिया, नौकरी का स्थान।

Table Rules:
- जहां आधिकारिक लिंक या वेबसाइट उपलब्ध हो वहां केवल "<a href='URL'>👉 Click Here</a>" लिखना।
- जहां जानकारी उपलब्ध न हो वहां "Coming Soon" लिखना।
- कोई गलत, अनुमानित या अपुष्ट जानकारी नहीं लिखनी।
- यदि विषय से संबंधित कोई विशेष (extra) जानकारी हो, तो उसे भी Table में नई पंक्ति (Row) बनाकर लिखें।
- जहां तक हो सके सही लिंक खोजें और Table में दें।
3. अगर Text में कोई और Link (URL) दिया गया है (Table के बाहर भी), तो उस Link को सीधा (नंगा) नहीं दिखाना है। उसे हमेशा <a href="URL">👉 Click Here</a> के रूप में ही लिखना है।
4. Content को SEO Friendly, Human Written और छोटे Paragraphs में लिखें।
5. सभी Heading (H2, H3) बहुत ही आकर्षक (Catchy) होनी चाहिए।
6. केवल शुद्ध HTML आउटपुट दें, कोई एक्स्ट्रा बात न लिखें।`;
        userPrompt = content || '';
        maxTokens = 4000;
        break;
      case 'captions':
        systemPrompt = 'You are a social media manager. Generate 3 engaging, short social media captions (for Instagram/Twitter) to promote this blog post. Use emojis. Return ONLY the captions, separated by double newlines.';
        userPrompt = `Title: ${title}\nTopic: ${topic}`;
        maxTokens = 300;
        break;
      case 'hashtags':
        systemPrompt = 'You are an SEO and Social Media expert. Generate a list of 10-15 trending, highly relevant hashtags for the given topic. Return ONLY the hashtags separated by spaces (e.g. #Tech #AI).';
        userPrompt = `Topic: ${topic}`;
        maxTokens = 150;
        break;
      default:
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    const generatedContent = await generateAIContent(aiConfig, systemPrompt, userPrompt, maxTokens);

    return NextResponse.json({ result: generatedContent });
  } catch (error: any) {
    console.error('AI Generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
  }
}
