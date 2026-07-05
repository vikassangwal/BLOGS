const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.autoBlogSettings.findFirst();
  console.log("SETTINGS:", settings);
}

main().finally(() => prisma.$disconnect());
