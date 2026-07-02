import { prisma } from '@/lib/prisma';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'deepseek' | 'openrouter';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

/**
 * Get AI configuration from SiteSettings or ApiKey table
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    // First try SiteSettings
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.aiApiKey) {
      const provider = settings.aiProvider as AIProvider;
      let model = settings.aiModel;
      let apiKeyToUse = settings.aiApiKey.trim();

      try {
        if (apiKeyToUse.startsWith('{')) {
          const parsedKeys = JSON.parse(apiKeyToUse);
          // If we want a specific provider, grab it. Otherwise use the default provider's key
          apiKeyToUse = parsedKeys[provider] || parsedKeys['openai'] || '';
        }
      } catch(e) {}
      
      if (!model) {
        if (provider === 'openai') model = 'gpt-4o-mini';
        else if (provider === 'gemini') model = 'gemini-1.5-pro';
        else if (provider === 'anthropic') model = 'claude-3-haiku-20240307';
        else if (provider === 'deepseek') model = 'deepseek-chat';
        else if (provider === 'openrouter') model = 'meta-llama/llama-3-8b-instruct:free';
        else model = 'gpt-4o-mini';
      }

      if (apiKeyToUse) {
        return {
          provider,
          apiKey: apiKeyToUse,
          model,
        };
      }
    }
    
    // Fallback to ApiKey table
    const apiKey = await prisma.apiKey.findFirst({
      where: { 
        provider: { in: ['openai', 'google_ai', 'anthropic'] },
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (apiKey) {
      const providerMap: Record<string, AIProvider> = {
        'openai': 'openai',
        'google_ai': 'gemini',
        'anthropic': 'anthropic',
        'deepseek': 'deepseek',
        'openrouter': 'openrouter'
      };
      return {
        provider: providerMap[apiKey.provider] || 'openai',
        apiKey: apiKey.apiKey.trim(),
        model: apiKey.provider === 'openai' ? 'gpt-4o-mini' : 
               apiKey.provider === 'google_ai' ? 'gemini-pro' : 
               apiKey.provider === 'deepseek' ? 'deepseek-chat' : 
               apiKey.provider === 'openrouter' ? 'meta-llama/llama-3-8b-instruct:free' : 'claude-3-haiku-20240307',
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      attempt++;
      if (attempt >= maxRetries) return res;
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.warn(`[AI API] Rate limit hit (429). Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      return res;
    }
  }
  return fetch(url, options);
}

/**
 * Call AI API to generate content
 */
export async function generateAIContent(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<string> {
  
  if (config.provider === 'openai') {
    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  if (config.provider === 'gemini') {
    let cleanModel = config.model.toLowerCase();
    if (cleanModel.includes('google/')) cleanModel = cleanModel.replace('google/', '');
    // If it's a random model like openai/gpt-4o-mini or llama, force it to gemini
    if (!cleanModel.includes('gemini')) cleanModel = 'gemini-1.5-flash';
    // Google doesn't have 2.5/2.0 on standard beta endpoints yet
    if (cleanModel.includes('gemini-2.5') || cleanModel.includes('gemini-2.0')) cleanModel = 'gemini-1.5-flash';
    if (!cleanModel) cleanModel = 'gemini-1.5-flash';

    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
        })
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  if (config.provider === 'anthropic') {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }
  
  if (config.provider === 'deepseek') {
    const res = await fetchWithRetry('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  if (config.provider === 'openrouter') {
    const res = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://antigravity.com', // Optional but recommended by OpenRouter
        'X-Title': 'Our Blog',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  throw new Error(`Unsupported AI provider: ${config.provider}`);
}
