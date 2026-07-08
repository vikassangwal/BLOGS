import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import BlogChatbot from '@/components/BlogChatbot';
export const revalidate = 60; // Revalidate the page every 60 seconds for performance

async function getPostsByTag(tag: string) {
  try {
    return await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: {
          some: {
            tag: {
              name: tag
            }
          }
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

async function getPostsByTags(tags: string[], limit: number = 8) {
  try {
    return await prisma.blogPost.findMany({
      where: {
        status: 'Published',
        tags: {
          some: {
            tag: {
              name: { in: tags }
            }
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        createdAt: true,
        expiryDate: true
      }
    });
  } catch (err) {
    console.error('Failed to fetch posts for tags:', tags, err);
    return [];
  }
}

export default async function HomePage() {
  // Fetch all categories in parallel on the server
  const [
    allPosts, techPosts, eduPosts, financePosts, whatsappLinks, siteSettings,
    latestJobs, admitCards, examResults,
    universityUpdates, govtSchemes, scholarships,
    techMobile, financeBanking, earningCourses
  ] = await Promise.all([
    prisma.blogPost.findMany({ where: { status: 'Published' }, orderBy: { publishedAt: 'desc' }, take: 10, select: { id: true, title: true, slug: true, publishedAt: true, featuredImage: true } }),
    getPostsByTag('Technology'),
    getPostsByTag('Education & Career'),
    getPostsByTag('Finance & Earning'),
    prisma.socialLink.findMany({ where: { platform: 'whatsapp', isActive: true } }),
    prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    getPostsByTags(['Vacancy', 'Career', 'Job'], 8),
    getPostsByTags(['Admit Card'], 8),
    getPostsByTags(['Results', 'Result', 'Answer Key', 'Syllabus'], 8),
    getPostsByTags(['University', 'IGNOU', 'College', 'Admission', 'Counselling', 'State University'], 8),
    getPostsByTags(['Scheme', 'Yojana', 'Government Scheme', 'PM Kisan', 'Sarkari Yojana'], 8),
    getPostsByTags(['Scholarship', 'National Scholarship', 'Scholarships'], 8),
    getPostsByTags(['Technology', 'Smartphone', 'Tech', 'Mobile', 'Gadget'], 8),
    getPostsByTags(['Finance', 'Banking', 'Bank', 'LIC', 'EPFO', 'Savings'], 8),
    getPostsByTags(['Earning', 'Online Earning', 'Course', 'Free Course'], 8)
  ]);

  let apiKeys: any = {};
  try {
    if (siteSettings?.aiApiKey?.startsWith('{')) {
      apiKeys = JSON.parse(siteSettings.aiApiKey);
    }
  } catch (e) {}
  
  const isChatbotActive = apiKeys.chatbotActive !== false;

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
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className="block group">
              <div className="premium-card flex flex-row items-center overflow-hidden p-3 gap-4 hover:bg-white/5 transition-colors border border-white/5 rounded-xl">
                {post.featuredImage && (
                  <div className="w-20 h-20 sm:w-28 sm:h-20 relative bg-gray-900 overflow-hidden rounded-lg flex-shrink-0">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 80px, 112px" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {tag}
                    </span>
                    <p className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors truncate">
                    {post.title}
                  </h3>
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

        {/* Quick Category Links */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/blog?tag=Technology" className="px-5 py-2.5 glass-panel hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white">
            💻 Technology
          </Link>
          <Link href="/blog?tag=Education%20%26%20Career" className="px-5 py-2.5 glass-panel hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white">
            🎓 Education & Career
          </Link>
          <Link href="/blog?tag=Finance%20%26%20Earning" className="px-5 py-2.5 glass-panel hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white">
            💰 Finance & Earning
          </Link>
          <Link href="/blog?tag=News" className="px-5 py-2.5 glass-panel hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white">
            📰 News
          </Link>
          <Link href="/blog" className="px-5 py-2.5 glass-panel hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-full text-sm font-medium transition-all text-gray-300 hover:text-white">
            ✨ View All
          </Link>
        </div>
      </div>

      {/* Sarkari Job Central Grid (सरकारी जॉब ग्रिड) */}
      <div className="max-w-6xl w-full mx-auto mt-20 px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            🎯 Job & Info Portal Grid (सरकारी जॉब एवं जानकारी ग्रिड)
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            लेटेस्ट सरकारी भर्ती, एडमिट कार्ड, परीक्षा परिणाम, विश्वविद्यालय अपडेट्स, और सरकारी योजनाओं की जानकारी एक नज़र में।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Box 1: Latest Jobs */}
          <div className="glass-panel border border-emerald-500/10 hover:border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-emerald-600/20 border-b border-emerald-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                🔥 नवीनतम नौकरियां (Latest Jobs)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {latestJobs.length > 0 ? (
                latestJobs.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      {post.expiryDate && (
                        <p className="text-[9px] text-red-400/80 mt-1 font-medium">
                          ⏰ Last Date: {new Date(post.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No active job listings.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Vacancy" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                View All Jobs →
              </Link>
            </div>
          </div>

          {/* Box 2: Admit Cards */}
          <div className="glass-panel border border-blue-500/10 hover:border-blue-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-blue-600/20 border-b border-blue-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-blue-400 flex items-center gap-2">
                🎟️ एडमिट कार्ड (Admit Cards)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {admitCards.length > 0 ? (
                admitCards.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent admit cards.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Admit%20Card" className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                View All Admit Cards →
              </Link>
            </div>
          </div>

          {/* Box 3: Results & Syllabus */}
          <div className="glass-panel border border-purple-500/10 hover:border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-purple-600/20 border-b border-purple-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                🏆 परिणाम और सिलेबस (Results & Syllabus)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {examResults.length > 0 ? (
                examResults.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent exam results.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Results" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                View All Results →
              </Link>
            </div>
          </div>

          {/* Box 4: University Updates */}
          <div className="glass-panel border border-cyan-500/10 hover:border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-cyan-600/20 border-b border-cyan-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                🎓 विश्वविद्यालय अपडेट्स (University Info)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {universityUpdates.length > 0 ? (
                universityUpdates.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent university updates.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=University" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                View University Info →
              </Link>
            </div>
          </div>

          {/* Box 5: Government Schemes */}
          <div className="glass-panel border border-orange-500/10 hover:border-orange-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-orange-600/20 border-b border-orange-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-orange-400 flex items-center gap-2">
                🎁 सरकारी योजनाएं (Govt Schemes)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {govtSchemes.length > 0 ? (
                govtSchemes.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No active government schemes.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Scheme" className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                View All Schemes →
              </Link>
            </div>
          </div>

          {/* Box 6: Scholarships */}
          <div className="glass-panel border border-yellow-500/10 hover:border-yellow-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-yellow-600/20 border-b border-yellow-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
                🎓 छात्रवृत्ति अलर्ट (Scholarship Alerts)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {scholarships.length > 0 ? (
                scholarships.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-yellow-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No active scholarships.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Scholarship" className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors">
                View Scholarships →
              </Link>
            </div>
          </div>

          {/* Box 7: Tech & Mobile */}
          <div className="glass-panel border border-red-500/10 hover:border-red-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-red-600/20 border-b border-red-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                📱 टेक और गैजेट्स (Tech & Mobiles)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {techMobile.length > 0 ? (
                techMobile.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent tech articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Technology" className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">
                View Tech News →
              </Link>
            </div>
          </div>

          {/* Box 8: Finance & Banking */}
          <div className="glass-panel border border-sky-500/10 hover:border-sky-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-sky-600/20 border-b border-sky-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
                📊 फाइनेंस और बैंकिंग (Finance & Bank)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {financeBanking.length > 0 ? (
                financeBanking.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent finance articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Finance%20%26%20Earning" className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
                View Finance Info →
              </Link>
            </div>
          </div>

          {/* Box 9: Earning & Free Courses */}
          <div className="glass-panel border border-pink-500/10 hover:border-pink-500/30 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md flex flex-col h-[480px]">
            <div className="bg-pink-600/20 border-b border-pink-500/20 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-pink-400 flex items-center gap-2">
                💸 कमाई और फ्री कोर्सेस (Earning & Courses)
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
            </div>
            <div className="p-4 flex-grow overflow-y-auto flex flex-col gap-3.5 scrollbar-thin">
              {earningCourses.length > 0 ? (
                earningCourses.map((post) => {
                  const isNew = post.publishedAt && (new Date().getTime() - new Date(post.publishedAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <div key={post.id} className="group border-b border-white/5 pb-2.5 last:border-0">
                      <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-gray-200 group-hover:text-pink-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                        {isNew && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded animate-pulse whitespace-nowrap">
                            NEW
                          </span>
                        )}
                      </Link>
                      <p className="text-[9px] text-gray-400 mt-1">
                        📅 Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-xs text-center py-10">No recent learning/earning articles.</p>
              )}
            </div>
            <div className="bg-white/2 py-2.5 px-5 text-center border-t border-white/5">
              <Link href="/blog?tag=Earning" className="text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors">
                View Earning Info →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Latest & Trending Sections */}
      <div className="max-w-6xl w-full mx-auto mt-20 pb-10">
        {(techPosts.length > 0 || eduPosts.length > 0 || financePosts.length > 0) ? (
          <>
            <CategorySection title="Trending in Technology" posts={techPosts} tag="Technology" />
            <CategorySection title="Education & Career" posts={eduPosts} tag="Education & Career" />
            <CategorySection title="Finance & Earning" posts={financePosts} tag="Finance & Earning" />
          </>
        ) : (
          <div className="text-center text-gray-500 mt-20 p-10 glass-panel rounded-2xl animate-fade-in">
            <p>More categorized articles coming soon!</p>
          </div>
        )}
      </div>

      {/* Marquee Ticker Section (ptti k rup me) */}
      {allPosts.length > 0 && (
        <div className="w-full mt-10 mb-20 overflow-hidden bg-blue-900/20 py-4 border-y border-blue-500/20 backdrop-blur-md relative flex items-center">
          <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent z-10 pointer-events-none"></div>
          <div className="whitespace-nowrap flex gap-8 items-center" style={{ animation: 'marquee 30s linear infinite' }}>
            {/* Double the array for infinite scroll effect */}
            {[...allPosts, ...allPosts].map((post, i) => (
              <Link href={`/blog/${post.slug}`} key={`${post.id}-${i}`} className="inline-flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-full transition-colors shrink-0">
                <span className="text-blue-400">⚡</span>
                <span className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">{post.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
      
      {/* Global AI Chatbot */}
      {isChatbotActive && <BlogChatbot whatsappLinks={whatsappLinks} />}
    </div>
  );
}
