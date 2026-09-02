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
  const [runStatus, setRunStatus] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedAiProvider, setSelectedAiProvider] = useState('gemini');
  const [isUrlGenerating, setIsUrlGenerating] = useState(false);
  const [urlGenResult, setUrlGenResult] = useState<any>(null);

  
  const [bulkTitles, setBulkTitles] = useState('');
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [bulkResults, setBulkResults] = useState<any>(null);

  const handleBulkPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTitles.trim()) return;

    const titleList = bulkTitles.split('\n').map(t => t.trim()).filter(t => t.length > 2);
    if (titleList.length === 0) return;

    setIsBulkPublishing(true);
    setBulkResults(null);

    try {
      const res = await fetch('/api/admin/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titles: titleList,
          preferredProvider: selectedAiProvider
        })
      });
      const data = await res.json();
      setBulkResults(data);
      if (data.success) {
        setBulkTitles('');
        fetchData();
      }
    } catch (err: any) {
      setBulkResults({ success: false, error: err.message });
    } finally {
      setIsBulkPublishing(false);
    }
  };

  const handleUrlToBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    setIsUrlGenerating(true);
    setUrlGenResult(null);
    try {
      const res = await fetch('/api/admin/url-to-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl, preferredProvider: selectedAiProvider })
      });
      const data = await res.json();
      setUrlGenResult(data);
      if (data.success) {
        setInputUrl('');
        fetchData();
      }
    } catch (err: any) {
      setUrlGenResult({ success: false, error: err.message });
    } finally {
      setIsUrlGenerating(false);
    }
  };

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
    setRunStatus("🚀 Auto-Blog चालू हो गया है! बैकग्राउंड में रिसर्च और राइटिंग प्रोसेस हो रही है...");
    
    try {
      // Trigger the background pipeline via cron endpoint with force flag
      await fetch("/api/cron/auto-blog?secret=knowora-cron-2026&force=true", {
        method: "GET",
        headers: { "x-force-run": "true" }
      }).catch(() => {});
      
      // Poll progress every 3 seconds for 45 seconds to update UI seamlessly
      let attempts = 0;
      const maxAttempts = 15;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const debugRes = await fetch("/api/auto-blog?debug=true");
          if (debugRes.ok) {
            const data = await debugRes.json();
            const latestLog = data?.logs?.[0];
            if (latestLog) {
              if (latestLog.status === "success") {
                setRunStatus(`✅ ${latestLog.title || latestLog.keyword || "पोस्ट तैयार हो रही है..."}`);
              } else if (latestLog.status === "failed") {
                setRunStatus(`⚠️ स्थिति: ${latestLog.error?.slice(0, 80) || "पुनः प्रयास जारी..."}`);
              }
            }
          }
          fetchData();
        } catch (e) {}

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsRunning(false);
          setRunStatus("✨ प्रक्रिया संपन्न! डेटा रीफ्रेश हो गया है।");
          fetchData();
          setTimeout(() => setRunStatus(""), 4000);
        }
      }, 3000);

    } catch (error: any) {
      setIsRunning(false);
      setRunStatus("");
      fetchData();
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

      {runStatus && (
        <div style={{ background: 'rgba(0, 102, 204, 0.15)', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid transparent',
            borderTopColor: '#0066cc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{runStatus}</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      
      
      {/* 🚀 BULK MULTI-TOPIC AUTO-BLOG PUBLISHER (1 TO 20 BLOGS IN 1-CLICK) */}
      <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
              📚 Bulk Multi-Topic Auto-Blog Generator (1 से 20 ब्लॉग्स 1-क्लिक में)
            </h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              यहाँ एक साथ 1 से 20 टाइटल्स (एक लाइन में एक टाइटल) पेस्ट करें — AI खुद सबके लिए अलग-अलग 2000+ शब्दों के संपूर्ण ब्लॉग्स लिखकर पब्लिश कर देगा!
            </p>
          </div>
        </div>

        <form onSubmit={handleBulkPublish} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <textarea
            rows={5}
            placeholder={`यहाँ टाइटल्स पेस्ट करें (एक लाइन में एक):
SSC CGL 2026 भर्ती
Railway NTPC 2026 Notification
UP Police SI 2026 Syllabus
PM Kisan 19th Installment 2026
Redmi Note 15 Pro Plus 5G`}
            value={bulkTitles}
            onChange={(e) => setBulkTitles(e.target.value)}
            required
            style={{ width: '100%', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text-primary)', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              💡 कुल टाइटल्स: {bulkTitles.split('\n').filter(t => t.trim().length > 2).length}
            </span>
            <button
              type="submit"
              disabled={isBulkPublishing || !bulkTitles.trim()}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '0.8rem 2rem', borderRadius: '10px', fontWeight: 700, cursor: (isBulkPublishing || !bulkTitles.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isBulkPublishing || !bulkTitles.trim()) ? 0.7 : 1 }}
            >
              {isBulkPublishing ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  AI लिख रहा है और पब्लिश कर रहा है...
                </>
              ) : (
                '🚀 सभी टाइटल्स पर अलग-अलग ब्लॉग्स पब्लिश करें'
              )}
            </button>
          </div>
        </form>

        {bulkResults && (
          <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '10px', background: bulkResults.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: bulkResults.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p style={{ margin: 0, fontWeight: 700, color: bulkResults.success ? '#34d399' : '#f87171' }}>
              {bulkResults.success ? `🎉 ${bulkResults.message}` : `❌ एरर: ${bulkResults.error}`}
            </p>
            {bulkResults.results && bulkResults.results.length > 0 && (
              <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {bulkResults.results.map((r: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    <span>{idx + 1}. {r.title}</span>
                    {r.success ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'underline' }}>
                        लाइव देखें ↗
                      </a>
                    ) : (
                      <span style={{ color: '#f87171' }}>{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1-CLICK URL TO LIVE BLOG (GEMINI / CLAUDE / OPENROUTER) */}
      <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(147, 51, 234, 0.1))', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚡ 1-Click Link to Published Blog (AI Powered)
            </h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              किसी भी सरकारी भर्ती, न्यूज़ या वेबसाइट का लिंक डालें — Gemini या Claude खुद पूरा 2026 ब्लॉग लिखकर तुरंत पब्लिश कर देगा!
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI Engine:</span>
            <select
              value={selectedAiProvider}
              onChange={(e) => setSelectedAiProvider(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <option value="gemini">✨ Google Gemini 2.5</option>
              <option value="anthropic">🧠 Anthropic Claude 3.5</option>
              <option value="openrouter">🌐 OpenRouter Universal</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleUrlToBlog} style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <input
            type="url"
            placeholder="यहाँ कोई भी URL (वेबसाइट लिंक) पेस्ट करें: https://..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            required
            style={{ flex: 1, minWidth: '280px', padding: '0.8rem 1.2rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}
          />
          <button
            type="submit"
            disabled={isUrlGenerating}
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700, cursor: isUrlGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isUrlGenerating ? 0.7 : 1 }}
          >
            {isUrlGenerating ? 'Writing & Publishing...' : '🚀 Write & Publish Now'}
          </button>
        </form>

        {urlGenResult && (
          <div style={{ marginTop: '1rem', padding: '0.8rem 1.2rem', borderRadius: '10px', background: urlGenResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${urlGenResult.success ? '#10b981' : '#ef4444'}`, color: urlGenResult.success ? '#10b981' : '#ef4444', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{urlGenResult.message || urlGenResult.error}</span>
            {urlGenResult.post && (
              <a href={urlGenResult.post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', background: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                👉 Live पोस्ट देखें
              </a>
            )}
          </div>
        )}
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
