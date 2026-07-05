const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const failed = await prisma.autoBlogKeyword.findMany({
    where: { status: 'failed' },
    take: 10,
    orderBy: { updatedAt: 'desc' }
  });
  console.log(failed);
}
main().catch(console.error).finally(() => prisma.$disconnect());
