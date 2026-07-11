import { prisma } from '@/lib/prisma';

// ============================================================================
// UNIVERSAL AI ENGINE — Accepts ANY provider, ANY model, ANY API key
// ============================================================================

export interface AIConfig {
  provider: string;   // Any string: 'openai', 'gemini', 'anthropic', 'deepseek', 'openrouter', 'groq', 'mistral', 'together', 'fireworks', 'perplexity', 'cohere', 'custom', etc.
  apiKey: string;
  model: string;
  baseUrl?: string;   // Custom base URL for unknown/self-hosted providers
}

// ---------------------------------------------------------------------------
// PROVIDER REGISTRY — Auto-detect provider from API key or model name
// ---------------------------------------------------------------------------
interface ProviderProfile {
  name: string;
  baseUrl: string;
  authHeader: (key: string) => Record<string, string>;
  buildBody: (model: string, systemPrompt: string, userPrompt: string, maxTokens: number, enableSearch?: boolean) => any;
  extractContent: (data: any) => string;
  models: string[];           // Known model prefixes for auto-detection
  keyPatterns: RegExp[];       // API key patterns for auto-detection
}

const PROVIDER_REGISTRY: Record<string, ProviderProfile> = {
  // ========================= OPENAI =========================
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['gpt-', 'o1-', 'o3-', 'o4-', 'chatgpt-'],
    keyPatterns: [/^sk-[a-zA-Z0-9_-]{20,}/],
  },

  // ========================= GEMINI =========================
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}',
    authHeader: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max, enableSearch) => {
      const body: any = {
        contents: [{ parts: [{ text: `${sys}\n\n${user}` }] }],
        generationConfig: { maxOutputTokens: max, temperature: 0.7 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      };
      if (enableSearch) {
        body.tools = [{ googleSearch: {} }];
      }
      return body;
    },
    extractContent: (data) => {
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Gemini: Content blocked by safety filters.');
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    models: ['gemini-'],
    keyPatterns: [/^AIza[a-zA-Z0-9_-]{30,}/],
  },

  // ========================= ANTHROPIC =========================
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    authHeader: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    }),
    buildBody: (model, sys, user, max) => ({
      model, max_tokens: max, system: sys,
      messages: [{ role: 'user', content: user }]
    }),
    extractContent: (data) => data.content?.[0]?.text || '',
    models: ['claude-'],
    keyPatterns: [/^sk-ant-/],
  },

  // ========================= DEEPSEEK =========================
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['deepseek-'],
    keyPatterns: [/^sk-[a-f0-9]{32,}/],
  },

  // ========================= OPENROUTER =========================
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    authHeader: (key) => ({
      'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.knowora.in', 'X-Title': 'Knowora Blog'
    }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: [], // OpenRouter uses external model names like 'google/gemini-2.5-flash'
    keyPatterns: [/^sk-or-/],
  },

  // ========================= GROQ =========================
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['llama-', 'llama3-', 'mixtral-', 'gemma-', 'gemma2-'],
    keyPatterns: [/^gsk_/],
  },

  // ========================= MISTRAL =========================
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['mistral-', 'mixtral-', 'codestral-', 'open-mistral-', 'pixtral-'],
    keyPatterns: [/^[a-zA-Z0-9]{32}$/],
  },

  // ========================= TOGETHER AI =========================
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['meta-llama/', 'mistralai/', 'togethercomputer/', 'Qwen/'],
    keyPatterns: [/^[a-f0-9]{64}$/],
  },

  // ========================= FIREWORKS AI =========================
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['accounts/fireworks/'],
    keyPatterns: [/^fw_/],
  },

  // ========================= PERPLEXITY =========================
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['sonar-', 'llama-3.1-sonar-'],
    keyPatterns: [/^pplx-/],
  },

  // ========================= COHERE =========================
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.com/v2/chat',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.message?.content?.[0]?.text || data.text || '',
    models: ['command-'],
    keyPatterns: [/^[a-zA-Z0-9]{40}$/],
  },

  // ========================= XAI (GROK) =========================
  xai: {
    name: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || '',
    models: ['grok-'],
    keyPatterns: [/^xai-/],
  },
};

