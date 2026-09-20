import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BlogPostClient from '@/components/BlogPostClient';

export const revalidate = 60;
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string }>;
};

async function getPostBySlugOrId(rawSlug: string) {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim().replace(/\/$/, '');
  const cleanSlug = decoded.toLowerCase();

  try {
    // 1. Direct exact slug match
    let post = await prisma.blogPost.findUnique({
      where: { slug: decoded },
      include: { 
        tags: { include: { tag: true } },
        author: { select: { name: true } }
      }
    });

    // 2. Case-insensitive slug match
    if (!post) {
      post = await prisma.blogPost.findFirst({
        where: { slug: { equals: cleanSlug, mode: 'insensitive' } },
        include: { 
          tags: { include: { tag: true } },
          author: { select: { name: true } }
        }
      });
    }

    // 3. Fallback: match by ID if slug is a valid ID
    if (!post && (decoded.length === 24 || decoded.length === 25 || decoded.length === 36)) {
      post = await prisma.blogPost.findUnique({
        where: { id: decoded },
        include: { 
          tags: { include: { tag: true } },
          author: { select: { name: true } }
        }
      }).catch(() => null);
    }

    // 4. Fallback: partial / substring slug match
    if (!post) {
      post = await prisma.blogPost.findFirst({
        where: { slug: { contains: cleanSlug.slice(0, 30), mode: 'insensitive' } },
        include: { 
          tags: { include: { tag: true } },
          author: { select: { name: true } }
        }
      });
    }

    return post;
  } catch (err) {
    console.error('Error fetching blog post:', err);
    return null;
  }
}

// 1. DYNAMIC METADATA (OPEN GRAPH, TWITTER CARDS, SEO)
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const post = await getPostBySlugOrId(resolvedParams?.slug || '');

    if (!post) {
      return { title: 'Post Not Found | Knowora' };
    }

    const title = post.seoTitle || post.title || 'Knowora Blog';
    const description = post.seoDescription || post.excerpt || '';
    const url = `https://knowora.in/blog/${post.slug}`;
    const rawImageUrl = post.featuredImage || 'https://knowora.in/default-og.png';

    const safeDate = (d: any) => {
      if (!d) return undefined;
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? undefined : dt.toISOString();
      } catch {
        return undefined;
      }
    };

    const pubDate = safeDate(post.publishedAt) || safeDate(post.createdAt) || new Date().toISOString();

    const modDate = safeDate(post.updatedAt) || pubDate;
    const authorName = post.author?.name || 'Vikas Sangwal';

    return {
      title: title,
      description: description,
      keywords: post.seoKeywords || '',
      authors: [{ name: authorName, url: 'https://knowora.in/about' }],
      alternates: { canonical: url },
      openGraph: {
        title: title,
        description: description,
        url: url,
        siteName: 'Knowora',
        images: [{ url: rawImageUrl, width: 1200, height: 630, alt: title }],
        locale: 'hi_IN',
        type: 'article',
        publishedTime: pubDate,
        modifiedTime: modDate,
        authors: [authorName],
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: description,
        images: [rawImageUrl],
      },
    };
  } catch (err) {
    console.error("Error generating metadata:", err);
    return { title: 'Blog Article | Knowora' };
  }
}

