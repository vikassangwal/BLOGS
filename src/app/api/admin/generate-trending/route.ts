import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAIContent, AIConfig } from '@/lib/ai';
import { validateAndFixLinks, stripLinkDisclaimers } from '@/lib/link-validator';
import { detectGridBox } from '@/lib/grid-classifier';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const TOP_TRENDING_TOPICS = [
  {
    topic: 'Railway RRB NTPC Recruitment 2026: 11,558 पदों पर 12वीं और ग्रेजुएट पास के लिए बंपर भर्ती, नोटिफिकेशन जारी!',
    category: 'Jobs',
    gridBox: 'latestJobs',
    officialUrl: 'https://www.rrbapply.gov.in',
    keywords: ['Railway RRB NTPC 2026', 'RRB NTPC Notification 2026', 'Railway Bharti 2026', 'RRB NTPC Online Apply', '11558 Posts']
  },
  {
    topic: 'UP Police Constable Result 2026: 60,244 पदों का रिजल्ट और कट-ऑफ जारी, यहाँ से डायरेक्ट चेक करें स्कोरकार्ड!',
    category: 'Results',
    gridBox: 'examResults',
    officialUrl: 'https://uppbpb.gov.in',
    keywords: ['UP Police Constable Result 2026', 'UP Police Cut off 2026', 'UP Police Scorecard Download', 'UPPRPB Result Link']
  },
  {
    topic: 'PM Kisan 19th Installment Release Date 2026: किसानों के बैंक खाते में ₹2000 की 19वीं किस्त, नई लाभार्थी सूची और e-KYC गाइड!',
    category: 'Schemes',
    gridBox: 'scheme',
    officialUrl: 'https://pmkisan.gov.in',
    keywords: ['PM Kisan 19th Installment', 'PM Kisan 2026 Date', 'PM Kisan e-KYC', 'PM Kisan Beneficiary Status', 'pmkisan gov in']
  },
  {
    topic: 'SSC GD Constable 2026 Notification: 39,481+ पदों पर 10वीं पास के लिए बंपर भर्ती, परीक्षा तिथि और ऑनलाइन फॉर्म!',
    category: 'Jobs',
    gridBox: 'latestJobs',
    officialUrl: 'https://ssc.gov.in',
    keywords: ['SSC GD 2026 Notification', 'SSC GD Constable Apply Online', 'SSC GD 39481 Vacancy', 'SSC GD Exam Date 2026']
  },
  {
    topic: 'IBPS Clerk XIV Recruitment 2026: 6,128 बैंक क्लर्क पदों पर भर्ती, ग्रेजुएट उम्मीदवार यहाँ से करें डायरेक्ट ऑनलाइन आवेदन!',
    category: 'Jobs',
    gridBox: 'latestJobs',
    officialUrl: 'https://www.ibps.in',
    keywords: ['IBPS Clerk 2026', 'IBPS Clerk Notification 2026', 'Bank Clerk Vacancy 2026', 'IBPS Clerk Online Apply']
  },
  {
    topic: 'NEET UG 2026 Round 1 Allotment Result: MCC ने जारी किया नीट सीट आवंटन रिजल्ट, कॉलेज रिपोर्टिंग की पूरी प्रक्रिया!',
    category: 'University',
    gridBox: 'university',
    officialUrl: 'https://mcc.nic.in',
    keywords: ['NEET UG 2026 Allotment Result', 'MCC NEET Counselling 2026', 'NEET Round 1 Seat Allotment', 'mcc nic in']
  },
  {
    topic: 'Mukhyamantri Majhi Ladki Bahin Yojana 2026: ₹1500 की नई किस्त जारी, लाभार्थी स्थिति और बैंक DBT स्टेटस ऐसे चेक करें!',
    category: 'Schemes',
    gridBox: 'scheme',
    officialUrl: 'https://ladakibahin.maharashtra.gov.in',
    keywords: ['Ladki Bahin Yojana 2026', 'Majhi Ladki Bahin Status', 'Ladki Bahin Installment Check', '1500 Rupees DBT']
  },
  {
    topic: 'Redmi Note 14 Pro+ 5G: 200MP कैमरा और 6200mAh धांसू बैटरी के साथ भारत में लॉन्च, देखें कीमत और फर्स्ट लुक फीचर्स!',
    category: 'Technology',
    gridBox: 'tech',
    officialUrl: 'https://www.mi.com/in',
    keywords: ['Redmi Note 14 Pro Plus 5G', 'Redmi Note 14 Pro Price India', 'Redmi Note 14 Launch Date', '200MP Camera Phone']
  }
];

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '3'); // Generate 3 trending posts per run by default

    // 1. Fetch site settings & AI keys
    const [siteSettings, autoBlogSettings] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
      prisma.autoBlogSettings.findUnique({ where: { id: 'default' } }),
    ]);

    let savedKeys: Record<string, string> = {};
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      try { savedKeys = JSON.parse(siteSettings.aiApiKey); } catch(e) {}
    }

    const configs: AIConfig[] = [];
    const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
    for (const prov of fallbackProviders) {
      const k = (savedKeys[prov] || '').trim();
      if (k && k.length >= 10) {
        let m = 'gemini-2.5-flash';
        if (prov === 'groq') m = 'meta-llama/llama-4-scout-17b-16e-instruct';
        else if (prov === 'openai') m = 'gpt-4o-mini';
        else if (prov === 'deepseek') m = 'deepseek-chat';
        configs.push({ provider: prov, apiKey: k, model: m });
      }
    }

    if (configs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No AI API keys configured. Please add Gemini API key in Admin Settings.' 
      }, { status: 400 });
    }

    const createdPosts: any[] = [];

    // 2. Iterate through trending topics
    for (const item of TOP_TRENDING_TOPICS) {
      if (createdPosts.length >= count) break;

      // Check if post already exists
      const existing = await prisma.blogPost.findFirst({
        where: {
          OR: [
            { title: { contains: item.keywords[0], mode: 'insensitive' } },
            { slug: { contains: item.keywords[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) } }
          ]
        }
      });

      if (existing && existing.content && existing.content.length > 2000) {
        console.log(`Topic already exists in full length: ${item.topic}`);
        continue;
      }

      console.log(`Generating Trending Article: ${item.topic}`);

      const writerSystemPrompt = `You are India's premier Hindi Content Writer and Top SEO Specialist.
You write 100% complete, highly engaging, viral Hindi articles in clean semantic HTML for Google Discover.
MANDATORY RULES & ANTI-REPETITION POLICY:
1. NEVER STOP WRITING MID-ARTICLE. You MUST write the ENTIRE post from Title to Conclusion without cutting off.
2. NO REPETITION FLUFF: Do NOT repeat in paragraphs what is already presented in tables. Paragraphs should provide analytical context, crucial rules, warnings, and step-by-step guidance.
3. The article MUST include all of these comprehensive HTML sections:
   - <h2>Introduction (भूमिका)</h2> (150-200 words engaging intro with exact Advt/Notification number)
   - <h2>एक नज़र में (Key Highlights)</h2> (Bullet list of 4 key facts in <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r">)
   - <h2 id="quick-info">Quick Overview (संक्षिप्त विवरण)</h2> (HTML table of department, advt no, posts, cutoff date, location)
   - <h2 id="dates">Important Dates (महत्वपूर्ण तिथियां)</h2> (HTML table of dates)
   - <h2 id="fee">Application Fee (आवेदन शुल्क)</h2> (HTML table of category-wise fees + other state rule)
   - <h2 id="breakdown">पदों का विवरण (Vacancy Breakdown Matrix)</h2> (HTML table breaking down posts by company/discipline/category)
   - <h2 id="eligibility">शैक्षणिक योग्यता एवं नियम (Eligibility & Qualifications)</h2> (Degree/12th/B.Tech rules + computer diploma criteria)
   - <h2 id="salary">वेतनमान एवं प्रोबेशन अवधि (Salary Structure)</h2> (HTML table comparing 2-year probation fixed stipend vs regular Basic Pay)
   - <h2 id="selection">चयन प्रक्रिया एवं परीक्षा योजना (Selection Scheme & Weightage)</h2> (HTML table of exam pattern, subject weightage %, and typing test marks)
   - <h2 id="upload-specs">दस्तावेज अपलोड नियम एवं साइज (Upload Specifications)</h2> (HTML table with photo px/KB with live photo, signature, thumb, declaration)
   - <h2 id="warnings">उम्मीदवारों के लिए जरूरी दिशा-निर्देश (Important Advisories)</h2> (Preference locking, correction policy, single application)
   - <h2 id="apply">How to Apply (ऑनलाइन आवेदन कैसे करें)</h2> (5 actionable step-by-step instructions)
   - <h2 id="links">महत्वपूर्ण लिंक्स (Important Links Table)</h2> (HTML table with direct link to ${item.officialUrl} using <a href="${item.officialUrl}" target="_blank" rel="nofollow">👉 Click Here</a>)
   - <h2 id="faq">अक्सर पूछे जाने वाले प्रश्न (FAQ)</h2> (2-3 detailed Q&As in <details><summary><strong>...</strong></summary><p>...</p></details>)
   - <h2 id="conclusion">निष्कर्ष (Conclusion)</h2> (100-word motivating conclusion + WhatsApp/Telegram share note)
4. Use clean HTML only (<h2>, <h3>, <p>, <table>, <ul>, <details>, <summary>, <strong>). Never output Markdown.`;

      const writerPrompt = `TOPIC: "${item.topic}"
NICHE: ${item.category}
OFFICIAL PORTAL: ${item.officialUrl}
KEYWORDS: ${item.keywords.join(', ')}

Write an authoritative, 100% COMPLETE, high-ranking Hindi HTML blog post on this trending topic for year 2026. Ensure every table has accurate structure, all dates are valid for 2026, and the article is fully written from start to finish with no cut-offs.`;

      try {
        let fullArticleHtml = await generateAIContent(configs, writerSystemPrompt, writerPrompt, 8000, true);
        fullArticleHtml = fullArticleHtml.replace(/^```html\n?|```$/g, '').trim();

        const plainCheck = fullArticleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainCheck.length < 1200) {
          throw new Error(`AI generated too short content (${plainCheck.length} chars).`);
        }

        const slug = item.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) + '-' + Date.now().toString().slice(-4);
        const imgPrompt = `High quality professional banner image representing ${item.keywords[0]}. 8k resolution, cinematic lighting, modern design.`;
        const featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1600&height=900&nologo=true`;

        let postRecord;
        if (existing) {
          postRecord = await prisma.blogPost.update({
            where: { id: existing.id },
            data: {
              title: item.topic,
              content: fullArticleHtml,
              gridBox: item.gridBox,
              featuredImage: featuredImage,
              status: 'Published',
              publishedAt: new Date(),
              updatedAt: new Date()
            }
          });
        } else {
          postRecord = await prisma.blogPost.create({
            data: {
              title: item.topic,
              slug: slug,
              content: fullArticleHtml,
              excerpt: `Detailed complete overview of ${item.topic}`,
              gridBox: item.gridBox,
              featuredImage: featuredImage,
              status: 'Published',
              publishedAt: new Date(),
              autoGenerated: true,
              seoTitle: item.topic,
              seoDescription: `Get complete details, eligibility, important dates, and official links for ${item.topic}.`,
              seoKeywords: item.keywords.join(', ')
            }
          });
        }

        try {
          revalidatePath(`/blog/${postRecord.slug}`);
          revalidatePath('/blog');
          revalidatePath('/');
        } catch(e) {}

        createdPosts.push({
          id: postRecord.id,
          title: postRecord.title,
          slug: postRecord.slug,
          gridBox: item.gridBox,
          length: fullArticleHtml.length
        });

      } catch (err: any) {
        console.error(`Failed to generate trending topic "${item.topic}":`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdPosts.length} 100% complete trending blog posts!`,
      posts: createdPosts
    });

  } catch (error: any) {
    console.error('Trending Generator failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
