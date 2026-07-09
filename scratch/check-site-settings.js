const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking SiteSettings in database...');
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      console.log('⚠️ No SiteSettings record found.');
    } else {
      console.log('Settings found:');
      console.log(`- Site Name: ${settings.siteName}`);
      console.log(`- AI Provider: ${settings.aiProvider}`);
      console.log(`- AI Model: ${settings.aiModel}`);
      console.log(`- AI API Key (masked): ${settings.aiApiKey ? settings.aiApiKey.slice(0, 10) + '...' : 'None'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
