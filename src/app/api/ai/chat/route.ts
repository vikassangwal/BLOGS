import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIConfig, generateAIContent } from '@/lib/ai';

export async function POST(request: Request) {
  try {
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
    const isFeedback = message.toLowerCase().match(/(mistake|typo|wrong|error|fix|spelling|missing)/);
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
        result: "I'm sorry, my AI features are currently offline. Please check back later!" 
      });
    }

    // Format history (limit to last 5 messages for context window)
    const recentHistory = history.slice(-5).map((h: any) => `${h.role === 'user' ? 'Reader' : 'AI'}: ${h.content}`).join('\n');

    const systemPrompt = `You are a helpful and polite AI assistant for the Our Blog blog.
Your ONLY job is to answer the reader's questions strictly based on the provided blog post content.
If the user asks something outside the scope of the article, politely decline and say you can only answer questions related to the article.
If the user points out a mistake, thank them and let them know the feedback has been logged for the author.
CRITICAL RULE: Always reply in the exact same language that the Reader is using. For example, if the user asks in Hindi, reply in Hindi. If they ask in Hinglish, reply in Hinglish.
Keep your answers concise, formatted nicely (use bolding or lists if helpful), and friendly.

Blog Post Title: ${post.title}

Blog Post Content:
${post.content.replace(/<[^>]+>/g, ' ').substring(0, 5000)} // stripped HTML, limited to 5k chars

Recent Conversation History:
${recentHistory}`;

    const result = await generateAIContent(aiConfig, systemPrompt, `Reader: ${message}\nAI:`, 500);

    return NextResponse.json({ reply: result });
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
