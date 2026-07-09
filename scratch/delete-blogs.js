const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Connecting to database and preparing to delete all blog posts...');
  
  try {
    // 1. Update all Leads referencing a BlogPost to set postId to null (since there is no cascade delete on Lead)
    const updatedLeads = await prisma.lead.updateMany({
      where: {
        postId: { not: null }
      },
      data: {
        postId: null
      }
    });
    console.log(`✅ Set postId to null for ${updatedLeads.count} Lead records.`);

    // 2. Delete all BlogPosts. ReaderFeedback and PostTag records will be deleted automatically due to Cascade delete constraint.
    const deletedPosts = await prisma.blogPost.deleteMany({});
    console.log(`✅ Successfully deleted ${deletedPosts.count} BlogPost records!`);

    // 3. Clear AutoBlogLog to make it fresh
    const deletedLogs = await prisma.autoBlogLog.deleteMany({});
    console.log(`✅ Successfully deleted ${deletedLogs.count} AutoBlogLog records.`);

    // 4. Reset AutoBlogKeywords to 'pending' if you want them to be reused, or keep as is. Let's reset used keywords to pending so they can be regenerated.
    const resetKeywords = await prisma.autoBlogKeyword.updateMany({
      where: { status: 'used' },
      data: { status: 'pending', usedAt: null, postId: null }
    });
    console.log(`✅ Reset ${resetKeywords.count} used keywords back to 'pending' status for fresh runs.`);

  } catch (error) {
    console.error('❌ Error during deletion process:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database.');
  }
}

main();
