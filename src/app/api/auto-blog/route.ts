import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { verifyToken } from '@/lib/auth';
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
    // Auth check: only admin can trigger auto-blog (skip for cron calls with x-cron-secret header)
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    const authHeader = request.headers.get('authorization');
    const isCronCall = 
      request.headers.get('x-cron-secret') === expectedSecret || 
      authHeader === `Bearer ${expectedSecret}` ||
      new URL(request.url).searchParams.get('secret') === expectedSecret ||
      new URL(request.url).searchParams.get('secret') === 'knowora-cron-2026';
    if (!isCronCall) {
      const cookieHeader = request.headers.get('cookie') || '';
      const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
      const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
      if (!user) return NextResponse.json({ success: false, error: 'Unauthorized. Please login as admin.' }, { status: 401 });
    }

    // 1. GET SETTINGS
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    if (!settings || (!settings.isActive && !request.headers.get('x-force-run') && !isCronCall)) {
      return NextResponse.json({ success: false, error: 'Auto-blogging is disabled in settings' });
    }

    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    function buildAgentConfig(prefix: string, defaultProvider: string, defaultModel: string, defaultTokens: number) {
      const provider = savedKeys[`${prefix}Provider`] || defaultProvider;
      const model = (savedKeys[`${prefix}Model`] || defaultModel).trim();
      const maxTokens = parseInt(savedKeys[`${prefix}Tokens`]) || defaultTokens;
      
      const fallbackProvider = savedKeys[`${prefix}FallbackProvider`] || null;
      const fallbackModel = (savedKeys[`${prefix}FallbackModel`] || '').trim() || null;
      
      const getApiKey = (p: string) => {
        let key = savedKeys[p] || '';
        if (!key && siteSettings?.aiApiKey && !siteSettings.aiApiKey.startsWith('{')) key = siteSettings.aiApiKey;
        if (!key) {
          const allKeyNames = Object.keys(savedKeys).filter(k => 
            !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
            savedKeys[k] && savedKeys[k].length >= 10
          );
          if (allKeyNames.length > 0) key = savedKeys[allKeyNames[0]];
        }
        return key.trim();
      };
      
      return {
        primary: { provider: provider as any, apiKey: getApiKey(provider), model },
        fallback: (fallbackProvider && fallbackModel) ? { provider: fallbackProvider as any, apiKey: getApiKey(fallbackProvider), model: fallbackModel } : null,
        maxTokens
      };
    }

    async function generateContentWithFallback(config: any, sysPrompt: string, userPrompt: string) {
      try {
        return await generateAIContent(config.primary, sysPrompt, userPrompt, config.maxTokens);
      } catch (err: any) {
        if (!config.fallback) {
          throw err;
        }
        console.warn(`[Auto-Blog Fallback] Primary ${config.primary.provider} failed. Switching to fallback ${config.fallback.provider}...`, err.message);
        return await generateAIContent(config.fallback, sysPrompt, userPrompt, config.maxTokens);
      }
    }

    // 2. DELETE OLD KEYWORDS (Older than 24 hours) TO ENSURE FRESH NEWS
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      await prisma.autoBlogKeyword.deleteMany({
        where: {
          status: 'pending',
          createdAt: { lt: twentyFourHoursAgo }
        }
      });
    } catch (e) { console.error('Failed to clear old keywords', e); }

    // 3. FETCH KEYWORD
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

      let seedNews = "";
      if (savedKeys.newsdata) {
          try {
              const ndRes = await fetch(`https://newsdata.io/api/1/news?apikey=${savedKeys.newsdata}&country=in&language=en,hi`);
              const ndJson = await ndRes.json();
              if (ndJson.results) {
                 seedNews = "LIVE NEWS HEADLINES RIGHT NOW (USE THESE TO GENERATE TOPICS):\n" + ndJson.results.map((r: any) => `- ${r.title}`).join('\n');
              }
          } catch(e) { console.error(e); }
      }

      let recentlyPublishedStr = '';
      try {
        const recentPosts = await prisma.blogPost.findMany({
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: { title: true }
        });
        if (recentPosts.length > 0) {
          recentlyPublishedStr = "🚨 ALREADY PUBLISHED TOPICS: (Do NOT generate these exact same topics again. EXCEPTIONS WHERE YOU MUST GENERATE A NEW TOPIC: 1) A brand new phase like Admit Card/Result for an old notification. 2) A NEW YEAR/CYCLE (e.g. if we published 'NEET 2025' before, then 'NEET 2026' is a BRAND NEW topic and NOT a duplicate). 3) A new price cut for an old gadget.):\n" + recentPosts.map(p => `- ${p.title}`).join('\n');
        }
      } catch (e) {
        console.error('Failed to fetch recent posts', e);
      }

      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const step1Prompt = `You are a Trending News & Job Alert researcher for India. 
      TODAY'S DATE IS: ${currentDate}.
      ${seedNews}
      ${recentlyPublishedStr}
      GENERATE A MASSIVE LIST OF 120 KEYWORDS.
      This is Step 1 (Brainstorming). Generate a wide variety of Government Job Vacancies (from the LAST 72 HOURS), Exam Notifications, Admit Cards, Answer Keys, Results, Counselling/Merit Lists, Timetables/Syllabus, Free Laptop/Coaching Schemes, Internships, Rojgar Mela/Apprenticeships, Army/Defense Rallies, Entrance Exams (NEET/JEE/CUET/TET), Top MNC Off-Campus Drives, Free Online Courses (Google/TCS), Skill Development (PMKVY), Scholarships, University Admissions/Results, IGNOU/Open University Updates, KVS/Navodaya Admissions, Nursing/Medical Courses, Bank/PSU Jobs (IBPS/SBI), School/College News, Career Courses (e.g. Best courses after 12th), Board Exam Updates, Technology (Telecom/5G plans, Smartphone/Gadget launches, App updates/Outages, AI Tools, EV Scooters, Gaming updates, Cyber Scams, Tech How-To), and Finance/Earning (PM Kisan, EPF, Online Earning, Bank Rules, IPOs, Gold Rates, LIC/Post Office). 
      Include topics from ALL 28 Indian States and 8 Union Territories.
        🚨 CRITICAL RULE FOR JOBS/EXAMS: NEVER include any job, recruitment, or exam where the 'Last Date to Apply' has ALREADY PASSED before ${currentDate}. If it's expired, DO NOT mention it! 🚨
      Respond ONLY with a valid JSON array of strings. No markdown.
      Example format: ["Topic 1", "Topic 2", "Topic 3"]`;

      let rModel = settings.researcherModel || '';
      const researcherConfigForTopic = buildAgentConfig('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
      
      try {
        // STEP 1: Generate 120 Keywords
        const step1Raw = await generateContentWithFallback(researcherConfigForTopic, "You output strict JSON arrays.", step1Prompt);
        const firstBracket1 = step1Raw.indexOf('[');
        const lastBracket1 = step1Raw.lastIndexOf(']');
        const rawKeywordsList = (firstBracket1 !== -1 && lastBracket1 !== -1) ? step1Raw.substring(firstBracket1, lastBracket1 + 1) : "[]";
        
        // STEP 2: Filter down to exactly 41 strictly verified keywords
        const step2Prompt = `You are a STRICT FACT-CHECKER AND EDITOR. 
        TODAY'S DATE IS: ${currentDate}.
        ${recentlyPublishedStr}
        Here is a raw list of brainstormed topics:
        ${rawKeywordsList}
        
        Your job is to filter this list and select EXACTLY 41 highly specific, real, and currently trending topics. DO NOT select the exact same topics from the ALREADY PUBLISHED list, UNLESS it is a brand new phase (e.g., Admit Card) OR a completely new year/cycle (e.g., NEET 2026 vs NEET 2025).
        Follow the 37+2+2 rule exactly:
        - Include EXACTLY 37 Education & Career topics. 
          🚨 1st PRIORITY (HIGHEST) 🚨: ANYTHING NEW! You MUST NOT miss ANY new Government Job, Exam Notification, Admit Card, Result, Answer Key, Cut-Off, Exam Calendar, Exam Date/Timetable, Syllabus Change, Counselling/Merit List, Any Official Notice, State Scholarship, Free Laptop/Coaching Scheme (Yojana), Internships, Rojgar Mela/Apprenticeship, Army/Defense Rally, Entrance Exam/TET, Top MNC Off-Campus Drive, Free Online Courses, Skill Development (PMKVY), KVS/Navodaya Admission, IGNOU/Open University Update, Nursing Course, Bank/PSU Job, or School/University Admission/Forms/Result released in the LAST 72 HOURS. Include ALL of these brand-new updates at the very top of your list so we can be the FIRST to publish!
          👉 2nd PRIORITY (FALLBACK) 👉: If (and ONLY if) there are not enough new updates today, you MUST fill the remaining slots with: Older Ongoing applications, General State Scholarship information, or Career Courses (e.g. 'Best courses after 12th').
          ⚠️ STRICT CRITICAL RULE ⚠️: You MUST provide exactly ONE real, current news topic for EACH of the 28 States of India, ONE for EACH of the 8 Union Territories, and ONE for the Central Government (28+8+1 = 37). 
          🚨 ANTI-FAKE NEWS & EXPIRY RULE 🚨: DO NOT invent exams, schemes, or results that don't exist. Keep real ongoing/upcoming exams. NEVER select a job/recruitment where the "Last Date to Apply" has already passed before today (${currentDate}). Writing about expired applications is completely useless and strictly forbidden!
        - Include 2 Technology topics. MUST BE REAL AND RELEASED IN THE LAST 72 HOURS. 🚨 TECH 1ST PRIORITY: New Telecom Recharge/5G Plans (Jio/Airtel/BSNL), Major Smartphone/Gadget Launches, WhatsApp/Instagram Updates or Outages, AI Tools (ChatGPT/Gemini), E-challan/Aadhaar/PAN Online Tech Tips, EV Scooter Launches, BGMI/Gaming Updates, or Cyber Security/Scam Alerts.
        - Include 2 Finance & Earning topics. MUST BE REAL AND RELEASED IN THE LAST 72 HOURS. 🚨 FINANCE 1ST PRIORITY: RBI Rules, E-Shram/PM Kisan updates, Online Earning Apps/Work from home, EPF withdrawal, Zero Balance Accounts, IPOs, Gold Rates, or Post Office/LIC Schemes.
        Ensure the topics are highly specific (NOT generic like 'Education news in Bihar').
          🚨 NO COMBO/GENERIC JOBS RULE: Every job topic MUST be for ONE SPECIFIC department and ONE SPECIFIC post (e.g. 'RPSC Programmer Recruitment 2026' or 'Goa Police Constable Vacancy 2026'). NEVER combine multiple departments or multiple unrelated posts into a single topic (e.g., NEVER write 'Goa Govt Jobs: Teacher, Clerk & Police 5000 Posts').
        Respond ONLY with a valid JSON array of exactly 41 strings. No markdown.`;

        const topicRaw = await generateContentWithFallback(researcherConfigForTopic, "You output strict JSON arrays.", step2Prompt);
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
            message: '41 Top-Filtered 100% Real Topics Generated successfully! Please click "Run Now" again to write the first blog.' 
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

    const researcherConfig = buildAgentConfig('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
    
    // Feature: Auto-inject Native Gemini for Google Search Grounding if key exists
    let geminiKey = savedKeys['gemini'];
    if (!geminiKey) {
      try {
        const dbKey = await prisma.apiKey.findFirst({ where: { provider: { in: ['gemini', 'google_ai'] }, isActive: true } });
        if (dbKey) geminiKey = dbKey.apiKey;
      } catch(e){}
    }
    if (geminiKey && geminiKey.length > 10) {
      researcherConfig.fallback = { ...researcherConfig.primary }; // Keep OpenRouter as fallback
      researcherConfig.primary = { provider: 'gemini', apiKey: geminiKey, model: 'gemini-1.5-flash' };
    }

    const writerConfig = buildAgentConfig('writer', 'openrouter', wModel || 'openai/gpt-4o-mini', 6000);
    const seoConfig = buildAgentConfig('seo', 'openrouter', sModel || 'openai/gpt-4o-mini', 500);

    // Verify at least one agent has a valid API key
    if (!researcherConfig.primary.apiKey && !writerConfig.primary.apiKey && !seoConfig.primary.apiKey) {
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
    if (savedKeys.newsdata) {
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

    const researchPrompt = `You are an expert Internet Researcher and SEO Analyst. The user wants to write a blog post about: "${targetTopic}".
    ${liveNewsContext}
    
    CRITICAL RULE (STRICT): If the topic is a COMPLETELY FAKE exam that does not exist or a totally made-up rumor, you MUST ONLY output the exact word "ABORT_FAKE_NEWS" and nothing else. 
    HOWEVER, if it is a real Upcoming Exam, an Expected Syllabus, an Ongoing Application, an Expected Result, a State Scholarship, a Board Exam update, an Answer Key, a Counselling/Merit List schedule, a Free Laptop/Coaching Scheme, an Internship, a Rojgar Mela/Apprenticeship, an Army/Defense Rally, an Entrance Exam/TET update, a Top MNC Off-Campus Drive, a Free Online Course, a Skill Development (PMKVY) update, a KVS/Navodaya Admission, an IGNOU/Open University update, a Nursing Course form, a Bank/PSU Job, a Telecom/Tech update, a Finance/Bank/Earning update, or a University Admission/Result, DO NOT ABORT! Provide research for it (mentioning it is expected/upcoming if applicable) so the writer can write an informative guide.

    You MUST extract the FULL NOTIFICATION DETAILS. Provide an exhaustive breakdown of ALL of the following (if available):
    1. FULL SUMMARY: What is the notification/scholarship/result/scheme about? (Department, Post name, Total Vacancies, Scheme benefits, or University name).
    2. IMPORTANT DATES: Application Start Date, Last Date, Fee Payment Last Date, Exam/Rally Date, Counselling Date, or Result Date (if any).
    3. VACANCY/SCHOLARSHIP/COURSE DETAILS: Category-wise breakdown (UR, OBC, SC, ST, EWS), Scholarship Amount, or Scheme Eligibility if available.
    4. ELIGIBILITY & AGE LIMIT: Educational qualifications required, Minimum/Maximum Age, and Age Relaxation rules (if applicable).
    5. APPLICATION FEES: Fees for General/OBC and SC/ST/Women.
    6. SELECTION PROCESS & SYLLABUS: How will candidates be selected? (Written, Physical, Interview) and basic syllabus topics (if job).
    7. SALARY/PAY SCALE: What is the expected salary or pay band?
    8. OFFICIAL LINKS & HOW TO APPLY: First, identify the exact conducting authority/department for the exam. Provide the OFFICIAL website link of THAT specific department (e.g., rpsc.rajasthan.gov.in, ssc.gov.in) where all information is available, and provide the step-by-step application/download process. If it is an Answer Key, Result, or Admit Card, provide the official portal/login link where students can check it. (WARNING: Do NOT provide direct .pdf links from private competitor sites, only provide official government/organization portal links).

    🚨 FOR TECHNOLOGY & GADGETS: You MUST provide COMPLETE specs! (Processor, RAM/Storage, Camera MP, Battery/Charging, Display size). You MUST provide the exact Price in India and the Launch Date.
    🚨 FOR TELECOM/APPS: Provide exact old vs new recharge prices, validity, or step-by-step guide to use the new App feature.
    🚨 FOR FINANCE: Provide exact Interest Rates, new rules, financial benefits, and eligibility criteria.
    8. SEO KEYWORDS: 5-7 high-traffic Hindi+English keywords.
    
    Be extremely detailed. If a specific piece of information is not found, state "Data not available". Do not write the article, just provide structured exhaustive research data.`;
    
    let researchData = '';
    try {
      researchData = await generateContentWithFallback(researcherConfig, "You are a factual research assistant.", researchPrompt);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e: any) {
      if (e.message?.includes('429')) throw new Error("API Limit (429): AI की फ्री लिमिट खत्म हो गई है या सर्वर बिज़ी है। कृपया 1 घंटे बाद कोशिश करें या अपना API Key बदलें।");
      researchData = `Topic: ${targetTopic}. Provide a comprehensive overview. ${liveNewsContext}`;
    }

    if (researchData.includes("ABORT_FAKE_NEWS")) {
      console.warn("AI detected fake/unreleased news for topic:", targetTopic);
      if (keywordId) {
        await prisma.autoBlogKeyword.update({ where: { id: keywordId }, data: { status: 'failed' } });
      }
      return NextResponse.json({ success: false, error: 'AI detected fake/unreleased news and aborted.' });
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
       - News: "PM मोदी ने किया बड़ा ऐलान, करोड़ों लोगों की ज़िंदगी बदल जाएगी! (PM Modi Announcement)"
       ALWAYS write the main title first in Hindi (creating eagerness to read), then in brackets English.
    ===== 🚨 UNIVERSAL QUALITY RULES (इनका 100% पालन करना अनिवार्य है) =====
    1. BANNED AI WORDS (NEVER USE THESE): "In conclusion", "Moreover", "Delve into", "Navigating the complexities", "Let's explore", "Today we will discuss", "Welcome to our blog", "It is important to note", "A testament to", "Tapestry", "Crucial", "Vital", "This article will", "आज के इस आर्टिकल में हम जानेंगे", "तो चलिए शुरू करते हैं", "आप सभी का स्वागत है". If you use ANY of these words, your output will be rejected.
    2. FEW-SHOT TONE EXAMPLE: Write exactly like a top-tier human journalist (e.g. from NDTV or The Hindu). Start directly with a punchy hook. 
       BAD START: "Today we will tell you about the SSC CGL notification that was released recently..."
       GOOD START (MIMIC THIS): "The wait is finally over for millions of government job aspirants. The Staff Selection Commission (SSC) has officially released the much-anticipated CGL 2026 notification, unlocking thousands of Grade B and C vacancies across central ministries."
    3. COMPLETENESS: आर्टिकल 100% पूरा होना चाहिए। CONCLUSION लिखकर ही खत्म करें।
    4. ACCURACY & NO EVASIVE ANSWERS (STRICT): जो भी डेटा (Dates, Fees, Links, Exam Dates) दें, वो असली होना चाहिए। अगर एग्जैक्ट डेट नहीं पता है, तो अपनी नॉलेज से एक पक्का अंदाजा/अनुमान (Expected Date/Month) दें, जैसे "(Expected August 2026 या उसके बाद की कोई भविष्य की तारीख)। 🚨 चेतावनी: आज की तारीख ${currentDate} है, इसलिए कभी भी बीती हुई तारीख का अंदाज़ा न लगाएं!"। कभी भी "नोटिफिकेशन में देखें", "जल्द घोषित होगी", या "चेक वेबसाइट" जैसे गोल-मोल जवाब हरगिज़ ना लिखें! अगर कुछ नहीं पता तो वह पंक्ति/रो हटा दें।
    5. NO FILLER CONTENT: "आज के इस आर्टिकल में", "उम्मीद है", "कैसा लगा", "दोस्तों" जैसे शब्द BANNED हैं। सीधे काम की बात लिखें।
    7. STRICT YEAR CONSISTENCY: Today's date is ${currentDate}. NEVER mix past years (e.g. 2024/2025) into 2026 notifications. Keep years and dates strictly consistent with today.
    8. EXACT QUALIFICATION RULE: DO NOT generalize educational qualifications (e.g., do NOT write 'Graduate in any stream' if the job specifically requires B.Tech, Nursing, or B.Ed). Write the EXACT degree required.
    9. NO FAKE RUMOR DATES: Never write clickbait statements like 'Result releasing today at 5 PM' unless officially declared. If it is an unconfirmed rumor, label it clearly as '(Expected/संभावित Date)'.
    10. NO GUESSING VACANCY NUMBERS: If the official notification does not mention exact vacancy numbers, write 'विज्ञप्ति के अनुसार (To be Announced)'. DO NOT make up random numbers like 3000 or 5000.
    11. MULTI-POST NOTIFICATIONS (जैसे SSC CGL, RRB NTPC, IBPS, RPSC Combined): जब एक ही विभाग एक साथ कई अलग-अलग पदों (Multiple Posts) की भर्ती निकाले, तो Post-Wise HTML Table ज़रूर बनाओ। टेबल में मुख्य 5-8 पदों का नाम, प्रत्येक पद की योग्यता (Qualification), आयु सीमा (Age Limit), और पे-स्केल (Pay Scale) अलग-अलग Rows में साफ़-साफ़ दर्शाओ। खिचड़ी मत बनाओ!
    12. DEEP ACCURACY & RECRUITMENT SPECIFICS (अति-महत्वपूर्ण नियम):
    - AGE & RELAXATION: General category age limit साफ़-साफ़ लिखें (जैसे 18-30 वर्ष)। आरक्षित वर्गों की छूट को अलग से दर्शाएं: OBC (+3 वर्ष), SC/ST (+5 वर्ष)। मिलाकर एक बड़ी उम्र न लिखें।
    - GENDER PHYSICAL STANDARDS: पुलिस/सेना भर्ती में पुरुष (Male) और महिला (Female) के शारीरिक माप (Height, Chest, Running) की टेबल अलग-अलग या स्पष्ट पंक्तियों में बनाएं।
    - DOMICILE / OTHER STATES: यह स्पष्ट रूप से लिखें कि दूसरे राज्य के छात्र आवेदन कर सकते हैं या नहीं (General Quota के तहत)।
    - QUALIFICATION & FINAL YEAR: यदि पद में विशेष विषय (जैसे B.Sc in Maths या B.Ed) चाहिए तो वही लिखें। यह भी स्पष्ट करें कि Final Year वाले विद्यार्थी पात्र हैं या नहीं।
    - DATES & CORRECTION WINDOW: 'आवेदन की अंतिम तिथि', 'फीस भुगतान की अंतिम तिथि' और 'फॉर्म सुधार (Correction Window) की तारीख' को अलग-अलग बिंदु में स्पष्ट करें।
    - FEE EXEMPTION: यदि महिला, SC, ST उम्मीदवारों के लिए फीस मुफ्त (₹0) है तो स्पष्ट ₹0 (Exempted) लिखें।
    - EXAM PATTERN & NEGATIVE MARKING: ऋणात्मक अंकन (Negative Marking) का सटीक मान लिखें (जैसे 1/4 या 1/3)। यदि Tier-1 केवल Qualifying है तो स्पष्ट रूप से लिखें।
    - BANK & SECTIONAL TIMING: यदि बैंक परीक्षा है, तो Sectional Timing (जैसे 20 मिनट प्रति विषय) का उल्लेख करें।
    - PAY SCALE & LEVEL: 7th Pay Commission का Pay Level (जैसे Pay Level 4: ₹25,500 - ₹81,100) और सम्भावित इन-हैंड सैलरी दोनों दर्शाएं।
    - SPECIFIC RECRUITMENT PORTAL: सामान्य सरकारी पोर्टल की जगह exact भर्ती पोर्टल लिंक (जैसे sso.rajasthan.gov.in या ssc.gov.in) ही दें।
    6. TABLES FOR DATA: कोई भी आंकड़ा (तारीख, फीस, सैलरी, स्पेसिफिकेशन) हो तो HTML <table> बनाकर दें।
    7. BOLD IMPORTANT INFO: मुख्य शब्दों को <strong>Bold</strong> करें।
    8. MOBILE-FIRST: कोई भी पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए।
    9. HTML FORMAT ONLY: कंटेंट सीधे पब्लिश करने योग्य HTML (<h2>, <p>, <table>, <ul>) में होगा। Markdown (##, **) का उपयोग ना करें।
    10. OFFICIAL HOME PAGE LINKS ONLY: बाहरी लिंक के लिए केवल मुख्य वेबसाइट का होमपेज (जैसे https://ssc.gov.in) दें। अगर आपको पता है कि डायरेक्ट लिंक अभी वेबसाइट पर नहीं आया है, तो साफ़ शब्दों में लिखें: "⚠️ *नोट: अभी डायरेक्ट अप्लाई लिंक या पीडीएफ वेबसाइट पर एक्टिव नहीं हुआ है, कृपया ऑफिशियल वेबसाइट चेक करते रहें।*" कभी भी खुद से फेक लिंक ना बनाएँ।
    11. HINGLISH SEO: 2-3 Hinglish कीवर्ड्स ("kaise kare", "kab aayega") डालें।
    12. VIRAL LISTICLE FORMAT: जहाँ भी मुमकिन हो (खासकर Technology और Finance में), जानकारियों को "Top 5", "Top 10", या "Best X" वाले पॉइंट-वाइज़ लिस्ट (Listicle) फॉर्मेट में लिखें। यह रीडर्स को बहुत एंगेजिंग लगता है।
    13. NEVER TRUNCATE: पूरा आर्टिकल (Introduction से Conclusion तक) लिखें।
    ===== END UNIVERSAL RULES =====

    3. IF the topic is about General News, Politics, Sports, Health, or any topic NOT covered by Finance/Tech/Education prompts below, you MUST follow this 🔥 NEWS MASTER PROMPT 🔥:
        --- START NEWS MASTER PROMPT ---
        तुम एक Top-Tier Hindi News Writer और SEO Expert हो।
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure):
        
        <h2>Introduction</h2>
        150-200 शब्दों में ख़बर का पूरा सार लिखो। पहली ही लाइन में सबसे बड़ी बात बताओ (Inverted Pyramid Style)।
        
        <h2>एक नज़र में (Key Highlights)</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
          <ul> (4 बुलेट पॉइंट्स में पूरी ख़बर का सार) </ul>
        </div>
        
        <h2>Table of Contents</h2>
        Clickable jump links वाला Table of Contents बनाओ।

        <h2 id="what-happened">क्या हुआ? (What Happened)</h2>
        ख़बर की पूरी Detail — कब, कहाँ, कैसे, किसने। अगर कोई सरकारी आदेश, संख्या, या डेटा हो तो HTML Table में दो।
        
        <h2 id="impact">इसका असर क्या होगा? (Impact & Analysis)</h2>
        आम जनता, छात्रों, नौकरीपेशा, या किसानों पर क्या प्रभाव पड़ेगा? Bullet Points में बताओ।
        
        <h2 id="background">पृष्ठभूमि (Background & Context)</h2>
        इस ख़बर की पिछली कहानी क्या है? पहले क्या-क्या हो चुका है? संक्षेप में 3-4 लाइनों में बताओ।
        
        <h2 id="expert-view">विशेषज्ञों की राय (Expert Views)</h2>
        इस विषय पर विशेषज्ञ क्या कह रहे हैं? 2-3 पॉइंट्स में लिखो।
        
        <h2 id="faq">FAQ (अक्सर पूछे जाने वाले प्रश्न)</h2>
        <details><summary>[Question]</summary><p>[Answer]</p></details> फॉर्मेट में 2 ज़रूरी FAQ लिखो।
        
        <h2 id="conclusion">Conclusion</h2>
        100 शब्दों में ख़बर का निष्कर्ष।
        <p class="text-xs text-gray-500 mt-4"><em>नोट: यह जानकारी विभिन्न समाचार स्रोतों पर आधारित है। कृपया आधिकारिक सूत्रों से भी पुष्टि करें।</em></p>
        <p class="font-bold text-green-600 mt-4">💡 <strong>ध्यान दें:</strong> अगर आपको यह ख़बर उपयोगी लगी, तो इसे अपने दोस्तों के साथ <strong>WhatsApp</strong> और <strong>Telegram</strong> पर ज़रूर शेयर करें!</p>
        --- END NEWS MASTER PROMPT ---

        4. IF the topic is about Finance, Earning Apps, Money, Investing, Share Market, Affiliate Marketing, or Earning Online, you MUST strictly follow this 🔥 FINANCE ULTIMATE MASTER PROMPT 🔥 format EXACTLY AS WRITTEN:
        --- START FINANCE MASTER PROMPT ---
        तुम एक Top-Tier Finance & Earning Blogger और SEO Specialist हो। 
        🚫 कड़े नियम (Strictly Enforced BANNED WORDS & RULES):
        - CRITICAL RULE: YOU MUST NOT STOP GENERATING. YOU MUST FINISH THE ENTIRE ARTICLE UP TO THE CONCLUSION. NEVER OUTPUT AN INCOMPLETE HTML.
        - BANNED WORDS: "आज के इस डिजिटल युग में", "आइए जानते हैं", "निष्कर्ष के तौर पर", "दोस्तों", "रोमांचक". सीधे मुद्दे (Point) पर बात शुरू करें।
        - No Markdown HTML: कंटेंट सीधे पब्लिश करने योग्य HTML फॉर्मेट में होगा (<h2>, <p>, <table>, <ul>)। 
        - Mobile-First Readability: कोई भी पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए।
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
        Explain the exact steps to register, set up, and start earning using an HTML Ordered List <ol>.
        
        <h2 id="pro-tips">Secret Tips & Mistakes to Avoid</h2>
        Create a 2-column HTML Table. Left column for Secret Tips (🟢), Right column for Mistakes to Avoid (🔴). DO NOT USE PARAGRAPHS HERE.
        
        <h2 id="withdrawal">Withdrawal & Timeline</h2>
        Create an HTML Table. DO NOT USE PARAGRAPHS HERE.
        Example Rows: Withdrawal Method (UPI/Bank), Minimum Payout, Earning Timeline.
        
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
        🚫 कड़े नियम (Strictly Enforced BANNED WORDS & RULES):
        - CRITICAL RULE: YOU MUST NOT STOP GENERATING. YOU MUST FINISH THE ENTIRE ARTICLE UP TO THE CONCLUSION. NEVER OUTPUT AN INCOMPLETE HTML.
        - BANNED WORDS: "आज के इस डिजिटल युग में", "आइए जानते हैं", "निष्कर्ष के तौर पर", "दोस्तों", "रोमांचक". सीधे मुद्दे (Point) पर बात शुरू करें।
        - No Markdown HTML: कंटेंट सीधे पब्लिश करने योग्य HTML फॉर्मेट में होगा (<h2>, <p>, <table>, <ul>)। 
        - Mobile-First Readability: कोई भी पैराग्राफ 3-4 लाइनों से बड़ा नहीं होना चाहिए।
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

        <h2 id="design">Display, Camera & Processor (डिस्प्ले, कैमरा और प्रोसेसर)</h2>
        Create a clean HTML Table summarizing the Display, Camera, and Processor. DO NOT USE PARAGRAPHS HERE.
        Example Rows: Display Size, Refresh Rate, Rear Camera, Front Camera, Processor, Antutu Score.
        
        <h2 id="battery">Battery, Charging & Box Contents (बैटरी और बॉक्स)</h2>
        Create an HTML Table. DO NOT USE PARAGRAPHS HERE.
        Example Rows: Battery Capacity, Fast Charging, Box Contents.
        
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
    6. IF the topic is about Education, Jobs, Vacancies, Results, or Career, you MUST strictly follow this 🔥 ULTIMATE MASTER PROMPT 3.0 🔥 format EXACTLY AS WRITTEN:
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
        CRITICAL: The Overview Table MUST be for ONE single recruitment. DO NOT list 5 different departments or posts in one table. Example Rows: Department Name (एक विभाग), Post Name (पद), Number of Vacancies, Age Limit (आयु सीमा), Educational Qualification, Salary (वेतन).

        <h2 id="selection">Selection Process & Exam Pattern (चयन प्रक्रिया और सिलेबस)</h2>
        Create an HTML Table for this section. DO NOT WRITE PARAGRAPHS.
        Example Rows: Stage 1 (e.g. CBT Exam), Stage 2 (PET/PST), Stage 3 (Interview/DV), Syllabus Topics (मुख्य विषय), Negative Marking (Yes/No).

        <h2 id="links">Important Links (महत्वपूर्ण लिंक)</h2>
        Create an HTML Table for ALL important links. DO NOT WRITE PARAGRAPHS.
        Example Rows: Official Website Link, Apply Online Link, Download Notification Link. (Use <a href="..." target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Click Here</a> for all links to make them stand out).

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

    11. CRITICAL LINKING RULE: First, identify which department is conducting the exam. If you do not know the exact direct URL for an official link (Result, Apply, Notification), you MUST ONLY provide the Official Homepage URL of that specific conducting department (e.g. "https://rpsc.rajasthan.gov.in"). NEVER use "[LINK_NOT_AVAILABLE]" or empty href. NEVER generate fake specific URLs. NEVER generate Google Search/Dork links. Just give the official homepage.
    
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
      const writerSystemPrompt = `You are India's #1 Hindi Blog Writer and Google SEO Expert. You write highly engaging, mobile-optimized viral Hindi content.

CRITICAL INSTRUCTIONS (PENALTY FOR FAILING):
1. NO LONG PARAGRAPHS: Every <p> must be strictly 2-3 lines max. Break large text blocks into multiple short <p> tags.
2. HINGLISH KEYWORDS (MANDATORY): You MUST organically insert exact English/Hinglish search phrases inside the Hindi text (e.g., "online apply kaise kare", "result kab aayega", "direct link"). Do NOT translate them to pure Hindi.
3. BOLD ALL NUMBERS: Every single number, date, fee, or salary (e.g., <strong>₹1,000</strong>, <strong>500 Posts</strong>) MUST be wrapped in <strong> tags, EVEN inside tables.
4. COMPLETE ARTICLE: NEVER stop writing mid-article. You MUST complete from Introduction to Conclusion.
5. NO FILLERS: NEVER use words like "आज के इस डिजिटल युग में", "दोस्तों", "रोमांचक", "आइए जानते हैं".
6. HTML ONLY: ALWAYS output clean HTML (<h2>, <p>, <table>, <ul>). NEVER output Markdown.

YOUR SEO SKILLS:
- You create clickable Table of Contents with jump links (<a href="#id">).
- You provide official homepage links when exact URLs are unknown.
- Every article ends with a WhatsApp/Telegram share CTA and an engaging comment hook.`;

      articleHtml = await generateContentWithFallback(writerConfig, writerSystemPrompt, writerPrompt);
      
      // Wait 2 seconds to prevent OpenRouter Free Tier burst rate limit (429)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up markdown wrappers
      articleHtml = articleHtml.replace(/^```html\n?|```$/g, '').trim();
    } catch(error: any) {
      console.error("Writer generation failed", error);
      if (error.message?.includes('429')) throw new Error("API Limit (429): AI की फ्री लिमिट खत्म हो गई है या सर्वर बिज़ी है। कृपया 1 घंटे बाद कोशिश करें या अपना API Key बदलें।");
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
    const seoPrompt = `You are India's Top SEO Expert specializing in Google Discover and Hindi blogs.
    Analyze the following article and generate optimized metadata for maximum Google ranking.
    
    RULES:
    1. seoTitle: Generate a VERY SIMPLE, CATCHY, and EASY TO UNDERSTAND Hindi title that common people can read easily. Use words like "बंपर भर्ती", "रिजल्ट जारी", "नया नियम". Mix in the main English keyword naturally. Keep it under 65 chars. Example: "SSC CGL 2026: बंपर भर्ती का नोटिफिकेशन जारी, ऐसे करें अप्लाई!"
    2. seoDescription: Write a compelling meta description in simple Hindi that makes users CLICK. Under 155 chars. Include primary keyword.
    3. seoKeywords: List 6-8 comma-separated keywords mixing Hindi, English, and Hinglish (e.g. "SSC CGL 2026, SSC CGL notification, SSC CGL kab aayega, एसएससी सीजीएल 2026").
    4. slug: Short, keyword-rich English-only URL slug (e.g. "ssc-cgl-2026-notification"). No random numbers.
    5. expiryDate: ONLY for job/recruitment posts with a specific last date. Otherwise null.
    
    Respond ONLY with a valid JSON object, no markdown:
    {
      "seoTitle": "...",
      "seoDescription": "...",
      "seoKeywords": "...",
      "slug": "...",
      "expiryDate": "YYYY-MM-DDTHH:mm:ss.sssZ or null"
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
      const seoResultRaw = await generateContentWithFallback(seoConfig, "You are an SEO metadata generator that outputs only strict JSON.", seoPrompt);
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
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    const authHeader = request.headers.get('authorization');
    
    // Check if this is a cron trigger request (from Vercel Cron or manual trigger)
    const isCron = 
      searchParams.get('secret') === expectedSecret ||
      searchParams.get('secret') === 'knowora-cron-2026' ||
      authHeader === `Bearer ${expectedSecret}`;

      
    if (isCron || searchParams.get('force-run') === 'true') {
      return POST(request);
    }

    // Auth check for stats
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
    const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

