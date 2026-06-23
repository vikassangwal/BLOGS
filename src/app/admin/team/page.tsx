'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TeamAdminPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    fullDetails: '',
    imageUrl: '',
    isActive: true
  });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    const res = await fetch('/api/team');
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleEdit = (member: any) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      role: member.role,
      bio: member.bio,
      fullDetails: member.fullDetails,
      imageUrl: member.imageUrl || '',
      isActive: member.isActive
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team member?')) return;
    await fetch(`/api/team/${id}`, { method: 'DELETE' });
    fetchTeam();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/team/${editingId}` : '/api/team';
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    setEditingId(null);
    setFormData({ name: '', role: '', bio: '', fullDetails: '', imageUrl: '', isActive: true });
    fetchTeam();
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 2rem 0', color: 'var(--color-text-primary)' }}>Team Management</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--color-text-primary)' }}>
            {editingId ? 'Edit Member' : 'Add New Member'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)' }}
              required
            />
            <input
              type="text"
              placeholder="Role (e.g. Lead Editor)"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)' }}
              required
            />
            <textarea
              placeholder="Short Bio (Excerpt)"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)', minHeight: '80px' }}
              required
            />
            <textarea
              placeholder="Full Details (HTML supported)"
              value={formData.fullDetails}
              onChange={e => setFormData({ ...formData, fullDetails: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)', minHeight: '150px' }}
              required
            />
            <input
              type="url"
              placeholder="Image URL (Optional)"
              value={formData.imageUrl}
              onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingId ? 'Update' : 'Add'} Member</button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', role: '', bio: '', fullDetails: '', imageUrl: '', isActive: true }); }} className="btn-secondary">Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--color-text-primary)' }}>Current Team</h2>
          {loading ? <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {members.map(member => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{member.name}</h4>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{member.role}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(member)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', color: '#60a5fa', border: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(member.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#f87171', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
              {members.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No members found.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
