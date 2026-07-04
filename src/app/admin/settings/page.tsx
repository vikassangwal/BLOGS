'use client';
import React, { useEffect, useState } from 'react';

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any>({ 
    openai: '', gemini: '', anthropic: '', deepseek: '', openrouter: '',
    groq: '', mistral: '', together: '', fireworks: '', perplexity: '', cohere: '', xai: '',
    resend: '', twitter: '', facebook: '', instagram: '', instagramAccountId: '',
    onesignalAppId: '', onesignalApiKey: '', razorpayKey: '', razorpaySecret: '',
    telegramToken: '', telegramChatId: '', whatsappToken: '', whatsappPhoneId: '', whatsappGroupId: '',
    supervisorActive: true, supervisorStrategy: 'free',
    chatbotActive: true, translateActive: false, supervisorMode: 'auto'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data || {});
        try {
          if (data?.aiApiKey?.startsWith('{')) {
            const parsed = JSON.parse(data.aiApiKey);
            setApiKeys({
              ...apiKeys,
              ...parsed
            });
          } else {
            setApiKeys({ ...apiKeys, openai: data?.aiApiKey || '' });
          }
        } catch(e) {}
      })
      .catch(() => setSettings({}));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...settings, aiApiKey: JSON.stringify(apiKeys) };
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Error: ' + (data.error || 'Failed to save settings'));
      }
    } catch (err: any) {
      alert('An error occurred: ' + err.message);
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
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
        <button 
          onClick={() => setActiveTab('integrations')} 
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'integrations' ? 700 : 500, color: activeTab === 'integrations' ? '#0066cc' : 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          Integrations (Email, Social, Ads)
        </button>
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Website Name (साइट का नाम)</label>
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
            
            {/* INFO BOX */}
            <div style={{ background: 'linear-gradient(135deg, rgba(0,102,204,0.1), rgba(147,51,234,0.1))', padding: '1rem 1.2rem', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', border: '1px solid rgba(0,102,204,0.2)' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>💡 Multiple AI Support:</strong> आप एक साथ कई AI Providers की API Keys सेव कर सकते हैं। हर Agent (Researcher, Writer, SEO) के लिए अलग-अलग AI चुन सकते हैं।
            </div>

            {/* ================================================ */}
            {/* SECTION 1: ALL API KEYS */}
            {/* ================================================ */}
            <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>🔑 API Keys (सभी AI Providers)</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>जितनी चाहें उतनी API Keys डालें। जो भी Key डालेंगे वो Provider Auto-Blogging में उपलब्ध हो जाएगा।</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#10A37F', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>OpenAI</span> API Key
                </label>
                <input type="password" value={apiKeys.openai || ''} onChange={e => setApiKeys({ ...apiKeys, openai: e.target.value })} placeholder="sk-..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: gpt-4o, gpt-4o-mini, gpt-4-turbo</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#4285F4', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Google</span> Gemini API Key
                </label>
                <input type="password" value={apiKeys.gemini || ''} onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })} placeholder="AIzaSy..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: gemini-2.5-flash, gemini-2.5-pro</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#D97706', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Claude</span> Anthropic API Key
                </label>
                <input type="password" value={apiKeys.anthropic || ''} onChange={e => setApiKeys({ ...apiKeys, anthropic: e.target.value })} placeholder="sk-ant-..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: claude-3-5-sonnet, claude-3-haiku</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#0066FF', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>DeepSeek</span> API Key
                </label>
                <input type="password" value={apiKeys.deepseek || ''} onChange={e => setApiKeys({ ...apiKeys, deepseek: e.target.value })} placeholder="sk-..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: deepseek-chat, deepseek-reasoner</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#F55036', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Groq</span> API Key
                </label>
                <input type="password" value={apiKeys.groq || ''} onChange={e => setApiKeys({ ...apiKeys, groq: e.target.value })} placeholder="gsk_..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: llama-3.3-70b, mixtral</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#FF7000', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Mistral</span> API Key
                </label>
                <input type="password" value={apiKeys.mistral || ''} onChange={e => setApiKeys({ ...apiKeys, mistral: e.target.value })} placeholder="..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: mistral-large-latest</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#0F172A', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>xAI (Grok)</span> API Key
                </label>
                <input type="password" value={apiKeys.xai || ''} onChange={e => setApiKeys({ ...apiKeys, xai: e.target.value })} placeholder="xai-..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Models: grok-3-mini</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#4A5568', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Other Providers</span>
                </label>
                <input type="password" value={apiKeys.perplexity || ''} onChange={e => setApiKeys({ ...apiKeys, perplexity: e.target.value })} placeholder="pplx-..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Supports: Perplexity, Together, Cohere, Fireworks</p>
              </div>

              {/* IMAGE GENERATION API */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span style={{ background: '#F59E0B', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Image Gen</span> Auto-Image API Key (DALL-E / Fal.ai / Unsplash)
                </label>
                <input type="password" value={apiKeys.imageGenApi || ''} onChange={e => setApiKeys({ ...apiKeys, imageGenApi: e.target.value })} placeholder="Enter API Key for Image Generation..." style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.3rem 0 0' }}>Auto-Blog में AI Images जनरेट करने के लिए। (अगर Pollinations.ai इस्तेमाल कर रहे हैं तो इसे खाली छोड़ दें, वो फ्री है)।</p>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(236,72,153,0.1))', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(147,51,234,0.3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
                <span style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>⭐ OpenRouter</span> API Key (सबसे ज़रूरी — सभी AI एक Key में)
              </label>
              <input type="password" value={apiKeys.openrouter || ''} onChange={e => setApiKeys({ ...apiKeys, openrouter: e.target.value })} placeholder="sk-or-v1-..." style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(147,51,234,0.3)', background: 'rgba(255,255,255,0.03)' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.4rem 0 0' }}>OpenRouter एक Key से सभी AI Models चला सकते हैं — GPT-4o, Gemini, Claude, Llama, Mixtral, DeepSeek और 100+ Models!</p>
            </div>

            {/* ================================================ */}
            {/* SECTION 2: DEFAULT PROVIDER + MODEL */}
            {/* ================================================ */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>⚙️ Default AI Provider & Model</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Chatbot और Blog Editor में AI के लिए यह Default Provider इस्तेमाल होगा।</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Default AI Provider</label>
                <select value={settings.aiProvider || 'openrouter'} onChange={e => setSettings({ ...settings, aiProvider: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <option value="openrouter">OpenRouter (All Models)</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                  <option value="mistral">Mistral</option>
                  <option value="xai">xAI Grok</option>
                  <option value="together">Together AI</option>
                  <option value="fireworks">Fireworks AI</option>
                  <option value="perplexity">Perplexity</option>
                  <option value="cohere">Cohere</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Default Model</label>
                <input type="text" value={settings.aiModel || ''} onChange={e => setSettings({ ...settings, aiModel: e.target.value })} placeholder="e.g. openai/gpt-4o-mini" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
              </div>
            </div>

            {/* ================================================ */}
            {/* SECTION 3: MULTI-AGENT CONFIGURATION */}
            {/* ================================================ */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>🤖 Multi-Agent AI Configuration (Auto-Blog)</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Auto-Blogging में हर Agent (Researcher, Writer, SEO) के लिए अलग Provider और Model चुनें।</p>

            {/* Agent 1: Researcher */}
            <div style={{ background: 'rgba(59,130,246,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700, color: '#3B82F6' }}>🔍 Agent 1: Researcher (रिसर्चर)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>यह AI इंटरनेट से facts, data और trends रिसर्च करके लाएगा।</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
                    <select value={apiKeys.researcherProvider || 'openrouter'} onChange={e => setApiKeys({ ...apiKeys, researcherProvider: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="groq">Groq</option>
                      <option value="mistral">Mistral</option>
                      <option value="xai">xAI Grok</option>
                      <option value="together">Together AI</option>
                      <option value="fireworks">Fireworks AI</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="cohere">Cohere</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
                    <input type="text" value={apiKeys.researcherModel || 'google/gemini-2.5-flash'} onChange={e => setApiKeys({ ...apiKeys, researcherModel: e.target.value })} placeholder="google/gemini-2.5-flash" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Max Tokens</label>
                    <input type="number" value={apiKeys.researcherTokens || 1500} onChange={e => setApiKeys({ ...apiKeys, researcherTokens: parseInt(e.target.value) || 1500 })} placeholder="1500" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                </div>
                {/* Fallback Configuration */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px dashed rgba(59,130,246,0.3)' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#3B82F6' }}>🔄 Fallback (Backup) AI</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <select value={apiKeys.researcherFallbackProvider || ''} onChange={e => setApiKeys({ ...apiKeys, researcherFallbackProvider: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <option value="">No Fallback</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="together">Together AI</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                    <input type="text" value={apiKeys.researcherFallbackModel || ''} onChange={e => setApiKeys({ ...apiKeys, researcherFallbackModel: e.target.value })} placeholder="Fallback Model Name" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent 2: Writer */}
            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>✍️ Agent 2: Writer (लेखक)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>यह AI शानदार ब्लॉग लिखेगा — हिंदी/इंग्लिश, SEO-optimized।</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
                    <select value={apiKeys.writerProvider || 'openrouter'} onChange={e => setApiKeys({ ...apiKeys, writerProvider: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="groq">Groq</option>
                      <option value="mistral">Mistral</option>
                      <option value="xai">xAI Grok</option>
                      <option value="together">Together AI</option>
                      <option value="fireworks">Fireworks AI</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="cohere">Cohere</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
                    <input type="text" value={apiKeys.writerModel || 'openai/gpt-4o-mini'} onChange={e => setApiKeys({ ...apiKeys, writerModel: e.target.value })} placeholder="openai/gpt-4o-mini" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Max Tokens</label>
                    <input type="number" value={apiKeys.writerTokens || 6000} onChange={e => setApiKeys({ ...apiKeys, writerTokens: parseInt(e.target.value) || 6000 })} placeholder="6000" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                </div>
                {/* Fallback Configuration */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px dashed rgba(16,185,129,0.3)' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#10B981' }}>🔄 Fallback (Backup) AI</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <select value={apiKeys.writerFallbackProvider || ''} onChange={e => setApiKeys({ ...apiKeys, writerFallbackProvider: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <option value="">No Fallback</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="together">Together AI</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                    <input type="text" value={apiKeys.writerFallbackModel || ''} onChange={e => setApiKeys({ ...apiKeys, writerFallbackModel: e.target.value })} placeholder="Fallback Model Name" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent 3: SEO Expert */}
            <div style={{ background: 'rgba(245,158,11,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700, color: '#F59E0B' }}>📊 Agent 3: SEO Expert</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>यह AI Title, Description, Keywords, Slug बनाएगा — Google Ranking के लिए।</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
                    <select value={apiKeys.seoProvider || 'openrouter'} onChange={e => setApiKeys({ ...apiKeys, seoProvider: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="groq">Groq</option>
                      <option value="mistral">Mistral</option>
                      <option value="xai">xAI Grok</option>
                      <option value="together">Together AI</option>
                      <option value="fireworks">Fireworks AI</option>
                      <option value="perplexity">Perplexity</option>
                      <option value="cohere">Cohere</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
                    <input type="text" value={apiKeys.seoModel || 'openai/gpt-4o-mini'} onChange={e => setApiKeys({ ...apiKeys, seoModel: e.target.value })} placeholder="openai/gpt-4o-mini" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Max Tokens</label>
                    <input type="number" value={apiKeys.seoTokens || 500} onChange={e => setApiKeys({ ...apiKeys, seoTokens: parseInt(e.target.value) || 500 })} placeholder="500" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  </div>
                </div>
                {/* Fallback Configuration */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px dashed rgba(245,158,11,0.3)' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#F59E0B' }}>🔄 Fallback (Backup) AI</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <select value={apiKeys.seoFallbackProvider || ''} onChange={e => setApiKeys({ ...apiKeys, seoFallbackProvider: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <option value="">No Fallback</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="together">Together AI</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                    <input type="text" value={apiKeys.seoFallbackModel || ''} onChange={e => setApiKeys({ ...apiKeys, seoFallbackModel: e.target.value })} placeholder="Fallback Model Name" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent 4: Image Creator */}
            <div style={{ background: 'rgba(236,72,153,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.2)' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700, color: '#EC4899' }}>🎨 Agent 4: Image Creator (तस्वीरें बनाने वाला)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>यह AI ब्लॉग के लिए Custom तस्वीरें बनाएगा। (अगर कोई नया Provider आए, तो Custom चुनें)।</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
                  <select value={apiKeys.imageGenProvider || 'pollinations'} onChange={e => setApiKeys({ ...apiKeys, imageGenProvider: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <option value="pollinations">Pollinations.ai (Free - No Key Needed)</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI (DALL-E)</option>
                    <option value="falai">Fal.ai</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
                  <input type="text" value={apiKeys.imageGenModel || 'flux'} onChange={e => setApiKeys({ ...apiKeys, imageGenModel: e.target.value })} placeholder="e.g. dall-e-3, flux-pro" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
            </div>

            {/* Agent 8: Editor / QA Agent */}
            <div style={{ background: 'rgba(139,92,246,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)', marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', fontWeight: 700, color: '#8B5CF6' }}>✅ Agent 8: Editor / QA Agent (ब्लॉग क्वालिटी चेक)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>यह AI हाल ही में पब्लिश हुए ब्लॉग्स को पढ़ेगा और अगर SEO, Title, या Content में कोई कमी होगी तो उसे तुरंत ठीक कर देगा।</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
                  <select value={apiKeys.editorProvider || 'openrouter'} onChange={e => setApiKeys({ ...apiKeys, editorProvider: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="groq">Groq</option>
                    <option value="mistral">Mistral</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
                  <input type="text" value={apiKeys.editorModel || 'openai/gpt-4o-mini'} onChange={e => setApiKeys({ ...apiKeys, editorModel: e.target.value })} placeholder="openai/gpt-4o-mini" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Max Tokens</label>
                  <input type="number" value={apiKeys.editorTokens || 4000} onChange={e => setApiKeys({ ...apiKeys, editorTokens: parseInt(e.target.value) || 4000 })} placeholder="4000" style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
            </div>

            {/* UI & UX Controls */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>🖥️ Website Features (UI/UX)</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: 700 }}>💬 Global Chatbot</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Show AI Chatbot on all public pages.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={apiKeys.chatbotActive !== false} onChange={e => setApiKeys({ ...apiKeys, chatbotActive: e.target.checked })} style={{ transform: 'scale(1.5)' }} />
                </label>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: 700 }}>🌍 Google Translate</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Enable multi-language dropdown for visitors.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={apiKeys.translateActive === true} onChange={e => setApiKeys({ ...apiKeys, translateActive: e.target.checked })} style={{ transform: 'scale(1.5)' }} />
                </label>
              </div>
            </div>

            {/* Agent 7: Supervisor Agent */}
            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>👑 Agent 7: Supervisor (Master Orchestrator)</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mode:</span>
                  <select value={apiKeys.supervisorMode || 'auto'} onChange={e => setApiKeys({ ...apiKeys, supervisorMode: e.target.value })} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <option value="auto">Auto Update</option>
                    <option value="manual">Manual (Notify Only)</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>यह एजेंट हर दिन सभी AI मॉडल्स की हेल्थ चेक करेगा। अगर कोई बेहतर मॉडल मिलता है, तो यह बाकी एजेंट्स को खुद अपडेट कर देगा।</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Priority Strategy (नया मॉडल चुनने का तरीका)</label>
                  <select value={apiKeys.supervisorStrategy || 'free'} onChange={e => setApiKeys({ ...apiKeys, supervisorStrategy: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <option value="free">💰 Cheapest / Free (सबसे सस्ता और फ्री मॉडल)</option>
                    <option value="smart">🧠 Smartest / Highest IQ (सबसे अक्लमंद मॉडल - महंगा हो सकता है)</option>
                    <option value="fast">⚡ Fastest (सबसे तेज़ रिप्लाई करने वाला)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'integrations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Push Notifications (OneSignal)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>OneSignal App ID</label>
                  <input type="text" value={apiKeys.onesignalAppId || ''} onChange={e => setApiKeys({ ...apiKeys, onesignalAppId: e.target.value })} placeholder="xxxx-xxxx-xxxx-xxxx" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>OneSignal REST API Key</label>
                  <input type="password" value={apiKeys.onesignalApiKey || ''} onChange={e => setApiKeys({ ...apiKeys, onesignalApiKey: e.target.value })} placeholder="os_..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Premium Content (Razorpay)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Used to unlock premium content for blogs with the "Premium" tag.</p>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Razorpay Key ID</label>
              <input type="text" value={apiKeys.razorpayKey || ''} onChange={e => setApiKeys({ ...apiKeys, razorpayKey: e.target.value })} placeholder="rzp_..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '1rem' }} />
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Razorpay Key Secret</label>
              <input type="password" value={apiKeys.razorpaySecret || ''} onChange={e => setApiKeys({ ...apiKeys, razorpaySecret: e.target.value })} placeholder="secret..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Email Newsletter (Resend)</h3>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Resend API Key</label>
              <input type="password" value={apiKeys.resend || ''} onChange={e => setApiKeys({ ...apiKeys, resend: e.target.value })} placeholder="re_..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Social Media Auto-Poster</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Telegram Bot Token</label>
                  <input type="password" value={apiKeys.telegramToken || ''} onChange={e => setApiKeys({ ...apiKeys, telegramToken: e.target.value })} placeholder="123456789:ABCdef..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Telegram Channel/Chat ID</label>
                  <input type="text" value={apiKeys.telegramChatId || ''} onChange={e => setApiKeys({ ...apiKeys, telegramChatId: e.target.value })} placeholder="@yourchannel or -100123456" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Twitter / X API Token</label>
                  <input type="password" value={apiKeys.twitter || ''} onChange={e => setApiKeys({ ...apiKeys, twitter: e.target.value })} placeholder="Bearer Token..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Facebook Graph API Token</label>
                  <input type="password" value={apiKeys.facebook || ''} onChange={e => setApiKeys({ ...apiKeys, facebook: e.target.value })} placeholder="EAA..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Instagram Graph API Token</label>
                  <input type="password" value={apiKeys.instagram || ''} onChange={e => setApiKeys({ ...apiKeys, instagram: e.target.value })} placeholder="IGQ..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Instagram Account ID</label>
                  <input type="text" value={apiKeys.instagramAccountId || ''} onChange={e => setApiKeys({ ...apiKeys, instagramAccountId: e.target.value })} placeholder="e.g. 178414..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Cloud API Token</label>
                  <input type="password" value={apiKeys.whatsappToken || ''} onChange={e => setApiKeys({ ...apiKeys, whatsappToken: e.target.value })} placeholder="EAAD..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Phone Number ID</label>
                  <input type="text" value={apiKeys.whatsappPhoneId || ''} onChange={e => setApiKeys({ ...apiKeys, whatsappPhoneId: e.target.value })} placeholder="1234567890..." style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Group ID (Target)</label>
                  <input type="text" value={apiKeys.whatsappGroupId || ''} onChange={e => setApiKeys({ ...apiKeys, whatsappGroupId: e.target.value })} placeholder="1234567890@g.us" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                </div>
              </div>
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
