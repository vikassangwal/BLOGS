import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.knowora.in';

  try {
    const [posts, tags, teamMembers] = await Promise.all([
      prisma.blogPost.findMany({
        where: { status: 'Published' },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 1000
      }),
      prisma.tag.findMany({
        select: { name: true }
      }).catch(() => []),
      prisma.teamMember.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true }
      }).catch(() => [])
    ]);

    const blogUrls = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    const webStoryUrls = posts.map((post) => ({
      url: `${baseUrl}/web-stories/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const tagUrls = tags.map((tag) => ({
      url: `${baseUrl}/blog?tag=${encodeURIComponent(tag.name)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    const teamUrls = teamMembers.map((member) => ({
      url: `${baseUrl}/team/${member.id}`,
      lastModified: member.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'always' as const,
        priority: 1.0,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/web-stories`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      },
      {
        url: `${baseUrl}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms-of-service`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      },
      {
        url: `${baseUrl}/disclaimer`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      }
    ];

    return [
      ...staticPages,
      ...blogUrls,
      ...webStoryUrls,
      ...tagUrls,
      ...teamUrls
    ];
  } catch (e) {
    console.error('Error generating dynamic sitemap:', e);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      }
    ];
  }
}
