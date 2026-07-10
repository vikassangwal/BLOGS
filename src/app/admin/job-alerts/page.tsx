'use client';
import React, { useEffect, useState } from 'react';

interface ScrapedAlert {
  title: string;
  sourceUrl: string;
  pubDate: string;
  source: string;
}

export default function JobAlertsDashboard() {
  const [alerts, setAlerts] = useState<ScrapedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [queuingIndex, setQueuingIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Manual Add Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualSource, setManualSource] = useState('Manual Entry');
  const [showManualForm, setShowManualForm] = useState(false);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    if (!manualTitle.trim() || !manualUrl.trim()) {
      setError('Please provide both a Title/Topic and a Source URL.');
      return;
    }
    
    // Validate URL format simply
    if (!manualUrl.toLowerCase().startsWith('http://') && !manualUrl.toLowerCase().startsWith('https://')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    const newAlert: ScrapedAlert = {
      title: manualTitle.trim(),
      sourceUrl: manualUrl.trim(),
      pubDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      source: manualSource.trim() || 'Manual Entry'
    };

    setAlerts([newAlert, ...alerts]);
    setManualTitle('');
    setManualUrl('');
    setManualSource('Manual Entry');
    setShowManualForm(false);
    setStatusMessage(`🎉 Added "${newAlert.title}" manually. You can now generate an AI post on it!`);
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/job-alerts/scrape');
      if (!res.ok) {
        throw new Error(`Failed to fetch alerts. Status: ${res.status}`);
      }
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading sourcing feeds.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAutoGenerate = async (alert: ScrapedAlert, index: number) => {
    setGeneratingIndex(index);
    setStatusMessage('');
    try {
      const url = new URL('/api/auto-blog', window.location.origin);
      url.searchParams.append('keyword', alert.title);
      url.searchParams.append('sourceUrl', alert.sourceUrl);
      url.searchParams.append('bg-run', 'false'); // Let dispatcher spin background worker
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'x-force-run': 'true' }
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage(`🎉 Success: Auto-blog generation triggered in the background for "${alert.title}"! It will be published shortly.`);
      } else {
        setError(data.error || 'Failed to trigger auto-blog generation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleQueueTopic = async (alert: ScrapedAlert, index: number) => {
    setQueuingIndex(index);
    setStatusMessage('');
    try {
      const res = await fetch('/api/auto-blog/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: alert.title,
          niche: 'Education & Career',
          priority: 50 // High priority
        })
      });
      const data = await res.json();

      if (res.ok) {
        setStatusMessage(`✅ Added: "${alert.title}" successfully added to the pending keyword queue!`);
      } else {
        setError(data.error || 'Failed to queue the keyword.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while queuing.');
    } finally {
      setQueuingIndex(null);
    }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', minHeight: '100vh', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
            📡 Live Job Sourcing Feed (लाइव सरकारी भर्ती स्रोत)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Monitor real-time official alerts from UPSC, Employment News, and PIB to generate posts instantly.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setShowManualForm(!showManualForm)}
            style={{
              background: showManualForm ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
              color: showManualForm ? '#f87171' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showManualForm ? '✖ Close Form' : '➕ Add Manual Alert'}
          </button>
          <button 
            onClick={fetchAlerts} 
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0066cc, #004999)',
              color: '#fff',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? '⏳ Refreshing...' : '🔄 Sync Latest Feed'}
          </button>
        </div>
      </div>

      {/* Manual Alert Add Form */}
      {showManualForm && (
        <form onSubmit={handleManualAdd} style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2.5rem',
          boxShadow: '0 4px 30px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 700 }}>➕ Add New Job Alert Manually (मैन्युअल जॉब अलर्ट जोड़ें)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Job Topic / Alert Title (e.g. UPSC Direct Recruitment 2026: 500+ Posts)
              </label>
              <input 
                type="text" 
                placeholder="Enter alert title / keyword..." 
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Official Alert Source URL (e.g. https://upsc.gov.in/notifications)
              </label>
              <input 
                type="text" 
                placeholder="https://..." 
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🚀 Add to Alert Feed
            </button>
          </div>
        </form>
      )}

      {/* Messages */}
      {statusMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {statusMessage}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Table Sourcing Panel */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>🌀</span>
            <p>Fetching real-time official recruitment alerts from PIB, UPSC and Employment News...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
            <h3>No fresh alerts found</h3>
            <p>Check again later or verify your internet connectivity.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Source</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Job Alert Details</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Scraped Date</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                      <span style={{
                        background: alert.source.includes('Official') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: alert.source.includes('Official') ? '#60a5fa' : '#34d399',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {alert.source}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
                        🔗 {alert.sourceUrl}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.85rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {alert.pubDate}
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleAutoGenerate(alert, index)}
                          disabled={generatingIndex !== null || queuingIndex !== null}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: (generatingIndex !== null || queuingIndex !== null) ? 'not-allowed' : 'pointer',
                            opacity: (generatingIndex !== null || queuingIndex !== null) ? 0.7 : 1
                          }}
                        >
                          {generatingIndex === index ? '⏳ Generating...' : '📝 AI Post'}
                        </button>
                        <button
                          onClick={() => handleQueueTopic(alert, index)}
                          disabled={generatingIndex !== null || queuingIndex !== null}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: (generatingIndex !== null || queuingIndex !== null) ? 'not-allowed' : 'pointer',
                            opacity: (generatingIndex !== null || queuingIndex !== null) ? 0.7 : 1
                          }}
                        >
                          {queuingIndex === index ? 'Adding...' : '➕ Queue'}
                        </button>
                        <a
                          href={alert.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: 'rgba(0, 102, 204, 0.1)',
                            color: '#60a5fa',
                            border: '1px solid rgba(0, 102, 204, 0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'inline-block'
                          }}
                        >
                          🌐 Visit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
