const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
  const logs = await prisma.autoBlogLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LAST 5 LOGS:");
  console.log(logs);
  
  const keywords = await prisma.autoBlogKeyword.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LAST 5 KEYWORDS:");
  console.log(keywords);
}

checkLogs().finally(() => prisma.$disconnect());
