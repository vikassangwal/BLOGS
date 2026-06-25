'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LeadCaptureForm from '@/components/LeadCaptureForm';

export default function BlogListingPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/blog', window.location.origin);
      url.searchParams.append('published', 'true');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '9');
      if (search) url.searchParams.append('search', search);
      if (activeTag) url.searchParams.append('tag', activeTag);

      const res = await fetch(url.toString());
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);

      // Extract unique tags from current data if tags aren't loaded yet
      if (tags.length === 0) {
        const allTags = new Set<string>();
        data.posts?.forEach((p: any) => p.tags?.forEach((t: string) => allTags.add(t)));
        setTags(Array.from(allTags));
      }
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, activeTag]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPosts();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Hero Section */}
      <section style={{
        padding: '6rem 2rem 4rem',
        background: 'linear-gradient(to bottom, rgba(0,102,204,0.05) 0%, rgba(0,0,0,0) 100%)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1px' }}>
          Insights & <span style={{ color: 'var(--color-accent)' }}>Innovations</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Discover the latest articles on AI, automation, business growth, and technology trends.
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: '500px', margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              borderRadius: '30px',
              border: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.2s, border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
          />
          <span style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setActiveTag('')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeTag === '' ? 'var(--color-accent)' : 'var(--color-border)',
              background: activeTag === '' ? 'var(--color-accent)' : 'transparent',
              color: activeTag === '' ? '#fff' : 'var(--color-text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            All
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeTag === tag ? 'var(--color-accent)' : 'var(--color-border)',
                background: activeTag === tag ? 'var(--color-accent)' : 'transparent',
                color: activeTag === tag ? '#fff' : 'var(--color-text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Blog Grid */}
      <section style={{ padding: '2rem 2rem 4rem', maxWidth: '1200px', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
            <div className="dot-bounce" style={{ animationDelay: '0s' }}>.</div>
            <div className="dot-bounce" style={{ animationDelay: '0.2s' }}>.</div>
            <div className="dot-bounce" style={{ animationDelay: '0.4s' }}>.</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
            <h3>No articles found</h3>
            <p>Try adjusting your search or category filters.</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem'
            }}>
              {posts.map((post, idx) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <article className="minimal-card" style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: `slideUp 0.4s ease forwards ${idx * 0.1}s`,
                    opacity: 0,
                    transform: 'translateY(20px)',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    border: '1px solid var(--color-border)',
                    transition: 'transform 0.3s, box-shadow 0.3s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    {/* Image */}
                    <div style={{ height: '200px', position: 'relative', background: 'var(--color-bg-secondary)' }}>
                      {post.featuredImage ? (
                        <Image src={post.featuredImage} alt={post.title} fill  sizes="(max-width: 768px) 100vw, 50vw" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-accent), #002244)', opacity: 0.8 }} />
                      )}
                      {post.tags?.[0] && (
                        <span style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'rgba(0,0,0,0.6)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backdropFilter: 'blur(10px)',
                          color: '#fff'
                        }}>
                          {post.tags[0]}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.8rem', lineHeight: 1.4 }}>
                        {post.title}
                      </h2>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, flex: 1 }}>
                        {post.excerpt}
                      </p>
                      
                      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                        Read Article <span style={{ transition: 'transform 0.2s' }}>→</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '4rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                  style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary"
                  style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Newsletter Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto 4rem', padding: '0 2rem' }}>
        <LeadCaptureForm />
      </section>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .dot-bounce {
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
