'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Head from 'next/head';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import SmartBanners from '@/components/SmartBanners';
import BlogChatbot from '@/components/BlogChatbot';
import AdInjector from '@/components/AdInjector';

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const [post, setPost] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Fetch post, ads, and related posts in parallel
    Promise.all([
      fetch(`/api/blog/${slug}`).then(res => res.ok ? res.json() : null),
      fetch('/api/ads').then(res => res.ok ? res.json() : []),
      fetch('/api/blog?published=true&limit=3').then(res => res.ok ? res.json() : { posts: [] })
    ]).then(([postData, adsData, relatedData]) => {
      if (!postData) notFound();
      setPost(postData);
      setAds(Array.isArray(adsData) ? adsData : []);
      // Exclude current post from related posts
      const related = (relatedData?.posts || []).filter((p: any) => p.id !== postData.id).slice(0, 3);
      setRelatedPosts(related);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
      notFound();
    });
  }, [slug]);

  const handleTranslate = async (lang: string) => {
    if (!lang) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: post.content, targetLanguage: lang })
      });
      const data = await res.json();
      if (data.translatedHtml) {
        setTranslatedHtml(data.translatedHtml);
      } else {
        alert('Translation failed. Please check AI API configuration.');
      }
    } catch (err) {
      alert('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-accent)' }}>Loading...</div>
      </div>
    );
  }

  if (!post) return null;

  const headerAd = ads.find(a => a.position === 'header');
  const footerAd = ads.find(a => a.position === 'footer');

  const isPremium = post.tags?.includes('Premium');
  let contentHtml = translatedHtml || post.content || '';
  
  if (isPremium && !isUnlocked) {
    // Show only the first 30% of content
    const charLimit = Math.floor(contentHtml.length * 0.3);
    contentHtml = contentHtml.substring(0, charLimit) + '...';
  }

  return (
    <div style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <title>{post.seoTitle || post.title}</title>
      <meta name="description" content={post.seoDescription || post.excerpt} />
      {post.seoKeywords && <meta name="keywords" content={post.seoKeywords} />}

      {/* Header Ad */}
      {headerAd && (
        <div className="ad-container" style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-bg-secondary)' }} dangerouslySetInnerHTML={{ __html: headerAd.adCode }} />
      )}

      <article style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Translate Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <select 
            onChange={(e) => handleTranslate(e.target.value)}
            disabled={isTranslating}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">{isTranslating ? 'Translating...' : 'Translate with AI'}</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
            <option value="Spanish">Spanish (Español)</option>
            <option value="French">French (Français)</option>
            <option value="German">German (Deutsch)</option>
          </select>
        </div>

        {/* Post Header */}
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {post.tags.map((tag: string) => (
                <span key={tag} style={{ background: tag === 'Premium' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-bg-secondary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: tag === 'Premium' ? '#fff' : 'var(--color-accent)' }}>
                  {tag === 'Premium' ? '👑 Premium' : tag}
                </span>
              ))}
            </div>
          )}
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-1px', marginBottom: post.subtitle ? '0.5rem' : '1.5rem' }}>
            {post.title}
          </h1>
          {post.subtitle && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              {post.subtitle}
            </h2>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {post.author?.name && (
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{post.author.name}</span>
            )}
            <span>•</span>
            <time>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
            <span>•</span>
            <span>{Math.ceil((post.content?.length || 0) / 1000)} min read</span>
            {post.autoGenerated && (
              <>
                <span>•</span>
                <span style={{ background: '#f3e8ff', color: '#9333ea', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>✨ AI Generated</span>
              </>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <figure style={{ margin: '0 -2rem 3rem', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative', height: '400px' }}>
            <Image src={post.featuredImage} alt={post.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 800px" />
          </figure>
        )}

        {/* Post Content */}
        <div style={{ position: 'relative' }}>
          <AdInjector htmlContent={contentHtml} />
          
          {/* Premium Paywall Blur */}
          {isPremium && !isUnlocked && (
            <div style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '400px',
              background: 'linear-gradient(to bottom, transparent, var(--color-bg-primary) 80%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '2rem'
            }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '2rem', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', width: '100%'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem 0' }}>👑 Premium Content</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>This article is exclusive to premium subscribers. Unlock it to read the rest.</p>
                <button 
                  onClick={() => setIsUnlocked(true)} 
                  className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', fontWeight: 800 }}
                >
                  Unlock via Razorpay (Demo)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* YMYL Disclaimer */}
        {(post.tags?.includes('Finance & Earning') || post.tags?.includes('Education & Career')) && (
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span> Disclaimer
            </h4>
            <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
              यह जानकारी केवल शैक्षिक उद्देश्यों के लिए है। (This information is for educational purposes only.) Please consult with a certified professional before making any financial or career-altering decisions.
            </p>
          </div>
        )}

        {/* Author Box */}
        <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
            {post.author?.name ? post.author.name.substring(0, 1).toUpperCase() : 'AG'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              Written by {post.author?.name || 'Anti Gravity Team'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {post.author?.name ? `${post.author.name} is a senior editor and subject matter expert.` : 'The Anti Gravity Team consists of industry experts and AI specialists dedicated to bringing you the most accurate and up-to-date information.'}
            </p>
          </div>
        </div>

        {/* Smart Banners */}
        <SmartBanners />

        {/* Lead Capture */}
        <div style={{ marginTop: '4rem' }}>
          <LeadCaptureForm postId={post.id} />
        </div>

        {/* Footer Ad */}
        {footerAd && (
          <div className="ad-container" style={{ textAlign: 'center', marginTop: '3rem' }} dangerouslySetInnerHTML={{ __html: footerAd.adCode }} />
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: '4rem', borderTop: '1px solid var(--color-border)', paddingTop: '3rem' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '2rem' }}>Related Articles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {relatedPosts.map((rp: any) => (
                <a href={`/blog/${rp.slug}`} key={rp.id} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', transition: 'all 0.3s ease' }} className="minimal-card">
                  <div style={{ width: '100%', height: '180px', background: rp.featuredImage ? `url(${rp.featuredImage}) center/cover` : 'linear-gradient(135deg, #1e1e2f, #2d2b42)' }} />
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{rp.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rp.excerpt || rp.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...'}</p>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>Read Article →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Floating Chatbot */}
      <BlogChatbot postId={post.id} postTitle={post.title} />

      <style>{`
        .blog-content h2 { fontSize: 2rem; fontWeight: 700; margin: 2.5rem 0 1rem; color: var(--color-text-primary); letter-spacing: -0.5px; }
        .blog-content h3 { fontSize: 1.5rem; fontWeight: 600; margin: 2rem 0 1rem; color: var(--color-text-primary); }
        .blog-content p { margin-bottom: 1.5rem; }
        .blog-content ul { margin: 0 0 1.5rem 2rem; list-style-type: disc; }
        .blog-content li { margin-bottom: 0.5rem; }
        .blog-content strong { color: var(--color-text-primary); }
        .blog-content a { color: var(--color-accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        .blog-content a:hover { border-bottom-color: var(--color-accent); }
        .blog-content blockquote { border-left: 4px solid var(--color-accent); margin: 2rem 0; padding-left: 1.5rem; font-style: italic; color: var(--color-text-secondary); background: rgba(255,255,255,0.05); border-radius: 8px; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; text-align: left; background: rgba(255,255,255,0.02); border-radius: 8px; overflow: hidden; border-spacing: 0; }
        .blog-content th, .blog-content td { padding: 12px 15px; border-bottom: 1px solid var(--color-border); }
        .blog-content th { background-color: rgba(255,255,255,0.05); font-weight: bold; color: var(--color-text-primary); }
        .blog-content tr:last-of-type td { border-bottom: none; }
      `}</style>
    </div>
  );
}
