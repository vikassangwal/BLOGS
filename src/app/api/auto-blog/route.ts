import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';

async function searchOfficialWebsite(query: string) {
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query + ' official website'), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const match = html.match(/class="result__url" href="([^"]+)"/);
    if(match && match[1]) {
      return decodeURIComponent(match[1].replace('//duckduckgo.com/l/?uddg=', '').split('&')[0]);
    }
  } catch(e) {}
  return null;
}

export async function POST(request: Request) {
  try {
    // Basic auth check (can be expanded for secure cron trigger)
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Check if auto-blogging is active
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.isActive && isCron) {
      return NextResponse.json({ message: 'Auto-blog is paused' });
    }

    // Enforce Frequency if triggered by Cron
    if (isCron && settings?.lastRunAt) {
      const now = Date.now();
      const lastRun = new Date(settings.lastRunAt).getTime();
      const diffHours = (now - lastRun) / (1000 * 60 * 60);

      let shouldRun = false;
      if (settings.frequency === 'hourly' && diffHours >= 0.95) shouldRun = true;
      else if (settings.frequency === 'every2h' && diffHours >= 1.95) shouldRun = true;
      else if (settings.frequency === 'every4h' && diffHours >= 3.95) shouldRun = true;
      else if (settings.frequency === 'every12h' && diffHours >= 11.95) shouldRun = true;
      else if (settings.frequency === 'daily' && diffHours >= 23.5) shouldRun = true;
      else if (settings.frequency === 'weekly' && diffHours >= 24 * 6.5) shouldRun = true;
      
      // If there's no frequency set, default to hourly
      if (!settings.frequency) shouldRun = true;

      if (!shouldRun) {
        return NextResponse.json({ message: `Skipped: Next run scheduled based on ${settings.frequency} frequency`, status: 'skipped' });
      }
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

    // 1. Prioritize manual keywords from the queue first
    const pendingKeyword = await prisma.autoBlogKeyword.findFirst({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    });

    if (pendingKeyword) {
      topic = pendingKeyword.keyword;
      // Update Keyword to processing
      await prisma.autoBlogKeyword.update({
        where: { id: pendingKeyword.id },
        data: { status: 'used', usedAt: new Date() }
      });
      // Try to fetch some news context for this specific manual topic to make it fresh
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' India')}&hl=en-IN&gl=IN&ceid=IN:en`;
        const feed = await parser.parseURL(rssUrl);
        if (feed.items && feed.items.length > 0) {
          const item = feed.items[0];
          newsContext = `Latest News on this topic: ${item.title}\nLink: ${item.link}\nSnippet: ${item.contentSnippet || item.content || ''}`;
        }
      } catch (rssError) {}
    } else {
      // 2. Fallback to random Top News in preferred niches if queue is empty
      // User specifically requested HIGHEST FOCUS on Education & Career
      let topics = [
        'Education News India', 'Sarkari Result Updates', 'Govt Jobs India', 
        'University Exam News India', 'Board Exam Results India', 'NEET/JEE Updates', 
        'Technology News', 'Finance News' // Tech/Finance kept but lower probability (2 out of 8)
      ];
      if (liveNewsSettings.isNewsActive && liveNewsSettings.newsTopics) {
          topics = liveNewsSettings.newsTopics.split(',').map((t: string) => t.trim());
      }
      topic = topics[Math.floor(Math.random() * topics.length)];
      
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' India')}&hl=en-IN&gl=IN&ceid=IN:en`;
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
          // Pick from top 3 news to ensure it's very recent and top
          const item = feed.items[Math.floor(Math.random() * Math.min(3, feed.items.length))];
          newsContext = `News Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.contentSnippet || item.content || ''}`;
        } else {
          // If RSS fails to find items, generate a generalized trending topic
          newsContext = `Generate a deep-researched, highly detailed comprehensive guide or top news analysis about the current trends in ${topic}.`;
        }
      } catch (rssError) {
        console.error('Failed to fetch RSS:', rssError);
        newsContext = `Generate a highly detailed educational or financial guide about ${topic}.`;
      }
    }

    // 2. Generate Content
    // Generate Title
    const titlePrompt = 'You are an expert SEO copywriter. Generate 1 highly engaging, click-worthy, SEO-optimized blog post title in Hindi or English for the given topic. Return ONLY the title, no quotes, no extra text.';
    const rawTitle = await generateAIContent(aiConfig, titlePrompt, `Topic: ${topic}\n${newsContext}`, 100);
    const title = rawTitle.replace(/^["']|["']$/g, '').trim();

    // Check if we already published this
    const potentialSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existing = await prisma.blogPost.findUnique({ where: { slug: potentialSlug } });
    if (existing) {
      return NextResponse.json({ error: 'News already covered' }, { status: 409 });
    }

    // 2.5 Fetch recent posts for Internal Linking
    const recentPosts = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { title: true, slug: true }
    });
    const internalLinksContext = recentPosts.length > 0 
      ? `\nINTERNAL LINKING INSTRUCTION:\nHere are some existing articles on our website:\n${recentPosts.map(p => `- ${p.title} (URL: /blog/${p.slug})`).join('\n')}\nIf any of these articles are highly relevant to your content, please contextually hyperlink them within your paragraphs using <a href="URL">...</a>.` 
      : '';

    // 2.6 Fetch Official Website Link (Web Search)
    const officialLink = await searchOfficialWebsite(topic);
    const linkContext = officialLink ? `\nOFFICIAL LINK INSTRUCTION: The official website for this topic is: ${officialLink}. Please include this exact link in the table and content where appropriate.` : '';

    // ALWAYS use the Universal SEO Blog Prompt for EVERY topic
    const articlePrompt = `तुम एक Professional SEO Content Writer, Education & Career Expert, Technology Analyst, Google Discover Friendly और AdSense Friendly Content Creator हो।
नीचे दिए गए विषय (Topic) या Live News पर 100% यूनिक, Human-Written, SEO Optimized, Google Ranking Friendly, Deep-Researched और Publish Ready ब्लॉग तैयार करो। विषय के सभी महत्वपूर्ण पहलुओं (विशेषकर Education, Career, Technology, Finance से जुड़े) को कवर करें, कुछ भी छूटना नहीं चाहिए।

IMPORTANT TECHNICAL RULE: You MUST format your entire response in valid HTML (using <h2>, <h3>, <p>, <table>, <ul>, <li>). Do NOT wrap the response in markdown code blocks like \`\`\`html. The user instruction "HTML Code नहीं लिखना" means do not write visible code for the user to read, but you MUST use HTML tags internally for formatting so the website can render it properly.

क्या करना है:
1. SEO Title: आकर्षक, क्लिक योग्य और मुख्य Keyword वाला। (Do not use h1 tag, start with h2)
2. Introduction: 150–250 शब्दों का विस्तृत परिचय, मुख्य Keyword के साथ।
3. महत्वपूर्ण जानकारी (Table): सबसे पहले एक Professional HTML <table> बनानी है, जिसमें निम्नलिखित 2 कॉलम (विवरण और जानकारी) और पंक्तियाँ (Rows) होनी चाहिए:
Rows: विभाग/संस्था, विषय/टॉपिक, मुख्य अपडेट, आधिकारिक वेबसाइट, महत्वपूर्ण तिथियां, अन्य विवरण (यदि लागू हो तो आवेदन शुल्क, आयु सीमा आदि)।

Table Rules:
- जहां आधिकारिक लिंक या वेबसाइट उपलब्ध हो वहां केवल "<a href='URL'>👉 Click Here</a>" लिखना।
- जहां जानकारी उपलब्ध न हो वहां "Coming Soon" या "Not Specified" लिखना।
- कोई गलत, अनुमानित या अपुष्ट जानकारी नहीं लिखनी।
- यदि विषय से संबंधित कोई विशेष (extra) जानकारी हो, तो उसे भी Table में नई पंक्ति (Row) बनाकर लिखें।
4. मुख्य विवरण (Main Content): विषय की पूरी जानकारी सरल और विस्तृत भाषा में।
5. योग्यता / शर्तें / आवश्यकताएं (यदि लागू हो)
6. आयु सीमा और आवेदन शुल्क (Age Limit & Fees)
7. प्रक्रिया (Step-by-Step Guide): अगर कोई फॉर्म भरने की प्रक्रिया है तो उसे चरणबद्ध तरीके से समझाएं।
8. FAQ: 8–15 प्रश्न जिनका उत्तर पहले नहीं दिया गया हो। उत्तर बिल्कुल नहीं लिखना। सभी प्रश्न <ul><li><a href="#">👉 [Question]? (Click Here)</a></li></ul> के रूप में लिखने हैं। 
9. Conclusion: 100–150 शब्दों का निष्कर्ष।

SEO Rules:
- मुख्य Keyword Title, Intro, H2, H3, Conclusion में शामिल।
- सभी Heading (H2, H3) बहुत ही आकर्षक और सुंदर (Catchy) होनी चाहिए।
- Keyword Stuffing नहीं। छोटे Paragraph।
- ब्लॉग कम से कम 1500–2000+ शब्दों का होना चाहिए (Make it extremely detailed).
- 100% Original and Human-Written in Hindi/Hinglish.
- किसी भी जानकारी का अनुमान नहीं लगाना।${internalLinksContext}${linkContext}

Topic: ${title}
News Context: ${newsContext}
Return ONLY the HTML output.`;

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

    // 3.5 Auto YouTube Video Embed
    let finalContent = content;
    if (settings?.embedYoutube !== false) {
      try {
        const ytSearchQuery = encodeURIComponent(topic + ' Hindi');
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytSearchQuery}`;
        const ytRes = await fetch(ytSearchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const ytHtml = await ytRes.text();
        const videoIdMatch = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          const youtubeEmbed = `
<div style="margin:2rem 0;text-align:center;">
  <h3>📺 इस विषय पर वीडियो देखें</h3>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:12px;">
    <iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:12px;" allowfullscreen loading="lazy"></iframe>
  </div>
</div>`;
          // Insert YouTube video after the first 40% of content
          const insertPos = Math.floor(finalContent.length * 0.4);
          const closingTagPos = finalContent.indexOf('</p>', insertPos);
          if (closingTagPos !== -1) {
            finalContent = finalContent.substring(0, closingTagPos + 4) + youtubeEmbed + finalContent.substring(closingTagPos + 4);
          } else {
            finalContent += youtubeEmbed;
          }
          console.log(`[YouTube Embed] Added video: ${videoId} for topic: ${topic}`);
        }
      } catch (ytError) {
        console.error('[YouTube Embed] Failed:', ytError);
      }
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
        content: finalContent,
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
    if (pendingKeyword) {
      await prisma.autoBlogKeyword.update({
        where: { id: pendingKeyword.id },
        data: { status: 'used', usedAt: new Date(), postId: post.id }
      });
    }

    // 5.5 Social Media & Push Notification Auto-Poster
    if (post.status === 'Published') {
      try {
        const siteSettingsObj = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        if (siteSettingsObj?.aiApiKey?.startsWith('{')) {
          const parsedKeys = JSON.parse(siteSettingsObj.aiApiKey);
          const postUrl = `https://antigravity.com/blog/${post.slug}`;
          const message = `New Post: ${post.title}!\n\nRead more: ${postUrl}`;
          
          if (parsedKeys.twitter) {
            console.log(`[Twitter Auto-Post] Sending tweet...`);
            fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${parsedKeys.twitter}`
                },
                body: JSON.stringify({ text: message })
            }).catch(console.error);
          }
          
          if (parsedKeys.instagram && parsedKeys.instagramAccountId && post.featuredImage) {
            console.log(`[Instagram Auto-Post] Sending image...`);
            // Step 1: Create Media Container
            fetch(`https://graph.facebook.com/v19.0/${parsedKeys.instagramAccountId}/media?image_url=${encodeURIComponent(post.featuredImage)}&caption=${encodeURIComponent(message)}&access_token=${parsedKeys.instagram}`, {
                method: 'POST'
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    // Step 2: Publish Media Container
                    fetch(`https://graph.facebook.com/v19.0/${parsedKeys.instagramAccountId}/media_publish?creation_id=${data.id}&access_token=${parsedKeys.instagram}`, {
                        method: 'POST'
                    }).catch(console.error);
                }
            })
            .catch(console.error);
          }

          // Telegram Bot API Integration
          if (parsedKeys.telegramToken && parsedKeys.telegramChatId) {
              if (post.featuredImage) {
                  fetch(`https://api.telegram.org/bot${parsedKeys.telegramToken}/sendPhoto`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: parsedKeys.telegramChatId, photo: post.featuredImage, caption: message })
                  }).catch(console.error);
              } else {
                  fetch(`https://api.telegram.org/bot${parsedKeys.telegramToken}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: parsedKeys.telegramChatId, text: message })
                  }).catch(console.error);
              }
          }
          
          if (parsedKeys.onesignalAppId && parsedKeys.onesignalApiKey) {
            console.log(`[OneSignal] Sending push notification...`);
            fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${parsedKeys.onesignalApiKey}`
              },
              body: JSON.stringify({
                app_id: parsedKeys.onesignalAppId,
                included_segments: ['Subscribed Users'],
                headings: { en: post.title },
                contents: { en: post.excerpt || 'Read our latest auto-generated post!' },
                url: postUrl,
                big_picture: post.featuredImage
              })
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to trigger social media auto-post', err);
      }
    }

    // 6. Log success
    await prisma.autoBlogLog.create({
      data: {
        keyword: pendingKeyword ? pendingKeyword.keyword : topic,
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
      const failedKeyword = await prisma.autoBlogKeyword.findFirst({
        where: { status: 'pending' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });
      
      if (failedKeyword) {
        await prisma.autoBlogKeyword.update({
          where: { id: failedKeyword.id },
          data: { status: 'failed' }
        });
        
        await prisma.autoBlogLog.create({
          data: {
            keyword: failedKeyword.keyword,
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
