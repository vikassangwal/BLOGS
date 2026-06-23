import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Try to fetch site settings to get the actual domain if available, otherwise fallback
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-vercel-domain.vercel.app'; // User should update this env var

  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'Published' },
      select: { slug: true, updatedAt: true },
    });

    const blogUrls = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      ...blogUrls,
    ];
  } catch (e) {
    // Fallback if db fails
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