// ---------------------------------------------------------------------------
// AUTO-DETECT: Guess provider from API key pattern or model name
// ---------------------------------------------------------------------------
function autoDetectProvider(apiKey: string, model: string): string {
  const key = apiKey.trim();
  const mdl = model.toLowerCase().trim();

  // Step 1: Match by API key pattern (most reliable)
  for (const [providerName, profile] of Object.entries(PROVIDER_REGISTRY)) {
    for (const pattern of profile.keyPatterns) {
      if (pattern.test(key)) return providerName;
    }
  }

  // Step 2: Match by model name prefix
  for (const [providerName, profile] of Object.entries(PROVIDER_REGISTRY)) {
    for (const prefix of profile.models) {
      if (mdl.startsWith(prefix.toLowerCase())) return providerName;
    }
  }

  // Step 3: If model contains '/' it's likely OpenRouter format
  if (mdl.includes('/')) return 'openrouter';

  // Step 4: Default fallback
  return 'openai';
}

// ---------------------------------------------------------------------------
// OpenAI-COMPATIBLE FALLBACK: For any unknown provider with a custom base URL
// Most AI APIs follow the OpenAI chat/completions format
// ---------------------------------------------------------------------------
function getOpenAICompatibleProfile(baseUrl: string): ProviderProfile {
  return {
    name: 'Custom AI',
    baseUrl: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    buildBody: (model, sys, user, max) => ({
      model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: max
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || data.content?.[0]?.text || '',
    models: [],
    keyPatterns: [],
  };
}

// ---------------------------------------------------------------------------
// GET AI CONFIG from database
// ---------------------------------------------------------------------------
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.aiApiKey) {
      const provider = settings.aiProvider || 'openai';
      let apiKeyToUse = settings.aiApiKey.trim();

      // Handle JSON-encoded multi-provider keys
      try {
        if (apiKeyToUse.startsWith('{')) {
          const parsedKeys = JSON.parse(apiKeyToUse);
          apiKeyToUse = parsedKeys[provider] || parsedKeys['openai'] || Object.values(parsedKeys).find((v: any) => v && String(v).length > 10) as string || '';
        }
      } catch (e) {}

      if (apiKeyToUse && apiKeyToUse.length >= 10) {
        return { provider, apiKey: apiKeyToUse.trim(), model: settings.aiModel || '' };
      }
    }

    // Fallback to ApiKey table
    const apiKey = await prisma.apiKey.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (apiKey && apiKey.apiKey?.length >= 10) {
      const providerMap: Record<string, string> = { 'google_ai': 'gemini' };
      return {
        provider: providerMap[apiKey.provider] || apiKey.provider,
        apiKey: apiKey.apiKey.trim(),
        model: '',
      };
    }

    return null;
  } catch (error) {
    console.error('[AI Config] Failed to load:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// FETCH WITH RETRY — Exponential backoff for rate limits
// ---------------------------------------------------------------------------
async function fetchWithRetry(url: string, options: any, maxRetries = 5): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout to ensure fallback attempts fit under Vercel 60s limit

      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV || attempt >= maxRetries - 1) return res;
        // Wait 15s for first rate limit, and 30s for subsequent retries to completely clear Google's 1-minute rate limit window!
        const waitTime = (attempt === 0) ? 15000 : 30000;
        console.warn(`[AI Rate Limit] Got 429 from API. Waiting ${waitTime / 1000} seconds before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      return res;
    } catch (error: any) {
      lastError = error;
      if (error.name === 'AbortError') {
        if (attempt >= maxRetries - 1) throw new Error('AI API request timed out (35s)');
        continue;
      }
      if (attempt >= maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastError || new Error('AI API failed after retries');
}

// ---------------------------------------------------------------------------
// PARSE ERROR RESPONSE — Extract meaningful error messages
// ---------------------------------------------------------------------------
async function parseErrorResponse(res: Response, providerName: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = json?.error?.message || json?.message || json?.error || json?.detail || '';
      if (msg) return `${providerName} API error ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
    } catch (e) {}
    if (text.length < 300) return `${providerName} API error ${res.status}: ${text}`;
  } catch (e) {}
  return `${providerName} API error: ${res.status}`;
}

