const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'vsangwal54@gmail.com' } });
  console.log('User found:', user ? 'Yes' : 'No');
  if(user) {
    console.log('2FA Enabled:', user.twoFactorEnabled);
    console.log('Locked Until:', user.lockedUntil);
    console.log('Failed Attempts:', user.failedLoginAttempts);
    console.log('Is Verified:', user.isVerified);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
