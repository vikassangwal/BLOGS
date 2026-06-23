'use client';
import React, { useEffect, useState } from 'react';

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setSettings(data || {}))
      .catch(() => setSettings({}));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) alert('Settings saved successfully');
      else alert('Failed to save settings. You must be a Super Admin.');
    } catch (err) {
      alert('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Site Settings</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Manage global configuration and AI integrations.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('general')} 
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'general' ? 700 : 500, color: activeTab === 'general' ? '#0066cc' : 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          General & SEO
        </button>
        <button 
          onClick={() => setActiveTab('ai')} 
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'ai' ? 700 : 500, color: activeTab === 'ai' ? '#0066cc' : 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          AI Configuration
        </button>
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Site Name</label>
              <input type="text" value={settings.siteName || ''} onChange={e => setSettings({ ...settings, siteName: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Site Tagline</label>
              <input type="text" value={settings.siteTagline || ''} onChange={e => setSettings({ ...settings, siteTagline: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Admin Email</label>
              <input type="email" value={settings.adminEmail || ''} onChange={e => setSettings({ ...settings, adminEmail: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Global SEO</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Home SEO Title</label>
              <input type="text" value={settings.seoTitle || ''} onChange={e => setSettings({ ...settings, seoTitle: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Home SEO Description</label>
              <textarea value={settings.seoDescription || ''} onChange={e => setSettings({ ...settings, seoDescription: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '100px' }} />
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <strong>Note:</strong> API keys are masked for security. If you see '********', a key is already set.
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>AI Provider</label>
              <select value={settings.aiProvider || 'openai'} onChange={e => setSettings({ ...settings, aiProvider: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>API Key</label>
              <input type="password" value={settings.aiApiKey || ''} onChange={e => setSettings({ ...settings, aiApiKey: e.target.value })} placeholder="Enter API Key" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Preferred Model</label>
              <input type="text" value={settings.aiModel || ''} onChange={e => setSettings({ ...settings, aiModel: e.target.value })} placeholder="e.g. gpt-4o, gemini-1.5-pro, claude-3-5-sonnet" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Make sure the model name matches the provider's API.</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={isSaving} className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
