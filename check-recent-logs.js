const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  console.log("Checking logs created after:", tenMinutesAgo);
  const logs = await prisma.autoBlogLog.findMany({
    where: {
      createdAt: { gte: tenMinutesAgo }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log("Recent logs count:", logs.length);
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
