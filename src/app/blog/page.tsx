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

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
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

export default function BlogListingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'var(--color-text-secondary)' }}>Loading Page...</span></div>}>
      <BlogListingClient />
    </Suspense>
  );
}
