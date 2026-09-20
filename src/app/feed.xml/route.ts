import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [posts, siteSettings] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: 'Published' },
        orderBy: { publishedAt: 'desc' },
        take: 50,
        include: { author: true, tags: { include: { tag: true } } }
      }),
      prisma.siteSettings.findUnique({ where: { id: 'default' } })
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://knowora.in';
    const siteName = siteSettings?.siteName || 'Knowora';
    const siteTagline = siteSettings?.siteTagline || 'Sarkari Job, Education News & Career Intelligence';

    const feedXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${siteName} | Latest Sarkari Jobs & Education News</title>
    <link>${siteUrl}</link>
    <description>${siteTagline}</description>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <language>hi-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts.map(post => {
      const authorName = post.author?.name || 'Vikas Sangwal';
      const categories = (post.tags || []).map((t: any) => `<category><![CDATA[${t.tag?.name || ''}]]></category>`).join('');
      return `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${siteUrl}/blog/${post.slug}</link>
        <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
        <description><![CDATA[${post.excerpt || 'Read the full article on Knowora...'}]]></description>
        <dc:creator><![CDATA[${authorName}]]></dc:creator>
        <pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
        ${categories}
        ${post.featuredImage ? `<media:content url="${post.featuredImage}" medium="image" />` : ''}
      </item>
      `;
    }).join('')}
  </channel>
</rss>`;

    return new NextResponse(feedXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
