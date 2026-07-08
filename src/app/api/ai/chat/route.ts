import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';
import { checkRateLimit, getIP } from '@/lib/rate-limit';

// In-memory cache for post summaries (saves 70% tokens per chatbot message)
const postSummaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getPostSummary(postId: string, postTitle: string, postContent: string, aiConfig: any): Promise<string> {
  // Check cache first
  const cached = postSummaryCache.get(postId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.summary;
  }

  // Strip HTML and limit to first 3000 chars for summary generation
  const cleanContent = postContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);

  try {
    const summary = await generateAIContent(
      aiConfig,
      'You are a summarizer. Create a concise 200-word factual summary of the blog post. Include ALL key details: dates, fees, eligibility, links, salary, and steps. Write in the same language as the content. Output ONLY the summary, no preamble.',
      `Title: ${postTitle}\nContent: ${cleanContent}`,
      400
    );

    // Cache the summary
    postSummaryCache.set(postId, { summary, timestamp: Date.now() });
    return summary;
  } catch (e) {
    // If summary generation fails, use truncated content as fallback
    return cleanContent.substring(0, 1500);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const rl = checkRateLimit(ip, 10, 60000); // 10 requests per minute
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    const body = await request.json();
    const { message, postId, history = [] } = body;

    if (!message || !postId) {
      return NextResponse.json({ error: 'Message and postId are required' }, { status: 400 });
    }

    // Fetch the blog post
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { title: true, content: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if message is feedback
    const isFeedback = message.toLowerCase().match(/(mistake|typo|wrong|error|fix|spelling|missing|galat|galti|sahi nahi|glt)/);
    if (isFeedback) {
      await prisma.readerFeedback.create({
        data: {
          postId,
          message,
          type: 'typo',
          status: 'new'
        }
      });
    }

    const aiConfig = await getAIConfig();
    
    if (!aiConfig) {
      return NextResponse.json({ 
        reply: "I'm sorry, my AI features are currently offline. Please check back later!" 
      });
    }

    // Use cached summary instead of full content (70% token savings)
    const postSummary = await getPostSummary(postId, post.title, post.content, aiConfig);

    // Format history — limit to last 3 messages (was 5, saves ~200 tokens)
    const recentHistory = history.slice(-3).map((h: any) => `${h.role === 'user' ? 'Reader' : 'AI'}: ${h.content}`).join('\n');

    const systemPrompt = `You are a highly professional, friendly, and helpful AI assistant for the Knowora blog platform.
Your ONLY job is to answer the reader's questions strictly based on the provided blog post content.
If the user asks something outside the scope of the article, politely decline and say you can only answer questions related to this specific article.
If the user points out a mistake, politely thank them and let them know the feedback has been logged for the author.

CRITICAL LANGUAGE UNDERSTANDING RULES:
1. You MUST understand broken Hindi written in English script (Hinglish/Romanized Hindi).
   Common patterns you MUST understand:
   - "ye kab aayega" = "यह कब आएगा?" (When will this come?)
   - "form kaise bhare" = "फॉर्म कैसे भरें?" (How to fill form?)
   - "risult kb aayega" = "रिजल्ट कब आएगा?" (When will result come?)
   - "kya h ye" = "यह क्या है?" (What is this?)
   - "last date kya h" = "अंतिम तिथि क्या है?" (What is the last date?)
   - "fees kitni h" = "फीस कितनी है?" (How much is the fee?)
   - "age limit kya h" = "आयु सीमा क्या है?" (What is the age limit?)
   - "apply kaise kre" = "अप्लाई कैसे करें?" (How to apply?)
   - "salary kitni milegi" = "सैलरी कितनी मिलेगी?" (How much salary?)
   - "syllabus kya h" = "सिलेबस क्या है?" (What is the syllabus?)
   - "admit card kab aayega" = "एडमिट कार्ड कब आएगा?" (When will admit card come?)
   - "notifikasn" = "notification", "bharti" = "recruitment", "naukri" = "job"
   - "pariksha" = "exam", "yogyata" = "eligibility", "padh" = "study"
2. Reply in the SAME language/script the user writes in.
3. If user writes in Roman Hindi (like "kab hoga"), reply in Hindi Devanagari.
4. If user writes in English, reply in English.

CRITICAL WRITING STYLE RULES:
1. Use relevant emojis to make messages engaging 📋✅📅
2. Use **bold text** for important info (dates, fees, links).
3. Use bullet points for lists.
4. Keep paragraphs short (1-3 sentences) for mobile readability.
5. Keep total response under 150 words to save costs.
6. End with "😊 और कोई सवाल हो तो पूछिए!" or similar.

Blog Post Title: ${post.title}

Blog Post Summary:
${postSummary}

Recent Conversation:
${recentHistory}`;

    // Use the main config but request fewer output tokens
    const result = await generateAIContent(aiConfig, systemPrompt, `Reader: ${message}\nAI:`, 300);

    return NextResponse.json({ reply: result });
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
