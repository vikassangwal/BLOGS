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

    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    function buildAgentConfig(providerKey: string, modelKey: string, fallbackProvider: string, fallbackModel: string) {
      const provider = savedKeys[providerKey] || fallbackProvider;
      let model = (savedKeys[modelKey] || fallbackModel).trim();
      
        let apiKey = '';
        if (provider === 'openrouter') apiKey = savedKeys.openrouter || '';
        else if (provider === 'openai') apiKey = savedKeys.openai || '';
        else if (provider === 'gemini') apiKey = savedKeys.gemini || '';
        else if (provider === 'anthropic') apiKey = savedKeys.anthropic || '';
        else if (provider === 'deepseek') apiKey = savedKeys.deepseek || '';

      if (!apiKey && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) apiKey = siteSettings.aiApiKey;
      return { provider: provider as any, apiKey, model };
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

      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const topicPrompt = `You are a Trending News & Job Alert researcher for India. 
      TODAY'S DATE IS: ${currentDate}.
      You must ONLY provide topics that are highly relevant, trending, or upcoming around THIS SPECIFIC DATE (${currentDate}). Do NOT provide old news from previous years.
      Provide exactly 45 highly specific, real, and currently trending topics in India.
      Include 30 Government Jobs, Exam Notifications, Admit Cards, or Exam Results (e.g., 'SSC CGL 2026 Notification', 'Bihar Police Constable Result', 'UPSC NDA 2026').
      Include 10 Technology trends (e.g., 'Samsung S24 Ultra Launch', 'Latest AI tools 2026').
      Include 5 Finance updates (e.g., 'Budget 2026 Highlights', 'Stock Market Sensex crash').
      Ensure the topics are highly specific (NOT generic like 'Education news in Bihar').
      Respond ONLY with a valid JSON array of strings. No markdown, no backticks.
      Example format: ["Topic 1", "Topic 2", "Topic 3"]`;

      let rModel = settings.researcherModel || '';

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

          // Return early to prevent Vercel 60s timeout limit. The next click will generate the actual blog.
          return NextResponse.json({ 
            status: 'empty', 
            message: '45 Hot Topics Generated successfully! Please click "Run Now" again to write the first blog.' 
          });
          
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
    let wModel = settings.writerModel || '';
    let sModel = settings.seoModel || '';

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
    7. IF the topic is about Finance, Earning Apps, Money, Investing, Share Market, Affiliate Marketing, or Earning Online, you MUST strictly follow this 🔥 FINANCE ULTIMATE MASTER PROMPT 🔥 format EXACTLY AS WRITTEN:
        --- START FINANCE MASTER PROMPT ---
        तुम एक Top-Tier Finance & Earning Blogger और SEO Specialist हो। 
        🚫 कड़े नियम (Strict Rules):
        - BANNED WORDS: "आज के इस डिजिटल युग में", "आइए जानते हैं", "निष्कर्ष के तौर पर", "दोस्तों", "रोमांचक". सीधे मुद्दे पर बात करें।
        - No Markdown HTML: कंटेंट सीधे HTML फॉर्मेट में होगा (<h2>, <p>, <table>, <ul>)।
        - Mobile-First Readability: पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए।
        - Highlighting: पैसे (Amount), समय (Time), और महत्वपूर्ण डेटा को हमेशा <strong>Bold</strong> करें।
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure) - YOU MUST USE THESE EXACT HTML HEADINGS:
        
        <h2>Introduction</h2>
        Write a 150-200 word engaging intro targeting the user's pain point (e.g. looking for extra income). Include the main keyword.
        
        <h2>एक नज़र में (Quick Overview)</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
          <ul> 
            <li><strong>संभावित कमाई (Earning Potential):</strong> [Amount e.g. ₹500/day]</li>
            <li><strong>लागत (Investment):</strong> [e.g. ₹0 / Zero Investment]</li>
            <li><strong>कौन कर सकता है? (Eligibility):</strong> [e.g. Students, Housewives]</li>
            <li><strong>पैसे कैसे मिलेंगे? (Withdrawal):</strong> [e.g. UPI, Bank Transfer]</li>
          </ul>
        </div>
        
        <h2>Table of Contents</h2>
        Create a clickable HTML Table of Contents with jump links (e.g. <a href="#what-is">).

        <h2 id="what-is">यह क्या है और कैसे काम करता है? (What is it?)</h2>
        Explain the concept easily (e.g. What is Affiliate Marketing / What is this app?).
        
        <h2 id="requirements">ज़रूरी टूल्स और ऐप्स (Tools & Requirements)</h2>
        List what is needed to start (Laptop, Internet, PAN Card, Demat Account). Add placeholder affiliate links: <a href="#" target="_blank" rel="nofollow" class="text-blue-600 font-bold underline">👉 Best Tool/App Link</a>.
        
        <h2 id="how-to-start">शुरुआत कैसे करें? (Step-by-Step Guide)</h2>
        Explain the exact 1-2-3 steps to register, set up, and start earning.
        
        <h2 id="pro-tips">ज़्यादा पैसे कैसे कमाएं? (Secret Tips)</h2>
        Give 3 pro-tips to maximize earnings or avoid losses.
        
        <h2 id="withdrawal">पैसे बैंक में कैसे ट्रांसफर करें? (Withdrawal Process)</h2>
        Explain how the money reaches the bank account/UPI.
        
        <h2 id="timeline">पहली कमाई कब तक आएगी? (Earning Timeline)</h2>
        Be brutally honest. Tell them if it takes 1 day, 1 month, or 6 months. Set realistic expectations.
        
        <h2 id="mistakes">शुरुआती लोग ये 3 गलतियां न करें (Common Mistakes)</h2>
        List 3 mistakes beginners make and how to avoid them (e.g. don't fall for scams, don't invest borrowed money).
        
        <h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
        Use <details><summary>[Question]</summary><p>[Answer]</p></details>. YOU MUST ANSWER THESE:
        1. क्या यह 100% सुरक्षित (Safe) है?
        2. क्या इसके लिए पैन कार्ड (PAN Card) या इन्वेस्टमेंट ज़रूरी है?
        3. क्या इसे मोबाइल से किया जा सकता है?
        
        <h2 id="conclusion">Conclusion & Disclaimer</h2>
        Motivate the user. THEN ADD THIS STRICT DISCLAIMER:
        <div class="bg-red-50 border-l-4 border-red-500 p-4 my-4 rounded-r text-sm">
          <strong>⚠️ Disclaimer:</strong> यह जानकारी केवल शैक्षिक उद्देश्यों (Educational Purposes) के लिए है। हम SEBI रजिस्टर्ड नहीं हैं। शेयर बाज़ार, क्रिप्टो, या किसी भी ऐप में निवेश/काम करने से पहले अपने वित्तीय सलाहकार (Financial Advisor) से सलाह ज़रूर लें। आपकी किसी भी वित्तीय हानि के लिए हम ज़िम्मेदार नहीं होंगे।
        </div>
        
        Add the VIRAL CTA: <p class="font-bold text-green-600 mt-4">💡 <strong>ध्यान दें:</strong> अगर आपका कोई दोस्त या रिश्तेदार पार्ट-टाइम इनकम ढूँढ रहा है, तो उसे यह पोस्ट <strong>WhatsApp</strong> पर ज़रूर शेयर करें!</p>
        --- END FINANCE MASTER PROMPT ---

        8. IF the topic is about Technology/Gadgets/Mobiles, you MUST strictly follow this 🔥 TECH ULTIMATE MASTER PROMPT 🔥 format EXACTLY AS WRITTEN:
        --- START TECH MASTER PROMPT ---
        तुम एक Top-Tier Tech Blogger और Gadget Reviewer हो। 
        🚫 कड़े नियम (Strict Rules):
        - BANNED WORDS: "आज के इस डिजिटल युग में", "आइए जानते हैं", "निष्कर्ष के तौर पर", "दोस्तों", "रोमांचक". सीधे मुद्दे पर बात करें।
        - No Markdown HTML: कंटेंट सीधे HTML फॉर्मेट में होगा (<h2>, <p>, <table>, <ul>)।
        - Mobile-First Readability: पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए।
        - Images: You MUST embed 1 realistic image after the introduction using this tag: <img src="https://image.pollinations.ai/prompt/Realistic%20Photo%20Of%20[GADGET_NAME_HERE]?width=800&height=400&nologo=true" alt="[GADGET_NAME_HERE] realistic view" class="w-full rounded-xl my-4" />
        - Links: Use <a href="..." target="_blank" rel="nofollow">👉 Check Price Here</a> for buying links (Amazon/Flipkart).
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure) - YOU MUST USE THESE EXACT HTML HEADINGS:
        
        <h2>Introduction</h2>
        Write a 150-200 word engaging intro. Tell the user why this phone/gadget is creating hype. Include the main keyword.
        
        <h2>एक नज़र में (Key Highlights)</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
          <ul> (Write 4 highly crisp bullet points: Processor, Battery, Camera, Price. Web Stories ready). </ul>
        </div>
        
        <h2>Table of Contents</h2>
        Create a clickable HTML Table of Contents with jump links (e.g. <a href="#design">) to IDs on the <h2> tags below.

        <h2 id="design">Display & Design (डिस्प्ले और डिज़ाइन)</h2>
        Discuss screen size, refresh rate (120Hz etc), panel type (AMOLED), and build quality.
        
        <h2 id="camera">Camera Quality (कैमरा क्वालिटी)</h2>
        Detail the primary, ultrawide, and selfie cameras.
        
        <h2 id="performance">Processor & Performance (Gaming & Antutu Score)</h2>
        Discuss the processor (Snapdragon/MediaTek), gaming performance (BGMI/FreeFire), and estimated Antutu score.
        
        <h2 id="battery">Battery & Charging (बैटरी और चार्जर)</h2>
        Discuss mAh capacity and fast charging Wattage.
        
        <h2 id="inbox">In The Box (बॉक्स में क्या-क्या मिलेगा?)</h2>
        Bullet list of box contents (Does it have a charger? Case? Type-C cable?).
        
        <h2 id="colors">Colors & Storage Variants (रंग और स्टोरेज)</h2>
        List the available aesthetic colors and RAM/ROM variants.
        
        <h2 id="specs">Key Specifications (स्पेसिफिकेशन्स)</h2>
        Create a clean, comprehensive HTML Table comparing Feature vs Details.
        
        <h2 id="pros-cons">Pros & Cons (फायदे और नुकसान)</h2>
        Create a 2-column HTML Table. Left column for Pros (🟢 फायदे), Right column for Cons (🔴 नुकसान).
        
        <h2 id="price">Price in India & Offers (कीमत और ऑफर्स)</h2>
        State the exact or expected price. Provide Affiliate Buying Links (Amazon/Flipkart) using: <a href="https://www.google.com/search?q=[GADGET_NAME_HERE]+buy+online+amazon" target="_blank" rel="nofollow" class="inline-block bg-yellow-400 text-black px-4 py-2 rounded font-bold mt-2">👉 Buy on Amazon / Flipkart</a>.
        
        <h2 id="alternatives">Rivals & Alternatives (इसके विकल्प)</h2>
        Mention 2-3 competitor phones in the same price range.
        
        <h2 id="verdict">क्या आपको यह खरीदना चाहिए? (Final Verdict)</h2>
        Give an honest review. End with <strong>Our Rating: [X]/5 ⭐</strong>.
        
        <h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
        Use <details><summary>[Question]</summary><p>[Answer]</p></details>. YOU MUST ANSWER THESE 3 QUESTIONS:
        1. क्या इसमें 3.5mm ऑडियो जैक है?
        2. क्या यह फोन 5G सपोर्ट करता है?
        3. क्या यह वाटरप्रूफ (IP Rating) है?
        
        <h2 id="conclusion">Conclusion</h2>
        Add the VIRAL CTA: <p class="font-bold text-green-600 mt-4">💡 <strong>ध्यान दें:</strong> अगर आपको यह जानकारी उपयोगी लगी, तो इसे अपने दोस्तों के साथ <strong>WhatsApp</strong> और <strong>Telegram</strong> पर ज़रूर शेयर करें!</p>
        Add COMMENT HOOK: <p class="font-bold text-blue-600 mt-2">💬 <strong>आपकी बारी:</strong> आपको इस फोन का कौन सा फीचर सबसे अच्छा लगा? नीचे कमेंट करके ज़रूर बताएं!</p>
        --- END TECH MASTER PROMPT ---
    10. IF the topic is about Education, Jobs, Vacancies, Results, or Career, you MUST strictly follow this 🔥 ULTIMATE MASTER PROMPT 3.0 🔥 format EXACTLY AS WRITTEN:
        --- START MASTER PROMPT ---
        तुम एक Top-Tier Education/Career Content Writer, Pro SEO Expert और Google Discover Specialist हो। 
        
        🚫 कड़े नियम (Strictly Enforced BANNED WORDS & RULES):
        - CRITICAL RULE: YOU MUST NOT STOP GENERATING. YOU MUST FINISH THE ENTIRE ARTICLE UP TO THE CONCLUSION. NEVER OUTPUT AN INCOMPLETE HTML.
        - BANNED WORDS: "आज के इस डिजिटल युग में", "आइए जानते हैं", "निष्कर्ष के तौर पर", "दोस्तों", "रोमांचक". सीधे मुद्दे (Point) पर बात शुरू करें।
        - No Markdown HTML: कंटेंट सीधे पब्लिश करने योग्य HTML फॉर्मेट में होगा (<h2>, <p>, <table>, <ul>)। 
        - Link Format: जहाँ भी कोई आधिकारिक बाहरी लिंक (वेबसाइट, नोटिफिकेशन आदि) देना हो, वहाँ अनिवार्य रूप से <a href="..." target="_blank" rel="nofollow">👉 Click Here</a> लिखें। 
        - Mobile-First Readability: कोई भी पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए। जानकारी को Bullet Points में तोड़ें।
        - Context-Aware Logic: केवल वही हेडिंग्स और लिंक्स दें जो वर्तमान में लागू हों। (उदा: अगर सिर्फ फॉर्म निकले हैं, तो एडमिट कार्ड या रिजल्ट की हेडिंग/लिंक बिल्कुल न दें)।
        - Smart Dates: आँख बंद करके "Coming Soon" न लिखें। यदि तिथि तय नहीं है, तो कैलेंडर या पिछले ट्रेंड के आधार पर संभावित महीने (जैसे: "जून-जुलाई 2026 (संभावित)") का अंदाज़ा लगाएँ।
        - Highlighting: पूरे लेख में सबसे अहम जानकारी (जैसे: वेतन ₹35,000, अंतिम तिथि 25 जुलाई, कुल पद 5,000) को हमेशा <strong>Bold</strong> करें।
        - Hinglish Keywords (Indian SEO): पैराग्राफ और हेडिंग्स के बीच में नेचुरली 2-3 Hinglish कीवर्ड्स (जैसे: "kaise check kare", "kab aayega", "download link") का इस्तेमाल करें।
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure) - YOU MUST USE THESE EXACT HTML HEADINGS:
        
        <h2>Introduction</h2>
        Write a 150-250 word highly engaging, conversational introduction. Speak directly to the candidate like a mentor (e.g. "अगर आप भी इस भर्ती का इंतज़ार कर रहे थे..."). Include the main keyword naturally.
        
        <h2>एक नज़र में (Key Highlights)</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
          <ul> (Write 4 highly crisp bullet points summarizing the entire post. Ready for Google Web Stories). </ul>
        </div>
        
        <h2>Table of Contents</h2>
        Create a clickable HTML Table of Contents with jump links (e.g. <a href="#quick-info">) linking to IDs on the <h2> tags below.

        <h2 id="quick-info">Quick Information (संक्षिप्त विवरण)</h2>
        Create ONE HTML Table combining department name, post name, and total posts.
        | विवरण | जानकारी | (Convert to HTML Table)
        | विभाग/संस्था | ... |
        | पद/विषय | ... |
        | कुल पद (Total Posts) | ... |

        <h2 id="dates">Important Dates (महत्वपूर्ण तिथियां)</h2>
        Create an HTML Table for dates. DO NOT WRITE PARAGRAPHS.
        Example Rows: Notification Date, Application Start, Last Date, Exam Date.

        <h2 id="fee">Application Fee (आवेदन शुल्क)</h2>
        Create an HTML Table for fees. DO NOT WRITE PARAGRAPHS.
        Example Rows: Gen/OBC Fee, SC/ST Fee, Payment Mode.

        <h2 id="details">Vacancy, Age Limit & Salary (पद, आयु सीमा और वेतन)</h2>
        Create an HTML Table for this section. DO NOT WRITE PARAGRAPHS.
        Example Rows: Post Name, Number of Vacancies, Age Limit (आयु सीमा), Educational Qualification, Salary (वेतन).

        <h2 id="selection">Selection Process & Exam Pattern (चयन प्रक्रिया और सिलेबस)</h2>
        Create an HTML Table for this section. DO NOT WRITE PARAGRAPHS.
        Example Rows: Stage 1 (e.g. CBT Exam), Stage 2 (PET/PST), Stage 3 (Interview/DV), Negative Marking (Yes/No).

        <h2 id="links">Important Links (महत्वपूर्ण लिंक)</h2>
        Create an HTML Table for ALL important links. DO NOT WRITE PARAGRAPHS.
        Example Rows: Official Website Link, Apply Online Link, Download Notification Link. (Use <a href="..." target="_blank" rel="nofollow">👉 Click Here</a> for all links).

        <h2 id="apply">How to Apply (आवेदन कैसे करें)</h2>
        Step-by-step process in 3-4 simple points.
        
        (IF TOPIC IS RESULT OR ADMIT CARD, add a section: <h2 id="cutoff">Expected Cut-off / Safe Score</h2>)
        
        <h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
        Use <details><summary>[Question]</summary><p>[Answer]</p></details> format. Provide EXACTLY 2 most important FAQs.
        
        <h2 id="conclusion">Conclusion</h2>
        Write a 100-word motivating conclusion. 
        Then ADD THIS EXACT DISCLAIMER: 
        <p class="text-xs text-gray-500 mt-4"><em>नोट: यह जानकारी इंटरनेट और आधिकारिक सूत्रों पर आधारित है, कृपया फॉर्म भरने से पहले एक बार स्वयं ऑफिशियल नोटिफिकेशन ज़रूर पढ़ें।</em></p>
        
        Then ADD THIS VIRAL CTA:
        <p class="font-bold text-green-600 mt-4">💡 <strong>ध्यान दें:</strong> अगर आपको यह जानकारी उपयोगी लगी, तो इसे अपने दोस्तों और स्टडी ग्रुप्स के साथ <strong>WhatsApp</strong> और <strong>Telegram</strong> पर ज़रूर शेयर करें!</p>
        
        Then ADD THIS COMMENT HOOK:
        <p class="font-bold text-blue-600 mt-2">💬 <strong>आपकी बारी:</strong> आपको क्या लगता है, इस बार कॉम्पिटिशन कैसा रहेगा? नीचे कमेंट करके अपनी राय ज़रूर दें!</p>
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

    let articleHtml = '';
    try {
      articleHtml = await generateAIContent(writerConfig, "You are an expert blog writer. You must finish your responses completely without truncating.", writerPrompt, 6000);
      
      // Clean up markdown wrappers
      articleHtml = articleHtml.replace(/^```html\n?|```$/g, '').trim();
    } catch(error) {
      console.error("Writer generation failed", error);
      throw error;
    }

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
