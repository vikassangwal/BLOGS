import { prisma } from '@/lib/prisma';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'deepseek' | 'openrouter';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

// Valid model mappings for each provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  anthropic: 'claude-3-haiku-20240307',
  deepseek: 'deepseek-chat',
  openrouter: 'meta-llama/llama-3-8b-instruct:free',
};

/**
 * Validate and sanitize model name for a given provider
 */
function sanitizeModel(provider: AIProvider, model: string): string {
  if (!model || !model.trim()) return DEFAULT_MODELS[provider];
  
  const clean = model.toLowerCase().trim();
  
  if (provider === 'gemini') {
    // Only allow known working Gemini models
    if (clean.includes('gemini-2.0-flash')) return 'gemini-2.0-flash';
    if (clean.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
    if (clean.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
    // Everything else (2.5, invalid names) → safe fallback
    return 'gemini-1.5-flash';
  }
  
  return model.trim();
}

/**
 * Validate API key format (basic sanity check)
 */
function isValidApiKey(key: string): boolean {
  if (!key || !key.trim()) return false;
  if (key.trim().length < 10) return false;
  if (key.includes(' ') && !key.startsWith('sk-')) return false;
  return true;
}

/**
 * Get AI configuration from SiteSettings or ApiKey table
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    // First try SiteSettings
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.aiApiKey) {
      const provider = (settings.aiProvider as AIProvider) || 'openai';
      let apiKeyToUse = settings.aiApiKey.trim();

      // Handle JSON-encoded multi-provider keys
      try {
        if (apiKeyToUse.startsWith('{')) {
          const parsedKeys = JSON.parse(apiKeyToUse);
          apiKeyToUse = parsedKeys[provider] || parsedKeys['openai'] || '';
        }
      } catch(e) {
        // If JSON parse fails, use the raw key as-is
      }
      
      const model = sanitizeModel(provider, settings.aiModel || '');

      if (isValidApiKey(apiKeyToUse)) {
        return { provider, apiKey: apiKeyToUse.trim(), model };
      }
    }
    
    // Fallback to ApiKey table
    const apiKey = await prisma.apiKey.findFirst({
      where: { 
        provider: { in: ['openai', 'google_ai', 'anthropic', 'deepseek', 'openrouter'] },
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (apiKey && isValidApiKey(apiKey.apiKey)) {
      const providerMap: Record<string, AIProvider> = {
        'openai': 'openai',
        'google_ai': 'gemini',
        'anthropic': 'anthropic',
        'deepseek': 'deepseek',
        'openrouter': 'openrouter'
      };
      const mappedProvider = providerMap[apiKey.provider] || 'openai';
      return {
        provider: mappedProvider,
        apiKey: apiKey.apiKey.trim(),
        model: DEFAULT_MODELS[mappedProvider],
      };
    }
    
    return null;
  } catch (error) {
    console.error('[AI Config] Failed to load AI configuration:', error);
    return null;
  }
}

/**
 * Fetch with automatic retry on 429 (Rate Limit) errors
 * Uses exponential backoff: 2s, 4s, 8s (total ~14s, safe for Vercel 60s limit)
 */
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout per request
      
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.status === 429) {
        if (attempt >= maxRetries - 1) return res; // Last attempt, return 429
        const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.warn(`[AI API] Rate limit (429). Retry ${attempt + 1}/${maxRetries} in ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return res;
    } catch (error: any) {
      lastError = error;
      if (error.name === 'AbortError') {
        console.error(`[AI API] Request timed out (attempt ${attempt + 1})`);
        if (attempt >= maxRetries - 1) throw new Error('AI API request timed out after 45 seconds');
        continue;
      }
      if (attempt >= maxRetries - 1) throw error;
      // Network error, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw lastError || new Error('AI API request failed after all retries');
}

/**
 * Parse API error response for better error messages
 */
async function parseErrorResponse(res: Response, providerName: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json?.error?.message || json?.message || json?.error || '';
      if (msg) return `${providerName} API error ${res.status}: ${msg}`;
    } catch(e) {
      // Not JSON
    }
    if (text.length < 200) return `${providerName} API error ${res.status}: ${text}`;
  } catch(e) {
    // Could not read body
  }
  return `${providerName} API error: ${res.status}`;
}

/**
 * Call AI API to generate content — supports OpenAI, Gemini, Anthropic, DeepSeek, OpenRouter
 */
export async function generateAIContent(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<string> {
  
  // Pre-flight validation
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error(`API Key खाली है। कृपया Admin Panel > Settings में ${config.provider} की API Key डालें।`);
  }
  
  if (!config.provider) {
    throw new Error('AI Provider सेट नहीं है। कृपया Admin Panel > Settings में Provider चुनें।');
  }

  const model = sanitizeModel(config.provider, config.model);

  // ===================== OPENAI =====================
  if (config.provider === 'openai') {
    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res, 'OpenAI'));
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('OpenAI ने खाली response दिया। कृपया दोबारा कोशिश करें।');
    return content;
  }
  
  // ===================== GEMINI =====================
  if (config.provider === 'gemini') {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        })
      }
    );
    if (!res.ok) throw new Error(await parseErrorResponse(res, 'Gemini'));
    const data = await res.json();
    
    // Check for safety blocks
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      console.warn('[Gemini] Content blocked by safety filters');
      throw new Error('Gemini ने content को safety reasons से block कर दिया। कृपया दोबारा कोशिश करें।');
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content) {
      // Check for blocked prompt
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Gemini error: Prompt blocked (${data.promptFeedback.blockReason})`);
      }
      throw new Error('Gemini ने खाली response दिया। कृपया दोबारा कोशिश करें।');
    }
    return content;
  }
  
  // ===================== ANTHROPIC =====================
  if (config.provider === 'anthropic') {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res, 'Anthropic'));
    const data = await res.json();
    const content = data.content?.[0]?.text || '';
    if (!content) throw new Error('Anthropic ने खाली response दिया। कृपया दोबारा कोशिश करें।');
    return content;
  }
  
  // ===================== DEEPSEEK =====================
  if (config.provider === 'deepseek') {
    const res = await fetchWithRetry('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res, 'DeepSeek'));
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('DeepSeek ने खाली response दिया। कृपया दोबारा कोशिश करें।');
    return content;
  }
  
  // ===================== OPENROUTER =====================
  if (config.provider === 'openrouter') {
    const res = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`,
        'HTTP-Referer': 'https://www.knowora.in',
        'X-Title': 'Knowora Blog',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res, 'OpenRouter'));
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('OpenRouter ने खाली response दिया। कृपया दोबारा कोशिश करें।');
    return content;
  }
  
  throw new Error(`असमर्थित AI Provider: ${config.provider}। कृपया Settings में OpenAI, Gemini, Anthropic, DeepSeek, या OpenRouter चुनें।`);
}
