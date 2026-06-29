'use client';
import React, { useEffect, useState } from 'react';

export default function AdsAdmin() {
  const [ads, setAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', adCode: '', position: 'header', isActive: true });

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ads');
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', adCode: '', position: 'header', isActive: true });
        fetchAds();
      } else {
        alert('Failed to add ad. Make sure you are Super Admin.');
      }
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      fetchAds();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      await fetch(`/api/ads?id=${id}`, { method: 'DELETE' });
      fetchAds();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>AdSense Management</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Add and manage Google AdSense codes across your website.</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>Add New Ad Unit</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ad Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Homepage Header Ad" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>AdSense HTML/JS Code</label>
            <textarea required value={formData.adCode} onChange={e => setFormData({...formData, adCode: e.target.value})} placeholder="<script async src='...'></script><ins ...></ins><script>...</script>" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '120px', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Position</label>
            <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <option value="header">Global Header (Top)</option>
              <option value="footer">Global Footer (Bottom)</option>
              <option value="sidebar">Sidebar</option>
              <option value="top-content">Inside Post - Top</option>
              <option value="in-content">Inside Post - Middle</option>
              <option value="bottom-content">Inside Post - Bottom</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" disabled={isSaving} className="btn-primary" style={{ padding: '0.8rem 2rem' }}>
              {isSaving ? 'Adding...' : 'Add Ad Unit'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>Active Ad Units</h3>
        {isLoading ? (
          <p>Loading...</p>
        ) : ads.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No ads configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{ad.name}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Pos: {ad.position}</span>
                    <span style={{ color: ad.isActive ? '#10b981' : '#ef4444' }}>{ad.isActive ? '🟢 Active' : '🔴 Inactive'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleToggle(ad.id, ad.isActive)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                    {ad.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(ad.id)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
