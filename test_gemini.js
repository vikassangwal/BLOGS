const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  let apiKey = '';
  try {
    const keys = JSON.parse(settings.aiApiKey);
    apiKey = keys.gemini;
  } catch(e) {}

  if (!apiKey) {
    console.log("No gemini key found");
    return;
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  console.log(JSON.stringify(data.models?.map(m => m.name), null, 2));
}

checkModels().catch(console.error).finally(() => prisma.$disconnect());
