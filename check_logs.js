const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.autoBlogLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LOGS:");
  console.log(logs);

  const keywords = await prisma.autoBlogKeyword.count({
    where: { status: 'pending' }
  });
  console.log("PENDING KEYWORDS:", keywords);
}

main().finally(() => prisma.$disconnect());
