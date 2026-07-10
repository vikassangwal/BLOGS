const { PrismaClient } = require('@prisma/client');
const { generateAIContent } = require('./src/lib/ai');

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  let savedKeys = {};
  if (settings && settings.aiApiKey && settings.aiApiKey.startsWith('{')) {
    savedKeys = JSON.parse(settings.aiApiKey);
  }

  function getApiKeyForProvider(p) {
    let key = (savedKeys[p] || '').trim();
    if (!key) {
      const fallback = Object.keys(savedKeys).find(k => 
        !k.includes('Provider') && !k.includes('Model') && !k.includes('Token') && !k.includes('Id') &&
        savedKeys[k] && typeof savedKeys[k] === 'string' && savedKeys[k].length >= 10
      );
      if (fallback) key = String(savedKeys[fallback]).trim();
    }
    return key;
  }

  function buildAgentConfigs(prefix, defaultProvider, defaultModel, defaultTokens) {
    const primaryProvider = savedKeys[`${prefix}Provider`] || settings?.aiProvider || defaultProvider;
    const primaryModel = (savedKeys[`${prefix}Model`] || settings?.aiModel || defaultModel).trim();
    const maxTokens = parseInt(savedKeys[`${prefix}Tokens`]) || defaultTokens;

    const configs = [];
    const key1 = getApiKeyForProvider(primaryProvider);
    if (key1) {
      configs.push({ provider: primaryProvider, apiKey: key1, model: primaryModel });
    }

    const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
    for (const prov of fallbackProviders) {
      const k = (savedKeys[prov] || '').trim();
      if (k && k.length >= 10 && prov !== primaryProvider) {
        const m = prov.startsWith('gemini') ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : prov === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';
        configs.push({ provider: prov, apiKey: k, model: m });
      }
    }

    if (configs.length === 0) {
      const anyKey = getApiKeyForProvider('gemini');
      if (anyKey) {
        configs.push({ provider: 'gemini', apiKey: anyKey, model: 'gemini-2.0-flash' });
      }
    }

    return { configs, maxTokens };
  }

  const researcherConfig = buildAgentConfigs('researcher', 'openrouter', 'google/gemini-2.5-flash', 1500);
  console.log("Config configs length:", researcherConfig.configs.length);
  researcherConfig.configs.forEach((c, i) => {
     console.log(`Config ${i+1}: provider=${c.provider}, model=${c.model}, apiKey startsWith=${c.apiKey.substring(0,5)}`);
  });

  const prompt = `You are a Trending News & Job Alert researcher for India. 
      Respond ONLY with a valid JSON array of exactly 15 strings. No markdown.
      Example format: ["Topic 1", "Topic 2", "Topic 3"]`;
      
  try {
    console.log("\nAttempting generation...");
    const res = await generateAIContent(researcherConfig.configs, "You output strict JSON arrays of 15 strings.", prompt, 1500, false);
    console.log("\n--- RESULT ---");
    console.log(res);
    console.log("--- END ---");
    
    const firstBracket = res.indexOf('[');
    const lastBracket = res.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1) {
        console.log("Error: No JSON array found in AI output");
    } else {
        console.log("Success! Array found.");
    }
  } catch (err) {
    console.error("\n[Test Error] AI Generation failed:", err.message);
  }
}

main().finally(() => prisma.$disconnect());
