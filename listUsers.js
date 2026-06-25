require('dotenv').config();
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function listUsers() { 
  const users = await prisma.user.findMany(); 
  console.log('Users:');
  users.forEach(u => console.log(u.email, '-', u.role));
  
  if (users.length > 0) {
    const firstUser = users[0];
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'SUPER_ADMIN' }
    });
    console.log('Made', firstUser.email, 'a SUPER_ADMIN');
  }
} 
listUsers().catch(console.error).finally(() => prisma.$disconnect());
