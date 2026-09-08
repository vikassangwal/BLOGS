// scripts/check_short_posts.ts
// This script connects to the Prisma client and scans all blog posts.
// It calculates word count of each post's content and logs posts with fewer than 500 words.

import { prisma } from '../lib/prisma';

async function countWords(text: string): Promise<number> {
  // Strip HTML tags and count words separated by whitespace.
  const plain = text.replace(/<[^>]*>/g, ' ');
  const words = plain.trim().split(/\s+/);
  return words.filter(w => w.length > 0).length;
}

async function findShortPosts() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, title: true, content: true }
  });
  const shortPosts = [] as { id: string; slug: string; title: string; wordCount: number }[];
  for (const p of posts) {
    const wordCount = await countWords(p.content || '');
    if (wordCount < 500) {
      shortPosts.push({ id: p.id, slug: p.slug, title: p.title, wordCount });
    }
  }
  if (shortPosts.length === 0) {
    console.log('✅ No short posts (<500 words) found.');
  } else {
    console.log(`🚩 Found ${shortPosts.length} short post(s) (<500 words):`);
    shortPosts.forEach(p => {
      console.log(`- [${p.id}] ${p.title} (/${p.slug}) – ${p.wordCount} words`);
    });
  }
}

findShortPosts()
  .catch(e => {
    console.error('Error checking short posts:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
