import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { tool, input } = await request.json();

    if (!tool || !input) {
      return NextResponse.json({ error: 'Tool name and input are required' }, { status: 400 });
    }

    const aiConfig = await getAIConfig();
    
    let prompt = '';
    let systemInstruction = '';

    if (tool === 'seo') {
      systemInstruction = 'You are an Expert SEO Specialist for an Indian News & Jobs Blog.';
      prompt = `Generate a high-converting, SEO-optimized Meta Title, Meta Description, and 10 highly searched Tags for the following topic/article: "${input}"
      
      Respond ONLY in JSON format like this:
      {
        "title": "Hindi Title (English Hook)",
        "description": "Compelling meta description under 160 characters",
        "tags": ["tag1", "tag2", "tag3"]
      }`;
    } else if (tool === 'keyword') {
      systemInstruction = 'You are a Master Keyword Researcher.';
      prompt = `Generate a list of 50 highly searched, low-competition Long-Tail Keywords and LSI keywords in India for the seed keyword: "${input}". 
      Categorize them into 'High Volume', 'Long Tail', and 'Questions (FAQs)'.
      
      Respond ONLY in JSON format like this:
      {
        "highVolume": ["kw1", "kw2"],
        "longTail": ["kw3", "kw4"],
        "questions": ["q1", "q2"]
      }`;
    } else if (tool === 'rank') {
      systemInstruction = 'You are a Google Discover and SEO Ranking Master.';
      prompt = `Provide a secret, highly actionable step-by-step strategy to rank an article on the topic: "${input}" in Google Discover and Top 10 Google Search Results in India.
      Include content gaps, what type of image to use, and exact subheadings to include.
      
      Respond in beautiful Markdown format with emojis.`;
    } else {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }

    const rawResponse = await generateAIContent(aiConfig, systemInstruction, prompt, 2000);

    let resultData = rawResponse;

    if (tool === 'seo' || tool === 'keyword') {
      try {
        const cleanJson = rawResponse.replace(/^```json\n?|```$/g, '').trim();
        resultData = JSON.parse(cleanJson);
      } catch (e) {
        console.error('Failed to parse AI JSON', e);
        // Fallback to raw text if JSON parsing fails
      }
    }

    return NextResponse.json({ result: resultData });

  } catch (error: any) {
    console.error('AI Tool Error:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
