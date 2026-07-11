
function getCurrentDateStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function getCurrentYearNum() {
  return new Date().getFullYear();
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent, AIConfig, parseAIJsonArray } from '@/lib/ai';
import { getResearchPrompt } from '@/lib/services/autoBlogPrompts';
import { verifyToken } from '@/lib/auth';
import { waitUntil } from '@vercel/functions';
import { validateAndFixLinks, cleanTableOfContents } from '@/lib/link-validator';
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
    const searchParams = new URL(request.url).searchParams;
    const customKeyword = searchParams.get('keyword') || '';
    const customSourceUrl = searchParams.get('sourceUrl') || '';
    // Auth check: only admin can trigger auto-blog (skip for cron calls with x-cron-secret header)
    const expectedSecret = process.env.CRON_SECRET || '';
    const authHeader = request.headers.get('authorization');
    const isCronCall = expectedSecret && (
      request.headers.get('x-cron-secret') === expectedSecret || 
      authHeader === `Bearer ${expectedSecret}` ||
      new URL(request.url).searchParams.get('secret') === expectedSecret
    );
    if (!isCronCall) {
      const cookieHeader = request.headers.get('cookie') || '';
      const tokenMatch = cookieHeader.match(/automata_auth_token=([^;]+)/);
      const user = tokenMatch ? verifyToken(tokenMatch[1]) : null;
      if (!user) return NextResponse.json({ success: false, error: 'Unauthorized. Please login as admin.' }, { status: 401 });
    }

      // Removed Vercel loopback fetch. 
      // Vercel loop protection blocks self-fetches from the same deployment on the Hobby tier.
      // Since maxDuration is 60s, we will let this execute synchronously so the UI can wait and receive the exact success/error response.
      console.log("[Auto-Blog] Starting execution directly...");

    // 1. GET SETTINGS
    const [settings, siteSettings] = await Promise.all([
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } }),
      prisma.siteSettings.findUnique({ where: { id: 'default' } })
    ]);

    if (!settings || (!settings.isActive && !request.headers.get('x-force-run') && !isCronCall)) {
      return NextResponse.json({ success: false, error: 'Auto-blogging is disabled in settings' });
    }

    // Cooldown protection (120 seconds) to prevent simultaneous triggers and IP blocks
    if (settings.lastRunAt && !request.headers.get('x-force-run')) {
      const elapsedSeconds = (Date.now() - new Date(settings.lastRunAt).getTime()) / 1000;
      if (elapsedSeconds < 120) {
        console.log(`[Auto-Blog] Cooldown active. Skipping execution (${elapsedSeconds}s elapsed).`);
        return NextResponse.json({ success: false, error: `Cooldown active. Please wait ${Math.ceil(120 - elapsedSeconds)} seconds.` });
      }
    }

    // Update lastRunAt timestamp in background (no await) to save 2-3 seconds of sequential DB latency
    prisma.autoBlogSettings.update({
      where: { id: 'default' },
      data: { lastRunAt: new Date() }
    }).catch(e => console.error('Failed to update lastRunAt settings:', e));
    let savedKeys: Record<string, string> = {};
    try {
      if (siteSettings?.aiApiKey?.startsWith('{')) {
        savedKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    
    function getApiKeyForProvider(p: string): string {
      let key = (savedKeys[p] || '').trim();
      if (!key) {
        // Fallback to any valid key in savedKeys >= 10 chars
        const fallback = Object.keys(savedKeys).find(k => 
          !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
          savedKeys[k] && typeof savedKeys[k] === 'string' && savedKeys[k].length >= 10
        );
        if (fallback) key = String(savedKeys[fallback]).trim();
      }
      return key;
    }

    function buildAgentConfigs(prefix: string, defaultProvider: string, defaultModel: string, defaultTokens: number): { configs: AIConfig[]; maxTokens: number } {
      const primaryProvider = savedKeys[`${prefix}Provider`] || siteSettings?.aiProvider || defaultProvider;
      const primaryModel = (savedKeys[`${prefix}Model`] || siteSettings?.aiModel || defaultModel).trim();
      const maxTokens = parseInt(savedKeys[`${prefix}Tokens`]) || defaultTokens;

      const configs: AIConfig[] = [];
      const key1 = getApiKeyForProvider(primaryProvider);
      if (key1) {
        configs.push({ provider: primaryProvider, apiKey: key1, model: primaryModel });
      }

      // Add ALL available backup keys in priority order: gemini, gemini2, gemini3, openrouter, groq, openai, deepseek
      const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
      for (const prov of fallbackProviders) {
        const k = (savedKeys[prov] || '').trim();
        if (k && k.length >= 10 && prov !== primaryProvider) {
          const m = prov.startsWith('gemini') ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : prov === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';
          configs.push({ provider: prov, apiKey: k, model: m });
        }
      }

      // If still empty, try single fallback key
      if (configs.length === 0) {
        const anyKey = getApiKeyForProvider('gemini');
        if (anyKey) {
          configs.push({ provider: 'gemini', apiKey: anyKey, model: 'gemini-2.0-flash' });
        }
      }

      return { configs, maxTokens };
    }

    async function generateContentWithFallback(configObj: { configs: AIConfig[]; maxTokens: number }, sysPrompt: string, userPrompt: string, enableSearch = false) {
      if (!configObj.configs || configObj.configs.length === 0) {
        throw new Error("No AI API Keys found in Admin Settings. Please enter your Gemini API Key in Admin Panel > Settings.");
      }
      return await generateAIContent(configObj.configs, sysPrompt, userPrompt, configObj.maxTokens, enableSearch);
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
    let targetTopic = '';
    let keywordId = null;
    let selectedCategory = 'News';
    let pendingKeyword = null;

    if (customKeyword) {
      targetTopic = customKeyword;
      const tLower = customKeyword.toLowerCase();
      if (tLower.includes('job') || tLower.includes('result') || tLower.includes('exam') || tLower.includes('admit') || tLower.includes('notification') || tLower.includes('vacancy') || tLower.includes('recruitment') || tLower.includes('syllabus')) {
        selectedCategory = 'Education & Career';
      } else if (tLower.includes('tech') || tLower.includes('launch') || tLower.includes('ai') || tLower.includes('phone') || tLower.includes('app')) {
        selectedCategory = 'Technology';
      } else if (tLower.includes('finance') || tLower.includes('stock') || tLower.includes('budget') || tLower.includes('market') || tLower.includes('bank') || tLower.includes('earn')) {
        selectedCategory = 'Finance & Earning';
      }
    } else {
      pendingKeyword = await prisma.autoBlogKeyword.findFirst({
        where: { status: 'pending' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });

      if (pendingKeyword) {
        targetTopic = pendingKeyword.keyword;
        keywordId = pendingKeyword.id;
        selectedCategory = pendingKeyword.niche || 'News';
      }
    }

    if (!targetTopic) {
      // ALWAYS generate topics when queue is empty, regardless of isNewsActive setting
      // Since manual run button was pressed, or the cron is active, we should restock the queue.


      // -------------------------------------------------------------
      // AI TOPIC GENERATOR (Triggered when queue is empty)
      // -------------------------------------------------------------

      let seedNews = "";
      let recentlyPublishedStr = '';
      
      const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
      
      try {
        const [newsResList, recentPosts] = await Promise.all([
          // News API parallel fetch
          (async () => {
            if (!savedKeys.newsdata) return null;
            try {
              return await Promise.all([
                fetchWithTimeout(`https://newsdata.io/api/1/news?apikey=${savedKeys.newsdata}&country=in&language=en,hi`, {}, 2500).catch(() => null),
                fetchWithTimeout(`https://newsdata.io/api/1/news?apikey=${savedKeys.newsdata}&country=in&language=en,hi&category=education`, {}, 2500).catch(() => null)
              ]);
            } catch (e) {
              console.error("News API calls failed:", e);
              return null;
            }
          })(),
          // Recent posts DB query (Limit to last 30 posts to avoid full-table scans and save 6-8s)
          prisma.blogPost.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
            select: { title: true }
          }).catch(() => [])
        ]);

        // Process news results
        if (newsResList) {
          const [ndRes, eduRes] = newsResList;
          if (ndRes && ndRes.ok) {
            const ndJson = await ndRes.json();
            if (ndJson.results) {
               seedNews = "LIVE NEWS HEADLINES RIGHT NOW (USE THESE TO GENERATE TOPICS):\n" + ndJson.results.map((r: any) => `- ${r.title}`).join('\n');
            }
          }
          if (eduRes && eduRes.ok) {
            const eduJson = await eduRes.json();
            if (eduJson.results && eduJson.results.length > 0) {
              seedNews += "\n\n📚 LIVE EDUCATION & UNIVERSITY NEWS (HIGH PRIORITY - USE THESE):\n" + eduJson.results.slice(0, 10).map((r: any) => `- ${r.title}`).join('\n');
            }
          }
        }

        // Process recent posts
        if (recentPosts && recentPosts.length > 0) {
          recentlyPublishedStr = `🚨 ALREADY PUBLISHED TOPICS IN THE LAST 28 DAYS: (Do NOT generate these exact same topics again. EXCEPTIONS WHERE YOU MUST GENERATE A NEW TOPIC: 1) A brand new phase like Admit Card/Result for an old notification. 2) A NEW YEAR/CYCLE (e.g. if we published 'NEET ${getCurrentYearNum() - 1}' before, then 'NEET ${getCurrentYearNum()}' is a BRAND NEW topic and NOT a duplicate). 3) A new price cut for an old gadget.):\n` + recentPosts.map(p => `- ${p.title}`).join('\n');
        }
      } catch (e) {
        console.error("Parallel news data / posts fetch failed:", e);
      }

      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const prompt = `You are a Trending News & Job Alert researcher for India. 
      TODAY'S DATE IS: ${getCurrentDateStr()}.
      ${seedNews}
      ${recentlyPublishedStr}
      
      Generate a list of EXACTLY 20 highly specific, real, and currently trending topics/keywords in India. 
      Follow this strict distribution rule (18 + 1 + 1):
      - 18 Education & Career topics:
        🚨 1st PRIORITY (HIGHEST) 🚨: Focus on new announcements from the LAST 72 HOURS! Include real Government Job Vacancies, Exam Notifications, Admit Cards, Results, Expected Cut-off Marks (संभावित कट-ऑफ / Safe Score for recently conducted exams), Answer Key releases, Exam Calendar, Exam Date/Timetable, Syllabus Change, Counselling/Merit List, State Scholarship Schemes, Internships, Rojgar Mela/Apprenticeships, Army/Defense Rallies, Entrance Exams (NEET/JEE/CUET/TET), Bank/PSU Jobs (IBPS/SBI), or University/School Board updates.
        🚨 STRICT RULE: Every topic must have active open applications and solid deadlines. Never guess dates or write an article based on guesses! If a deadline is not announced, write "Coming Soon" (जल्द आ रहा है) instead of guessing.
        🚨 CRITICAL RULE: NEVER include any job/recruitment where the 'Last Date to Apply' has already passed before ${getCurrentDateStr()}.
        👉 2nd PRIORITY (FALLBACK) 👉: If there are not enough new government job updates, fill the slots with contractual recruitments, private sector jobs (TCS off-campus, bank openings), ongoing applications with active deadlines, or career guides (e.g. "Best courses after 12th").
        🚨 NO COMBO/GENERIC JOBS RULE: Every job topic MUST be for ONE SPECIFIC department and ONE SPECIFIC post (e.g. 'RPSC Programmer Recruitment ${getCurrentYearNum()}'). NEVER combine multiple departments or unrelated posts into a single topic.
      - 1 Technology topics: Telecom plans/5G updates, Smartphone/Gadget launches, WhatsApp/Instagram updates, AI Tools, EV Scooter launches, BGMI/Gaming, or Cyber Scam Alerts.
      - 1 Finance & Earning topics: RBI Rules, E-Shram/PM Kisan updates, Online Earning Apps/Work from home, EPF withdrawal, Zero Balance Accounts, IPOs, Gold Rates, or Post Office/LIC Schemes.
      
      🚨 TOP TRUSTED INDIA SOURCES RULE 🚨: 
      Verify topics from India's Premier Official Portals: ssc.gov.in, upsc.gov.in, ibps.in, nta.ac.in, cbse.gov.in, ignou.ac.in, scholarships.gov.in, employmentnews.gov.in. DO NOT pick unverified rumors.
      
      Respond ONLY with a valid JSON array of exactly 20 objects, where each object has "keyword" (string) and "niche" (string). The "niche" must be exactly one of: "Education & Career", "Technology", or "Finance & Earning".
      No markdown.
      Example format:
      [
        { "keyword": "RPSC Programmer Recruitment 2026", "niche": "Education & Career" },
        { "keyword": "Xiaomi Redmi Note 15 Pro India Launch Date", "niche": "Technology" },
        { "keyword": "EPF Withdrawal Rules Changes 2026", "niche": "Finance & Earning" }
      ]
      
      CRITICAL INSTRUCTION: If you do not have live internet access, you MUST STILL generate the JSON array using your existing knowledge of what typically happens in this month. Do NOT refuse to answer. Do NOT apologize. ONLY output the JSON array.`;

      let rModel = settings.researcherModel || '';
      const researcherConfigForTopic = buildAgentConfigs('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
      try {
        const topicRaw = await generateContentWithFallback(researcherConfigForTopic, "You output strict JSON arrays of 20 objects.", prompt);
        const generatedTopics = parseTopicsFromAI(topicRaw);
        
        if (Array.isArray(generatedTopics) && generatedTopics.length > 0) {
          const shuffledTopics = generatedTopics.sort(() => Math.random() - 0.5);
          
          const queueData = shuffledTopics.map((item: any) => {
             if (!item) return null;
             const topic = item.keyword;
             const niche = item.niche;

             // 🚨 STRICT FILTER: Skip Education & Career topics that are Results, Syllabus, or Earning-related
             // These are excluded from auto-blogging per user requirement
             const tLower = topic.toLowerCase();
             const isExcludedEduTopic = niche === 'Education & Career' && (
               tLower.includes('result') || tLower.includes('परिणाम') ||
               tLower.includes('syllabus') || tLower.includes('सिलेबस') ||
               tLower.includes('earning') || tLower.includes('course') || tLower.includes('कोर्स') || tLower.includes('कमाई')
             );
             if (isExcludedEduTopic) {
               console.log(`[Topic Filter] Skipping excluded topic: "${topic}"`);
               return null; // Will be filtered out below
             }

             return {
                keyword: topic,
                niche: niche,
                status: 'pending',
                priority: 5
             };
          }).filter((item): item is { keyword: string; niche: string; status: string; priority: number } => item !== null);

          // Deduplicate: filter out keywords that already exist as pending
           const existingKeywords = await prisma.autoBlogKeyword.findMany({
             where: { status: 'pending' },
             select: { keyword: true }
           });
           const existingSet = new Set(existingKeywords.map(k => k.keyword.toLowerCase()));
          const uniqueQueueData = queueData.filter((q): q is { keyword: any; niche: string; status: string; priority: number } => q !== null && q !== undefined && !existingSet.has(q.keyword.toLowerCase()));

           if (uniqueQueueData.length > 0) {
             await prisma.autoBlogKeyword.createMany({ data: uniqueQueueData });
           }

          // Return early to prevent Vercel 60s timeout limit. The next click will generate the actual blog.
          return NextResponse.json({ 
            status: 'empty', 
            message: `${uniqueQueueData.length} Fresh Topics Generated successfully! Please click "Run Now" again to write the first blog.` 
          });
          
        } else {
           return NextResponse.json({ status: 'empty', message: 'AI failed to generate topics array.' });
        }
      } catch (e: any) {
        console.error('AI Topic Generator failed:', e);
        return NextResponse.json({ status: 'empty', message: 'AI Error: ' + (e.message || 'Unknown error') });
      }
    }

    let rModel = settings.researcherModel || '';
    let wModel = settings.writerModel || '';
    let sModel = settings.seoModel || '';

    const researcherConfig = buildAgentConfigs('researcher', 'openrouter', rModel || 'google/gemini-2.5-flash', 1500);
    
    // Feature: Auto-inject Native Gemini for Google Search Grounding if key exists
    let geminiKey = savedKeys['gemini'];
    if (!geminiKey) {
      try {
        const dbKey = await prisma.apiKey.findFirst({ where: { provider: { in: ['gemini', 'google_ai'] }, isActive: true } });
        if (dbKey) geminiKey = dbKey.apiKey;
      } catch(e){}
    }
    if (geminiKey && geminiKey.length > 10) {
      researcherConfig.configs.unshift({ provider: 'gemini', apiKey: geminiKey, model: 'gemini-1.5-flash' });
    }

    const writerConfig = buildAgentConfigs('writer', 'openrouter', wModel || 'openai/gpt-4o-mini', 8000);
    const seoConfig = buildAgentConfigs('seo', 'openrouter', sModel || 'openai/gpt-4o-mini', 500);

    // Verify at least one agent has a valid API key
    const hasResearcherKey = researcherConfig.configs.length > 0 && researcherConfig.configs[0].apiKey;
    const hasWriterKey = writerConfig.configs.length > 0 && writerConfig.configs[0].apiKey;
    const hasSeoKey = seoConfig.configs.length > 0 && seoConfig.configs[0].apiKey;
    if (!hasResearcherKey && !hasWriterKey && !hasSeoKey) {
      return NextResponse.json({ success: false, error: 'AI is not configured. Please add at least one API key in Settings > AI Configuration.' });
    }

    // Set Language Rules
    const langInstructions = "Write completely in Hindi (Devanagari script), but keep technical words in English.";

    // Fetch recent posts ONCE for both internal linking and writer prompt (previously fetched twice)
    let recentPostsList: { title: string; slug: string }[] = [];
    try {
      recentPostsList = await prisma.blogPost.findMany({
        where: { status: 'Published' },
        orderBy: { publishedAt: 'desc' },
        take: 15,
        select: { title: true, slug: true }
      });
    } catch (e) {
      console.error('Failed to fetch recent posts for internal linking', e);
    }

    // -------------------------------------------------------------
    // AGENT 1: THE RESEARCHER & NEWS API
    // -------------------------------------------------------------
    let liveNewsContext = '';
    if (savedKeys.newsdata) {
      try {
        // Use first 3 meaningful words for better search relevance (was using only first word)
        const searchWords = targetTopic.split(' ').filter(w => w.length > 2).slice(0, 3).join(' ') || 'india';
        const newsRes = await fetchWithTimeout(`https://newsdata.io/api/1/news?apikey=${savedKeys.newsdata}&q=${encodeURIComponent(searchWords)}&language=en,hi`, {}, 3000);
        const newsJson = await newsRes.json();
        if (newsJson.results && newsJson.results.length > 0) {
          liveNewsContext = "LIVE NEWS DATA (Use this for factual accuracy):\n" + 
            newsJson.results.slice(0, 3).map((n: any) => `- ${n.title}: ${n.description}`).join('\n');
        }
      } catch (e) {
        console.error("News API failed", e);
      }
    }

    const researchPrompt = getResearchPrompt(targetTopic, liveNewsContext, customSourceUrl, getCurrentDateStr(), getCurrentYearNum());
    
    let researchData = '';
    try {
      researchData = await generateContentWithFallback(researcherConfig, "You are a factual research assistant.", researchPrompt);
    } catch (e: any) {
      if (e.message?.includes('429')) throw new Error("API Limit (429): AI की फ्री लिमिट खत्म हो गई है या सर्वर बिज़ी है। कृपया 1 घंटे बाद कोशिश करें या अपना API Key बदलें।");
      researchData = `Topic: ${targetTopic}. Provide a comprehensive overview. ${liveNewsContext}`;
    }

    if (customSourceUrl) {
      researchData += `\n\n🚨 MANDATORY OFFICIAL APPLY / NOTIFICATION URL: You MUST use the following URL for the application/notification link: ${customSourceUrl}. Do NOT use any other link or guess the official link.`;
    }

    if (researchData.includes("ABORT_FAKE_NEWS")) {
      console.warn("AI detected fake/unreleased news for topic:", targetTopic);
      if (keywordId) {
        await prisma.autoBlogKeyword.update({ where: { id: keywordId }, data: { status: 'failed' } });
      }
      return NextResponse.json({ success: false, error: 'AI detected fake/unreleased news and aborted.' });
    }

    // 🚨 NEW: Block blog writing if no official notification found for Education & Career topics
    if (researchData.includes("ABORT_NO_NOTIFICATION")) {
      console.warn(`[Auto-Blog] ABORT: No official notification found for Education topic: "${targetTopic}". Skipping blog creation.`);
      if (keywordId) {
        await prisma.autoBlogKeyword.update({ where: { id: keywordId }, data: { status: 'failed' } });
      }
      return NextResponse.json({ 
        success: false, 
        error: `Blog not written: Official notification not yet released for "${targetTopic}". Blog will be created once official notification is available.` 
      });
    }

    // 🚨 NEW: Block excluded topics (Results, Syllabus, Earning & Courses)
    if (researchData.includes("ABORT_EXCLUDED_TOPIC")) {
      console.warn(`[Auto-Blog] ABORT: Topic "${targetTopic}" is in excluded category (Results/Syllabus/Earning). Skipping.`);
      if (keywordId) {
        await prisma.autoBlogKeyword.update({ where: { id: keywordId }, data: { status: 'failed' } });
      }
      return NextResponse.json({ 
        success: false, 
        error: `Topic "${targetTopic}" is excluded (Results/Syllabus/Earning are not auto-blogged in Education & Career).` 
      });
    }

    // -------------------------------------------------------------
    // AUTO INTERNAL LINKING - Reuse pre-fetched recent posts (no duplicate DB query)
    // -------------------------------------------------------------
    let internalLinkingStr = '';
    if (recentPostsList.length > 0) {
      const links = recentPostsList.map(p => `- <a href="https://www.knowora.in/blog/${p.slug}">${p.title}</a>`).join('\n');
      internalLinkingStr = `
      INTERNAL LINKING GUIDELINES:
      You have access to the following existing articles on our website:
${links}
      If any of these articles are highly relevant to the context of the content you are writing, MUST organically insert 1-2 hyperlinks to them within your HTML text. Use the exact provided HTML anchor tags.`;
    }

    // -------------------------------------------------------------
    // AGENT 2: THE WRITER
    // -------------------------------------------------------------
    const writerPrompt = `You are a Senior Content Writer and SEO Expert.
    Write a highly engaging, beautifully formatted, 1000+ word blog article based on the following research:
    
    RESEARCH DATA:
    ${researchData}
    ${internalLinkingStr}
    
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
    2. FEW-SHOT TONE EXAMPLE: Write exactly like a top-tier human journalist (e.g. from NDTV or The Hindu). Start directly with a hook.
       BAD START: "Today we will tell you about the SSC CGL notification that was released recently..."
       GOOD START (MIMIC THIS): "The wait is finally over for millions of government job aspirants. The Staff Selection Commission (SSC) has officially released the much-anticipated CGL 2026 notification, unlocking thousands of Grade B and C vacancies across central ministries."
    3. COMPLETENESS: आर्टिकल 100% पूरा होना चाहिए। CONCLUSION लिखकर ही खत्म करें।
    4. NO ESTIMATES/RUMORS WITHOUT OFFICIAL NOTIFICATION (बिना आधिकारिक सूचना के अंदाज़ा लगाना प्रतिबंधित है): बिना किसी आधिकारिक सूचना, प्रेस विज्ञप्ति या विज्ञापन के सामान्य नौकरियों पर अंदाज़े से कोई पोस्ट या मनगढ़ंत डेटा (जैसे काल्पनिक आवेदन तिथि) नहीं लिखेंगे। केवल प्रमाणित तथ्यों का उपयोग करेंगे। अपवाद (Exceptions): OMR Sheets, Answer Keys, संभावित कट-ऑफ (Expected Cut-off), प्रवेश पत्र (Admit Cards), और सरकारी रिजल्ट्स (Results) के लिए आप अंदाज़े वाली या संभावित तारीख (जैसे 'Expected Result Date') लिख सकते हैं, लेकिन यह 100% सुनिश्चित करेंगे कि परीक्षा पहले ही आयोजित की जा चुकी हो। यदि परीक्षा आयोजित नहीं हुई है, तो OMR/Result/Cut-off की कोई भी अंदाज़े वाली पोस्ट लिखना पूर्णतः प्रतिबंधित है। आज की तारीख ${getCurrentDateStr()} है।
    5. NO FILLER CONTENT: "आज के इस आर्टिकल में", "उम्मीद है", "कैसा लगा", "दोस्तों" जैसे शब्द BANNED हैं। सीधे काम की बात लिखें।
    7. STRICT YEAR CONSISTENCY: Today's date is Monday, July 6, 2026. NEVER mix past years into current year (${getCurrentYearNum()}) notifications. Keep years and dates strictly consistent with today.
    8. EXACT QUALIFICATION RULE: DO NOT generalize educational qualifications (e.g., do NOT write 'Graduate in any stream' if the job specifically requires B.Tech, Nursing, or B.Ed). Write the EXACT degree required.
    9. NO FAKE RUMOR DATES: Never write clickbait statements like 'Result releasing today at 5 PM' unless officially declared. If it is an unconfirmed rumor, label it clearly as '(Expected/संभावित Date)'.
    10. NO GUESSING VACANCY NUMBERS: If the official notification does not mention exact vacancy numbers, write 'विज्ञप्ति के अनुसार (To be Announced)'. DO NOT make up random numbers like 3000 or 5000.
    11. MULTI-POST NOTIFICATIONS (जैसे SSC CGL, RRB NTPC, IBPS, RPSC Combined): जब एक ही विभाग एक साथ एक ही नोटिफिकेशन में कई अलग-अलग पदों (Multiple Posts) की भर्ती निकाले, तो जो जानकारी सामान्य (Common) हो (जैसे: आवेदन शुरू होने की तिथि, अंतिम तिथि, और आवेदन शुल्क), उसे एक बार सामान्य रूप से दर्शाएं। इसके अलावा, प्रत्येक पद की विशिष्ट जानकारी (जैसे: शैक्षणिक योग्यता (Qualification), आयु सीमा (Age Limit), पे-स्केल/सैलरी (Salary), और परीक्षा सिलेबस) को पूरी तरह से अलग-अलग (Post-Wise) दर्शाएं। इसके लिए अलग-अलग HTML Rows या अलग-अलग उपशीर्षकों (Sub-headings) का स्पष्ट प्रयोग करें ताकि उम्मीदवार को हर पद की सटीक जानकारी बिल्कुल स्पष्ट और अलग मिले, खिचड़ी बिल्कुल न बने!
    12. DEEP ACCURACY & RECRUITMENT SPECIFICS (अति-महत्वपूर्ण नियम):
    13. ULTRA-ADVANCED RECRUITMENT RULES (अति-सूक्ष्म कानूनी एवं तकनीकी नियम):
    14. EXAM STATUS & PAST EXAM CHECK (परीक्षा स्थिति का कड़ा नियम):
    15. MASTER RECRUITMENT & UX CHECKLIST (30 अति-सूक्ष्म नियम):
    16. SEO, E-E-A-T & HELPFUL CONTENT MASTER RULES (गूगल रैंकिंग सुरक्षा नियम):
    17. ULTIMATE 500 BLOGGING ROADMAP & EXCELLENCE RULES (500 मास्टर नियम):
    18. STRICT LINKING RULES (लिंक्स से जुड़े कड़े नियम):
    - OFFICIAL HOMEPAGE ONLY: कभी भी गूगल सर्च लिंक (e.g. google.com/search?q=site:...) न बनाएं। कभी भी मनगढ़ंत डायरेक्ट .pdf लिंक न बनाएं। हमेशा संबंधित विभाग का असली मुख्य आधिकारिक पोर्टल लिंक (उदा. https://ssc.gov.in या https://rpsc.rajasthan.gov.in) ही दें।
    - NO COMPETITOR LINKS: किसी भी प्राइवेट प्रतिस्पर्धी ब्लॉग (उदा. SarkariResult, Testbook, FreeJobAlert) का लिंक कभी न दें। केवल सरकारी/आधिकारिक पोर्टल लिंक ही दें।
    - NO EMPTY/BROKEN LINKS: कभी भी "#", "", "[LINK_NOT_AVAILABLE]" या खाली href का प्रयोग न करें।
    - DESCRIPTIVE ANCHOR TEXT: "यहाँ क्लिक करें" की जगह "SSC आधिकारिक वेबसाइट (ssc.gov.in)" जैसा स्पष्ट एंकर टेक्स्ट लिखें।
    - EXTERNAL LINK ATTRIBUTES: सभी बाहरी लिंक्स में अनिवार्य रूप से target="_blank" rel="noopener noreferrer" लगाएं।
    - OFFICIAL PDF & GAZETTE PARSING: जानकारी केवल आधिकारिक विज्ञापनों (.gov.in / .nic.in) से लें।
    - SELECTION FLOWCHART & PET TABLE: चयन प्रक्रिया (Selection Stages) और शारीरिक दक्षता (PET/PST) की साफ़ अलग तालिका बनाएं।
    - PAY LEVEL & IN-HAND CALCULATOR: 7th CPC का Exact Pay Level (Level 1 से 14) और सम्भावित इन-हैंड सैलरी दोनों दर्शाएं।
    - 5-YEAR CUT-OFF TREND: सम्भव हो तो पिछले वर्षों की श्रेणी-वार कट-ऑफ (UR, OBC, SC, ST, EWS) तालिका ज़रूर शामिल करें।
    - AGE CALCULATION CUT-OFF DATE: आयु सीमा की गणना किस कट-ऑफ तारीख से होगी, इसका स्पष्ट उल्लेख करें।
    - OTR / SSO REGISTRATION (केवल जहाँ लागू हो): OTR सभी भर्तियों में नहीं होता। केवल इन विभागों में लागू होता है — RPSC → sso.rajasthan.gov.in, RSSB/RSMSSB → sso.rajasthan.gov.in, SSC → ssc.gov.in OTR, UPSSSC → upsssc.gov.in। Railways (RRB/RRC), Banks (IBPS/SBI), Army/Navy/NTA परीक्षाओं, और अन्य PSU भर्तियों में OTR की आवश्यकता नहीं होती — वहाँ OTR का उल्लेख बिल्कुल न करें।
    - INSTANT INDEXING & SCHEMA READY: लेख को स्वच्छ HTML5 में रखें ताकि गूगल बोट 1 मिनट में इंडेक्स करे।
    - ADSENSE SAFETY & NO SPAM: अत्यधिक स्पैम बटन्स न लगाएं। लेख को 100% ज्ञानवर्धक और भरोसेमंद बनाएं।
    - WHATSAPP & TELEGRAM BROADCAST SUMMARY: अंत में 2 पंक्तियों का संक्षिप्त सारांश (Short Summary) व्हाट्सएप शेयर हेतु प्रदान करें।
    - LIFETIME DYNAMIC YEAR: हमेशा चालू वर्ष (${getCurrentYearNum()}) का प्रयोग करें। बीती हुई तारीखें न लिखें।
    - NO THIN CONTENT: लेख पूरी तरह विस्तृत, जानकारी से भरपूर और स्पष्ट उपशीर्षकों (H2/H3) में संरचित होना चाहिए।
    - NO KEYWORD STUFFING: प्राथमिक और द्वितीयक कीवर्ड्स को प्राकृतिक रूप से जोड़ें। अस्वाभाविक दोहराव न करें।
    - OFFICIAL CITATIONS: हमेशा आधिकारिक सरकारी अधिसूचना (Official Notification) और आधिकारिक विभाग पोर्टल लिंक का संदर्भ दें।
    - MATCH SEARCH INTENT: यूजर की खोज मंशा (Search Intent) को समझें। लेख के शुरुआत में ही सार तालिका (Summary Table) प्रदान करें।
    - NO CLICKBAIT: शीर्षक और विवरण सटीक एवं लेख की वास्तविक जानकारी से मेल खाने चाहिए।
    - FACTUAL ACCURACY: आज की तिथि (${getCurrentDateStr()}) के अनुसार सभी तिथियाँ, योग्यता, पद और आयु सीमाएँ 100% सटीक होनी चाहिए।
    1. APPRENTICESHIP VS CONTRACT VS PERMANENT: Apprenticeship को '1-वर्षीय प्रशिक्षण', Contract को 'संविदा (11 माह)' और Permanent को 'स्थायी पद' साफ़ लिखें।
    2. BACKLOG VACANCIES: बैकलॉग पद (पुराने खाली पद) और फ्रेश पदों की संख्या अलग-अलग दर्शाएं।
    3. EXPERIENCE: डिग्री हासिल करने के 'बाद' के अनिवार्य अनुभव (Post-Qualification Experience) को स्पष्ट लिखें।
    4. TYPING SPEED & FONT: टाइपिंग टेस्ट हेतु स्पीड (30/35 WPM) और फ़ॉन्ट (Kruti Dev / Mangal Font) की शर्त लिखें।
    5. CORRECTION FEE: फॉर्म सुधार (Correction Window) की फीस (उदा. ₹200-₹500) का उल्लेख करें।
    6. INTERVIEW QUALIFYING MARKS: साक्षात्कार के न्यूनतम अर्हता अंक (Qualifying Marks) की शर्त दर्शाएं।
    7. PET EXEMPTIONS: पूर्व सैनिकों (Ex-Servicemen) एवं दिव्यांगजनों (PwBD) के लिए PET/PST छूट का उल्लेख करें।
    8. FEE REFUND RULE: RRB/SSC की तरह CBT-1 परीक्षा देने पर फीस रिफंड (उदा. ₹400 वापस) का नियम लिखें।
    9. DEPARTMENTAL CANDIDATES: सेवारत कर्मचारियों के लिए दी जाने वाली विशेष आयु सीमा छूट दर्शाएं।
    10. CORRIGENDUM NOTICES: मुख्य नोटिफिकेशन के बाद जारी हुए शुद्धि-पत्र (Corrigendum Notice) के संशोधन शामिल करें।
    11. ADSENSE SAFETY: अत्यधिक स्पैम 'Apply Now' बटन या स्कैम वाले क्लिकबैट शब्दों का प्रयोग न करें।
    12. MOBILE TABLE SCROLL: सभी HTML टेबल को स्वच्छ और मोबाइल-फ्रेंडली ((<div style="overflow-x:auto;">)) बनाएं ताकि मोबाइल पर टेबल कटे नहीं।
    13. PAY MATRIX LEVEL: 7th Pay Commission का Pay Level (Level 1 से 14) और सम्भावित इन-हैंड सैलरी दोनों लिखें।
    14. OTR (केवल जहाँ लागू हो): OTR/SSO केवल RPSC, RSSB, SSC, UPSSSC जैसे विभागों में होता है। यदि यह भर्ती इन विभागों से है तो OTR का उल्लेख Step 1 में करें। यदि यह Railway, Bank, Army, NTA, PSU की भर्ती है तो OTR का कोई mention नहीं करना है।
    15. SERVER RUSH WARNING: फॉर्म भरने की अंतिम तिथि के दिन सर्वर बिज़ी/क्रैश होने का अलर्ट नोट में दें।
    16. FORM HARCOPY NOTE: आवेदकों को 'Application Form Hardcopy & Fee Receipt' सुरक्षित रखने का नोट लिखें।
    17. REGIONAL LANGUAGES: यदि परीक्षा 13 क्षेत्रीय भाषाओं में उपलब्ध है तो उसका उल्लेख करें।
    18. EXAM CITIES: परीक्षा केंद्र राज्य में होंगे या ऑल-इंडिया, यह स्पष्ट करें।
    - EXAM ALREADY CONDUCTED CHECK: यदि किसी परीक्षा/भर्ती का एग्जाम पहले ही आयोजित (Conducted) हो चुका है, तो भूलकर भी भविष्य की एग्जाम डेट न लिखें!
    - यदि एग्जाम हो चुका है, तो साफ़-साफ़ लिखें: "यह परीक्षा ${getCurrentDateStr()} से पहले आयोजित की जा चुकी है और उम्मीदवार अब उत्तर कुंजी (Answer Key) या परिणाम (Result) का इंतज़ार कर रहे हैं।"
    - केवल तभी भविष्य की एग्जाम डेट लिखें जब आधिकारिक रूप से परीक्षा आयोजित होना बाकी हो!
    - APPRENTICESHIP VS PERMANENT: यदि भर्ती Apprenticeship (शिक्षुता) की है, तो उसे '1 वर्ष का प्रशिक्षण (Apprenticeship)' साफ़-साफ़ लिखें। इसे स्थायी (Permanent) सरकारी नौकरी कभी न लिखें।
    - DEGREE VS DIPLOMA: B.Tech (Degree) और Diploma (Polytechnic) की पात्रता को अलग-अलग रखें। डिप्लोमा धारकों को B.Tech पदों पर पात्र न बताएं जब तक आधिकारिक नोटिस में न हो।
    - CERTIFICATE DATES: OBC-NCL और EWS प्रमाण पत्र के लिए फॉर्म भरने की अंतिम तिथि (Cut-off Date) का विशेष उल्लेख करें।
    - OTR & SERVICE BOND: यदि यह भर्ती RPSC/RSSB/SSC/UPSSSC जैसे विभाग की है जहाँ OTR अनिवार्य है, तभी Step 1 में OTR/SSO ID portal का उल्लेख करें। अन्य सभी विभागों (Railway, IBPS, Army, NTA, PSU) की भर्ती में OTR का mention न करें। बैंक/PSU नौकरी में सर्विस बॉन्ड (यदि लागू हो) की जानकारी दें।
    - NORMALIZATION & MARKS: मल्टी-शिफ्ट कंप्यूटर परीक्षाओं (CBT) में Normalization प्रक्रिया और Tier-1 (Qualifying vs Merit) की स्थिति स्पष्ट करें।
    - ADVT NUMBER: विज्ञापन संख्या (Advt No.) चालू वर्ष (${getCurrentYearNum()}) की ही लिखें, पुरानी कॉपी न करें।
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
    9. HTML FORMAT ONLY: कंटेंट सीधे पब्लिश करने योग्य HTML (<h2>, <p>, <table>, <ul>, <ol>, <li>) में होगा। Markdown (##, **) का उपयोग ना करें।
    10. OFFICIAL HOME PAGE LINKS ONLY: बाहरी लिंक के लिए केवल मुख्य वेबसाइट का होमपेज (जैसे https://ssc.gov.in) दें। अगर आपको पता है कि डायरेक्ट लिंक अभी वेबसाइट पर नहीं आया है, तो साफ़ शब्दों में लिखें: "⚠️ *नोट: अभी डायरेक्ट अप्लाई लिंक या पीडीएफ वेबसाइट पर एक्टिव नहीं हुआ है, कृपया ऑफिशियल वेबसाइट चेक करते रहें।*" कभी भी खुद से फेक लिंक ना बनाएँ।
    11. HINGLISH SEO: 2-3 Hinglish कीवर्ड्स ("kaise kare", "kab aayega") डालें।
    12. VIRAL LISTICLE FORMAT: जहाँ भी मुमकिन हो (खासकर Technology और Finance में), जानकारियों को "Top 5", "Top 10", या "Best X" वाले पॉइंट-वाइज़ लिस्ट (Listicle) फॉर्मेट में लिखें। यह रीडर्स को बहुत एंगेजिंग लगता है।
    13. NEVER TRUNCATE: पूरा आर्टिकल (Introduction से Conclusion तक) लिखें।
    15. STEP-BY-STEP NUMBERING (चरण-दर-चरण निर्देश): "आवेदन कैसे करें (How to Apply)" या कोई भी प्रक्रिया (Process/Steps) दर्शाने के लिए हमेशा 1, 2, 3 नंबरों वाले HTML Ordered List (<ol> और <li>) का उपयोग करें। बिना नंबरों वाले पैराग्राफ या सादे बुलेट पॉइंट (ul) का उपयोग न करें।
    14. COPYRIGHT SAFETY (कॉपीराइट सुरक्षा - अनिवार्य):
        - कभी भी किसी सरकारी अधिसूचना, समाचार एजेंसी, या वेबसाइट से टेक्स्ट को शब्दशः (Verbatim) कॉपी-पेस्ट न करें।
        - सभी जानकारियों को अपने शब्दों में पुनः लिखें (Rewrite in your own words)।
        - किसी अखबार या वेबसाइट के पूरे पैराग्राफ को कॉपी न करें।
        - तथ्यों (Facts) का उपयोग करें, लेकिन विश्लेषण (Analysis) और भाषा (Language) मौलिक (Original) होनी चाहिए।
        - डेटा का स्रोत बताएं: "सूत्र: SSC आधिकारिक वेबसाइट (ssc.gov.in)"।
        - कोई भी छवि (Image), लोगो, या ग्राफिक कॉपी न करें।
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
        - Smart Dates: यदि आवेदन या परीक्षा की तिथि घोषित नहीं हुई है, तो केवल "Coming Soon" (जल्द आ रहा है) लिखें या आज की तारीख के बाद वाले भविष्य के महीनों (जैसे: अगस्त-सितंबर 2026) का अंदाज़ा लगाएं। आज की तारीख (${getCurrentDateStr()}) से पहले के किसी भी बीते हुए महीने या तारीख (जैसे मार्च, अप्रैल, मई 2026) को बिल्कुल न लिखें। बीती हुई तारीखें लिखने से जानकारी पुरानी और नकली लगती है।
        - Highlighting: पूरे लेख में सबसे अहम जानकारी (जैसे: वेतन ₹35,000, अंतिम तिथि 25 जुलाई, कुल पद 5,000) को हमेशा <strong>Bold</strong> करें।
        - Hinglish Keywords (Indian SEO): पैराग्राफ और हेडिंग्स के बीच में नेचुरली 2-3 Hinglish कीवर्ड्स (जैसे: "kaise check kare", "kab aayega", "download link") का इस्तेमाल करें।
        
        📝 ब्लॉग का अनिवार्य लेआउट (Blog Structure) - YOU MUST USE THESE EXACT HTML HEADINGS:
        
        <h2>Introduction</h2>
        Write a 150-250 word highly engaging, conversational introduction. Speak directly to the candidate like a mentor (e.g. "अगर आप भी इस भर्ती का इंतज़ार कर रहे थे..."). Include the main keyword naturally.
        
        <h2>एक नज़र में (Key Highlights)</h2>
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">
          <ul> (Write 4 highly crisp bullet points summarizing the entire post. Ready for Google Web Stories). </ul>
        </div>
        
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

        <h2 id="details">पदों की जानकारी (Vacancy Details & Eligibility)</h2>
        Create a detailed Column-based HTML Table for Vacancy distribution. DO NOT WRITE PARAGRAPHS.
        - CRITICAL RULE: The table MUST have these columns: 1. पद का नाम (Post Name), 2. रिक्तियों की संख्या (Number of Vacancies), 3. आयु सीमा (Age Limit), 4. शैक्षणिक योग्यता (Qualification).
        - Create a separate row for EACH post. If there are 5 posts, create 5 rows!
        - If exact vacancy numbers are missing, write 'To be Announced'. Make sure EVERY post's vacancy count is clearly listed inside this grid.
        - DO NOT create a two-column property-value list. It MUST be a proper data grid.

        <h2 id="selection">Selection Process (चयन प्रक्रिया)</h2>
        Create an HTML Table for this section. DO NOT WRITE PARAGRAPHS.
        Example Rows: Stage 1 (e.g. CBT Exam), Stage 2 (PET/PST), Stage 3 (Interview/DV).

        <h2 id="syllabus">Exam Syllabus & Pattern (परीक्षा सिलेबस और पैटर्न)</h2>
        Detailed breakdown of subjects, questions, and marks.
        - Create a clean HTML table summarizing: विषय (Subject Name), प्रश्नों की संख्या (Questions), कुल अंक (Marks), परीक्षा समय (Duration), and नेगेटिव मार्किंग (Negative Marking).
        - List the main syllabus sub-topics (e.g. General Knowledge, Quantitative Aptitude, Reasoning, Language) in a clean bulleted list.

        <h2 id="cutoff">Previous Year Cut-off Marks (पिछले वर्षों की कट-ऑफ)</h2>
        Create a clean category-wise HTML table comparing UR (General), OBC, SC, ST, and EWS cut-off marks/percentages from the previous exam cycle. If the exact data is unavailable or it is a new recruitment, provide expected/general target percentages (e.g., UR: 70-75%, OBC: 65-70%) to help candidates set a target score.

        <h2 id="links">Important Links (महत्वपूर्ण लिंक)</h2>
        Create an HTML Table for ALL important links. DO NOT WRITE PARAGRAPHS.
        Example Rows: Official Website Link, Apply Online Link, Download Notification Link. (Use <a href="..." target="_blank" rel="nofollow" class="font-bold text-blue-600 underline">👉 Click Here</a> for all links to make them stand out).

        <h2 id="apply">How to Apply (आवेदन कैसे करें)</h2>
        Step-by-step process in 3-4 simple points.
        
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

    11. CRITICAL LINKING RULE: 
    - If the Notification has NOT been released yet, or the Application/Apply Link is NOT active yet, do NOT generate any dummy, placeholder, or fake link. In the link table cell, simply write the text "Coming Soon" (जल्द आ रहा है) without any <a> tag.
    - For active or available links (like Official Notification PDF, Direct Apply Page, Admit Card download page), try to provide the verified EXACT direct sub-page link / URL (e.g., "https://ssc.gov.in/api/attachment/...pdf" or the specific application login portal page of that conducting department) so the user lands directly on the target page. If you do not have the verified direct page URL, fallback to the direct Official Homepage URL of that specific conducting department (e.g., "https://ssc.gov.in", "https://rpsc.rajasthan.gov.in", "https://rssb.rajasthan.gov.in", "https://upsc.gov.in") so users can click to visit the main page and navigate it directly.
    - NEVER use "#", "[LINK_NOT_AVAILABLE]", or empty href attributes.
    
    ${recentPostsList && recentPostsList.length > 0 ? `
    AUTO-INTERNAL LINKING:
    If you mention the following related articles, you MUST add them as a visually distinct NOTE block using this exact HTML format:
    <div class="internal-link-note"><strong>📝 नोट (Note):</strong> <a href="...">Article Title</a> के बारे में और पढ़ें।</div>
    Do NOT just mix them in the normal paragraph text. You MUST use this exact HTML div format. Use the exact <a> tags provided below:
    ${recentPostsList.map(p => `- <a href="https://www.knowora.in/blog/${p.slug}">${p.title}</a>`).join('\n')}
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
1. HIGH-CTR MAIN HEADING: The first heading (<h2> or <h1>) at the very top of your HTML MUST be an extremely catchy, clickbait-style title in Hindi/Hinglish that draws immediate clicks on Google Discover. It MUST include key details: recruitment agency, vacancy count (e.g., 5000+ Posts), qualification (e.g., 10th/12th Pass), and urgent terms like "बंपर भर्ती", "अभी-अभी जारी Notification", "यहाँ से डायरेक्ट करें आवेदन".
   - Example: "<h2>Railway RRC Recruitment 2026: 10th Pass के लिए 5000+ पदों पर बंपर भर्ती, अभी-अभी जारी हुआ नोटिफिकेशन!</h2>"
2. NO LONG PARAGRAPHS: Every <p> must be strictly 2-3 lines max. Break large text blocks into multiple short <p> tags.
3. HINGLISH KEYWORDS (MANDATORY): You MUST organically insert exact English/Hinglish search phrases inside the Hindi text (e.g., "online apply kaise kare", "result kab aayega", "direct link"). Do NOT translate them to pure Hindi.
4. BOLD ALL NUMBERS: Every single number, date, fee, or salary (e.g., <strong>₹1,000</strong>, <strong>500 Posts</strong>) MUST be wrapped in <strong> tags, EVEN inside tables.
5. COMPLETE ARTICLE: NEVER stop writing mid-article. You MUST complete from Introduction to Conclusion.
6. NO FILLERS: NEVER use words like "आज के इस डिजिटल युग में", "दोस्तों", "रोमांचक", "आइए जानते हैं".
8. NO PLAGIARISM / COPYRIGHT SAFETY: NEVER copy-paste text from any source. ALL content MUST be 100% original and written in your own words. Paraphrase all facts and figures. NEVER reproduce copyrighted text, logos, taglines, or brand slogans verbatim.
7. HTML ONLY: ALWAYS output clean HTML (<h2>, <p>, <table>, <ul>). NEVER output Markdown.

YOUR SEO SKILLS:
- You provide official homepage links when exact URLs are unknown.
- Every article ends with a WhatsApp/Telegram share CTA and an engaging comment hook.`;

      articleHtml = await generateContentWithFallback(writerConfig, writerSystemPrompt, writerPrompt);
      
      // Removed artificial delay to save precious execution time on Vercel Hobby limits

      // Clean up markdown wrappers
      articleHtml = articleHtml.replace(/^```html\n?|```$/g, '').trim();
    } catch(error: any) {
      console.error("Writer generation failed", error);
      if (error.message?.includes('429')) throw new Error("API Limit (429): AI की फ्री लिमिट खत्म हो गई है या सर्वर बिज़ी है। कृपया 1 घंटे बाद कोशिश करें या अपना API Key बदलें।");
      throw error;
    }

    // Extract Title from the HTML generated by the writer (filtering out generic placeholders)
    let articleTitle = targetTopic;
    const allHeaders = Array.from(articleHtml.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/gi));
    const genericTitles = [
      'introduction',
      'key highlights',
      'quick overview',
      'highlights',
      'संक्षिप्त विवरण',
      'quick info',
      'quick information',
      'conclusion',
      'निष्कर्ष',
      'faq',
      'f.a.q.',
      'अक्सर पूछे जाने वाले प्रश्न',
      'एक नज़र में',
      'एक नजर में',
      'एक नज़र में'
    ];

    let foundTitle = '';
    for (const match of allHeaders) {
      if (match && match[1]) {
        const cleanHeader = match[1].replace(/<[^>]+>/g, '').trim();
        const isGeneric = genericTitles.some(g => cleanHeader.toLowerCase().includes(g));
        if (!isGeneric && cleanHeader.length > 8) {
          foundTitle = cleanHeader;
          break;
        }
      }
    }

    if (foundTitle) {
      articleTitle = foundTitle;
    }

    // -------------------------------------------------------------
    // AGENT 3: THE SEO EXPERT
    // -------------------------------------------------------------
    const seoPrompt = `You are India's Top SEO Expert specializing in Google Discover and Hindi blogs.
    Analyze the following article and generate optimized metadata for maximum Google ranking.
    
    RULES:
    1. seoTitle: Generate a VERY SIMPLE, CATCHY, and EASY TO UNDERSTAND Hindi title that common people can read easily. Use words like "बंपर भर्ती", "रिजल्ट जारी", "नया नियम". Mix in the main English keyword naturally. Keep it under 65 chars. Example: "SSC CGL ${getCurrentYearNum()}: बंपर भर्ती का नोटिफिकेशन जारी, ऐसे करें अप्लाई!"
    2. seoDescription: Write a compelling meta description in simple Hindi that makes users CLICK. Under 155 chars. Include primary keyword.
    3. seoKeywords: List 6-8 comma-separated keywords mixing Hindi, English, and Hinglish (e.g. "SSC CGL 2026, SSC CGL notification, SSC CGL kab aayega, एसएससी सीजीएल 2026").
    4. slug: Short, keyword-rich English-only URL slug (e.g. "ssc-cgl-2026-notification"). No random numbers.
    5. qualifications: Extract the required educational qualifications as a JSON array of strings. Choose ONLY from these options: ["10th", "12th", "Graduate", "Post Graduate", "ITI", "Diploma", "B.Tech/BE", "Nursing", "B.Ed", "Other"]. If multiple apply, list all of them. If none apply or it's not a job post, return [].
    6. jobStates: Extract the relevant Indian states for the job as a JSON array of strings. Choose ONLY from: ["Central", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"]. For Central Govt/All-India jobs (SSC, UPSC, Railways, Army, Navy, Airforce, etc.), return ["Central"]. If none apply, return [].
    7. applyStartDate: Extract the start date for application in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ). Return null if not mentioned or not a job post.
    8. applyLastDate: Extract the last date/deadline to apply in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ). Return null if not mentioned or not a job post.
    9. vacancyCount: Extract total number of vacancies/posts as an integer. Return null if not mentioned or not a job post.
    10. officialApplyUrl: Extract the official apply portal/website URL. Return null if not mentioned or not a job post.
    
    Respond ONLY with a valid JSON object, no markdown:
    {
      "seoTitle": "...",
      "seoDescription": "...",
      "seoKeywords": "...",
      "slug": "...",
      "qualifications": ["12th", "Graduate"],
      "jobStates": ["Rajasthan"],
      "applyStartDate": "YYYY-MM-DDTHH:mm:ss.sssZ or null",
      "applyLastDate": "YYYY-MM-DDTHH:mm:ss.sssZ or null",
      "vacancyCount": 500,
      "officialApplyUrl": "https://..."
    }
    
    ARTICLE HTML:
    ${articleHtml}`;

    let seoData = {
      seoTitle: targetTopic,
      seoDescription: "An in-depth look at " + targetTopic,
      seoKeywords: targetTopic.toLowerCase().split(' ').join(', '),
      slug: targetTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4),
      qualifications: [] as string[],
      jobStates: [] as string[],
      applyStartDate: null as Date | null,
      applyLastDate: null as Date | null,
      vacancyCount: null as number | null,
      officialApplyUrl: null as string | null
    };

    let expiryDate = null;
    try {
      const seoResultRaw = await generateContentWithFallback(seoConfig, "You are an SEO metadata generator that outputs only strict JSON.", seoPrompt);
      const cleanJsonStr = seoResultRaw.replace(/^```json\n?|```$/g, '').trim();
      const parsedSeo = JSON.parse(cleanJsonStr);
      if (parsedSeo.seoTitle) {
        seoData.seoTitle = parsedSeo.seoTitle;
        seoData.seoDescription = parsedSeo.seoDescription || seoData.seoDescription;
        seoData.seoKeywords = parsedSeo.seoKeywords || seoData.seoKeywords;
        seoData.slug = parsedSeo.slug || seoData.slug;
        
        if (Array.isArray(parsedSeo.qualifications)) seoData.qualifications = parsedSeo.qualifications;
        if (Array.isArray(parsedSeo.jobStates)) seoData.jobStates = parsedSeo.jobStates;
        
        if (parsedSeo.applyStartDate) {
          const sDate = new Date(parsedSeo.applyStartDate);
          if (!isNaN(sDate.getTime())) seoData.applyStartDate = sDate;
        }
        
        if (parsedSeo.applyLastDate) {
          const lDate = new Date(parsedSeo.applyLastDate);
          if (!isNaN(lDate.getTime())) {
            seoData.applyLastDate = lDate;
            expiryDate = lDate; // Synchronize with legacy expiryDate
          }
        } else if (parsedSeo.expiryDate) {
          const lDate = new Date(parsedSeo.expiryDate);
          if (!isNaN(lDate.getTime())) {
            seoData.applyLastDate = lDate;
            expiryDate = lDate;
          }
        }
        
        if (parsedSeo.vacancyCount !== undefined) {
          const val = parseInt(parsedSeo.vacancyCount);
          if (!isNaN(val)) seoData.vacancyCount = val;
        }
        
        if (parsedSeo.officialApplyUrl) seoData.officialApplyUrl = String(parsedSeo.officialApplyUrl);
      }
    } catch(e) {
      console.warn("SEO Agent JSON parsing failed, using fallback.", e);
    }

    // Final title safety: If extracted title is generic, too short, or matches the original keyword exactly, override with the catchy SEO title
    const isTitleGeneric = genericTitles.some(g => articleTitle.toLowerCase().includes(g));
    if (isTitleGeneric || articleTitle.length < 10 || articleTitle.toLowerCase() === targetTopic.toLowerCase()) {
      if (seoData.seoTitle && !genericTitles.some(g => seoData.seoTitle.toLowerCase().includes(g))) {
        articleTitle = seoData.seoTitle;
      }
    }
    // Clean up any extra quote characters that AI might include in the title
    articleTitle = articleTitle.replace(/^["'“‘]+|["'”’]+$/g, '').trim();

    // -------------------------------------------------------------
    // IMAGE GENERATOR (Agent 4)
    // -------------------------------------------------------------
    const imgProvider = savedKeys.imageGenProvider || 'pollinations';
    const imgModel = savedKeys.imageGenModel || 'dall-e-3';
    const imgApiKey = savedKeys.imageGenApi || savedKeys.openai || '';
    const imgPrompt = `High quality professional blog header image representing ${targetTopic}. 8k resolution, cinematic lighting, modern design.`;
    // Default to Pollinations AI (free, reliable, always works)
    let featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;
    
    const imgSourceType = settings.imageSource || 'unsplash'; // unsplash, pexels, ai, none

    if (imgSourceType === 'none') {
      featuredImage = '';
    } else if (imgSourceType === 'unsplash' || imgSourceType === 'pexels') {
      // Unsplash Source API is deprecated (2023) and Pexels requires auth.
      // Both now fallback to Pollinations AI which is free and always works.
      featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;
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

    articleHtml = validateAndFixLinks(articleHtml, targetTopic);
    articleHtml = cleanTableOfContents(articleHtml, articleTitle);
    console.log('✅ Link validation & TOC cleaning complete for:', targetTopic);

    // -------------------------------------------------------------
    // AUTOMATIC SUB-TAG DETECTION FOR HOME GRID COLUMNS
    // -------------------------------------------------------------
    const detectedTagsSet = new Set<string>();
    detectedTagsSet.add(pendingKeyword?.niche || selectedCategory); // Add primary niche first

    const lowerTopic = targetTopic.toLowerCase();
    if (lowerTopic.includes('job') || lowerTopic.includes('recruitment') || lowerTopic.includes('bharti') || lowerTopic.includes('vacancy') || lowerTopic.includes('naukri')) {
      detectedTagsSet.add('Job');
      detectedTagsSet.add('Vacancy');
      detectedTagsSet.add('Career');
    }
    if (lowerTopic.includes('upcoming') || lowerTopic.includes('expected') || lowerTopic.includes('संभावित') || lowerTopic.includes('coming soon') || lowerTopic.includes('agami')) {
      detectedTagsSet.add('Upcoming');
    }
    if (lowerTopic.includes('rule') || lowerTopic.includes('rules') || lowerTopic.includes('नियम') || lowerTopic.includes('अधिकार') || lowerTopic.includes('rights')) {
      detectedTagsSet.add('Rules & Rights');
    }
    if (lowerTopic.includes('guideline') || lowerTopic.includes('guidelines') || lowerTopic.includes('निर्देश') || lowerTopic.includes('गाइडलाइन')) {
      detectedTagsSet.add('Guidelines');
    }
    if (lowerTopic.includes('admit') || lowerTopic.includes('admit card') || lowerTopic.includes(' प्रवेश पत्र')) {
      detectedTagsSet.add('Admit Card');
    }
    if (lowerTopic.includes('result') || lowerTopic.includes('परिणाम') || lowerTopic.includes('answer key') || lowerTopic.includes('उत्तर कुंजी') || lowerTopic.includes('syllabus') || lowerTopic.includes('cut off') || lowerTopic.includes('cutoff')) {
      detectedTagsSet.add('Results');
    }
    if (lowerTopic.includes('university') || lowerTopic.includes('ignou') || lowerTopic.includes('college') || lowerTopic.includes('admission') || lowerTopic.includes('counselling') || lowerTopic.includes('counseling') || lowerTopic.includes('admissions') || lowerTopic.includes('merit list') || lowerTopic.includes('timetable') || lowerTopic.includes('time table') || lowerTopic.includes('university results')) {
      detectedTagsSet.add('University');
    }
    if (lowerTopic.includes('scheme') || lowerTopic.includes('yojana') || lowerTopic.includes('योजना') || lowerTopic.includes('pm kisan') || lowerTopic.includes('e-shram') || lowerTopic.includes('shram')) {
      detectedTagsSet.add('Scheme');
    }
    if (lowerTopic.includes('scholarship') || lowerTopic.includes('छात्रवृत्ति')) {
      detectedTagsSet.add('Scholarship');
    }
    if (lowerTopic.includes('tech') || lowerTopic.includes('phone') || lowerTopic.includes('mobile') || lowerTopic.includes('gadget') || lowerTopic.includes('launch') || lowerTopic.includes('recharge') || lowerTopic.includes('outage') || lowerTopic.includes('app')) {
      detectedTagsSet.add('Technology');
    }
    if (lowerTopic.includes('finance') || lowerTopic.includes('bank') || lowerTopic.includes('banking') || lowerTopic.includes('lic') || lowerTopic.includes('epfo') || lowerTopic.includes('savings') || lowerTopic.includes('interest rate') || lowerTopic.includes('gold rate')) {
      detectedTagsSet.add('Finance');
    }
    if (lowerTopic.includes('earning') || lowerTopic.includes('earn') || lowerTopic.includes('money') || lowerTopic.includes('course') || lowerTopic.includes('courses') || lowerTopic.includes('free course') || lowerTopic.includes('online earning')) {
      detectedTagsSet.add('Earning');
    }

    // AUTOMATIC QUALIFICATION TAGGING
    const lowerContent = articleHtml.toLowerCase();
    if (lowerTopic.includes('10th') || lowerTopic.includes('10वीं') || lowerTopic.includes('matric') || lowerTopic.includes('high school') ||
        lowerContent.includes('10th pass') || lowerContent.includes('10वीं पास') || lowerContent.includes('मैट्रिक')) {
      detectedTagsSet.add('10th Pass');
    }
    if (lowerTopic.includes('12th') || lowerTopic.includes('12वीं') || lowerTopic.includes('intermediate') || lowerTopic.includes('higher secondary') ||
        lowerContent.includes('12th pass') || lowerContent.includes('12वीं पास') || lowerContent.includes('इंटरमीडिएट')) {
      detectedTagsSet.add('12th Pass');
    }
    if (lowerTopic.includes('iti') || lowerTopic.includes('diploma') || lowerTopic.includes('polytechnic') ||
        lowerContent.includes('iti pass') || lowerContent.includes('डिप्लोमा') || lowerContent.includes('पॉलीटेक्निक')) {
      detectedTagsSet.add('ITI / Diploma');
    }
    if (lowerTopic.includes('b.tech') || lowerTopic.includes('btech') || lowerTopic.includes('b.e') ||
        lowerContent.includes('b.tech') || lowerContent.includes('btech') || lowerContent.includes('b.e.')) {
      detectedTagsSet.add('B.Tech / BE');
    }
    if (lowerTopic.includes('post graduate') || lowerTopic.includes('postgraduate') || lowerTopic.includes('pg pass') || lowerTopic.includes('mca') || lowerTopic.includes('mba') ||
        lowerContent.includes('post graduate') || lowerContent.includes('postgraduate') || lowerContent.includes('परास्नातक') || lowerContent.includes('m.tech') || lowerContent.includes('mtech')) {
      detectedTagsSet.add('Post Graduate');
    }
    if (lowerTopic.includes('graduate') || lowerTopic.includes('graduation') || lowerTopic.includes('degree') || lowerTopic.includes('b.sc') || lowerTopic.includes('bsc') || lowerTopic.includes('b.a') || lowerTopic.includes('ba pass') || lowerTopic.includes('b.com') || lowerTopic.includes('bcom') ||
        lowerContent.includes('graduate') || lowerContent.includes('graduation') || lowerContent.includes('स्नातक') || lowerContent.includes('डिग्री')) {
      detectedTagsSet.add('Graduate');
    }

    const tagsToCreate = Array.from(detectedTagsSet).map(tagName => ({
      tag: {
        connectOrCreate: {
          where: { name: tagName },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          }
        }
      }
    }));

    // -------------------------------------------------------------
    // SAVE TO DATABASE
    // -------------------------------------------------------------
    // Generate slug with 8 random chars for better uniqueness (was 4 digits — collision risk)
    const slugRandom = Math.random().toString(36).substring(2, 6) + '-' + Date.now().toString().slice(-4);
    const finalSlug = seoData.slug + '-' + slugRandom;
    
    // Build social caption for broadcasting
    const socialCaption = `${articleTitle}\n\nRead more: https://www.knowora.in/blog/${finalSlug}`;
    const socialHashtags = (seoData.seoKeywords || '').split(',').slice(0, 3).map((k: string) => `#${k.trim().replace(/\s+/g, '')}`).join(' ');

    // Use Prisma transaction to prevent partial state corruption
    // (Previously: if timeout hit between blog save and keyword update, duplicate posts were created)
    const newPost = await prisma.$transaction(async (tx) => {
      const post = await tx.blogPost.create({
        data: {
          title: articleTitle,
          slug: finalSlug,
          content: articleHtml,
          excerpt: seoData.seoDescription,
          featuredImage: featuredImage,
          status: settings.autoPublish ? 'Published' : 'Draft',
          publishedAt: settings.autoPublish ? new Date() : null,
          autoGenerated: true,
          expiryDate: expiryDate,
          jobStates: seoData.jobStates,
          qualifications: seoData.qualifications,
          applyStartDate: seoData.applyStartDate,
          applyLastDate: seoData.applyLastDate,
          vacancyCount: seoData.vacancyCount,
          officialApplyUrl: seoData.officialApplyUrl,
          seoTitle: seoData.seoTitle,
          seoDescription: seoData.seoDescription,
          seoKeywords: seoData.seoKeywords,
          socialCaptions: socialCaption,
          socialHashtags: socialHashtags,
          tags: {
            create: tagsToCreate
          }
        }
      });

      if (keywordId) {
        await tx.autoBlogKeyword.update({
          where: { id: keywordId },
          data: { status: 'used', usedAt: new Date(), postId: post.id }
        });
      }

      await tx.autoBlogLog.create({
        data: {
          keyword: targetTopic,
          title: post.title,
          status: 'success',
          postId: post.id
        }
      });

      return post;
    });

    // -------------------------------------------------------------
    // BROADCASTING — All post-save work runs in background via waitUntil()
    // This prevents Vercel 60s timeout from killing social/email/indexing
    // Previously all this was sequential and often got killed at 60s
    // -------------------------------------------------------------
    const broadcastCaption = newPost.socialCaptions || `${newPost.title}\n\nRead more: https://www.knowora.in/blog/${newPost.slug}\n\n${newPost.socialHashtags || ''}`;
    const socialImageUrl = `https://www.knowora.in/api/og?title=${encodeURIComponent(newPost.title)}&bg=${encodeURIComponent(newPost.featuredImage || '')}`;

    // Use waitUntil() to run broadcasting in background — HTTP response returns immediately
    waitUntil((async () => {
      try {
        // Run ALL social media posts in PARALLEL (was sequential — wasted 10-15s)
        const socialPromises: Promise<any>[] = [];

        if (savedKeys.whatsappToken && savedKeys.whatsappPhoneId && savedKeys.whatsappGroupId) {
          socialPromises.push(postToWhatsApp(savedKeys.whatsappToken, savedKeys.whatsappPhoneId, savedKeys.whatsappGroupId, broadcastCaption, socialImageUrl).catch(e => console.error('WhatsApp failed:', e)));
        }
        if (savedKeys.instagramToken && savedKeys.instagramAccountId) {
          socialPromises.push(postToInstagram(savedKeys.instagramToken, savedKeys.instagramAccountId, socialImageUrl, broadcastCaption).catch(e => console.error('Instagram failed:', e)));
        }
        if (savedKeys.twitter) {
          socialPromises.push(postToTwitter(savedKeys.twitter, broadcastCaption).catch(e => console.error('Twitter failed:', e)));
        }
        if (savedKeys.telegramToken && savedKeys.telegramChatId) {
          socialPromises.push(
            fetch(`https://api.telegram.org/bot${savedKeys.telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: savedKeys.telegramChatId, text: broadcastCaption, parse_mode: 'HTML' })
            }).catch(e => console.error('Telegram failed:', e))
          );
        }

        // Run all social posts in parallel
        if (socialPromises.length > 0) {
          await Promise.allSettled(socialPromises);
        }

        // Email newsletter
        if (savedKeys.resend && settings.autoPublish) {
          try {
            const leads = await prisma.lead.findMany({ select: { email: true } });
            const emails = leads.map((l: any) => l.email).filter(Boolean);
            if (emails.length > 0) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${savedKeys.resend}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: 'Our Blog <info@knowora.in>',
                  to: 'subscribers@knowora.in',
                  bcc: emails.slice(0, 50),
                  subject: `New Post: ${newPost.title}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2>${newPost.title}</h2>
                      ${newPost.featuredImage ? `<img src="${newPost.featuredImage}" style="width: 100%; border-radius: 8px;" />` : ''}
                      <p>${newPost.excerpt || ''}</p>
                      <a href="https://www.knowora.in/blog/${newPost.slug}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Read Full Article</a>
                    </div>
                  `
                })
              });
            }
          } catch (e) { console.error('Newsletter failed:', e); }
        }

        // Google SEO: Sitemap ping + Indexing API
        if (settings.autoPublish) {
          try { await fetch(`https://www.google.com/ping?sitemap=https://www.knowora.in/sitemap.xml`); } catch (e) { console.error('Google ping failed:', e); }
          if (savedKeys.googleIndexingJson) {
            try {
              const { submitToGoogleIndexing } = require('@/lib/google-indexing');
              await submitToGoogleIndexing(`https://knowora.in/blog/${newPost.slug}`, 'URL_UPDATED', savedKeys.googleIndexingJson);
            } catch (e) { console.error('Google Indexing failed:', e); }
          }
        }

        // Revalidate pages
        try { revalidatePath('/'); revalidatePath('/blog'); } catch (e) { console.warn('Revalidate failed:', e); }

      } catch (broadcastError) {
        console.error('[Auto-Blog] Broadcasting error (non-fatal):', broadcastError);
      }
    })());

    // Return immediately — broadcasting continues in background via waitUntil()
    return NextResponse.json({ success: true, post: newPost, message: `Blog "${newPost.title}" published successfully!` });

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
    const expectedSecret = process.env.CRON_SECRET || '';
    const authHeader = request.headers.get('authorization');
    
    // Check if this is a cron trigger request (requires valid CRON_SECRET)
    const isCron = expectedSecret && (
      searchParams.get('secret') === expectedSecret ||
      authHeader === `Bearer ${expectedSecret}`
    );

    // Security: force-run also requires valid cron secret (was bypassing auth entirely)
    if (isCron) {
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

// ---------------------------------------------------------------------------
// UTILITY: Robustly parse generated topics JSON array of objects or strings from AI
// ---------------------------------------------------------------------------
function parseTopicsFromAI(rawText: string): { keyword: string; niche: string }[] {
  let cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    const bracketed = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(bracketed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'string') {
            return { keyword: item, niche: classifyTopicNiche(item) };
          } else if (item && typeof item === 'object') {
            const keyword = item.keyword || item.topic || '';
            let niche = item.niche || item.category || '';
            if (!['Education & Career', 'Technology', 'Finance & Earning'].includes(niche)) {
              niche = classifyTopicNiche(keyword);
            }
            return { keyword, niche };
          }
          return null;
        }).filter((item): item is { keyword: string; niche: string } => item !== null && item.keyword.length > 0);
      }
    } catch (e) {
      console.warn("Failed to parse topics JSON, falling back to regex/line-based parser", e);
    }
  }

  const items: { keyword: string; niche: string }[] = [];
  const objRegex = /\{\s*"keyword"\s*:\s*"([^"]+)"\s*,\s*"niche"\s*:\s*"([^"]+)"\s*\}/g;
  let match;
  while ((match = objRegex.exec(cleaned)) !== null) {
    items.push({ keyword: match[1], niche: match[2] });
  }

  if (items.length > 0) return items;

  const strMatches: string[] = [];
  const regex = /(?:"|')([^"'\r\n]+)(?:"|')/g;
  let sMatch;
  while ((sMatch = regex.exec(cleaned)) !== null) {
    const val = sMatch[1].trim();
    if (val && val.length > 2 && !val.includes('{') && !val.includes('}')) {
      strMatches.push(val);
    }
  }

  return strMatches.map(str => ({
    keyword: str,
    niche: classifyTopicNiche(str)
  }));
}

