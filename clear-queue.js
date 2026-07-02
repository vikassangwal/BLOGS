const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.autoBlogKeyword.deleteMany({
    where: { status: 'pending' },
  });
  console.log(`Deleted ${result.count} pending generic keywords.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
