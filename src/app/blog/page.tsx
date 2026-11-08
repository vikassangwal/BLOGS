import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import BlogListingClient from '@/components/BlogListingClient';

export const revalidate = 600; // Cache for 10 minutes

type Props = {
  searchParams: Promise<{ tag?: string; search?: string; qualification?: string }>;
};

export async function generateMetadata(
  { searchParams }: Props
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const tag = resolvedSearchParams.tag;
  const search = resolvedSearchParams.search;
  const qual = resolvedSearchParams.qualification;

  let siteSettings = null;
  try {
    siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {
    console.error("Prisma error in generateMetadata:", e);
  }
  const siteName = siteSettings?.siteName || 'Knowora';

  let title = `Latest Articles & Updates | ${siteName}`;
  let description = `Discover informative articles and updates on ${siteName}.`;

  if (tag) {
    if (tag.toLowerCase().includes('education') || tag.toLowerCase().includes('career')) {
      title = `Sarkari Results, Admit Cards, Latest Job Vacancy Alerts | ${siteName}`;
      description = `Get instant notifications for active government recruitments, admit cards, exam results, and eligibility criteria details on ${siteName}.`;
    } else if (tag.toLowerCase().includes('tech')) {
      title = `Tech News, AI Tools, Smart Devices & Reviews | ${siteName}`;
      description = `Read about trending technologies, artificial intelligence breakthroughs, gadget reviews, and mobile software updates.`;
    } else if (tag.toLowerCase().includes('finance') || tag.toLowerCase().includes('earning')) {
      title = `Government Schemes, Banking & Online Earning Guide | ${siteName}`;
      description = `Learn about public savings schemes, banking sector updates, online career courses, and personal finance management tools.`;
    } else {
      title = `${tag} Articles & Latest Updates | ${siteName}`;
      description = `Explore high-quality insights, guides, and tutorials categorized under ${tag} on ${siteName}.`;
    }
  } else if (search) {
    title = `Search Results for "${search}" | ${siteName}`;
    description = `Browse articles and guides matching search query: "${search}" on ${siteName}.`;
  } else if (qual) {
    title = `Sarkari Jobs for ${qual} | ${siteName}`;
    description = `Find government recruitment updates, online application links, and vacancies specifically matching educational qualification: ${qual}.`;
  } else {
    description = siteSettings?.seoDescription || description;
    title = siteSettings?.seoTitle || title;
  }

  return {
    title: title,
    description: description,
    alternates: {
      canonical: `https://knowora.in/blog${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`,
    },
    openGraph: {
      title: title,
      description: description,
      url: `https://knowora.in/blog`,
      siteName: siteName,
      type: 'website',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
    }
  };
}

export default async function BlogListingPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const tag = resolvedSearchParams?.tag;
  const search = resolvedSearchParams?.search;
  const qual = resolvedSearchParams?.qualification;

  let siteSettings = null;
  let initialPosts: any[] = [];
  let initialTotalPages = 1;

  try {
    siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

    const where: any = { status: 'Published' };
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (qual && qual !== 'All Qualifications') {
      where.qualifications = { has: qual };
    }

    const [rawPosts, count] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        take: 12,
        orderBy: { publishedAt: 'desc' },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true } }
        }
      }),
      prisma.blogPost.count({ where })
    ]);

    initialTotalPages = Math.ceil(count / 12) || 1;
    initialPosts = rawPosts.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || (p.content ? p.content.replace(/<[^>]+>/g, ' ').slice(0, 160).trim() + '...' : ''),
      featuredImage: p.featuredImage || '/default-og.png',
      tags: p.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : p.createdAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
      applyStartDate: p.applyStartDate ? p.applyStartDate.toISOString() : null,
      applyLastDate: p.applyLastDate ? p.applyLastDate.toISOString() : null,
      expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
      vacancyCount: p.vacancyCount || null,
      qualifications: p.qualifications || [],
      jobStates: p.jobStates || [],
      officialApplyUrl: p.officialApplyUrl || null,
      author: p.author ? { name: p.author.name } : { name: 'Vikas Sangwal' }
    }));
  } catch (e) {
    console.error("Prisma error in BlogListingPage:", e);
  }
  
  let uiConfig: any = {};
  try {
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      uiConfig = JSON.parse(siteSettings.aiApiKey);
    }
  } catch (e) {}

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'var(--color-text-secondary)' }}>Loading Page...</span></div>}>
      <BlogListingClient uiConfig={uiConfig} initialPosts={initialPosts} initialTotalPages={initialTotalPages} />
    </Suspense>
  );
}
