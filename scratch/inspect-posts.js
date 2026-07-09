const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // 1. Fetch posts matching Active Jobs query criteria
  const activeJobs = await prisma.blogPost.findMany({
    where: {
      status: 'Published',
      tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career'] } } } },
      NOT: [
        { tags: { some: { tag: { name: { in: ['Upcoming', 'Upcoming Job', 'Agami'] } } } } },
        { title: { contains: 'संभावित' } },
        { title: { contains: 'Upcoming' } }
      ],
      OR: [
        { expiryDate: { gte: now } },
        { expiryDate: null }
      ]
    },
    select: {
      id: true,
      title: true,
      expiryDate: true,
      tags: { select: { tag: { select: { name: true } } } }
    }
  });

  // 2. Fetch posts matching Upcoming Jobs query criteria
  const upcomingJobs = await prisma.blogPost.findMany({
    where: {
      status: 'Published',
      tags: { some: { tag: { name: { in: ['Job', 'Vacancy', 'Career'] } } } },
      OR: [
        { tags: { some: { tag: { name: { in: ['Upcoming', 'Upcoming Job', 'Agami'] } } } } },
        { title: { contains: 'संभावित' } },
        { title: { contains: 'Upcoming' } }
      ]
    },
    select: {
      id: true,
      title: true,
      tags: { select: { tag: { select: { name: true } } } }
    }
  });

  console.log("=== ACTIVE JOBS ===");
  console.log(JSON.stringify(activeJobs, null, 2));

  console.log("\n=== UPCOMING JOBS ===");
  console.log(JSON.stringify(upcomingJobs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
