import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'Visual Web Stories | Knowora',
  description: 'Explore visual Web Stories on latest Sarkari Jobs, Tech News, Finance Updates, and Career Guidance.',
  openGraph: {
    title: 'Visual Web Stories | Knowora',
    description: 'Explore visual Web Stories on latest Sarkari Jobs, Tech News, Finance Updates, and Career Guidance.',
    url: 'https://www.knowora.in/web-stories',
    siteName: 'Knowora',
    type: 'website'
  }
};

export default async function WebStoriesListPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'Published' },
    orderBy: { publishedAt: 'desc' },
    take: 24,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true
    }
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-600/20 text-blue-400 font-semibold px-4 py-1.5 rounded-full text-xs uppercase tracking-wider mb-3 border border-blue-500/30">
            ⚡ Instant Visual Updates
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Google Web Stories
          </h1>
          <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            Swipe through full visual updates on Sarkari Jobs, Admit Cards, Tech Releases & Financial News.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {posts.map((post) => (
            <Link 
              key={post.id} 
              href={`/web-stories/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-end aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-xl hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Poster Image */}
              <Image 
                src={post.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=720&h=1280&fit=crop'} 
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

              {/* Story Badge Icon */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
                <span>⚡ Story</span>
              </div>

              {/* Title & Meta */}
              <div className="relative p-3 z-10">
                <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-3 leading-snug group-hover:text-blue-300 transition-colors">
                  {post.title}
                </h2>
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span>Tap to watch</span>
                  <span className="text-blue-400">➔</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
