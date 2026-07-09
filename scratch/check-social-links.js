const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const links = await prisma.socialLink.findMany();
  console.log("=== ALL SOCIAL LINKS ===");
  console.log(JSON.stringify(links, null, 2));

  // If no links or empty, let's create default ones so the header bar is visible!
  if (links.length === 0) {
    console.log("No social links found! Creating default active links...");
    const created = await Promise.all([
      prisma.socialLink.create({
        data: {
          platform: 'whatsapp',
          label: 'WhatsApp Channel',
          url: 'https://whatsapp.com/channel/example',
          isActive: true
        }
      }),
      prisma.socialLink.create({
        data: {
          platform: 'telegram',
          label: 'Telegram Group',
          url: 'https://t.me/example',
          isActive: true
        }
      }),
      prisma.socialLink.create({
        data: {
          platform: 'instagram',
          label: 'Instagram Page',
          url: 'https://instagram.com/example',
          isActive: true
        }
      })
    ]);
    console.log("Created default social links:", JSON.stringify(created, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
