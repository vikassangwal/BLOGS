const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing social links to re-seed clean defaults
  await prisma.socialLink.deleteMany({});
  console.log("Cleared existing social links.");

  const created = await Promise.all([
    prisma.socialLink.create({
      data: {
        platform: 'whatsapp',
        label: 'WhatsApp Channel',
        url: 'https://whatsapp.com/channel/example',
        isActive: true,
        displayOrder: 1
      }
    }),
    prisma.socialLink.create({
      data: {
        platform: 'telegram',
        label: 'Telegram Group',
        url: 'https://t.me/example',
        isActive: true,
        displayOrder: 2
      }
    }),
    prisma.socialLink.create({
      data: {
        platform: 'youtube',
        label: 'YouTube Channel',
        url: 'https://youtube.com/example',
        isActive: true,
        displayOrder: 3
      }
    }),
    prisma.socialLink.create({
      data: {
        platform: 'instagram',
        label: 'Instagram Page',
        url: 'https://instagram.com/example',
        isActive: true,
        displayOrder: 4
      }
    }),
    prisma.socialLink.create({
      data: {
        platform: 'facebook',
        label: 'Facebook Group',
        url: 'https://facebook.com/example',
        isActive: true,
        displayOrder: 5
      }
    }),
    prisma.socialLink.create({
      data: {
        platform: 'twitter',
        label: 'X (Twitter)',
        url: 'https://x.com/example',
        isActive: true,
        displayOrder: 6
      }
    })
  ]);
  
  console.log("Seeded all 6 social links:", JSON.stringify(created, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
