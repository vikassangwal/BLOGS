const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });
  console.log("LAST 10 POSTS:");
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
