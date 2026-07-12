const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCall(apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: "Say 'Hello' in exactly 1 word." }] }]
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const status = res.status;
    const text = await res.text();
    console.log(`Model: ${model} -> Status: ${status}, Response: ${text.substring(0, 150)}`);
  } catch (e) {
    console.log(`Model: ${model} -> Request Failed:`, e.message);
  }
}

async function main() {
  const settings = await prisma.siteSettings.findFirst({ where: { id: 'default' } });
  if (!settings || !settings.aiApiKey) return;
  const keys = JSON.parse(settings.aiApiKey);
  const geminiKey = keys.gemini || keys.gemini2 || keys.gemini3;
  if (!geminiKey) {
    console.log("No Gemini key found to test.");
    return;
  }
  console.log("Testing with key starting with:", geminiKey.substring(0, 8));
  await testCall(geminiKey, 'gemini-1.5-flash');
  await testCall(geminiKey, 'gemini-2.0-flash');
  await testCall(geminiKey, 'gemini-2.5-flash');
}

main().catch(console.error).finally(() => prisma.$disconnect());
