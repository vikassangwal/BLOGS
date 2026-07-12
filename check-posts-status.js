const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log("Latest Posts:");
  posts.forEach(p => console.log(`- ${p.title} (slug: ${p.slug}, created: ${p.createdAt})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
