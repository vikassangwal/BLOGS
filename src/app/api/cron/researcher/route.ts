import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    
    if (!settings || !settings.agent11IsActive) {
      return NextResponse.json({ message: 'Agent 11 (Researcher) is inactive.' });
    }

    const { nicheSeedKeywords, targetCountry, researcherModel } = settings;
    if (!nicheSeedKeywords) {
      return NextResponse.json({ message: 'No seed keywords set.' });
    }

    const apiKeys = await prisma.apiKey.findMany({ where: { isActive: true } });
    const aiKey = apiKeys.find(k => k.provider === 'openrouter' || k.provider === 'openai')?.apiKey;

    if (!aiKey) {
       return NextResponse.json({ message: 'No AI key found for researcher.' });
    }

    // Call LLM to generate keywords based on Niche and Country
    const prompt = `Act as an Expert SEO Keyword Researcher. 
    Niche: ${nicheSeedKeywords}
    Target Country: ${targetCountry}
    Generate exactly 3 high-volume, low-competition keywords in this niche that are trending right now.
    Return ONLY a JSON array of strings. Do not include markdown formatting or backticks. Example: ["keyword 1", "keyword 2", "keyword 3"]`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: researcherModel || 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    let keywordsText = data.choices?.[0]?.message?.content || '[]';
    
    // Clean up potential markdown from the response
    keywordsText = keywordsText.replace(/```json/g, '').replace(/```/g, '').trim();

    let keywords = [];
    try {
      keywords = JSON.parse(keywordsText);
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
      const existing = await prisma.autoBlogKeyword.findFirst({ where: { keyword: kw } });
      if (!existing) {
        await prisma.autoBlogKeyword.create({ data: { keyword: kw } });
        added.push(kw);
      }
    }

    return NextResponse.json({ message: 'Research complete.', addedKeywords: added });

  } catch (error: any) {
    console.error('Agent 11 Research Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
