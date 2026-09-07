require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function ensureClickableLinks(html) {
  if (!html) return '';
  let text = html;

  // 1. Convert markdown style links [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer">text</a>
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi, (match, title, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 font-bold underline hover:text-blue-400">👉 ${title}</a>`;
  });

  // 2. Convert plain URLs in table cells or text if not already inside an <a> tag
  // We split by existing tags to avoid double-wrapping inside <a href="...">
  const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/gi);
  for (let i = 0; i < parts.length; i++) {
    // If it's not a tag (i.e. plain text between tags)
    if (parts[i] && !parts[i].startsWith('<')) {
      parts[i] = parts[i].replace(/(https?:\/\/[a-zA-Z0-9.\-_~:\/?#[\]@!$&'()*+,;=%]+)/gi, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 font-bold underline hover:text-blue-400">🔗 ${url}</a>`;
      });
    }
  }
  text = parts.join('');

  // 3. Ensure all existing <a> tags have target="_blank" and rel="noopener noreferrer"
  text = text.replace(/<a\s+(?![^>]*target=)([^>]*href=["'][^"']+["'][^>]*)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');

  return text;
}

async function main() {
  const posts = await prisma.blogPost.findMany();
  console.log('Total posts in database:', posts.length);

  let updatedCount = 0;
  for (const post of posts) {
    const updatedContent = ensureClickableLinks(post.content);
    if (updatedContent !== post.content) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { content: updatedContent }
      });
      updatedCount++;
      console.log(`Updated clickable links in: ${post.slug}`);
    }
  }
  console.log(`All done! Updated ${updatedCount} posts with 100% clickable links.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
