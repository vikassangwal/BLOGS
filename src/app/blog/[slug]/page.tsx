import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BlogPostClient from '@/components/BlogPostClient';

export const revalidate = 600; // Cache for 10 minutes

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
  const rawImageUrl = post.featuredImage || 'https://knowora.in/default-og.png';
  const imageUrl = `https://www.knowora.in/api/og?title=${encodeURIComponent(title)}&bg=${encodeURIComponent(rawImageUrl)}`;

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
  let [post, ads, relatedPostsRaw, siteSettings, whatsappLinks] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { slug },
      include: { 
        tags: { include: { tag: true } },
        author: { select: { name: true } }
      }
    }),
    prisma.adPlacement.findMany({ where: { isActive: true } }),
    prisma.blogPost.findMany({
      where: { status: 'Published', slug: { not: slug } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, featuredImage: true }
    }),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    prisma.socialLink.findMany({ where: { platform: 'whatsapp', isActive: true } })
  ]);

  if (!post) {
    // Smart Fallback: if user typed a short slug or prefix, match it using contains/insensitive
    post = await prisma.blogPost.findFirst({
      where: {
        slug: {
          contains: slug,
          mode: 'insensitive'
        }
      },
      include: { 
        tags: { include: { tag: true } },
        author: { select: { name: true } }
      }
    });
  }

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

  // Generate FAQ Schema from H2 headings
  const faqItems: { question: string; answer: string }[] = [];
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const contentStr = post.content || '';
  let h2Match;
  while ((h2Match = h2Regex.exec(contentStr)) !== null) {
    const question = h2Match[1].replace(/<[^>]+>/g, '').trim();
    // Get text between this H2 and the next H2 (or end), limit to 200 chars
    const startIdx = h2Match.index + h2Match[0].length;
    const nextH2 = contentStr.indexOf('<h2', startIdx);
    const answerHtml = contentStr.substring(startIdx, nextH2 === -1 ? startIdx + 500 : nextH2);
    const answer = answerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
    if (question && answer && answer.length > 20) {
      faqItems.push({ question, answer });
    }
  }

  return (
    <>
      {/* Inject JSON-LD into the head of the document */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://knowora.in' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://knowora.in/blog' },
          { '@type': 'ListItem', position: 3, name: post.title, item: `https://knowora.in/blog/${slug}` }
        ]
      }) }} />

      {/* FAQ Schema */}
      {faqItems.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': faqItems.slice(0, 10).map(faq => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.answer
            }
          }))
        }) }} />
      )}
      
      {/* Pass data to the Client Component for interactivity */}
      <BlogPostClient 
        post={post} 
        ads={ads} 
        relatedPosts={relatedPostsRaw} 
        whatsappLinks={whatsappLinks} 
      />
    </>
  );
}
