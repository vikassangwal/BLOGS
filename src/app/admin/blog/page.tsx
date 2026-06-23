'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function BlogAdmin() {
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/blog', window.location.origin);
      url.searchParams.append('page', page.toString());
      if (search) url.searchParams.append('search', search);
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchPosts(); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await fetch(`/api/blog?id=${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'Published': 'bg-green-100 text-green-800',
      'Draft': 'bg-gray-100 text-gray-800',
      'Scheduled': 'bg-blue-100 text-blue-800'
    };
    const css = colors[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${css.split(' ')[0]} ${css.split(' ')[1]}`} style={{
        background: status === 'Published' ? '#dcfce7' : status === 'Draft' ? 'rgba(255, 255, 255, 0.02)' : '#dbeafe',
        color: status === 'Published' ? '#166534' : status === 'Draft' ? 'var(--color-text-primary)' : '#1e40af',
        padding: '0.2rem 0.6rem',
        borderRadius: '10px'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Blog Management</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Manage your articles, drafts, and scheduled posts.</p>
        </div>
        <Link href="/admin/blog/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          + New Post
        </Link>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'transparent', color: 'var(--color-text-primary)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: '#111', color: 'var(--color-text-primary)' }}
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
        </select>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Author</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Views</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{post.title}</div>
                  {post.autoGenerated && <span style={{ fontSize: '0.7rem', color: '#c084fc', background: 'rgba(192, 132, 252, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>AI Generated</span>}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}><StatusBadge status={post.status} /></td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{post.author?.name || 'System'}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{post.viewCount}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{new Date(post.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/admin/blog/edit?slug=${post.slug}`} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-primary)', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(post.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && !isLoading && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No posts found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Prev</button>
          <span>{page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
