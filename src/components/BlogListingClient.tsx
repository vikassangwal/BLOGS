'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import LeadCaptureForm from '@/components/LeadCaptureForm';

const INDIAN_STATES = [
  'All India',
  'Central Government',
  ...[
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    // Union Territories
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ].sort((a, b) => a.localeCompare(b))
];

const QUALIFICATIONS = [
  'All Qualifications',
  '10th Pass',
  '12th Pass',
  'Graduate',
  'Post Graduate',
  'B.Tech / BE',
  'ITI / Diploma'
];

export default function BlogListingClient() {
  const searchParams = useSearchParams();
  const initialTag = searchParams ? searchParams.get('tag') || '' : '';
  const initialSearch = searchParams ? searchParams.get('search') || '' : '';
  const initialJobType = searchParams ? searchParams.get('jobType') || '' : '';
  const initialQualFromUrl = searchParams ? searchParams.get('qualification') || '' : '';

  const mapSearchToQualification = (s: string): string => {
    const lower = s.toLowerCase();
    if (lower.includes('8th')) return 'All Qualifications';
    if (lower.includes('10th')) return '10th Pass';
    if (lower.includes('12th')) return '12th Pass';
    if (lower.includes('iti')) return 'ITI / Diploma';
    if (lower.includes('diploma')) return 'ITI / Diploma';
    if (lower.includes('btech') || lower.includes('b.tech') || lower.includes('bcom') || lower.includes('b.com')) return 'Graduate';
    if (lower.includes('post graduate')) return 'Post Graduate';
    if (lower.includes('graduate')) return 'Graduate';
    return 'All Qualifications';
  };

  const initialQualification = initialQualFromUrl
    ? initialQualFromUrl
    : initialSearch
      ? mapSearchToQualification(initialSearch)
      : 'All Qualifications';

  const [posts, setPosts] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [subTag, setSubTag] = useState('');
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedQualification, setSelectedQualification] = useState(initialQualification);
  const [isStateDetected, setIsStateDetected] = useState(false);
  const [showFilters, setShowFilters] = useState(
    initialTag === 'Education & Career' || initialJobType === 'active_upcoming' || !!initialQualFromUrl
  );
  const isFirstSearchRender = useRef(true);

  // Auto-detect State based on IP
  useEffect(() => {
    const detectState = async () => {
      try {
        const savedState = localStorage.getItem('user_state');
        if (savedState) {
          setSelectedState(savedState);
          setIsStateDetected(true);
          return;
        }

        const findStateMatch = (regionStr: string) => {
          if (!regionStr) return null;
          const lowerRegion = regionStr.toLowerCase();
          return INDIAN_STATES.find(s => {
            const lowerS = s.toLowerCase();
            if (lowerS === 'all india' || lowerS === 'central government') return false;
            return lowerS === lowerRegion || lowerRegion.includes(lowerS) || lowerS.includes(lowerRegion);
          });
        };

        let detectedRegion = '';
        
        try {
          const res1 = await fetch('https://ipinfo.io/json');
          if (res1.ok) {
            const data1 = await res1.json();
            if (data1.country === 'IN' && data1.region) {
              detectedRegion = data1.region;
            }
          }
        } catch (e) {}

        if (!detectedRegion) {
          try {
            const res2 = await fetch('https://ipapi.co/json/');
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2.country_code === 'IN' && data2.region) {
                detectedRegion = data2.region;
              }
            }
          } catch (e) {}
        }
        
        if (!detectedRegion) {
          try {
            const res3 = await fetch('https://freeipapi.com/api/json');
            if (res3.ok) {
              const data3 = await res3.json();
              if (data3.countryCode === 'IN' && data3.regionName) {
                detectedRegion = data3.regionName;
              }
            }
          } catch (e) {}
        }

        if (detectedRegion) {
          const stateMatch = findStateMatch(detectedRegion);
          if (stateMatch) {
            setSelectedState(stateMatch);
            localStorage.setItem('user_state', stateMatch);
          }
        }
      } catch (err) {
        console.error('IP Detection failed', err);
      } finally {
        setIsStateDetected(true);
      }
    };
    detectState();
  }, []);

  // Sync state if URL changes externally
  useEffect(() => {
    if (searchParams) {
      const tag = searchParams.get('tag');
      const s = searchParams.get('search');
      const jt = searchParams.get('jobType');
      const qual = searchParams.get('qualification');
      if (tag !== null && tag !== activeTag) {
        setActiveTag(tag);
        if (tag === 'Education & Career') {
          setShowFilters(true);
        } else if (tag === 'Technology' || tag === 'Finance & Earning' || tag === 'News') {
          setShowFilters(false);
        }
      }
      if (s !== null && s !== search) {
        setSearch(s);
        if (s) setShowFilters(true);
      }
      if (qual !== null) {
        setSelectedQualification(qual || 'All Qualifications');
        if (qual) setShowFilters(true);
      }
      if (jt === 'active_upcoming') setShowFilters(true);
    }
  }, [searchParams]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/blog', window.location.origin);
      url.searchParams.append('published', 'true');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '9');

      if (search) url.searchParams.append('search', search);
      if (activeTag) url.searchParams.append('tag', activeTag);
      if (selectedState && selectedState !== 'All India') {
        url.searchParams.append('stateFilter', selectedState);
      }
      if (selectedQualification && selectedQualification !== 'All Qualifications') {
        url.searchParams.append('qualification', selectedQualification);
      }
      const jobType = searchParams?.get('jobType');
      if (jobType) {
        url.searchParams.append('jobType', jobType);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);

      if (tags.length === 0) {
        const allTags = new Set<string>();
        data.posts?.forEach((p: any) => p.tags?.forEach((t: string) => {
          if (t && t !== '${topic}') allTags.add(t);
        }));
        setTags(Array.from(allTags));
      }
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStateDetected) {
      fetchPosts();
    }
  }, [page, activeTag, isStateDetected, selectedState, selectedQualification]);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      if (isStateDetected) fetchPosts();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const MAIN_CATEGORIES = ['Education & Career', 'Technology', 'Finance & Earning'];
  const getContextTags = (category: string) => {
    if (category === 'Technology') return ['News', 'AI', 'Software', 'Gadgets', 'Mobiles', 'Telecom', 'Gaming'];
    if (category === 'Finance & Earning') return ['News', 'Crypto', 'Stock Market', 'Business', 'Investment', 'Personal Finance', 'Banking', 'Schemes'];
    if (category === 'Education & Career') return ['News', 'Vacancy', 'Study', 'Career', 'Results', 'Admit Card', 'Syllabus', 'Scholarship', 'Admissions', 'Answer Key'];
    return MAIN_CATEGORIES;
  };

  const currentTags = getContextTags(activeTag);

  // Local filtering for sub-tags
  const filteredPosts = subTag 
    ? posts.filter(p => p.tags && p.tags.includes(subTag))
    : posts;

  return (
    <div className="listing-container">
      <style dangerouslySetInnerHTML={{__html: `
        .listing-container {
          min-height: 100vh;
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        .hero-section {
          padding: 4rem 2rem 2.5rem;
          background: linear-gradient(to bottom, rgba(0,102,204,0.05) 0%, rgba(0,0,0,0) 100%);
          text-align: center;
        }
        .hero-title {
          font-size: 2.6rem;
          font-weight: 800;
          margin-bottom: 0.4rem;
          letter-spacing: -1.2px;
          line-height: 1.2;
        }
        .hero-description {
          font-size: 1rem;
          color: var(--color-text-secondary);
          max-width: 600px;
          margin: 0 auto 1.5rem;
          line-height: 1.5;
        }
        .search-container {
          max-width: 400px;
          margin: 0 auto;
          position: relative;
        }
        .search-input {
          width: 100%;
          padding: 0.65rem 2.8rem 0.65rem 1.2rem;
          border-radius: 20px;
          border: 1px solid var(--color-border);
          background: rgba(255,255,255,0.03);
          color: var(--color-text-primary);
          font-size: 0.875rem;
          outline: none;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          transition: all 0.2s ease-in-out;
        }
        .search-input:focus {
          border-color: var(--color-accent);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
        }
        .search-icon {
          position: absolute;
          right: 1.2rem;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.6;
          pointer-events: none;
          font-size: 0.9rem;
        }
        .filter-panel {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 900px;
          margin: 1.5rem auto 0;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 1rem;
          border-radius: 16px;
          border: 1px solid var(--color-border);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .filter-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          color: var(--color-text-primary);
        }
        .state-select-wrapper {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.04);
          padding: 0.4rem 1rem;
          border-radius: 20px;
          border: 1px solid var(--color-border);
          min-width: 220px;
        }
        .state-select {
          background: transparent;
          border: none;
          color: var(--color-text-primary);
          width: 100%;
          outline: none;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          appearance: auto;
        }
        .qual-section-title {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin: 0.25rem 0 0.5rem 0;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        .qual-chips-row {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .qual-chips-row::-webkit-scrollbar {
          display: none;
        }
        .qual-chip-btn {
          flex-shrink: 0;
          padding: 0.4rem 0.9rem;
          border-radius: 15px;
          border: 1px solid var(--color-border);
          background: rgba(255,255,255,0.03);
          color: var(--color-text-primary);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .qual-chip-btn.active {
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: #fff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }
        .qual-chip-btn:hover:not(.active) {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
        }
        .tags-container {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 1.5rem;
        }
        .tag-btn {
          padding: 0.35rem 0.85rem;
          border-radius: 15px;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-primary);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .tag-btn.active {
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: #fff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }
        .tag-btn:hover:not(.active) {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
        }
        .blog-grid-section {
          padding: 1.5rem 1rem 3rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .blog-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .blog-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          overflow: hidden;
          padding: 0.75rem;
          gap: 0.75rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          transition: all 0.2s ease-in-out;
        }
        .blog-card:hover {
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .blog-image-wrapper {
          width: 100px;
          height: 75px;
          position: relative;
          background: #0b0f19;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .blog-info-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          justify-content: center;
        }
        .blog-meta-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.2rem;
          flex-wrap: wrap;
        }
        .blog-tag-badge {
          background: rgba(59,130,246,0.1);
          color: #60a5fa;
          padding: 0.15rem 0.45rem;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .blog-date-text {
          font-size: 0.7rem;
          color: var(--color-text-secondary);
          margin: 0;
          white-space: nowrap;
        }
        .blog-expiry-badge {
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          padding: 0.15rem 0.45rem;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: 600;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
        }
        .blog-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 0.15rem 0;
          line-clamp: 2;
          -webkit-line-clamp: 2;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.35;
          color: var(--color-text-primary);
        }
        .blog-excerpt {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-clamp: 1;
          -webkit-line-clamp: 1;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pagination-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
          margin-top: 2.5rem;
        }
        .btn-pagination {
          padding: 0.4rem 1rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-pagination:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-pagination:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
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

        @media (max-width: 768px) {
          .hero-section {
            padding: 2rem 1rem 1.5rem;
          }
          .hero-title {
            font-size: 1.8rem;
          }
          .hero-description {
            font-size: 0.85rem;
            margin-bottom: 1rem;
          }
          .filter-panel {
            padding: 0.75rem;
            border-radius: 12px;
          }
          .filter-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .filter-title {
            font-size: 0.9rem;
            text-align: left;
          }
          .state-select-wrapper {
            min-width: 100%;
            padding: 0.35rem 0.75rem;
          }
          .state-select {
            font-size: 0.8rem;
          }
          .qual-section-title {
            font-size: 0.7rem;
            margin-bottom: 0.4rem;
          }
          .qual-chip-btn {
            padding: 0.3rem 0.75rem;
            font-size: 0.75rem;
          }
          .tags-container {
            margin-top: 1rem;
            gap: 0.3rem;
          }
          .tag-btn {
            padding: 0.3rem 0.7rem;
            font-size: 0.75rem;
          }
          .blog-grid-section {
            padding: 1rem 0.5rem 2rem;
          }
          .blog-card {
            padding: 0.6rem;
            gap: 0.6rem;
            border-radius: 8px;
          }
          .blog-image-wrapper {
            width: 80px;
            height: 60px;
            border-radius: 6px;
          }
          .blog-title {
            font-size: 0.875rem;
            line-height: 1.3;
          }
          .blog-excerpt {
            font-size: 0.75rem;
          }
          .blog-meta-row {
            gap: 0.3rem;
          }
          .blog-tag-badge, .blog-expiry-badge {
            font-size: 0.6rem;
            padding: 0.1rem 0.35rem;
          }
          .blog-date-text {
            font-size: 0.65rem;
          }
        }
      `}} />

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          {activeTag ? (
            <>
              {activeTag} <span style={{ color: 'var(--color-accent)' }}>Articles</span>
            </>
          ) : (
            <>
              Insights & <span style={{ color: 'var(--color-accent)' }}>Innovations</span>
            </>
          )}
        </h1>
        <p className="hero-description">
          {activeTag 
            ? `Discover the latest and most trending articles about ${activeTag}.`
            : `Discover the latest articles on AI, automation, business growth, and technology trends.`
          }
        </p>

        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">
            🔍
          </span>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3 className="filter-title">
                Advanced Job Filters
              </h3>
              
              <div className="state-select-wrapper">
                <span style={{ opacity: 0.7 }}>📍</span>
                <select 
                  className="state-select"
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    localStorage.setItem('user_state', e.target.value);
                    setPage(1);
                  }}
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s} style={{ background: '#121212', color: '#fff' }}>
                      {s === 'All India' ? 'National News (All India)' : s === 'Central Government' ? 'Central Government' : `${s}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '0.25rem' }}>
              <p className="qual-section-title">
                Education Qualification
              </p>
              <div className="qual-chips-row">
                {QUALIFICATIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setSelectedQualification(q);
                      setPage(1);
                    }}
                    className={`qual-chip-btn ${selectedQualification === q ? 'active' : ''}`}
                  >
                    {q === 'All Qualifications' ? 'All Qualifications' : q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="tags-container">
          <button
            onClick={() => {
              setSubTag('');
            }}
            className={`tag-btn ${subTag === '' ? 'active' : ''}`}
          >
            All {activeTag || 'Articles'}
          </button>
          {currentTags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                if (MAIN_CATEGORIES.includes(tag)) {
                  window.location.href = `/blog?tag=${encodeURIComponent(tag)}`;
                } else {
                  setSubTag(tag);
                }
              }}
              className={`tag-btn ${subTag === tag ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Blog Grid */}
      <section className="blog-grid-section">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            <span className="dot-bounce" style={{ animationDelay: '0s' }}>.</span>
            <span className="dot-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="dot-bounce" style={{ animationDelay: '0.4s' }}>.</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>📭</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
              No articles found
            </h3>
            <p style={{ fontSize: '0.9rem' }}>Try adjusting your search, state, or qualification filters.</p>
            <button 
              onClick={() => {
                setSearch('');
                setSelectedState('All India');
                setSelectedQualification('All Qualifications');
                setSubTag('');
                setPage(1);
              }}
              style={{
                marginTop: '1.25rem',
                padding: '0.5rem 1.25rem',
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="blog-list-wrapper">
              {filteredPosts.map((post: any, idx: number) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <article className="blog-card">
                    {post.featuredImage && (
                      <div className="blog-image-wrapper">
                        <Image src={post.featuredImage} alt={post.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 80px, 100px" />
                      </div>
                    )}

                    <div className="blog-info-wrapper">
                      <div className="blog-meta-row">
                        {post.tags?.[0] && (
                          <span className="blog-tag-badge">
                            {post.tags[0]}
                          </span>
                        )}
                        <p className="blog-date-text">
                          {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {post.expiryDate && (
                          <span className="blog-expiry-badge">
                            ⏰ Last Date: {new Date(post.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h2 className="blog-title">
                        {post.title}
                      </h2>
                      <p className="blog-excerpt">
                        {post.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-pagination"
                >
                  Previous
                </button>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-pagination"
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
    </div>
  );
}
