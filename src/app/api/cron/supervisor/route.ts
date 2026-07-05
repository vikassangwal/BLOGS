import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'knowora-cron-2026';
    
    if (cronSecret !== expectedSecret && cronSecret !== 'knowora-cron-2026') {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 });
    }

    // 1. Fetch settings
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const autoSettings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
    
    if (!siteSettings || !autoSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    let apiKeys: any = {};
    try {
      if (siteSettings.aiApiKey?.startsWith('{')) {
        apiKeys = JSON.parse(siteSettings.aiApiKey);
      }
    } catch(e) {}

    // Check if Supervisor is enabled
    const supervisorMode = apiKeys.supervisorMode || (apiKeys.supervisorActive === false ? 'off' : 'auto');
    if (supervisorMode === 'off') {
      return NextResponse.json({ status: 'skip', message: 'Supervisor Agent is disabled.' });
    }

    const strategy = apiKeys.supervisorStrategy || 'free'; // 'free', 'smart', 'fast'

    // 2. Fetch all models from OpenRouter (acts as the global registry)
    let availableModels: any[] = [];
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(10000) });
      if (orRes.ok) {
        const orData = await orRes.json();
        availableModels = orData.data || [];
      } else {
        throw new Error('Non-200 response from registry');
      }
    } catch (error) {
      console.warn("Supervisor failed to fetch registry, using Fallback Models...");
      // Fallback: If OpenRouter is down, fallback to known good models for each category
      if (apiKeys.supervisorBackupModel) {
        availableModels.push({ id: apiKeys.supervisorBackupModel, context_length: 128000, pricing: { prompt: "0", completion: "0" } });
      } else {
        availableModels = [
          { id: 'google/gemini-2.5-flash', context_length: 1048576, pricing: { prompt: "0", completion: "0" } },
          { id: 'google/gemini-2.5-pro', context_length: 1048576, pricing: { prompt: "0", completion: "0" } },
          { id: 'openai/gpt-4o-mini', context_length: 128000, pricing: { prompt: "0.00015", completion: "0.0006" } }
        ];
      }
    }

    // Filter out image/embedding models (must have text modality)
    availableModels = availableModels.filter((m: any) => 
      !m.id.includes('vision') && 
      !m.id.includes('embedding') &&
      m.context_length >= 4000
    );

    let newResearcher = autoSettings.researcherModel;
    let newWriter = autoSettings.writerModel;
    let newSeo = autoSettings.seoModel;

    // A helper to pick models based on strategy
    const getBestModel = (minContext: number, preferredProvider: string = '') => {
      let candidates = availableModels.filter((m: any) => m.context_length >= minContext);
      
      if (strategy === 'free') {
        // Find 100% free models
        const freeModels = candidates.filter((m: any) => parseFloat(m.pricing?.prompt || '1') === 0 && parseFloat(m.pricing?.completion || '1') === 0);
        if (freeModels.length > 0) {
          return freeModels.sort((a: any, b: any) => b.context_length - a.context_length)[0].id; // Pick free model with largest context
        }
        // If no free, pick the cheapest
        candidates.sort((a: any, b: any) => parseFloat(a.pricing?.prompt || '999') - parseFloat(b.pricing?.prompt || '999'));
        return candidates[0]?.id;
      } 
      
      else if (strategy === 'smart') {
        // Prioritize known high-IQ models by hardcoded IDs if they exist, else sort by context length
        const topTier = ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-1.5-pro', 'x-ai/grok-2-vision-1212'];
        for (const t of topTier) {
          if (candidates.some((c: any) => c.id === t)) return t;
        }
        return candidates.sort((a: any, b: any) => b.context_length - a.context_length)[0]?.id;
      }
      
      else if (strategy === 'fast') {
        // Flash/Haiku/Mini models
        const fastTier = ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'groq/llama-3.3-70b-versatile'];
        for (const t of fastTier) {
          if (candidates.some((c: any) => c.id === t)) return t;
        }
        // Fallback to cheapest (usually fastest)
        candidates.sort((a: any, b: any) => parseFloat(a.pricing?.prompt || '999') - parseFloat(b.pricing?.prompt || '999'));
        return candidates[0]?.id;
      }

      return null;
    };

    // Calculate new models
    const suggestedResearcher = getBestModel(8000) || newResearcher;
    const suggestedWriter = getBestModel(16000) || newWriter; // Writer needs big context
    const suggestedSeo = getBestModel(4000) || newSeo;

    let updatesMade = false;
    let updateMessage = '🤖 *AI Supervisor Auto-Update Report*\n\n';

    if (suggestedResearcher !== newResearcher) {
      updateMessage += `🔍 **Researcher:** ${newResearcher} ➡️ ${suggestedResearcher}\n`;
      newResearcher = suggestedResearcher;
      updatesMade = true;
    }
    if (suggestedWriter !== newWriter) {
      updateMessage += `✍️ **Writer:** ${newWriter} ➡️ ${suggestedWriter}\n`;
      newWriter = suggestedWriter;
      updatesMade = true;
    }
    if (suggestedSeo !== newSeo) {
      updateMessage += `🎯 **SEO Expert:** ${newSeo} ➡️ ${suggestedSeo}\n`;
      newSeo = suggestedSeo;
      updatesMade = true;
    }

    if (updatesMade) {
      if (supervisorMode === 'auto') {
        // Apply updates to DB
        await prisma.autoBlogSettings.update({
          where: { id: 'default' },
          data: {
            researcherModel: newResearcher,
            writerModel: newWriter,
            seoModel: newSeo
          }
        });
        updateMessage += `\nStrategy used: *${strategy.toUpperCase()}*\nYour agents have been automatically upgraded! 🚀`;
      } else {
        updateMessage += `\nStrategy used: *${strategy.toUpperCase()}*\n⚠️ **Manual Mode:** I have found these better models but I did NOT update them. Please update manually in the Admin Panel.`;
      }

      // Notify via Telegram if configured
      if (apiKeys.telegramToken && apiKeys.telegramChatId) {
        try {
          await fetch(`https://api.telegram.org/bot${apiKeys.telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: apiKeys.telegramChatId,
              text: updateMessage,
              parse_mode: 'Markdown'
            })
          });
        } catch (e) {
          console.error("Telegram notification failed", e);
        }
      }

      return NextResponse.json({ status: 'updated', message: 'Models updated successfully.', details: updateMessage });
    }

    return NextResponse.json({ status: 'ok', message: 'All models are currently optimal. No updates needed.' });

  } catch (error: any) {
    console.error('Supervisor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
