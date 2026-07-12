const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const siteSettings = await prisma.siteSettings.findFirst({
    where: { id: 'default' }
  });
  if (!siteSettings) {
    console.log("No SiteSettings found!");
    return;
  }
  const keyStr = siteSettings.aiApiKey || '';
  try {
    const parsed = JSON.parse(keyStr);
    const obscured = {};
    for (const key of Object.keys(parsed)) {
      const val = String(parsed[key] || '');
      obscured[key] = val.length > 8 ? `${val.substring(0, 4)}...${val.slice(-4)} (len: ${val.length})` : val;
    }
    console.log("Saved keys in database:", JSON.stringify(obscured, null, 2));
  } catch (e) {
    console.log("Failed to parse API keys as JSON:", keyStr);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
