import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
// Code cleaned up: RSS fetching is no longer used.
export const maxDuration = 60; // Vercel hobby allows up to 60s for serverless
export const dynamic = 'force-dynamic'; // Prevent caching for cron jobs

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
    let selectedCategory = 'News';

    if (!pendingKeyword) {
      // ALWAYS generate topics when queue is empty, regardless of isNewsActive setting
      // Since manual run button was pressed, or the cron is active, we should restock the queue.


      // -------------------------------------------------------------
      // AI TOPIC GENERATOR (Triggered when queue is empty)
      // -------------------------------------------------------------
      const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      let savedKeys: Record<string, string> = {};
      try {
        if (siteSettings?.aiApiKey?.startsWith('{')) {
          savedKeys = JSON.parse(siteSettings.aiApiKey);
        }
      } catch(e) {}

      function buildAgentConfig(providerKey: string, modelKey: string, fallbackProvider: string, fallbackModel: string) {
        const provider = savedKeys[providerKey] || fallbackProvider;
        const model = (savedKeys[modelKey] || fallbackModel).trim();
        let apiKey = '';
        if (provider === 'openrouter') apiKey = savedKeys.openrouter || '';
        else if (provider === 'openai') apiKey = savedKeys.openai || '';
        else if (provider === 'gemini') apiKey = savedKeys.gemini || '';
        else if (provider === 'anthropic') apiKey = savedKeys.anthropic || '';
        else if (provider === 'deepseek') apiKey = savedKeys.deepseek || '';
        if (!apiKey && savedKeys.openrouter) return { provider: 'openrouter' as any, apiKey: savedKeys.openrouter, model };
        if (!apiKey && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) apiKey = siteSettings.aiApiKey;
        return { provider: provider as any, apiKey, model };
      }

      const topicPrompt = `You are a Trending News & Job Alert researcher for India. 
      The user needs to auto-generate blogs today. 
      Provide exactly 45 highly specific, real, and currently trending topics in India.
      Include 30 Government Jobs, Exam Notifications, Admit Cards, or Exam Results (e.g., 'SSC CGL 2026 Notification', 'Bihar Police Constable Result', 'UPSC NDA 2026').
      Include 10 Technology trends (e.g., 'Samsung S24 Ultra Launch', 'Latest AI tools 2024').
      Include 5 Finance updates (e.g., 'Budget 2026 Highlights', 'Stock Market Sensex crash').
      Ensure the topics are highly specific (NOT generic like 'Education news in Bihar').
      Respond ONLY with a valid JSON array of strings. No markdown, no backticks.
      Example format: ["Topic 1", "Topic 2", "Topic 3"]`;

      let rModel = settings.researcherModel || '';
      if (rModel === 'google/gemini-2.5-flash' || rModel.includes('2.5-flash') || !rModel) rModel = 'google/gemini-2.0-flash-exp:free';

      const researcherConfigForTopic = buildAgentConfig('researcherProvider', 'researcherModel', 'openrouter', rModel);
      
      try {
        const topicRaw = await generateAIContent(researcherConfigForTopic, "You output strict JSON arrays.", topicPrompt, 1500);
        const firstBracket = topicRaw.indexOf('[');
        const lastBracket = topicRaw.lastIndexOf(']');
        if (firstBracket === -1 || lastBracket === -1) throw new Error("No JSON array found");
        const cleanTopicJson = topicRaw.substring(firstBracket, lastBracket + 1);
        const generatedTopics: string[] = JSON.parse(cleanTopicJson);
        
        if (Array.isArray(generatedTopics) && generatedTopics.length > 0) {
          const shuffledTopics = generatedTopics.sort(() => Math.random() - 0.5);
          
          const queueData = shuffledTopics.map((topic, i) => {
             let niche = 'News';
             const tLower = topic.toLowerCase();
             if (tLower.includes('job') || tLower.includes('result') || tLower.includes('exam') || tLower.includes('admit') || tLower.includes('notification') || tLower.includes('vacancy') || tLower.includes('recruitment')) {
                niche = 'Education & Career';
             } else if (tLower.includes('tech') || tLower.includes('launch') || tLower.includes('ai') || tLower.includes('phone') || tLower.includes('app')) {
                niche = 'Technology';
             } else if (tLower.includes('finance') || tLower.includes('stock') || tLower.includes('budget') || tLower.includes('market') || tLower.includes('bank')) {
                niche = 'Finance & Earning';
             }
             return {
                keyword: topic,
                niche: niche,
                status: 'pending',
                priority: 5
             };
          });

          await prisma.autoBlogKeyword.createMany({ data: queueData });

          pendingKeyword = await prisma.autoBlogKeyword.findFirst({
            where: { status: 'pending' },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
          });
          
          if (!pendingKeyword) return NextResponse.json({ status: 'empty', message: 'Failed to pick generated keyword.' });
        } else {
           return NextResponse.json({ status: 'empty', message: 'AI failed to generate topics array.' });
        }
      } catch (e: any) {
        console.error('AI Topic Generator failed:', e);
        return NextResponse.json({ status: 'empty', message: 'AI Error: ' + (e.message || 'Unknown error') });
      }
    }

    if (pendingKeyword) {
      targetTopic = pendingKeyword.keyword;
      keywordId = pendingKeyword.id;
      selectedCategory = pendingKeyword.niche || 'News';
    }

    let rModel = settings.researcherModel || '';
    if (rModel === 'google/gemini-2.5-flash' || rModel.includes('2.5-flash') || !rModel) rModel = 'google/gemini-2.0-flash-exp:free';
    
    let wModel = settings.writerModel || '';
    if (wModel === 'openai/gpt-4o-mini' || !wModel) wModel = 'meta-llama/llama-3.3-70b-instruct';
    
    let sModel = settings.seoModel || '';
    if (sModel === 'openai/gpt-4o-mini' || !sModel) sModel = 'google/gemini-2.0-flash-exp:free';

    const researcherConfig = buildAgentConfig('researcherProvider', 'researcherModel', 'openrouter', rModel);
    const writerConfig = buildAgentConfig('writerProvider', 'writerModel', 'openrouter', wModel);
    const seoConfig = buildAgentConfig('seoProvider', 'seoModel', 'openrouter', sModel);

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
    // AGENT 1: THE RESEARCHER & NEWS API
    // -------------------------------------------------------------
    let liveNewsContext = '';
    if (selectedCategory === 'News' && savedKeys.newsdata) {
      try {
        const newsRes = await fetch(`https://newsdata.io/api/1/news?apikey=${savedKeys.newsdata}&q=${encodeURIComponent(targetTopic.split(' ')[0] || 'india')}&language=en,hi`);
        const newsJson = await newsRes.json();
        if (newsJson.results && newsJson.results.length > 0) {
          liveNewsContext = "LIVE NEWS DATA (Use this for factual accuracy):\n" + 
            newsJson.results.slice(0, 3).map((n: any) => `- ${n.title}: ${n.description}`).join('\n');
        }
      } catch (e) {
        console.error("News API failed", e);
      }
    }

    const researchPrompt = `You are an expert Internet Researcher. The user wants to write a blog post about: "${targetTopic}".
    ${liveNewsContext}
    Analyze this topic and provide a detailed factual summary, key points, current trends, and structural ideas for the article.
    Ensure facts are accurate. Do not write the article, just provide the research data and an outline.`;
    
    let researchData = '';
    try {
      researchData = await generateAIContent(researcherConfig, "You are a factual research assistant.", researchPrompt, 1500);
    } catch (e) {
      // Fallback if researcher fails (e.g. invalid model)
      researchData = `Topic: ${targetTopic}. Provide a comprehensive overview. ${liveNewsContext}`;
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
    2. THE MAIN ARTICLE TITLE (<h1> or <h2> at the top) MUST be highly engaging, creating immense curiosity (जिज्ञासा). MUST be in the exact format: "Long Hindi Title with Curiosity Hook (Short English Keyword Title)". 
       EXAMPLES FOR ALL CATEGORIES:
       - Education/Jobs: "UPSC NDA 2026 का आधिकारिक नोटिफिकेशन जारी, जानिए योग्यता, पद और आवेदन का तरीका! (UPSC NDA 2026 Notification)"
       - Technology: "Realme 14 Pro 5G भारत में हुआ लॉन्च, 200MP कैमरा और धांसू फीचर्स ने उड़ाई सबकी नींद! (Realme 14 Pro 5G Launch)"
       - Finance: "बजट 2026 में हुआ बड़ा बदलाव, टैक्सपेयर्स को मिला भारी तोहफा, जानिए पूरी डिटेल! (Budget 2026 Updates)"
       ALWAYS write the main title first in Hindi (creating eagerness to read), then in brackets English.
    3. Format using strict HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote>, <table>.
    4. Do NOT wrap the output in markdown code blocks like \`\`\`html. Output raw HTML only.
    5. Make the content highly readable and scannable with engaging subheadings.
    6. Add a compelling introduction and a strong conclusion.
    7. IF the topic is about Finance/Earning/Money, you MUST include sections on "How to make money (पैसे कैसे कमाएं)" and "Money Management Tips (पैसे कैसे मैनेज करें)".
    8. IF the topic is about Technology/Gadgets/Mobiles, you MUST embed realistic images of the gadgets using this HTML tag: <img src="https://image.pollinations.ai/prompt/Realistic%20Photo%20Of%20[GADGET_NAME_HERE]?width=800&height=400&nologo=true" alt="Gadget Image" class="w-full rounded-xl my-4" />
    9. IF the topic is about Technology/Gadgets, you MUST include a Specification & Price Table at the end. The table must have multiple purchase links (Amazon, Flipkart, Meesho) styled as buttons. If you do not know the exact product link, use [LINK_NOT_AVAILABLE] as the href.
    10. IF the topic is about Education, Jobs, Vacancies, Results, or Career, you MUST strictly follow this 🔥 MASTER PROMPT 🔥 format:
        --- START MASTER PROMPT ---
        तुम एक Professional Education/Career Content Writer, SEO Expert और Google Discover Friendly Blogger हो। 
        🚫 कड़े नियम (Strictly Enforced):
        1. Clean HTML Code: कंटेंट सीधे पब्लिश करने योग्य HTML फॉर्मेट में होगा। (Use <h2>, <p>, <table>, <ul>, etc. NO Markdown).
        2. Link Format: जहाँ भी कोई आधिकारिक लिंक (वेबसाइट, नोटिफिकेशन, आवेदन, रिजल्ट आदि) देना हो, वहाँ href में लिंक डालकर टेक्स्ट केवल और केवल "👉 Click Here" लिखना है (e.g., <a href="https://www.google.com/search?q=site:ssc.nic.in+result">👉 Click Here</a>).
        3. Missing Info Format: जो जानकारी अभी उपलब्ध या घोषित नहीं हुई है, वहाँ अनुमान नहीं लगाना है, बल्कि केवल "Coming Soon" लिखना है।
        4. Length & Quality: ब्लॉग 2000-3000+ शब्दों का होना चाहिए। कोई AI जैसी भाषा नहीं होनी चाहिए। 100% Human-Written होना चाहिए।
        5. Formatting: छोटे पैराग्राफ, Bullet Points और Tables का अनिवार्य रूप से उपयोग करना है।
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure):
        <h2>Introduction</h2> (150-250 words)
        
        <h2>Quick Information</h2> (Mandatory HTML Table)
        - **CRITICAL:** The table MUST have exactly TWO (2) columns. NEVER create a 3-column or 4-column table.
        | विवरण | जानकारी | (Convert this to HTML Table format)
        | विभाग/संस्था | ... |
        | पद/विषय | ... |
        | कुल पद | ... |
        | आवेदन का माध्यम | ... |
        | नौकरी का स्थान | ... |
        | चयन प्रक्रिया | ... |
        | आवेदन शुरू | Coming Soon |
        | अंतिम तिथि | Coming Soon |
        | परीक्षा तिथि | Coming Soon |
        | आधिकारिक वेबसाइट | 👉 Click Here |
        | ऑफिशियल नोटिफिकेशन | 👉 Click Here |
        | ऑनलाइन आवेदन | 👉 Click Here |
        | एडमिट कार्ड | 👉 Click Here |
        | आंसर की | 👉 Click Here |
        | रिजल्ट | 👉 Click Here |

        <h2>Important Dates (महत्वपूर्ण तिथियां)</h2>
        <h2>Vacancy Details (पदों का विवरण)</h2> (Use Table)
        <h2>Application Fee (आवेदन शुल्क)</h2> (Use Table)
        <h2>Eligibility Criteria (शैक्षणिक योग्यता और आयु सीमा)</h2> (Use Bullet Points)
        <h2>Selection Process (चयन प्रक्रिया)</h2> (Step 1, Step 2...)
        <h2>Exam Pattern & Syllabus (परीक्षा पैटर्न और सिलेबस)</h2>
        <h2>Salary & Job Profile (वेतन और कार्य विवरण)</h2>
        <h2>Required Documents (आवश्यक दस्तावेज़)</h2>
        <h2>How to Apply / Check Result (आवेदन कैसे करें / रिजल्ट कैसे देखें)</h2> (Step-by-step)
        <h2>FAQ</h2> (Use HTML <details> and <summary> tags for questions, and put 👉 Click Here inside if needed)
        <h2>Conclusion</h2>
        --- END MASTER PROMPT ---

    11. CRITICAL LINKING RULE: If you do not know the exact direct URL for an official link (Result, Apply, Notification), you MUST generate a targeted Google Search URL that searches ONLY the official domain. 
        Format: "https://www.google.com/search?q=site:[OFFICIAL_DOMAIN]+[SPECIFIC_KEYWORD]". 
        Example for SSC CGL: <a href="https://www.google.com/search?q=site:ssc.nic.in+SSC+CGL+apply+online+link" target="_blank">👉 Click Here</a>. 
        NEVER use "[LINK_NOT_AVAILABLE]" or "#" or empty href. Always provide a Google Dork link if unsure so the user can easily find it.
    
    ${recentPostsHtml ? `
    AUTO-INTERNAL LINKING:
    If you mention the following related articles, you MUST add them as a visually distinct NOTE block using this exact HTML format:
    <div class="internal-link-note"><strong>📝 नोट (Note):</strong> <a href="...">Article Title</a> के बारे में और पढ़ें।</div>
    Do NOT just mix them in the normal paragraph text. You MUST use this exact HTML div format. Use the exact <a> tags provided below:
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

    // Extract Title from the HTML generated by the writer
    let articleTitle = targetTopic;
    const titleMatch = articleHtml.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
    if (titleMatch && titleMatch[1]) {
      articleTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim(); // Remove any nested tags like <strong>
    }

    // -------------------------------------------------------------
    // AGENT 3: THE SEO EXPERT
    // -------------------------------------------------------------
    const seoPrompt = `You are an SEO Expert. Analyze the following article HTML and generate optimized metadata.
    IMPORTANT TITLE RULE: The seoTitle MUST ALWAYS be formatted as "Hindi Title (English Title)". For example: "सेंसेक्स में भारी गिरावट (Sensex Crashes Heavily)". The title MUST be directly related to the news. Where Hindi is not suitable, use English.
    
    Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or backticks:
    {
      "seoTitle": "Hindi Title (English Title) (under 80 chars)",
      "seoDescription": "Compelling meta description (under 160 chars)",
      "seoKeywords": "keyword1, keyword2, keyword3",
      "slug": "url-friendly-english-slug",
      "expiryDate": "YYYY-MM-DDTHH:mm:ss.sssZ (ONLY if this is a job vacancy or recruitment news with a specific last date to apply, otherwise return null)"
    }
    
    ARTICLE HTML:
    ${articleHtml.substring(0, 2000)}...`;

    let seoData = {
      seoTitle: targetTopic,
      seoDescription: "An in-depth look at " + targetTopic,
      seoKeywords: targetTopic.toLowerCase().split(' ').join(', '),
      slug: targetTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4)
    };

    let expiryDate = null;
    try {
      const seoResultRaw = await generateAIContent(seoConfig, "You are an SEO metadata generator that outputs only strict JSON.", seoPrompt, 500);
      const cleanJsonStr = seoResultRaw.replace(/^```json\n?|```$/g, '').trim();
      const parsedSeo = JSON.parse(cleanJsonStr);
      if (parsedSeo.seoTitle) seoData = { ...seoData, ...parsedSeo };
      if (parsedSeo.expiryDate) {
        const parsedDate = new Date(parsedSeo.expiryDate);
        if (!isNaN(parsedDate.getTime())) expiryDate = parsedDate;
      }
    } catch(e) {
      console.warn("SEO Agent JSON parsing failed, using fallback.", e);
    }

    // -------------------------------------------------------------
    // IMAGE GENERATOR (Agent 4)
    // -------------------------------------------------------------
    let featuredImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(targetTopic.split(' ')[0] || 'tech')}`;
    
    const imgSourceType = settings.imageSource || 'unsplash'; // unsplash, pexels, ai, none
    const imgProvider = savedKeys.imageGenProvider || 'pollinations';
    const imgModel = savedKeys.imageGenModel || 'dall-e-3';
    const imgApiKey = savedKeys.imageGenApi || savedKeys.openai || '';
    const imgPrompt = `High quality professional blog header image representing ${targetTopic}. 8k resolution, cinematic lighting, modern design.`;

    if (imgSourceType === 'none') {
      featuredImage = '';
    } else if (imgSourceType === 'pexels') {
      featuredImage = `https://images.pexels.com/photos/random?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop&query=${encodeURIComponent(targetTopic.split(' ')[0] || 'tech')}`;
      // Note: A real pexels API call requires auth, but source.unsplash style doesn't exist for pexels officially without API.
      // If they have an API key later we can use it, for now we fallback to standard placeholder or Unsplash if pexels random doesn't work.
    } else if (imgSourceType === 'ai') {
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
      } else if (imgProvider === 'openrouter' && imgApiKey) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${imgApiKey}` },
            body: JSON.stringify({ model: imgModel || 'openai/dall-e-3', prompt: imgPrompt, n: 1, size: "1024x1024" })
          });
          const data = await res.json();
          if (data?.data?.[0]?.url) {
            featuredImage = data.data[0].url;
          }
        } catch (e) {
          console.error("OpenRouter Image Gen failed", e);
        }
      } else {
         // Fallback to pollinations
         featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;
      }
    }

    // -------------------------------------------------------------
    // SAVE TO DATABASE
    // -------------------------------------------------------------
    const finalSlug = seoData.slug + '-' + Date.now().toString().slice(-4);
    
    const newPost = await prisma.blogPost.create({
      data: {
        title: articleTitle, // Use the extracted title from the Writer Agent directly
        slug: finalSlug,
        content: articleHtml,
        excerpt: seoData.seoDescription,
        featuredImage: featuredImage,
        status: settings.autoPublish ? 'Published' : 'Draft',
        publishedAt: settings.autoPublish ? new Date() : null,
        autoGenerated: true,
        expiryDate: expiryDate,
        seoTitle: seoData.seoTitle,
        seoDescription: seoData.seoDescription,
        seoKeywords: seoData.seoKeywords,
        tags: {
          create: [{ tag: { connectOrCreate: { where: { name: pendingKeyword?.niche || selectedCategory }, create: { name: pendingKeyword?.niche || selectedCategory, slug: (pendingKeyword?.niche || selectedCategory).toLowerCase().replace(/[^a-z0-9]+/g, '-') } } } }]
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

    // -------------------------------------------------------------
    // EMAIL NEWSLETTER (Resend API)
    // -------------------------------------------------------------
    if (savedKeys.resend && settings.autoPublish) {
      try {
        // Fetch leads
        const leads = await prisma.lead.findMany({ select: { email: true } });
        const emails = leads.map((l: any) => l.email).filter(Boolean);
        
        if (emails.length > 0) {
          // Resend allows max 50 emails in bcc per API call for free tier, we slice first 50
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${savedKeys.resend}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Our Blog <info@knowora.in>',
              to: 'subscribers@knowora.in', // dummy to
              bcc: emails.slice(0, 50),
              subject: `New Post: ${newPost.title}`,
              html: `
                <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                  <h2>${newPost.title}</h2>
                  ${newPost.featuredImage ? `<img src="${newPost.featuredImage}" style="width: 100%; border-radius: 8px;" />` : ''}
                  <p>${newPost.excerpt || ''}</p>
                  <a href="https://www.knowora.in/blog/${newPost.slug}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Read Full Article</a>
                </div>
              `
            })
          });
        }
      } catch (e) {
        console.error("Newsletter broadcast failed:", e);
      }
    }

    // -------------------------------------------------------------
    // SEO: PING GOOGLE SITEMAP
    // -------------------------------------------------------------
    if (settings.autoPublish) {
      try {
        await fetch(`https://www.google.com/ping?sitemap=https://www.knowora.in/sitemap.xml`);
        // If Google Indexing API JSON is provided, you would use googleapis here. 
        // For serverless simplicity, sitemap ping is highly effective for fast indexing.
      } catch (e) {
        console.error("Google ping failed", e);
      }
    }

    // Revalidate Homepage and Blog index so the new post appears immediately
    try {
      revalidatePath('/');
      revalidatePath('/blog');
    } catch(e) {
      console.warn("Revalidate failed", e);
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
