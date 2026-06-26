import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: { author: true }
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://antigravity.com';

    const feedXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Anti Gravity Blog</title>
    <link>${siteUrl}</link>
    <description>Latest insights and articles from Anti Gravity.</description>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts.map(post => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${siteUrl}/blog/${post.slug}</link>
        <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
        <description><![CDATA[${post.excerpt || 'Read the full article...'}]]></description>
        <pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
        ${post.author?.name ? `<author>${post.author.name}</author>` : ''}
        ${post.featuredImage ? `<media:content url="${post.featuredImage}" medium="image" />` : ''}
      </item>
    `).join('')}
  </channel>
</rss>`;

    return new NextResponse(feedXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