// ---------------------------------------------------------------------------
// TELEGRAM ALERT SYSTEM (P2)
// ---------------------------------------------------------------------------
export async function sendTelegramAlert(message: string) {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings || !settings.aiApiKey) return;
    let keys = {};
    if (settings.aiApiKey.startsWith('{')) keys = JSON.parse(settings.aiApiKey);
    const token = (keys as any).telegramToken;
    const chatId = (keys as any).telegramChatId;
    
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message })
      });
    }
  } catch (e) {
    console.error('[Telegram Alert Failed]', e);
  }
}

// ---------------------------------------------------------------------------
// MAIN: Generate AI Content — Universal for ALL providers (P1: Fallback Array)
// ---------------------------------------------------------------------------
export async function generateAIContent(
  configOrConfigs: AIConfig | AIConfig[],
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000,
  enableSearch: boolean = false,
  minResponseLength: number = 100
): Promise<string> {

  const configs = Array.isArray(configOrConfigs) ? configOrConfigs : [configOrConfigs];
  if (configs.length === 0) throw new Error("No AI config provided.");

  let lastError: Error | null = null;

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    
    // Pre-flight validation
    if (!config.apiKey?.trim()) {
      lastError = new Error(`API Key खाली है। कृपया Admin Panel > Settings में API Key डालें।`);
      continue;
    }

  // Resolve provider: explicit name or auto-detect from key/model
  let providerName = config.provider?.toLowerCase().trim() || autoDetectProvider(config.apiKey, config.model);

  if (providerName === 'gemini2' || providerName === 'gemini3') {
    providerName = 'gemini';
  }

  // Get provider profile (or use OpenAI-compatible fallback)
  let profile = PROVIDER_REGISTRY[providerName];

  if (!profile) {
    // Unknown provider → try as OpenAI-compatible with custom base URL
    if (config.baseUrl) {
      profile = getOpenAICompatibleProfile(config.baseUrl);
      profile.name = providerName || 'Custom AI';
    } else {
      // Auto-detect from key
      const detected = autoDetectProvider(config.apiKey, config.model);
      profile = PROVIDER_REGISTRY[detected];
      if (!profile) {
        // Ultimate fallback: treat as OpenAI-compatible
        profile = getOpenAICompatibleProfile('https://api.openai.com/v1/chat/completions');
        profile.name = 'Unknown Provider';
      }
      providerName = detected;
    }
  }

    // Default model if not specified
    const model = config.model?.trim() || getDefaultModel(providerName);

    // Build request URL
    let url = profile.baseUrl;
    if (providerName === 'gemini') {
      // Gemini uses URL-based auth and model name in URL
      const safeModel = sanitizeGeminiModel(model);
      url = url.replace('{MODEL}', safeModel).replace('{KEY}', config.apiKey.trim());
    }

    // Build request
    const headers = profile.authHeader(config.apiKey.trim());
    const body = profile.buildBody(model, systemPrompt, userPrompt, maxTokens, enableSearch);

    try {
      // Execute with retry: skip retries on Vercel or when multiple fallback configs are available
      const maxAttempts = (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV || configs.length > 1) ? 1 : 3;
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }, maxAttempts);

      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, profile.name));
      }

      const data = await res.json();
      const content = profile.extractContent(data);

      // Check for truncation (hit token limit)
      const finishReason = data?.choices?.[0]?.finish_reason || data?.candidates?.[0]?.finishReason;
      if (finishReason === 'length' || finishReason === 'MAX_TOKENS') {
        console.warn(`[AI] Response was truncated (hit token limit) from ${profile.name}. Output may be incomplete.`);
      }

      if (!content) {
        // Special check for Gemini prompt block
        if (providerName === 'gemini' && data.promptFeedback?.blockReason) {
          throw new Error(`Gemini: Prompt blocked (${data.promptFeedback.blockReason})`);
        }
        throw new Error(`${profile.name} ने खाली response दिया। कृपया दोबारा कोशिश करें।`);
      }

      // Reject suspiciously short responses (likely error messages, not real content)
      if (content.length < minResponseLength) {
        console.warn(`[AI] ${profile.name} returned very short response (${content.length} chars). Trying next provider...`);
        lastError = new Error(`${profile.name} returned insufficient content (${content.length} chars)`);
        continue;
      }

      return content;
    } catch (err: any) {
      console.warn(`[AI] Config ${i + 1}/${configs.length} (${providerName}) failed:`, err.message);
      lastError = err;
      
      // If this is the primary provider and there are fallbacks, send alert!
      if (i === 0 && configs.length > 1) {
        const nextProvider = configs[i+1].provider;
        await sendTelegramAlert(`🚨 CRITICAL: Primary AI API (${providerName}) failed!\nError: ${err.message}\n\nAuto-Switching to Fallback: ${nextProvider} 🔄`);
      }
      
      // Wait 5 seconds before trying the next fallback key (cools down IP rate limits)
      if (i < configs.length - 1) {
        console.log(`⏳ Waiting 5 seconds before trying fallback ${configs[i+1].provider}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Continue to next fallback config
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed.');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.5-flash',
    anthropic: 'claude-sonnet-4-20250514',
    deepseek: 'deepseek-chat',
    openrouter: 'google/gemini-2.0-flash-exp:free',
    groq: 'llama-3.3-70b-versatile',
    mistral: 'mistral-small-latest',
    together: 'meta-llama/Llama-3-70b-chat-hf',
    fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    perplexity: 'sonar',
    cohere: 'command-r-plus',
    xai: 'grok-3-mini',
  };
  return defaults[provider] || 'gpt-4o-mini';
}

function sanitizeGeminiModel(model: string): string {
  let clean = model.toLowerCase().trim();
  if (!clean) return 'gemini-2.5-flash';
  
  // Strip 'google/' prefix if present
  if (clean.startsWith('google/')) {
    clean = clean.replace('google/', '');
  }
  // Strip ':free' or other suffix if present
  if (clean.includes(':')) {
    clean = clean.split(':')[0];
  }
  
  // Map deprecated/expired experimental models to stable production versions
  if (clean.includes('2.0-flash-exp') || clean.includes('2.0-flash')) {
    clean = 'gemini-2.5-flash';
  }
  
  if (!clean.startsWith('gemini-')) return `gemini-${clean}`;
  return clean;
}

// ---------------------------------------------------------------------------
// UTILITY: Get list of all supported providers (for Settings UI dropdown)
// ---------------------------------------------------------------------------
export function getSupportedProviders(): { id: string; name: string; defaultModel: string }[] {
  return Object.entries(PROVIDER_REGISTRY).map(([id, profile]) => ({
    id,
    name: profile.name,
    defaultModel: getDefaultModel(id),
  }));
}

// ---------------------------------------------------------------------------
// UTILITY: Test if an API key works for a given provider
// ---------------------------------------------------------------------------
export async function testAPIKey(provider: string, apiKey: string, model?: string): Promise<{ success: boolean; message: string; provider: string }> {
  try {
    const config: AIConfig = {
      provider,
      apiKey,
      model: model || getDefaultModel(provider),
    };
    const result = await generateAIContent(config, 'You are a test.', 'Say "API working" in exactly 2 words.', 20, false, 1);
    return { success: true, message: `✅ ${provider} API working! Response: "${result.substring(0, 50)}"`, provider };
  } catch (error: any) {
    return { success: false, message: `❌ ${error.message}`, provider };
  }
}

// ---------------------------------------------------------------------------
// UTILITY: Robustly parse a string list/JSON array returned by AI
// ---------------------------------------------------------------------------
export function parseAIJsonArray(rawText: string): string[] {
  let cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  // Attempt 1: Standard JSON parse of bracketed content
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    const bracketed = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(bracketed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Attempt 2: If JSON parse fails, convert single quotes to double quotes
      try {
        const doubleQuoted = bracketed
          .replace(/'/g, '"')
          .replace(/\\"/g, '"');
        const parsed = JSON.parse(doubleQuoted);
        if (Array.isArray(parsed)) return parsed;
      } catch (e2) {
        // Fall through to regex extraction
      }
    }
  }

  // Attempt 3: Regex extraction of quoted strings
  const matches: string[] = [];
  const regex = /(?:"|')([^"'\r\n]+)(?:"|')/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const val = match[1].trim();
    if (val && val.length > 2) {
      matches.push(val);
    }
  }
  
  if (matches.length > 0) return matches;

  // Attempt 4: If no quotes, split by commas or newlines
  const lines = cleaned.split(/[\n,]+/).map(s => s.trim().replace(/^[-*•\d.\s'"]+|['"\s]+$/g, '')).filter(s => s.length > 2);
  if (lines.length > 0) return lines;

  throw new Error("No JSON array found in AI output. AI Output: " + rawText);
}
