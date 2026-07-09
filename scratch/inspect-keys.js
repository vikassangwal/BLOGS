const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Inspecting site keys structure...');
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings || !settings.aiApiKey) {
      console.log('⚠️ No settings or keys found.');
      return;
    }

    let savedKeys = {};
    try {
      savedKeys = JSON.parse(settings.aiApiKey);
    } catch (e) {
      console.log('❌ Failed to parse aiApiKey as JSON:', e.message);
      return;
    }

    console.log('\nKeys present in JSON:');
    const keys = Object.keys(savedKeys);
    keys.forEach(k => {
      const val = savedKeys[k] ? String(savedKeys[k]).trim() : '';
      console.log(`- Name: "${k}"`);
      console.log(`  Length: ${val.length}`);
      console.log(`  First 8 chars: ${val.slice(0, 8)}`);
      console.log(`  Last 8 chars: ${val.slice(-8)}`);
    });

    // Check if keys are identical
    const gemini1 = (savedKeys['gemini'] || '').trim();
    const gemini2 = (savedKeys['gemini2'] || '').trim();
    const gemini3 = (savedKeys['gemini3'] || '').trim();

    console.log('\nComparison of Gemini keys:');
    console.log(`- gemini key length: ${gemini1.length}`);
    console.log(`- gemini2 key length: ${gemini2.length}`);
    console.log(`- gemini3 key length: ${gemini3.length}`);

    if (gemini1 && gemini2 && gemini1 === gemini2) {
      console.log('🚨 WARNING: gemini and gemini2 are EXACTLY IDENTICAL!');
    } else if (gemini1 && gemini2) {
      console.log('✅ gemini and gemini2 are different keys.');
    }

    if (gemini1 && gemini3 && gemini1 === gemini3) {
      console.log('🚨 WARNING: gemini and gemini3 are EXACTLY IDENTICAL!');
    } else if (gemini1 && gemini3) {
      console.log('✅ gemini and gemini3 are different keys.');
    }

    if (gemini2 && gemini3 && gemini2 === gemini3) {
      console.log('🚨 WARNING: gemini2 and gemini3 are EXACTLY IDENTICAL!');
    } else if (gemini2 && gemini3) {
      console.log('✅ gemini2 and gemini3 are different keys.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
