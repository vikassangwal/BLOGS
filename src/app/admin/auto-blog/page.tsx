'use client';
import React, { useEffect, useState } from 'react';

export default function AutoBlogAdmin() {
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [newKeywords, setNewKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDigestRunning, setIsDigestRunning] = useState(false);

  const [runnerState, setRunnerState] = useState({
    agent: 'updater', // 'updater' | 'editor'
    timeRange: 'all',
    batchSize: 1,
    order: 'oldest',
    recheck: false
  });
  const [isRunnerActive, setIsRunnerActive] = useState(false);
  const [runnerLogs, setRunnerLogs] = useState<any[]>([]);

  const handleManualRunner = async () => {
    setIsRunnerActive(true);
    setRunnerLogs([]);
    try {
      const endpoint = runnerState.agent === 'updater' ? '/api/cron/update-content' : '/api/cron/editor';
      const params = new URLSearchParams({
        manual: 'true',
        timeRange: runnerState.timeRange,
        batchSize: String(runnerState.batchSize),
        order: runnerState.order,
        recheck: String(runnerState.recheck)
      });
      
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();
      
      if (data.status === 'skip') {
        setRunnerLogs([{ message: data.message || 'No posts matched the criteria.', type: 'info' }]);
      } else if (data.status === 'success') {
        const list = data.results || [];
        setRunnerLogs(list.map((r: any) => ({
          message: `${r.title}: ${r.status === 'updated' ? '✅ Updated' : r.status === 'edited' ? '✏️ QA Checked' : r.status === 'checked_no_update' ? '🔍 Checked (No New Info)' : '❌ Failed'}`,
          type: r.status === 'failed' ? 'error' : 'success'
        })));
      } else {
        setRunnerLogs([{ message: data.error || 'Runner execution failed.', type: 'error' }]);
      }
    } catch (e: any) {
      setRunnerLogs([{ message: e.message || 'An error occurred during runner execution.', type: 'error' }]);
    } finally {
      setIsRunnerActive(false);
      fetchData(); // refresh stats
    }
  };

  const fetchData = async () => {
    try {
      const [settingsRes, autoBlogRes, keywordsRes] = await Promise.all([
        fetch('/api/auto-blog/settings').catch(() => ({ json: () => ({} as any) })),
        fetch('/api/auto-blog').catch(() => ({ json: () => ({} as any) })),
        fetch('/api/auto-blog/keywords?limit=100').catch(() => ({ json: () => ({ keywords: [] } as any) }))
      ]);
      const settingsData: any = await settingsRes.json();
      const autoBlogData: any = await autoBlogRes.json();
      const keywordsData: any = await keywordsRes.json();

      setSettings(settingsData);
      setStats(autoBlogData.stats || {});
      setLogs(autoBlogData.logs || []);
      setKeywords(keywordsData.keywords || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch('/api/auto-blog/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      alert('Settings saved');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Keywords function removed as it is now handled automatically by the 41-blog queue

  const deleteKeyword = async (id: string) => {
    try {
      await fetch(`/api/auto-blog/keywords?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const triggerRun = async () => {
    setIsRunning(true);
    let data;
    try {
      const res = await fetch('/api/auto-blog', { 
        method: 'POST',
        headers: { 'x-force-run': 'true' }
      });
      
      try {
        data = await res.json();
      } catch (err) {
        throw new Error(`Server returned invalid JSON. Status: ${res.status}`);
      }

      if (data.status === 'empty') {
        alert(data.message || 'No pending keywords found');
      } else if (data.success) {
        alert(data.message || 'Auto-blog generated successfully!');
        fetchData();
      } else {
        if (data.error && data.error.includes('AI detected fake')) {
          console.warn('Fake news skipped, trying next keyword...');
          // Automatically try the next keyword without bothering the user!
          setTimeout(() => triggerRun(), 1000);
        } else {
          alert('Auto-blog failed: ' + data.error);
        }
      }
    } catch (error: any) {
      alert('Auto-blog trigger failed: ' + (error?.message || error));
    } finally {
      // Only reset isRunning if we are NOT automatically retrying
      if (!(data && data.error && data.error.includes('AI detected fake'))) {
        setIsRunning(false);
      }
    }
  };

  const triggerDigestRun = async () => {
    setIsDigestRunning(true);
    try {
      const res = await fetch('/api/cron/active-digest?force=true');
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error(`Server returned invalid JSON. Status: ${res.status}`);
      }

      if (data.status === 'skip') {
        alert(data.message || 'Skipped generating digest.');
      } else if (data.status === 'success') {
        alert('Active Jobs Digest compiled successfully!\nUrl: ' + data.postUrl);
        fetchData();
      } else {
        alert('Failed: ' + (data.error || data.message));
      }
    } catch (error: any) {
      alert('Digest trigger failed: ' + (error?.message || error));
    } finally {
      setIsDigestRunning(false);
    }
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>AI Auto-Blogging</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Configure and monitor your automated content pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={triggerDigestRun} 
            disabled={isDigestRunning || isRunning}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: (isDigestRunning || isRunning) ? 'not-allowed' : 'pointer', opacity: (isDigestRunning || isRunning) ? 0.7 : 1 }}
          >
            {isDigestRunning ? 'Compiling Digest...' : '📰 Compile Active Jobs Digest'}
          </button>
          <button 
            onClick={triggerRun} 
            disabled={isRunning || isDigestRunning}
            style={{ background: 'linear-gradient(135deg, #0066cc, #004999)', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: (isRunning || isDigestRunning) ? 'not-allowed' : 'pointer', opacity: (isRunning || isDigestRunning) ? 0.7 : 1 }}
          >
            {isRunning ? 'Running...' : '▶ Run Now (Force Trigger)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Keywords</p>
          <h3 style={{ margin: 0, fontSize: '2rem' }}>{stats.totalKeywords || 0}</h3>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pending Queue</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#0066cc' }}>{stats.pendingKeywords || 0}</h3>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Completed</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#059669' }}>{stats.usedKeywords || 0}</h3>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Auto Posts Generated</p>
          <h3 style={{ margin: 0, fontSize: '2rem', color: '#9333ea' }}>{stats.totalAutoPosts || 0}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Settings */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Automation Settings</h2>
          <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={settings.isActive}
                onChange={e => setSettings({ ...settings, isActive: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="isActive" style={{ fontWeight: 600 }}>Enable Auto-Blogging</label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Blog Generation Frequency (ब्लॉग लिखने का अंतराल)</label>
              <select
                value={settings.frequency || '15m'}
                onChange={e => setSettings({ ...settings, frequency: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-primary)' }}
              >
                <option value="15m">Every 15 Minutes (हर 15 मिनट में)</option>
                <option value="30m">Every 30 Minutes (हर 30 मिनट में)</option>
                <option value="1h">Every 1 Hour (हर 1 घंटे में)</option>
                <option value="2h">Every 2 Hours (हर 2 घंटे में)</option>
                <option value="4h">Every 4 Hours (हर 4 घंटे में)</option>
                <option value="6h">Every 6 Hours (हर 6 घंटे में)</option>
                <option value="12h">Every 12 Hours (हर 12 घंटे में)</option>
                <option value="daily">Every 24 Hours / Daily (हर 24 घंटे में)</option>
                <option value="weekly">Every 7 Days / Weekly (हर हफ्ते में)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                GitHub Actions 15 मिनट के अंतराल पर बैकग्राउंड रन करेगा, लेकिन नया ब्लॉग तभी जनरेट होगा जब आपके द्वारा चुने गए अंतराल से अधिक समय बीत चुका होगा।
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Featured Image Source</label>
              <select
                value={settings.imageSource}
                onChange={e => setSettings({ ...settings, imageSource: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              >
                <option value="unsplash">Unsplash (Auto-fetch)</option>
                <option value="pollinations">Pollinations.ai (Free AI Generator)</option>
                <option value="none">None</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="checkbox"
                id="autoPublish"
                checked={settings.autoPublish}
                onChange={e => setSettings({ ...settings, autoPublish: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="autoPublish" style={{ fontWeight: 600 }}>Publish immediately (otherwise Draft)</label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="checkbox"
                id="embedYoutube"
                checked={settings.embedYoutube !== false}
                onChange={e => setSettings({ ...settings, embedYoutube: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="embedYoutube" style={{ fontWeight: 600 }}>Auto-Embed YouTube Videos (Boosts SEO)</label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>📰 41-Blog Daily Auto-Queue</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Automatically queues and publishes 41 specific daily blogs.</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="checkbox"
                id="isNewsActive"
                checked={settings.isNewsActive || false}
                onChange={e => setSettings({ ...settings, isNewsActive: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="isNewsActive" style={{ fontWeight: 600 }}>Enable 41-Blog Daily Generation (37 Education/Vacancy, 2 Tech, 2 Finance)</label>
            </div>

            <div style={{ background: 'rgba(0, 102, 204, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 102, 204, 0.3)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                <strong>Current Configuration:</strong> The system automatically seeds the queue with 41 blogs every day. You do not need to manually input topics. It targets every Indian state for "Education & Career" and includes dedicated slots for "Technology" and "Finance".
              </p>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>🤖 Multi-Agent AI Configuration</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Select which OpenRouter models to use for each step of the pipeline.</p>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Researcher Agent Model</label>
              <input
                type="text"
                value={settings.researcherModel || 'google/gemini-2.5-flash'}
                onChange={e => setSettings({ ...settings, researcherModel: e.target.value })}
                placeholder="google/gemini-2.5-flash"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Writer Agent Model</label>
              <input
                type="text"
                value={settings.writerModel || 'openai/gpt-4o-mini'}
                onChange={e => setSettings({ ...settings, writerModel: e.target.value })}
                placeholder="openai/gpt-4o-mini"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>SEO Expert Model</label>
              <input
                type="text"
                value={settings.seoModel || 'openai/gpt-4o-mini'}
                onChange={e => setSettings({ ...settings, seoModel: e.target.value })}
                placeholder="openai/gpt-4o-mini"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>📱 Auto Social Media Posting</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Leave blank to disable. Requires Meta API access tokens.</p>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Instagram Graph API Token</label>
              <input
                type="password"
                value={settings.instagramToken || ''}
                onChange={e => setSettings({ ...settings, instagramToken: e.target.value })}
                placeholder="EAAGm0..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Instagram Account ID</label>
              <input
                type="text"
                value={settings.instagramAccountId || ''}
                onChange={e => setSettings({ ...settings, instagramAccountId: e.target.value })}
                placeholder="178414..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>WhatsApp Cloud API Token</label>
              <input
                type="password"
                value={settings.whatsappToken || ''}
                onChange={e => setSettings({ ...settings, whatsappToken: e.target.value })}
                placeholder="EAAGm0..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>WhatsApp Phone ID</label>
                <input
                  type="text"
                  value={settings.whatsappPhoneId || ''}
                  onChange={e => setSettings({ ...settings, whatsappPhoneId: e.target.value })}
                  placeholder="104..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Target Group/Phone Number</label>
                <input
                  type="text"
                  value={settings.whatsappGroupId || ''}
                  onChange={e => setSettings({ ...settings, whatsappGroupId: e.target.value })}
                  placeholder="919876543210"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>🔔 Push Notifications (OneSignal)</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>OneSignal App ID</label>
                <input
                  type="text"
                  value={settings.onesignalAppId || ''}
                  onChange={e => setSettings({ ...settings, onesignalAppId: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>OneSignal REST API Key</label>
                <input
                  type="password"
                  value={settings.onesignalApiKey || ''}
                  onChange={e => setSettings({ ...settings, onesignalApiKey: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>📧 Email Newsletter (SMTP)</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>SMTP Host (e.g. smtp.gmail.com)</label>
                <input
                  type="text"
                  value={settings.smtpHost || ''}
                  onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>SMTP Port (e.g. 465)</label>
                <input
                  type="number"
                  value={settings.smtpPort || ''}
                  onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 465 })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>SMTP User / Email</label>
                <input
                  type="text"
                  value={settings.smtpUser || ''}
                  onChange={e => setSettings({ ...settings, smtpUser: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>SMTP Password / App Password</label>
                <input
                  type="password"
                  value={settings.smtpPass || ''}
                  onChange={e => setSettings({ ...settings, smtpPass: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="btn-primary" style={{ marginTop: '2rem', width: '100%' }}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* Manual Keyword Queue Input Removed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Manual Agent Runner Panel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ Manual Agent Runner (मैनुअल एजेंट रनर)
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-0.5rem 0 1.5rem 0' }}>
              Select an agent, configure parameters, and manually run background updates on existing posts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Select Agent (एजेंट चुनें)</label>
                <select
                  value={runnerState.agent}
                  onChange={e => setRunnerState({ ...runnerState, agent: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                >
                  <option value="updater">🔄 Agent 10: Auto Blog Updater (पुरानी पोस्ट अपडेट)</option>
                  <option value="editor">✏️ Agent 8: Editor & Quality QA (भाषा / SEO सुधारें)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Time Range (ब्लॉग की उम्र)</label>
                  <select
                    value={runnerState.timeRange}
                    onChange={e => setRunnerState({ ...runnerState, timeRange: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                  >
                    <option value="all">All Time (सभी समय के)</option>
                    <option value="24h">Last 24 Hours (पिछले 24 घंटे)</option>
                    <option value="7d">Last 7 Days (पिछले 7 दिन)</option>
                    <option value="30d">Last 30 Days (पिछले 30 दिन)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Batch Size (ब्लॉग संख्या)</label>
                  <select
                    value={runnerState.batchSize}
                    onChange={e => setRunnerState({ ...runnerState, batchSize: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                  >
                    <option value={1}>1 Blog</option>
                    <option value={2}>2 Blogs</option>
                    <option value={3}>3 Blogs</option>
                    <option value={5}>5 Blogs (Max)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Scan Order (चेक करने का क्रम)</label>
                <select
                  value={runnerState.order}
                  onChange={e => setRunnerState({ ...runnerState, order: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                >
                  <option value="oldest">⬇️ Oldest First (नीचे से / सबसे पुराने पहले)</option>
                  <option value="newest">⬆️ Newest First (ऊपर से / सबसे नए पहले)</option>
                  <option value="popular">⭐ Popular First (सबसे ज़्यादा देखे गए पहले)</option>
                </select>
              </div>

              {runnerState.agent === 'editor' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <input
                    type="checkbox"
                    id="recheck"
                    checked={runnerState.recheck}
                    onChange={e => setRunnerState({ ...runnerState, recheck: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="recheck" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Re-check Already QA Checked Blogs (दोबारा जाँचें)
                  </label>
                </div>
              )}

              <button
                onClick={handleManualRunner}
                disabled={isRunnerActive || isRunning || isDigestRunning}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: (isRunnerActive || isRunning || isDigestRunning) ? 'not-allowed' : 'pointer',
                  opacity: (isRunnerActive || isRunning || isDigestRunning) ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  marginTop: '0.5rem'
                }}
              >
                {isRunnerActive ? '⏳ Executing Agent...' : '▶ Run Configured Agent'}
              </button>

              {runnerLogs.length > 0 && (
                <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.8rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700 }}>Execution Logs:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {runnerLogs.map((log, index) => (
                      <div key={index} style={{ color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : '#60a5fa' }}>
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Up Next (Pending Queue)</h2>
              {keywords.filter(k => k.status === 'pending').length > 0 && (
                <button 
                  onClick={async () => {
                    if(confirm('Delete all pending keywords?')) {
                      await fetch('/api/auto-blog/keywords?clearAll=true', { method: 'DELETE' });
                      fetchData();
                    }
                  }} 
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Clear All
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {keywords.filter(k => k.status === 'pending').map(kw => (
                <div key={kw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>{kw.keyword}</span>
                  <button onClick={() => deleteKeyword(kw.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>✕ Delete</button>
                </div>
              ))}
              {keywords.filter(k => k.status === 'pending').length === 0 && (
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Queue is empty. Click 'Run Now' to generate fresh topics.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
