import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    // Basic auth check (can be expanded for secure cron trigger)
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Check if auto-blogging is active
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.isActive && !isCron) {
      // If triggered manually from admin, we might bypass the isActive check, but let's assume it should be active.
      // Actually, allow manual triggers even if paused.
    }

    // 1. Fetch next pending keyword
    const pendingKeyword = await prisma.autoBlogKeyword.findFirst({
      where: { status: 'pending' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    if (!pendingKeyword) {
      return NextResponse.json({ message: 'No pending keywords found in queue.', status: 'empty' });
    }

    const aiConfig = await getAIConfig();
    if (!aiConfig) {
      return NextResponse.json({ error: 'AI Provider not configured.' }, { status: 400 });
    }

    // Check SiteSettings for Live News Settings
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let liveNewsSettings: any = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        liveNewsSettings = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    let topic = 'Business';
    let newsContext = '';

    if (liveNewsSettings.isNewsActive && liveNewsSettings.newsTopics) {
      // 1. Pick a random news topic
      const topics = liveNewsSettings.newsTopics.split(',').map((t: string) => t.trim());
      topic = topics[Math.floor(Math.random() * topics.length)];
      
      // 2. Fetch Google News RSS
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' India')}&hl=en-IN&gl=IN&ceid=IN:en`;
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
          // Pick a random recent news item from the top 5
          const item = feed.items[Math.floor(Math.random() * Math.min(5, feed.items.length))];
          newsContext = `News Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.contentSnippet || item.content || ''}`;
        }
      } catch (rssError) {
        console.error('Failed to fetch RSS:', rssError);
      }
    } else {
      // Fallback to AutoBlogKeyword queue
      const pendingKeyword = await prisma.autoBlogKeyword.findFirst({
        where: { status: 'pending' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });

      if (!pendingKeyword) {
        return NextResponse.json({ message: 'No pending keywords or Live News found.', status: 'empty' });
      }
      topic = pendingKeyword.keyword;
      
      // Update Keyword to processing to prevent duplicates in quick succession
      await prisma.autoBlogKeyword.update({
        where: { id: pendingKeyword.id },
        data: { status: 'used', usedAt: new Date() }
      });
    }

    // 2. Generate Content
    // Generate Title
    const titlePrompt = 'You are an expert SEO copywriter. Generate 1 highly engaging, click-worthy, SEO-optimized blog post title for the given topic or news. Return ONLY the title, no quotes, no extra text.';
    const rawTitle = await generateAIContent(aiConfig, titlePrompt, `Topic: ${topic}\n${newsContext}`, 100);
    const title = rawTitle.replace(/^["']|["']$/g, '').trim();

    // Check if we already published this
    const potentialSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existing = await prisma.blogPost.findUnique({ where: { slug: potentialSlug } });
    if (existing) {
      return NextResponse.json({ error: 'News already covered' }, { status: 409 });
    }

    // Generate Article
    let articlePrompt = '';
    
    // Check if topic is Education & Career related
    const isEdu = /education|career|job|sarkari|yojna|result|admit card|exam|scholarship|recruitment|vacancy/i.test(topic + newsContext);

    if (isEdu) {
      articlePrompt = `तुम एक Professional SEO Content Writer, Blogging Expert, Google Discover Friendly और AdSense Friendly Content Creator हो।
नीचे दिए गए विषय (Topic) या Live News पर 100% यूनिक, Human-Written, SEO Optimized, Google Ranking Friendly और Publish Ready ब्लॉग तैयार करो।

IMPORTANT TECHNICAL RULE: You MUST format your entire response in valid HTML (using <h2>, <h3>, <p>, <table>, <ul>, <li>). Do NOT wrap the response in markdown code blocks like \`\`\`html. The user instruction "HTML Code नहीं लिखना" means do not write visible code for the user to read, but you MUST use HTML tags internally for formatting so the website can render it properly.

क्या करना है:
1. SEO Title: आकर्षक, क्लिक योग्य और मुख्य Keyword वाला। (Do not use h1 tag, start with h2)
2. Introduction: 150–250 शब्दों का परिचय, मुख्य Keyword के साथ।
3. महत्वपूर्ण जानकारी (Table): सबसे पहले एक Professional HTML <table> बनानी है। 
   Rows: विभाग/संस्था, पद/विषय, कुल पद, आवेदन का माध्यम, आधिकारिक वेबसाइट (<a href="#">👉 Click Here</a>), ऑफिशियल नोटिफिकेशन (Coming Soon), ऑनलाइन आवेदन (Coming Soon), एडमिट कार्ड (Coming Soon), रिजल्ट (Coming Soon), आवेदन शुरू (Coming Soon), अंतिम तिथि (Coming Soon), परीक्षा तिथि (Coming Soon), चयन प्रक्रिया, नौकरी का स्थान।
   (जहां लिंक हो वहां <a href="#">👉 Click Here</a> का प्रयोग करें। यदि आपको योजना/भर्ती की असली Official Website का लिंक पता है तो "#" की जगह उस असली लिंक का प्रयोग करें, अन्यथा "#" ही लिखें। जहां जानकारी न हो वहां Coming Soon)
4. पदों का विवरण: सभी पदों की जानकारी सरल भाषा में।
5. शैक्षणिक योग्यता: आवश्यक योग्यता विस्तार से।
6. आयु सीमा: न्यूनतम, अधिकतम और छूट।
7. आवेदन शुल्क: सभी वर्गों का शुल्क।
8. चयन प्रक्रिया: चयन के सभी चरण।
9. परीक्षा पैटर्न: विषय, समय, प्रश्न संख्या।
10. सिलेबस: केवल Topic List (e.g. <ul><li><a href="#">👉 सामान्य ज्ञान (Click Here)</a></li></ul>)
11. शारीरिक मापदंड: यदि लागू हो।
12. वेतन: Salary, Grade Pay।
13. आवेदन प्रक्रिया: Step-by-Step।
14. आवश्यक दस्तावेज़: सूची।
15. महत्वपूर्ण तिथियाँ: तिथियाँ या Coming Soon।
16. कार्य विवरण (Job Profile)
17. FAQ: 8–15 प्रश्न जिनका उत्तर पहले नहीं दिया गया हो। उत्तर बिल्कुल नहीं लिखना। सभी प्रश्न <ul><li><a href="#">👉 [Question]? (Click Here)</a></li></ul> के रूप में लिखने हैं। 
18. Conclusion: 100–150 शब्दों का निष्कर्ष।

SEO Rules:
- मुख्य Keyword Title, Intro, H2, H3, Conclusion में शामिल।
- सभी Heading (H2, H3) बहुत ही आकर्षक और सुंदर (Catchy) होनी चाहिए।
- Keyword Stuffing नहीं। छोटे Paragraph।
- ब्लॉग कम से कम 2000–3000+ शब्दों का होना चाहिए (Make it extremely detailed).
- 100% Original and Human-Written in Hindi/Hinglish.
- किसी भी जानकारी का अनुमान नहीं लगाना।

Topic: ${title}
News Context: ${newsContext}
Return ONLY the HTML output.`;
    } else {
      articlePrompt = `You are an expert blog writer and news analyst. Write a comprehensive, highly engaging, and user-friendly SEO-optimized article (1000+ words) based on the provided topic or live news. 
Analyze the news deeply and explain it in simple terms.
Use appropriate HTML formatting (h2, h3, p, ul, li, strong, blockquote). 
Ensure the tone is professional yet engaging. Do not include a title tag (h1), start with an h2 or introductory paragraph. Return ONLY the HTML content.

Title: ${title}
Topic: ${topic}
${newsContext}`;
    }

    const content = await generateAIContent(aiConfig, articlePrompt, '', 4000);

    // Generate SEO metadata
    const seoPrompt = `You are an SEO expert. Given the blog content, generate an SEO title, an SEO description (under 160 characters), and a comma-separated list of keywords. 
If the content is related to a specific Indian state (like UP, Bihar, Rajasthan, etc.), add "State: [StateName]" to the keywords.
Format exactly as:
SEO Title: [title]
SEO Description: [desc]
Keywords: [kw]`;
    const seoRaw = await generateAIContent(aiConfig, seoPrompt, content.substring(0, 2000), 300);
    
    let seoTitle = title;
    let seoDescription = '';
    let seoKeywords = topic;

    const titleMatch = seoRaw.match(/SEO Title:\s*(.*)/i);
    const descMatch = seoRaw.match(/SEO Description:\s*(.*)/i);
    const kwMatch = seoRaw.match(/Keywords:\s*(.*)/i);

    if (titleMatch && titleMatch[1]) seoTitle = titleMatch[1].trim();
    if (descMatch && descMatch[1]) seoDescription = descMatch[1].trim();
    if (kwMatch && kwMatch[1]) seoKeywords = kwMatch[1].trim();

    // Ensure topic is in keywords
    if (!seoKeywords.toLowerCase().includes(topic.toLowerCase())) {
      seoKeywords += `, ${topic}`;
    }

    // Excerpt
    const excerpt = seoDescription || content.substring(0, 150).replace(/<[^>]+>/g, '') + '...';

    // 3. Featured Image (Unsplash)
    let featuredImage = null;
    if (settings?.imageSource === 'unsplash') {
      const encodedTopic = encodeURIComponent(topic.split(' ')[0] || 'business');
      featuredImage = `https://source.unsplash.com/1200x630/?${encodedTopic}`;
    }

    // 4. Create Post
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existingSlug = await prisma.blogPost.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

    // Parse keywords for tags
    const tagNames = seoKeywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    const tagConnectOrCreate = tagNames.map((name: string) => {
      const tagSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return {
        tag: {
          connectOrCreate: {
            where: { slug: tagSlug },
            create: { name, slug: tagSlug }
          }
        }
      };
    });

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        featuredImage,
        status: settings?.autoPublish ? 'Published' : 'Draft',
        publishedAt: settings?.autoPublish ? new Date() : null,
        autoGenerated: true,
        seoTitle,
        seoDescription,
        seoKeywords,
        authorId: superAdmin?.id,
        tags: { create: tagConnectOrCreate }
      }
    });

    // 5. Update Keyword
    await prisma.autoBlogKeyword.update({
      where: { id: pendingKeyword.id },
      data: { status: 'used', usedAt: new Date(), postId: post.id }
    });

    // 6. Log success
    await prisma.autoBlogLog.create({
      data: {
        keyword: pendingKeyword.keyword,
        title: post.title,
        status: 'success',
        postId: post.id
      }
    });

    // Update last run
    if (settings) {
      await prisma.autoBlogSettings.update({
        where: { id: settings.id },
        data: { lastRunAt: new Date() }
      });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Auto-blog error:', error);
    
    // Attempt to log failure
    try {
      // Find pending again to log if we crashed during generation
      const pendingKeyword = await prisma.autoBlogKeyword.findFirst({
        where: { status: 'pending' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });
      
      if (pendingKeyword) {
        await prisma.autoBlogKeyword.update({
          where: { id: pendingKeyword.id },
          data: { status: 'failed' }
        });
        
        await prisma.autoBlogLog.create({
          data: {
            keyword: pendingKeyword.keyword,
            status: 'failed',
            error: error.message || 'Unknown error'
          }
        });
      }
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ error: 'Auto-blogging failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('trigger') === 'cron') {
      const authHeader = request.headers.get('authorization');
      // Require CRON_SECRET if it's set in env
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized cron' }, { status: 401 });
      }
      
      // Call the POST function directly to reuse logic
      return POST(request);
    }

    const [totalKeywords, pendingKeywords, usedKeywords, totalAutoPosts, logs] = await Promise.all([
      prisma.autoBlogKeyword.count(),
      prisma.autoBlogKeyword.count({ where: { status: 'pending' } }),
      prisma.autoBlogKeyword.count({ where: { status: 'used' } }),
      prisma.blogPost.count({ where: { autoGenerated: true } }),
      prisma.autoBlogLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    return NextResponse.json({
      stats: {
        totalKeywords,
        pendingKeywords,
        usedKeywords,
        totalAutoPosts
      },
      logs
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
