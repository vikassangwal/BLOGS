require('dotenv').config();
const { PrismaClient } = require('@prisma/client'); 
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient(); 

async function createSuperAdmin() { 
  try {
    const email = 'vsangwal54@gmail.com';
    const password = await bcrypt.hash('Vikas@0502', 12);
    
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      console.log('User exists, updating role...');
      user = await prisma.user.update({
        where: { email },
        data: { role: 'SUPER_ADMIN', isVerified: true, password }
      });
    } else {
      console.log('Creating new SUPER_ADMIN user...');
      user = await prisma.user.create({
        data: {
          name: 'Vikas Sangwal',
          email,
          password,
          role: 'SUPER_ADMIN',
          isVerified: true
        }
      });
    }
    
    console.log('Successfully set up SUPER_ADMIN for:', user.email);
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
} 
createSuperAdmin();
