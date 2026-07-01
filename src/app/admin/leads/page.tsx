'use client';
import React, { useEffect, useState } from 'react';

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/leads', window.location.origin);
      url.searchParams.append('page', page.toString());
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setLeads(data.leads || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchLeads(); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleExport = () => {
    window.location.href = '/api/leads/export';
  };

  const handleSendNewsletter = async () => {
    if (!confirm('Are you sure you want to send a newsletter to ALL leads right now?')) return;
    setIsSendingNewsletter(true);
    try {
      const res = await fetch('/api/newsletter', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Failed to send newsletter. Check SMTP settings.');
    } finally {
      setIsSendingNewsletter(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Lead Management</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>View and export leads captured from the blog and chatbot.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleSendNewsletter} disabled={isSendingNewsletter} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ec4899', border: 'none' }}>
            {isSendingNewsletter ? 'Sending...' : '🚀 Send Newsletter Blast'}
          </button>
          <button onClick={handleExport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'transparent', color: 'var(--color-text-primary)' }}
        />
      </div>

      <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Contact Info</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Source</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {lead.name}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ color: '#60a5fa', marginBottom: '0.25rem' }}>{lead.email}</div>
                  {lead.phone && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{lead.phone}</div>}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {lead.source}
                  </span>
                  {lead.post && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>from: {lead.post.title}</div>}
                </td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {new Date(lead.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && !isLoading && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No leads found.</p>
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
