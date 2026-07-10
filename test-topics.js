const { PrismaClient } = require('@prisma/client');
const { generateAIContent } = require('./src/lib/ai');

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  let savedKeys = {};
  if (settings && settings.aiApiKey && settings.aiApiKey.startsWith('{')) {
    savedKeys = JSON.parse(settings.aiApiKey);
  }
  console.log("Saved keys keys:", Object.keys(savedKeys));

  const configs = [];
  const fallbackProviders = ['gemini', 'gemini2', 'gemini3', 'openrouter', 'groq', 'openai', 'deepseek'];
  for (const prov of fallbackProviders) {
    const k = (savedKeys[prov] || '').trim();
    if (k && k.length >= 10) {
      const m = prov.startsWith('gemini') ? 'gemini-2.0-flash' : prov === 'groq' ? 'llama-3.3-70b-versatile' : prov === 'openai' ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';
      configs.push({ provider: prov.startsWith('gemini') ? 'gemini' : prov, apiKey: k, model: m });
    }
  }

  console.log(`Found ${configs.length} configs:`, configs.map(c => c.provider));

  if (configs.length === 0) {
    console.log("No configs found");
    return;
  }

  const prompt = `You are a Trending News & Job Alert researcher for India. 
      Respond ONLY with a valid JSON array of exactly 15 strings. No markdown.
      Example format: ["Topic 1", "Topic 2", "Topic 3"]`;
      
  try {
    // Note: ai.ts is TS so we need to run via ts-node, but since we are running in Next.js environment, let's just use ts-node or run via Next's transpilation.
  } catch (err) {
    console.error("AI Error:", err.message);
  }
}

main().finally(() => prisma.$disconnect());
