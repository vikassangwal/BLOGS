const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function makeSuperAdmin() { 
  const user = await prisma.user.update({ 
    where: { email: 'vsangwal54@gmail.com' }, 
    data: { role: 'SUPER_ADMIN' } 
  }); 
  console.log('Updated user:', user.email, 'to role:', user.role); 
} 
makeSuperAdmin().catch(console.error).finally(() => prisma.$disconnect());
