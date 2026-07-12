const { PrismaClient } = require('@prisma/client');
const { generateAIContent } = require('./src/lib/ai');
const prisma = new PrismaClient();

async function main() {
  console.log("Loading settings from database...");
  const settings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  
  if (!settings || !siteSettings) {
    console.log("Settings not found!");
    return;
  }
  
  let savedKeys = {};
  if (siteSettings.aiApiKey && siteSettings.aiApiKey.startsWith('{')) {
    savedKeys = JSON.parse(siteSettings.aiApiKey);
  }
  
  console.log("Configured API Keys providers:");
  const geminiInjections = [
    { name: 'gemini3', model: 'gemini-2.0-flash' },
    { name: 'gemini2', model: 'gemini-1.5-flash' },
    { name: 'gemini', model: 'gemini-2.5-flash' }
  ];
  
  const configs = [];
  for (const g of geminiInjections) {
    const k = (savedKeys[g.name] || '').trim();
    if (k && k.length >= 10) {
      configs.push({ provider: g.name, apiKey: k, model: g.model });
      console.log(`- ${g.name} is active (model: ${g.model})`);
    }
  }
  
  if (configs.length === 0) {
    console.log("No active Gemini keys found!");
    return;
  }
  
  console.log("\nStarting local test call to Gemini API via generateAIContent...");
  const sysPrompt = "You are a helpful assistant.";
  const userPrompt = "Reply with 'Local API Check OK' in exactly 4 words.";
  
  try {
    // Map providers to native gemini for the API wrapper to recognize them
    const mappedConfigs = configs.map(c => ({
      provider: c.provider === 'gemini2' || c.provider === 'gemini3' ? 'gemini' : c.provider,
      apiKey: c.apiKey,
      model: c.model
    }));
    
    console.log("Mapped Configs for fetch call:", JSON.stringify(mappedConfigs.map(c => ({ provider: c.provider, model: c.model })), null, 2));
    
    const res = await generateAIContent(mappedConfigs, sysPrompt, userPrompt, 100);
    console.log("\n[SUCCESS] Response from AI:", res);
  } catch (e) {
    console.error("\n[FAILED] AI Generation failed:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
