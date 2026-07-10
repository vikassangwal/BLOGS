const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const post = await prisma.blogPost.findUnique({
    where: { slug: 'epf-withdrawal-2026-ei0e-3848' }
  });
  
  if (post) {
    fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/1b91d278-c82f-4751-908f-4d6abc593d58/scratch/blog-content.md', post.content);
    console.log('Blog content saved to scratch/blog-content.md');
  } else {
    console.log('Blog post not found!');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
