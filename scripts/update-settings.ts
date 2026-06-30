import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName: 'Knowora',
      siteTagline: 'Stay Ahead with the Latest Knowledge & Updates',
      adminEmail: 'contact@knowora.in',
      seoTitle: 'Knowora | Latest News, Education, Tech & Career Updates',
      seoDescription: 'Welcome to Knowora - Your trusted source for the latest news, expert insights on education, career guidance, technology trends, and finance updates. Stay informed, stay ahead!'
    },
    create: {
      id: 'default',
      siteName: 'Knowora',
      siteTagline: 'Stay Ahead with the Latest Knowledge & Updates',
      adminEmail: 'contact@knowora.in',
      seoTitle: 'Knowora | Latest News, Education, Tech & Career Updates',
      seoDescription: 'Welcome to Knowora - Your trusted source for the latest news, expert insights on education, career guidance, technology trends, and finance updates. Stay informed, stay ahead!'
    }
  });
  console.log('Settings updated successfully in the database!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
