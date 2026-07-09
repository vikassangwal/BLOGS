const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Count posts grouped by tag name
  const tags = await prisma.tag.findMany({
    select: {
      name: true,
      _count: {
        select: { posts: true }
      }
    }
  });

  console.log("=== TAGS DISTRIBUTION ===");
  console.log(JSON.stringify(tags, null, 2));

  // Find all posts and their tags to see if any rules/guidelines articles exist under other tags
  const posts = await prisma.blogPost.findMany({
    where: { status: 'Published' },
    select: {
      id: true,
      title: true,
      tags: { select: { tag: { select: { name: true } } } }
    }
  });

  console.log("\n=== ALL PUBLISHED POSTS & THEIR TAGS ===");
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
