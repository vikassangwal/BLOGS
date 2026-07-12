const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSettings.findFirst({ where: { id: 'default' } });
  if (!settings || !settings.aiApiKey) return;
  const keys = JSON.parse(settings.aiApiKey);
  const geminiKey = keys.gemini || keys.gemini2 || keys.gemini3;
  if (!geminiKey) return;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Supported Models:");
    if (data.models) {
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Failed to list models:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
