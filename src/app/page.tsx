import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Revalidate the page every 60 seconds for performance

async function getPostsByTag(tag: string) {
  try {
    return await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: {
          has: tag
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
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
  } catch (err) {
    console.error('Failed to fetch', tag, err);
    return [];
  }
}

export default async function HomePage() {
  // Fetch all categories in parallel on the server
  const [techPosts, eduPosts, financePosts] = await Promise.all([
    getPostsByTag('Technology'),
    getPostsByTag('Education & Career'),
    getPostsByTag('Finance & Earning')
  ]);

  const CategorySection = ({ title, posts, tag }: { title: string, posts: any[], tag: string }) => {
    if (posts.length === 0) return null;
    return (
      <div className="mt-20 w-full animate-slide-up">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <Link href={`/blog?tag=${encodeURIComponent(tag)}`} className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors">
            View All →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className="block group">
              <div className="premium-card h-full flex flex-col overflow-hidden">
                <div className="h-48 relative bg-gray-900 overflow-hidden">
                  {post.featuredImage ? (
                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black opacity-80" />
                  )}
                  <span className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-md">
                    {tag}
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                  </p>
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 py-10">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center animate-slide-up mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-blue-400 mb-8 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          AI-Powered Content Generation is Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Next-Generation <br className="hidden md:block" />
          <span className="premium-gradient-text">Blogging Platform</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Discover expertly curated and AI-assisted insights in Technology, Education & Career, and Finance & Earning. High-quality knowledge for the modern world.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link href="/blog" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            Read Our Articles
          </Link>
        </div>
      </div>

      {/* Latest & Trending Sections */}
      <div className="max-w-6xl w-full mx-auto mt-20 pb-20">
        {(techPosts.length > 0 || eduPosts.length > 0 || financePosts.length > 0) ? (
          <>
            <CategorySection title="Trending in Technology" posts={techPosts} tag="Technology" />
            <CategorySection title="Education & Career" posts={eduPosts} tag="Education & Career" />
            <CategorySection title="Finance & Earning" posts={financePosts} tag="Finance & Earning" />
          </>
        ) : (
          <div className="text-center text-gray-500 mt-20 p-10 glass-panel rounded-2xl animate-fade-in">
            <p>No articles available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
