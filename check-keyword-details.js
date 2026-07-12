const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kw = await prisma.autoBlogKeyword.findFirst({
    where: { keyword: "Karnataka VAO Recruitment 2026 Apply Online" }
  });
  console.log("Keyword details:", JSON.stringify(kw, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