// ---------------------------------------------------------------------------
// UTILITY: Classify niche of a topic keyword based on keywords table mapping
// ---------------------------------------------------------------------------
function classifyTopicNiche(topic: string): string {
  const tLower = topic.toLowerCase();
  
  // Strict matching words for Technology
  const techKeywords = [
    'tech', 'launch', 'ai', 'phone', 'app', 'mobile', 'gadget', 'samsung', 'redmi', 'iphone', 'oneplus', 
    'realme', 'vivo', 'oppo', 'xiaomi', 'motorola', 'scam', 'cyber', '5g', 'telecom', 'jio', 'airtel', 
    'vi ', 'gaming', 'bgmi', 'pubg', 'scooter', 'ev ', 'ola ev', 'charger', 'update',
    'मोबाइल', 'फ़ोन', 'फ़ोन', 'लॉन्च', 'फीचर', 'स्कैम', 'धोखाधड़ी', 'स्मार्टफोन', 'तकनीक'
  ];
  
  // Strict matching words for Finance & Earning
  const financeKeywords = [
    'finance', 'stock', 'budget', 'market', 'bank', 'earn', 'paisa', 'kisan', 'shram', 'epf', 'pf ', 
    'ipo', 'gold', 'silver', 'lic', 'post office', 'scheme', 'yojana', 'loan', 'credit', 'pan card', 
    'tax', 'invest', 'saving', 'mutual fund', 'rupee', 'paytm', 'gpay', 'phonepe',
    'कमाई', 'पैसे', 'बजट', 'योजना', 'लोन', 'ऋण', 'ब्याज', 'खाता', 'पेंशन', 'सोना', 'चांदी', 'गोल्ड', 'रुपए'
  ];

  if (techKeywords.some(w => tLower.includes(w))) {
    return 'Technology';
  }
  if (financeKeywords.some(w => tLower.includes(w))) {
    return 'Finance & Earning';
  }
  return 'Education & Career'; // Default
}

