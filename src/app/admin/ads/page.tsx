'use client';
import React, { useEffect, useState } from 'react';

export default function AdsAdmin() {
  const [ads, setAds] = useState<any[]>([]);
  const [publisherId, setPublisherId] = useState('ca-pub-2689010221295201');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPublisher, setIsSavingPublisher] = useState(false);
  const [isSavingAd, setIsSavingAd] = useState(false);
  
  // Custom Ad Unit Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    adCode: '', 
    position: 'header', 
    isActive: true 
  });

  // Quick Generator State
  const [quickSlotId, setQuickSlotId] = useState('');
  const [quickPosition, setQuickPosition] = useState('in-content');
  const [quickName, setQuickName] = useState('');

  const fetchSettingsAndAds = async () => {
    setIsLoading(true);
    try {
      // Fetch Ad Units
      const adsRes = await fetch('/api/ads');
      const adsData = await adsRes.json();
      setAds(Array.isArray(adsData) ? adsData : []);

      // Fetch Global Site Settings for Publisher ID
      const setRes = await fetch('/api/settings');
      const setParsed = await setRes.json();
      if (setParsed?.aiApiKey?.startsWith('{')) {
        const keys = JSON.parse(setParsed.aiApiKey);
        if (keys.adsensePublisherId) {
          setPublisherId(keys.adsensePublisherId);
        }
      }
    } catch (e) {
      console.error('Error fetching settings/ads:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettingsAndAds();
  }, []);

  const handleSavePublisherId = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPublisher(true);
    try {
      const setRes = await fetch('/api/settings');
      const setParsed = await setRes.json();
      let keys: any = {};
      if (setParsed?.aiApiKey?.startsWith('{')) {
        try { keys = JSON.parse(setParsed.aiApiKey); } catch(e){}
      }
      keys.adsensePublisherId = publisherId.trim();

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...setParsed, aiApiKey: JSON.stringify(keys) })
      });
      if (res.ok) {
        alert('✅ Publisher ID updated successfully! Live across all pages.');
      } else {
        alert('Failed to update Publisher ID.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setIsSavingPublisher(false);
  };

  const handleAddCustomAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAd(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', adCode: '', position: 'header', isActive: true });
        fetchSettingsAndAds();
        alert('🎉 New Ad Unit saved and activated!');
      } else {
        alert('Failed to add ad. Make sure you are logged in as Admin.');
      }
    } catch (err) {
      console.error(err);
    }
    setIsSavingAd(false);
  };

  const handleQuickGenerateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSlotId.trim()) {
      alert('Please enter your AdSense Slot ID.');
      return;
    }
    const name = quickName.trim() || `AdSense ${quickPosition.toUpperCase()} Slot (${quickSlotId.trim()})`;
    const code = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId.trim()}" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="${publisherId.trim()}"
     data-ad-slot="${quickSlotId.trim()}"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`;

    setIsSavingAd(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, adCode: code, position: quickPosition, isActive: true })
      });
      if (res.ok) {
        setQuickSlotId('');
        setQuickName('');
        fetchSettingsAndAds();
        alert('✅ Auto-Generated AdSense Slot saved successfully!');
      } else {
        alert('Failed to save auto-generated ad.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setIsSavingAd(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      fetchSettingsAndAds();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      await fetch(`/api/ads?id=${id}`, { method: 'DELETE' });
      fetchSettingsAndAds();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
          💰 Google AdSense Control Center
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Manage your AdSense Publisher ID, Slot IDs, and custom ad placements directly from the Admin Panel.
        </p>
      </div>

      {/* SECTION 1: GLOBAL PUBLISHER ID SETTING */}
      <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#60a5fa' }}>
          1. Global AdSense Publisher ID
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.2rem' }}>
          Enter your AdSense Publisher ID (begins with <code>ca-pub-</code>). This ID will be loaded automatically on every page.
        </p>

        <form onSubmit={handleSavePublisherId} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <input 
              required 
              type="text" 
              value={publisherId} 
              onChange={e => setPublisherId(e.target.value)} 
              placeholder="ca-pub-2689010221295201" 
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'monospace', fontWeight: 600 }} 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSavingPublisher} 
            className="btn-primary" 
            style={{ padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700 }}
          >
            {isSavingPublisher ? 'Saving...' : '💾 Save Publisher ID'}
          </button>
        </form>
      </div>

      {/* SECTION 2: QUICK ADSENSE SLOT GENERATOR */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
          2. Quick Slot ID Auto-Generator
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.2rem' }}>
          Have a 10-digit AdSense Slot ID? Select position, enter Slot ID, and click generate. The system creates full code automatically!
        </p>

        <form onSubmit={handleQuickGenerateAd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Position</label>
            <select value={quickPosition} onChange={e => setQuickPosition(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
              <option value="in-content">Inside Post - Middle (In-Article)</option>
              <option value="header">Global Header (Top)</option>
              <option value="footer">Global Footer (Bottom)</option>
              <option value="top-content">Inside Post - Top</option>
              <option value="bottom-content">Inside Post - Bottom</option>
              <option value="sidebar">Sidebar</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>AdSense Slot ID (10 Digits)</label>
            <input required type="text" value={quickSlotId} onChange={e => setQuickSlotId(e.target.value)} placeholder="e.g. 1234567890" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Ad Unit Name (Optional)</label>
            <input type="text" value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="e.g. In-Article Ad 1" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <button type="submit" disabled={isSavingAd} className="btn-primary" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: 700 }}>
              {isSavingAd ? 'Generating...' : '⚡ Generate & Add Ad'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: CUSTOM AD HTML CODE EDITOR */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
          3. Custom Ad Code Editor (Paste Raw HTML/JS)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.2rem' }}>
          Paste complete AdSense code snippets or third-party ad banner HTML directly.
        </p>

        <form onSubmit={handleAddCustomAd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ad Unit Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Header Responsive Banner" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full AdSense Code (HTML/JS)</label>
            <textarea required value={formData.adCode} onChange={e => setFormData({...formData, adCode: e.target.value})} placeholder="<script async src='...'></script><ins class='adsbygoogle' ...></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', minHeight: '130px', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Position Placement</label>
            <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
              <option value="in-content">Inside Post - Middle (In-Article)</option>
              <option value="header">Global Header (Top)</option>
              <option value="footer">Global Footer (Bottom)</option>
              <option value="top-content">Inside Post - Top</option>
              <option value="bottom-content">Inside Post - Bottom</option>
              <option value="sidebar">Sidebar</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" disabled={isSavingAd} className="btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 700 }}>
              {isSavingAd ? 'Saving...' : '➕ Add Custom Ad Unit'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: ACTIVE AD UNITS LIST */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
          4. Existing Active Ad Placements ({ads.length})
        </h2>

        {isLoading ? (
          <div>Loading Ad Units...</div>
        ) : ads.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No ad placements created yet. Use the forms above to add your first AdSense unit!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: 700 }}>{ad.name}</h4>
                  <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {ad.position}
                  </span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: ad.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {ad.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => handleToggle(ad.id, ad.isActive)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {ad.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => handleDelete(ad.id)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
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
