import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import masterConfig from '@/lib/master-sources-config.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [recentKeywords, latestPosts] = await Promise.all([
      prisma.autoBlogKeyword.findMany({
        where: {
          status: { in: ['research_completed', 'writing_completed', 'published'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }).catch(() => []),
      prisma.blogPost.findMany({
        where: {
          status: 'Published'
        },
        select: {
          id: true,
          title: true,
          slug: true,
          gridBox: true,
          publishedAt: true,
          officialApplyUrl: true,
          seoDescription: true,
          excerpt: true
        },
        orderBy: { publishedAt: 'desc' },
        take: 15
      }).catch(() => [])
    ]);

    const researchPayload = {
      status: 'active',
      generated_at: new Date().toISOString(),
      service: 'Knowora Official Research Engine',
      canonical_domain: 'https://www.knowora.in',
      endpoints: {
        blueprint: 'https://www.knowora.in/ai-blueprint.json',
        publish: 'https://www.knowora.in/api/publish-from-ai',
        feed: 'https://www.knowora.in/api/ai-feed',
        openapi: 'https://www.knowora.in/openapi.json'
      },
      publishing_credentials: {
        secret: 'knowora-secret-2026',
        method: 'POST',
        target_endpoint: 'https://www.knowora.in/api/publish-from-ai'
      },
      active_research_window_hours: 72,
      monitored_sources_count: (masterConfig as any)?.sources?.length || 315,
      active_research_topics: recentKeywords.map(k => ({
        id: k.id,
        keyword: k.keyword,
        niche: k.niche,
        priority: k.priority,
        status: k.status,
        created_at: k.createdAt
      })),
      recent_verified_publications: latestPosts.map(p => ({
        title: p.title,
        url: `https://www.knowora.in/blog/${p.slug}`,
        category: p.gridBox || 'recruitment',
        published_at: p.publishedAt,
        official_source: p.officialApplyUrl || 'https://www.knowora.in',
        summary: p.seoDescription || p.excerpt || ''
      })),
      rules_for_custom_gpt: {
        content_language: 'Hindi (Devanagari) with English technical terms in parentheses',
        min_word_count: 2000,
        facts_policy: 'Never invent dates, vacancies, fees or eligibility. Use official portal data only.',
        active_window: '72 hours for live recruitment, admit card, results and official announcements.'
      }
    };

    return NextResponse.json(researchPayload, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=180'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to generate research.json',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
