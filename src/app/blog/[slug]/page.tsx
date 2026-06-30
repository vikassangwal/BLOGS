import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BlogPostClient from '@/components/BlogPostClient';

type Props = {
  params: Promise<{ slug: string }>;
};

// 1. DYNAMIC METADATA (OPEN GRAPH, TWITTER CARDS, SEO)
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { tags: { include: { tag: true } } }
  });

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const siteName = siteSettings?.siteName || 'Knowora';

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || '';
  const url = `https://knowora.in/blog/${post.slug}`;
  const imageUrl = post.featuredImage || 'https://knowora.in/default-og.png'; // Fallback

  return {
    title: title,
    description: description,
    keywords: post.seoKeywords || '',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_IN',
      type: 'article',
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      authors: post.authorId ? ['Author'] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

// 2. SERVER COMPONENT (DATA FETCHING & SCHEMA INJECTION)
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Fetch all necessary data server-side for immediate HTML rendering (SEO)
  const [post, ads, relatedPostsRaw, siteSettings] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { slug },
      include: { 
        tags: { include: { tag: true } },
        author: { select: { name: true, image: true } }
      }
    }),
    prisma.adPlacement.findMany({ where: { isActive: true } }),
    prisma.blogPost.findMany({
      where: { status: 'Published', slug: { not: slug } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, content: true, featuredImage: true }
    }),
    prisma.siteSettings.findUnique({ where: { id: 'default' } })
  ]);

  if (!post) {
    notFound();
  }

  // Record a view (fire and forget, don't await)
  prisma.blogPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } }
  }).catch(() => {});

  const siteName = siteSettings?.siteName || 'Knowora';
  const url = `https://knowora.in/blog/${post.slug}`;
  const imageUrl = post.featuredImage || 'https://knowora.in/default-og.png';

  // 3. JSON-LD STRUCTURED DATA (NEWS ARTICLE SCHEMA)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.seoTitle || post.title,
    image: [imageUrl],
    datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: [{
      '@type': 'Person',
      name: post.author?.name || `${siteName} Team`,
      url: `https://knowora.in/author/${post.authorId || 'admin'}`
    }],
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: 'https://knowora.in/logo.png'
      }
    },
    description: post.seoDescription || post.excerpt
  };

  return (
    <>
      {/* Inject JSON-LD into the head of the document */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Pass data to the Client Component for interactivity */}
      <BlogPostClient 
        post={post} 
        ads={ads} 
        relatedPosts={relatedPostsRaw} 
      />
    </>
  );
}