// 2. SERVER COMPONENT (DATA FETCHING & SCHEMA INJECTION)
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams?.slug || '';
  const post = await getPostBySlugOrId(rawSlug);

  if (!post) {
    notFound();
  }

  // Fetch secondary data safely with catch fallbacks
  const [ads, relatedPostsRaw, siteSettings, whatsappLinks] = await Promise.all([
    prisma.adPlacement.findMany({ where: { isActive: true } }).catch(() => []),
    prisma.blogPost.findMany({
      where: { status: 'Published', slug: { not: post.slug } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 4,
      select: { id: true, title: true, slug: true, excerpt: true, featuredImage: true }
    }).catch(() => []),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
    prisma.socialLink.findMany({ where: { platform: 'whatsapp', isActive: true } }).catch(() => [])
  ]);

  const siteName = siteSettings?.siteName || 'Knowora';
  const url = `https://knowora.in/blog/${post.slug}`;
  const imageUrl = post.featuredImage || 'https://knowora.in/default-og.png';

  const toIso = (d: any): string | undefined => {
    if (!d) return undefined;
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? undefined : dt.toISOString();
    } catch {
      return undefined;
    }
  };

  // 3. JSON-LD STRUCTURED DATA (ENHANCED NEWSARTICLE & BLOGPOSTING SCHEMA)
  const contentStr = post.content || '';
  const words = contentStr.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;

  // Extract official government citations for GEO & source grounding
  const citations: string[] = [];
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(contentStr)) !== null) {
    const href = linkMatch[1];
    if (href.includes('.gov.in') || href.includes('.nic.in') || href.includes('upsc.') || href.includes('ssc.') || href.includes('rrb')) {
      if (!citations.includes(href)) citations.push(href);
    }
  }
  if (citations.length === 0) {
    citations.push('https://india.gov.in');
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['BlogPosting', 'NewsArticle'],
    headline: post.seoTitle || post.title,
    image: [imageUrl],
    datePublished: toIso(post.publishedAt) || toIso(post.createdAt) || new Date().toISOString(),
    dateModified: toIso(post.updatedAt) || toIso(post.createdAt) || new Date().toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: ['hi-IN', 'en-IN'],
    wordCount: words,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article p', '.blog-content h2']
    },
    citation: citations.slice(0, 5),
    author: [{
      '@type': 'Person',
      name: post.author?.name || 'Vikas Sangwal',
      jobTitle: 'Founder & Editor-in-Chief',
      url: `https://knowora.in/team/${post.authorId || 'admin'}`
    }],
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: siteName,
      url: 'https://knowora.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://knowora.in/logo.png'
      },
      publishingPrinciples: 'https://knowora.in/editorial-policy',
      correctionsPolicy: 'https://knowora.in/fact-check-policy'
    },
    description: post.seoDescription || post.excerpt
  };

  // Generate FAQ Schema from H2 headings (AEO: up to 450 chars per answer)
  const faqItems: { question: string; answer: string }[] = [];
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  let h2Match;
  while ((h2Match = h2Regex.exec(contentStr)) !== null) {
    const question = h2Match[1].replace(/<[^>]+>/g, '').trim();
    const startIdx = h2Match.index + h2Match[0].length;
    const nextH2 = contentStr.indexOf('<h2', startIdx);
    const answerHtml = contentStr.substring(startIdx, nextH2 === -1 ? startIdx + 800 : nextH2);
    const answer = answerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 450);
    if (question && answer && answer.length > 25) {
      faqItems.push({ question, answer });
    }
  }

  // Generate JobPosting Schema if it is a recruitment page
  const tagNames = (post.tags || []).map((t: any) => t.tag?.name?.toLowerCase() || '');
  const titleLower = (post.title || '').toLowerCase();
  const isJob = tagNames.some((t: string) => t.includes('job') || t.includes('vacancy') || t.includes('career') || t.includes('recruitment')) ||
                titleLower.includes('recruitment') || titleLower.includes('vacancy') || titleLower.includes('भर्ती') || titleLower.includes('नौकरी');

  let jobPostingJsonLd: any = null;
  if (isJob) {
    let orgName = "Government Department";
    let officialOrgUrl = "https://india.gov.in";
    if (titleLower.includes('upsc')) { orgName = "Union Public Service Commission (UPSC)"; officialOrgUrl = "https://upsc.gov.in"; }
    else if (titleLower.includes('ssc')) { orgName = "Staff Selection Commission (SSC)"; officialOrgUrl = "https://ssc.gov.in"; }
    else if (titleLower.includes('ibps')) { orgName = "Institute of Banking Personnel Selection (IBPS)"; officialOrgUrl = "https://ibps.in"; }
    else if (titleLower.includes('railway') || titleLower.includes('rrb')) { orgName = "Railway Recruitment Board (RRB)"; officialOrgUrl = "https://indianrailways.gov.in"; }
    else if (titleLower.includes('sbi')) { orgName = "State Bank of India (SBI)"; officialOrgUrl = "https://sbi.co.in"; }
    else if (titleLower.includes('bpsc')) { orgName = "Bihar Public Service Commission (BPSC)"; officialOrgUrl = "https://bpsc.bih.nic.in"; }
    else if (titleLower.includes('uppsc')) { orgName = "Uttar Pradesh Public Service Commission (UPPSC)"; officialOrgUrl = "https://uppsc.up.nic.in"; }
    else if (titleLower.includes('rpsc')) { orgName = "Rajasthan Public Service Commission (RPSC)"; officialOrgUrl = "https://rpsc.rajasthan.gov.in"; }
    else if (titleLower.includes('rvun') || titleLower.includes('rvunl') || titleLower.includes('jvvn')) { orgName = "Rajasthan Vidyut Nigam (RVUNL)"; officialOrgUrl = "https://energy.rajasthan.gov.in"; }
    else if (titleLower.includes('hssc')) { orgName = "Haryana Staff Selection Commission (HSSC)"; officialOrgUrl = "https://hssc.gov.in"; }
    else if (titleLower.includes('jkssb')) { orgName = "Jammu & Kashmir Services Selection Board (JKSSB)"; officialOrgUrl = "https://jkssb.nic.in"; }
    else if (titleLower.includes('post office') || titleLower.includes('india post')) { orgName = "India Post"; officialOrgUrl = "https://indiapost.gov.in"; }

    const STATES_LIST = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'];
    let stateLocation = "Delhi";
    const matchedState = STATES_LIST.find(s => titleLower.includes(s.toLowerCase()) || tagNames.some(t => t.includes(s.toLowerCase())));
    if (matchedState) {
      stateLocation = matchedState;
    }

    const plainDesc = (post.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500) + '...';

    jobPostingJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: post.title.replace(/संभावित|Upcoming|Expected|आगामी/gi, '').trim(),
      description: post.excerpt || plainDesc,
      datePosted: toIso(post.publishedAt) || toIso(post.createdAt) || new Date().toISOString(),
      validThrough: toIso(post.expiryDate) || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      employmentType: 'FULL_TIME',
      qualifications: "10th / 12th / Graduate / Post Graduate as specified in the official notification",
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: 25500,
          maxValue: 142400,
          unitText: 'MONTH'
        }
      },
      hiringOrganization: {
        '@type': 'Organization',
        name: orgName,
        sameAs: officialOrgUrl
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: stateLocation,
          addressRegion: stateLocation,
          addressCountry: 'IN'
        }
      }
    };
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
          { '@type': 'ListItem', position: 3, name: post.title, item: `https://knowora.in/blog/${post.slug}` }
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

      {/* JobPosting Schema */}
      {jobPostingJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }} />
      )}
      
      {/* Pass data to the Client Component for interactivity */}
      <BlogPostClient 
        post={JSON.parse(JSON.stringify(post))} 
        ads={JSON.parse(JSON.stringify(ads))} 
        relatedPosts={JSON.parse(JSON.stringify(relatedPostsRaw))} 
        whatsappLinks={JSON.parse(JSON.stringify(whatsappLinks))}
        commentsEnabled={siteSettings?.commentsEnabled !== false}
      />
    </>
  );
}
