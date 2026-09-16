import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SECRET_KEY = 'knowora-secret-2026';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ai-secret',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-ai-secret') || '';
  const querySecret = request.nextUrl.searchParams.get('secret') || '';
  return (
    querySecret === SECRET_KEY ||
    headerSecret === SECRET_KEY ||
    authHeader === `Bearer ${SECRET_KEY}`
  );
}

// GET: List all blogs with quality analysis (word counts, errors, missing tables/faqs)
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Please provide valid secret.' }, { status: 401, headers: CORS_HEADERS });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const status = searchParams.get('status'); // Published, Draft
    const search = searchParams.get('search');
    const filterQuality = searchParams.get('filterQuality'); // 'errors_only', 'thin_only'

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [totalCount, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          gridBox: true,
          excerpt: true,
          content: true,
          featuredImage: true,
          seoTitle: true,
          seoDescription: true,
          seoKeywords: true,
          officialApplyUrl: true,
          createdAt: true,
          publishedAt: true,
          viewCount: true
        }
      })
    ]);

    const analyzedPosts = posts.map(post => {
      const plainText = (post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = plainText ? plainText.split(/\s+/).length : 0;
      
      const hasTables = (post.content || '').includes('<table');
      const hasFaqs = (post.content || '').includes('<details') || (post.content || '').includes('FAQ') || (post.content || '').includes('अक्सर पूछे जाने वाले');
      const hasGovLinks = (post.content || '').includes('.gov.in') || (post.content || '').includes('.nic.in');
      const isThin = wordCount < 600;

      const issues: string[] = [];
      if (isThin) issues.push(`Thin content (${wordCount} words; recommended 1500+ words)`);
      if (!hasTables) issues.push('Missing structured data table');
      if (!hasFaqs) issues.push('Missing FAQ section');
      if (!hasGovLinks) issues.push('Missing official (.gov.in / .nic.in) verification link');
      if (!post.featuredImage) issues.push('Missing featured image');
      if (!post.seoDescription) issues.push('Missing SEO description');

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        url: `https://www.knowora.in/blog/${post.slug}`,
        status: post.status,
        gridBox: post.gridBox,
        wordCount,
        quality_status: issues.length === 0 ? 'Excellent' : isThin ? 'Needs Expansion' : 'Needs Optimization',
        issues,
        excerpt: post.excerpt,
        content_preview: plainText.substring(0, 300) + '...',
        createdAt: post.createdAt,
        publishedAt: post.publishedAt
      };
    });

    let filtered = analyzedPosts;
    if (filterQuality === 'errors_only') {
      filtered = analyzedPosts.filter(p => p.issues.length > 0);
    } else if (filterQuality === 'thin_only') {
      filtered = analyzedPosts.filter(p => p.wordCount < 600);
    }

    return NextResponse.json({
      success: true,
      totalCount,
      page,
      limit,
      returnedCount: filtered.length,
      posts: filtered
    }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch blogs' }, { status: 500, headers: CORS_HEADERS });
  }
}
