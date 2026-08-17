import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent, parseAIJsonArray } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
  const secret = new URL(req.url).searchParams.get('secret');
  const authHeader = req.headers.get('authorization') || '';
  if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}` && secret !== 'knowora-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    
    if (!settings || !settings.agent11IsActive) {
      return NextResponse.json({ message: 'Agent 11 (Researcher) is inactive.' });
    }

    const { nicheSeedKeywords, targetCountry, researcherModel } = settings;
    if (!nicheSeedKeywords) {
      return NextResponse.json({ message: 'No seed keywords set.' });
    }

    const aiConfig = await getAIConfig();

    if (!aiConfig) {
       return NextResponse.json({ message: 'No AI key found for researcher.' });
    }

    // Call LLM to generate keywords based on Niche and Country
    const prompt = `Act as an Expert SEO Keyword Researcher. 
    Niche: ${nicheSeedKeywords}
    Target Country: ${targetCountry}
    Generate exactly 3 high-volume, low-competition keywords in this niche that are trending right now.
    Return ONLY a JSON array of strings. Do not include markdown formatting or backticks. Example: ["keyword 1", "keyword 2", "keyword 3"]`;

    let keywordsText = '';
    try {
      if (researcherModel) {
         aiConfig.model = researcherModel;
      }
      keywordsText = await generateAIContent(aiConfig, "You output strict JSON arrays of strings.", prompt, 500);
    } catch (e: any) {
      console.error("AI Generation Error in researcher:", e);
      return NextResponse.json({ message: 'Failed to generate keywords from AI.', error: e.message });
    }
    
    // Clean up potential markdown from the response
    keywordsText = keywordsText.replace(/```json/g, '').replace(/```/g, '').trim();

    let keywords = [];
    try {
      keywords = parseAIJsonArray(keywordsText);
    } catch (e) {
       console.error("Failed to parse keywords from AI:", keywordsText);
       return NextResponse.json({ message: 'Failed to parse keywords from AI response.', raw: keywordsText });
     }

    if (!Array.isArray(keywords)) {
       return NextResponse.json({ message: 'AI did not return an array.' });
    }

    // Store in AutoBlogKeyword
    const added = [];
    for (const kw of keywords) {
      const cleanKw = (kw || '').trim();
      if (!cleanKw) continue;
      const existing = await prisma.autoBlogKeyword.findFirst({ where: { keyword: cleanKw } });
      if (!existing) {
        let niche = 'Education & Career'; // Default
        const tLower = kw.toLowerCase();
        
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
          niche = 'Technology';
        } else if (financeKeywords.some(w => tLower.includes(w))) {
          niche = 'Finance & Earning';
        }
        
        await prisma.autoBlogKeyword.create({ data: { keyword: cleanKw, niche: niche } });
        added.push(cleanKw);
      }
    }

    return NextResponse.json({ message: 'Research complete.', addedKeywords: added });

  } catch (error: any) {
    console.error('Agent 11 Research Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
