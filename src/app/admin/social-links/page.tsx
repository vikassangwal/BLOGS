'use client';
import React, { useEffect, useState } from 'react';

export default function SocialLinksAdmin() {
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    platform: 'whatsapp',
    label: '',
    url: '',
    isActive: true,
    displayOrder: 0
  });

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/social-links');
      const data = await res.json();
      setLinks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch('/api/social-links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData })
        });
      } else {
        await fetch('/api/social-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setFormData({ platform: 'whatsapp', label: '', url: '', isActive: true, displayOrder: 0 });
      setEditingId(null);
      fetchLinks();
    } catch (error) {
      alert('Failed to save link');
    }
  };

  const handleEdit = (link: any) => {
    setFormData({
      platform: link.platform,
      label: link.label,
      url: link.url,
      isActive: link.isActive,
      displayOrder: link.displayOrder
    });
    setEditingId(link.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    try {
      await fetch(`/api/social-links?id=${id}`, { method: 'DELETE' });
      fetchLinks();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const platforms = ['whatsapp', 'telegram', 'instagram', 'twitter', 'facebook', 'youtube'];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Social Links Management</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Add links to your Telegram, WhatsApp, Instagram, etc. to show them as buttons on your blog.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: 'var(--color-text-primary)' }}>
              {editingId ? 'Edit Link' : 'Add New Link'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Platform</label>
                <select 
                  value={formData.platform} 
                  onChange={e => setFormData({ ...formData, platform: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                >
                  {platforms.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Label (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., Join Telegram Group"
                  value={formData.label} 
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Link URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://t.me/yourgroup"
                  value={formData.url} 
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Order</label>
                  <input 
                    type="number" 
                    value={formData.displayOrder} 
                    onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    Is Active?
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingId ? 'Update Link' : 'Add Link'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ platform: 'whatsapp', label: '', url: '', isActive: true, displayOrder: 0 }); }} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div style={{ flex: '2 1 500px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Platform</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Label / URL</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map(link => (
                  <tr key={link.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>{link.platform}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Order: {link.displayOrder}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>{link.label || 'No Label'}</div>
                      <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>{link.url}</a>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: link.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: link.isActive ? '#34d399' : '#ef4444', borderRadius: '10px', fontWeight: 600 }}>
                        {link.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(link)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-primary)', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(link.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {links.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No social links added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
