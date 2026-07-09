const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.autoBlogLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  console.log("=== AUTO BLOG LOGS ===");
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
