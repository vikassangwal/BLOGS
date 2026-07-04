'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPagesList() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/pages');
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultAboutPage = async () => {
    try {
      setLoading(true);
      await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'About Us',
          slug: 'about',
          content: '<h2>Welcome to Our Blog</h2><p>This is the default about us page.</p>'
        })
      });
      fetchPages();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Pages...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Pages Management</h1>
        <button 
          onClick={createDefaultAboutPage}
          style={{ padding: '0.8rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          + Create "About Us" Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '12px' }}>
          <h3>No pages found</h3>
          <p style={{ opacity: 0.7, marginTop: '1rem' }}>Click the button above to create an About Us page.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {pages.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{p.title}</h3>
                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>/{p.slug}</p>
              </div>
              <div>
                <Link href={`/admin/pages/${p.slug}`} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', borderRadius: '6px', textDecoration: 'none', marginRight: '0.5rem' }}>
                  Edit Editor
                </Link>
                <a href={`/${p.slug}`} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '6px', textDecoration: 'none' }}>
                  View Live
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
