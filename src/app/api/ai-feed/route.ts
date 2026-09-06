import { NextResponse, NextRequest } from 'next/server';
import masterSources from '@/lib/master-sources-config.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  const payload = {
    system_name: "Knowora Universal AI Research & Auto-Blog Engine",
    canonical_domain: "https://www.knowora.in",
    webhook_endpoint: "https://www.knowora.in/api/publish-from-ai",
    webhook_secret: "knowora-secret-2026",
    config_version: masterSources.config_version || "1.0.0",
    purpose: "24-hour official-source research and 2000-2800+ words Hindi master blog generation",
    rules: {
      freshness: "Only process official government / institutional notifications published in the last 24 hours.",
      language: "Hindi (Devanagari script) with English terminology in parentheses where helpful.",
      minimum_word_count: "2000 to 2800+ words (Comprehensive In-Depth Master Guide).",
      required_elements: [
        "1. Catchy Hindi SEO Title with Year 2026 & vacancy count",
        "2. Key Highlights Table (Board, Vacancy, Eligibility, Salary, Dates, Portal)",
        "3. Category-wise Vacancy Breakdown Table (UR, OBC, EWS, SC, ST, PwD)",
        "4. Detailed Educational Qualification & Eligibility Matrix",
        "5. Age Limit & Category-wise Age Relaxations Table",
        "6. Step-by-Step Selection Process (Stages 1 to 4)",
        "7. Complete Exam Pattern & Marking Scheme Table",
        "8. 7th Pay Commission Salary Structure (Basic Pay, DA, HRA, In-Hand)",
        "9. 90-Day Proven Scientific Preparation Roadmap",
        "10. 7-Step Step-by-Step Online Application Guide",
        "11. 7 Critical Mistakes to Avoid",
        "12. Important Official Links Table with 100% verified .gov.in / .nic.in links",
        "13. 10 Detailed FAQs wrapped in <details><summary>",
        "14. In-depth Conclusion & Action Plan"
      ]
    },
    allowed_grid_boxes: [
      "latestJobs",
      "admitCard",
      "examResults",
      "scholarship",
      "scheme",
      "tech",
      "finance",
      "upcomingJobs"
    ],
    sources_summary: {
      total_sources_monitored: 315,
      categories: [
        "Central Ministries & Agencies (PIB, NTA, UGC, AICTE, UPSC, SSC, RRB, CBSE, NCERT)",
        "State Public Service Commissions (BPSC, UPSSSC, UPPSC, RSMSSB, RPSC, MPPSC, HSSC, UKPSC, etc.)",
        "Universities & Higher Education (DU, JNU, BHU, IITs, IIMs, Central Universities)",
        "National Welfare Schemes & Portals (PM Kisan, myScheme, NSP, DigiLocker, Apprenticeship India)",
        "Financial & Banking Regulators (RBI, SEBI, LIC, IBPS, SBI, EPFO, ESIC)",
        "Technology & Innovation (DoT, MEITY, CERT-In, IndiaAI, NIC, ISRO, DRDO)"
      ]
    },
    how_to_publish_direct_from_ai: {
      method: "POST",
      url: "https://www.knowora.in/api/publish-from-ai",
      headers: {
        "Content-Type": "application/json"
      },
      request_body_example: {
        secret: "knowora-secret-2026",
        title: "भर्ती / योजना का आकर्षक शीर्षक 2026",
        slug: "clean-english-slug-2026",
        content: "<h2>...</h2><p>...</p><table>...</table>",
        excerpt: "2-3 पंक्तियों का संक्षिप्त विवरण",
        gridBox: "latestJobs",
        officialApplyUrl: "https://rrbapply.gov.in"
      }
    },
    master_prompt_for_ai: `आप Knowora (https://www.knowora.in) के मुख्य चीफ एडिटर हैं। 
आपका कार्य पिछले 24 घंटों में भारत सरकार (Central/State Govt), भर्ती बोर्डों, विश्वविद्यालयों, या नियामक संस्थाओं द्वारा जारी किसी भी आधिकारिक अधिसूचना, परीक्षा परिणाम, एडमिट कार्ड, योजना, तकनीकी लॉन्च या वित्तीय अपडेट पर 2000-2800+ शब्दों का एक संपूर्ण, प्रामाणिक और विस्तृत हिंदी ब्लॉग आर्टिकल लिखना है।

हर आर्टिकल में निम्नलिखित 14 बिंदु 100% शामिल होने चाहिए:
1. 📊 Key Highlights Table (भर्ती बोर्ड, पद, वेतन, अंतिम तिथि, आधिकारिक पोर्टल)
2. 📋 श्रेणीवार रिक्तियों का विस्तृत वर्गीकरण तालिका (UR, OBC, EWS, SC, ST, PwD)
3. 🎓 विस्तृत शैक्षणिक योग्यता एवं पात्रता मापदंड
4. 🎂 आयु सीमा एवं श्रेणीवार छूट तालिका (3 वर्ष, 5 वर्ष, 10 वर्ष)
5. 🏆 चयन प्रक्रिया के 4 चरण (लिखित परीक्षा → स्किल टेस्ट → दस्तावेज सत्यापन → मेडिकल)
6. 📝 विस्तृत परीक्षा पैटर्न, अंक योजना और समय अवधि तालिका
7. 💰 7वें वेतन आयोग के अनुसार इन-हैंड सैलरी स्ट्रक्चर तालिका
8. 📅 90-दिवसीय वैज्ञानिक तैयारी रणनीति (Phase 1, 2, 3)
9. 📲 ऑनलाइन आवेदन करने की 7-स्टेप चरणबद्ध गाइड
10. ⚠️ 7 बड़ी गलतियां जिनसे बचना आवश्यक है
11. 🔗 महत्वपूर्ण आधिकारिक वेब लिंक्स तालिका (100% असली सरकारी लिंक्स)
12. ❓ 10 महत्वपूर्ण FAQs (<details><summary> टैग में)
13. 📌 निष्कर्ष एवं अभ्यर्थियों के लिए संदेश

जब आप आर्टिकल तैयार कर लें, तो सीधे POST https://www.knowora.in/api/publish-from-ai पर secret: "knowora-secret-2026" के साथ JSON भेजकर पब्लिश करें।`
  };

  if (format === 'text' || format === 'markdown') {
    const textOutput = `# Knowora Universal AI Master Blueprint & Feed
**Canonical Domain:** ${payload.canonical_domain}
**Publishing Webhook:** ${payload.webhook_endpoint}
**Webhook Secret:** `knowora-secret-2026`

## Master Instructions for AI Agents
${payload.master_prompt_for_ai}

## JSON API Endpoint
To consume as JSON: `https://www.knowora.in/api/ai-blueprint?format=json`
`;
    return new NextResponse(textOutput, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  return NextResponse.json(payload, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
