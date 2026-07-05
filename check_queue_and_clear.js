const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.autoBlogKeyword.count({ where: { status: 'Pending' } });
  console.log('Pending keywords count:', count);
  
  if (count > 0) {
    const pending = await prisma.autoBlogKeyword.findMany({ 
      where: { status: 'Pending' },
      take: 10
    });
    console.log('Top 10 pending:', pending.map(p => p.keyword).join(', '));
    
    // Clear them all so the AI is forced to generate fresh ones right now
    await prisma.autoBlogKeyword.deleteMany({ where: { status: 'Pending' } });
    console.log('Deleted all pending keywords to force fresh generation.');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
