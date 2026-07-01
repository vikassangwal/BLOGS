const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.autoBlogLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(logs);
}
main().finally(() => prisma.$disconnect());
