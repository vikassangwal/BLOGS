const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (settings && settings.aiApiKey && settings.aiApiKey.startsWith('{')) {
    const keys = JSON.parse(settings.aiApiKey);
    for (const [k, v] of Object.entries(keys)) {
       console.log(`${k}: ${v ? 'SET (length: ' + v.length + ')' : 'EMPTY'}`);
       if (k.startsWith('gemini') || k === 'groq') {
           console.log(`Testing ${k} ... prefix: ${v.substring(0, 4)}...`);
       }
    }
  } else {
    console.log("No JSON keys found in siteSettings.aiApiKey");
  }
}
main().finally(() => prisma.$disconnect());
