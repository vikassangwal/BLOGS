import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const id = decodeURIComponent(resolved?.id || '');
  const authorName = id === 'admin' || id.toLowerCase().includes('vikas') ? 'Vikas Sangwal' : id;

  return {
    title: `${authorName} — Author & Editorial Profile | Knowora`,
    description: `Read official government recruitment analyses, exam updates, and educational guides published by ${authorName} at Knowora.`,
    alternates: {
      canonical: `https://knowora.in/author/${encodeURIComponent(id)}`,
    },
    openGraph: {
      title: `${authorName} — Editorial Profile | Knowora`,
      description: `Official author profile and verified articles by ${authorName} on Knowora.`,
      url: `https://knowora.in/author/${encodeURIComponent(id)}`,
      siteName: 'Knowora',
      type: 'profile',
      locale: 'hi_IN',
    },
  };
}

export default async function AuthorProfilePage({ params }: Props) {
  const resolved = await params;
  const rawId = decodeURIComponent(resolved?.id || '');

  // 1. Fetch author details or team member from Prisma
  let authorName = 'Vikas Sangwal';
  let authorRole = 'Founder & Editor-in-Chief';
  let authorBio = 'Vikas Sangwal is the Founder & Editor-in-Chief of Knowora. With over 7 years of specialized experience in tracking Indian competitive examinations, Central & State recruitment policies, and educational guidelines, he leads the Knowora editorial and fact-checking desk to ensure 100% authentic, gazette-verified reporting.';
  let authorImage = '/logo.png';

  try {
    const member = await prisma.teamMember.findFirst({
      where: {
        OR: [
          { id: rawId },
          { name: { contains: rawId, mode: 'insensitive' } }
        ]
      }
    });

    if (member) {
      authorName = member.name;
      authorRole = member.role;
      if (member.bio) authorBio = member.bio;
      if (member.imageUrl) authorImage = member.imageUrl;
    }
  } catch (e) {
    console.error('Error fetching author:', e);
  }

  // 2. Fetch author's published blog posts
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: {
        status: 'Published'
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        createdAt: true
      }
    });
  } catch (e) {
    console.error('Error fetching author posts:', e);
  }

  // 3. E-E-A-T Person JSON-LD Schema
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: authorName,
      jobTitle: authorRole,
      description: authorBio,
      image: `https://knowora.in${authorImage}`,
      url: `https://knowora.in/author/${encodeURIComponent(rawId)}`,
      worksFor: {
        '@type': 'NewsMediaOrganization',
        name: 'Knowora',
        url: 'https://knowora.in',
        publishingPrinciples: 'https://knowora.in/editorial-policy'
      },
      knowsAbout: [
        'Staff Selection Commission (SSC)',
        'Union Public Service Commission (UPSC)',
        'Railway Recruitment Boards (RRB)',
        'State PSC Examinations',
        '7th Central Pay Commission Pay Matrix',
        'Indian Education Policy'
      ],
      sameAs: [
        'https://knowora.in/about',
        'https://twitter.com/KnoworaIn'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Author Profile Header Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-blue-500/30 shadow-lg bg-neutral-800 flex-shrink-0">
              <Image
                src={authorImage}
                alt={authorName}
                fill
                className="object-cover"
                sizes="144px"
              />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
                <span>Verified Official Editor</span>
                <span>•</span>
                <span>E-E-A-T Certified</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                {authorName}
              </h1>
              
              <p className="text-blue-400 font-medium text-base mb-4">
                {authorRole} at Knowora
              </p>
              
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
                {authorBio}
              </p>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-xs font-medium text-neutral-400">
                <span className="bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">🎯 UPSC / SSC / RRB Expert</span>
                <span className="bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">📜 Gazette Verified Reporting</span>
                <span className="bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">🛡️ 100% Anti-Scam Guard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Author Articles Grid */}
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Articles & Verified Notices by {authorName}
              </h2>
              <p className="text-neutral-400 text-sm mt-1">
                Latest updates, application deadlines, syllabus, and results
              </p>
            </div>
            <Link
              href="/blog"
              className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All Blog Posts →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all duration-200 hover:-translate-y-1 flex flex-col"
              >
                {post.featuredImage && (
                  <div className="relative aspect-video w-full bg-neutral-800 overflow-hidden">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="text-xs text-neutral-500 mb-2">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString('hi-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-neutral-400 line-clamp-2 flex-1">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-blue-400 font-medium">
                    <span>पूरा आर्टिकल पढ़ें</span>
                    <span>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
