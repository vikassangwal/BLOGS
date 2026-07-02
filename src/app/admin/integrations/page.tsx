'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IntegrationsHubPage() {
  const [aiKeys, setAiKeys] = useState({ 
    openai: '', gemini: '', anthropic: '', deepseek: '', openrouter: '', 
    newsdata: '', googleIndexing: '', resend: '' 
  });
  const [socialKeys, setSocialKeys] = useState({
    twitter: '', instagramToken: '', instagramAccountId: '',
    whatsappToken: '', whatsappPhoneId: '', whatsappGroupId: '',
    telegramToken: '', telegramChatId: ''
  });
  const [emailKeys, setEmailKeys] = useState({
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: ''
  });
  const [imageSource, setImageSource] = useState('unsplash');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // ai, images, social, email, news

  useEffect(() => {
    fetch('/api/admin/integrations')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          if (data.aiKeys) setAiKeys(prev => ({ ...prev, ...data.aiKeys }));
          if (data.socialKeys) setSocialKeys(prev => ({ ...prev, ...data.socialKeys }));
          if (data.emailKeys) setEmailKeys(prev => ({ ...prev, ...data.emailKeys }));
          if (data.imageSource) setImageSource(data.imageSource);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiKeys, socialKeys, emailKeys, imageSource })
      });
      if (res.ok) alert('Integrations saved successfully!');
      else alert('Failed to save settings.');
    } catch (e) {
      alert('An error occurred while saving.');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading Integrations...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Integrations Hub (Multi-API)</h1>
        <div className="flex gap-4">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
          <Link href="/admin" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Back
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {['ai', 'images', 'news_seo', 'email', 'social'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {tab === 'ai' && '🤖 AI Models'}
            {tab === 'images' && '🖼️ Images'}
            {tab === 'news_seo' && '📰 News & SEO'}
            {tab === 'email' && '📧 Email/Newsletter'}
            {tab === 'social' && '📱 Social Media'}
          </button>
        ))}
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-gray-800">
        
        {/* AI TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">AI Provider API Keys</h2>
            <p className="text-sm text-gray-400">Enter API keys for any providers you want to use. The auto-blogger will use OpenRouter by default if available, or fall back to OpenAI/Gemini.</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">OpenRouter API Key (Recommended)</label>
                <input type="password" value={aiKeys.openrouter || ''} onChange={e => setAiKeys({...aiKeys, openrouter: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="sk-or-v1-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">OpenAI API Key</label>
                <input type="password" value={aiKeys.openai || ''} onChange={e => setAiKeys({...aiKeys, openai: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="sk-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Google Gemini API Key</label>
                <input type="password" value={aiKeys.gemini || ''} onChange={e => setAiKeys({...aiKeys, gemini: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="AIzaSy..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Anthropic (Claude) API Key</label>
                <input type="password" value={aiKeys.anthropic || ''} onChange={e => setAiKeys({...aiKeys, anthropic: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="sk-ant-..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">DeepSeek API Key</label>
                <input type="password" value={aiKeys.deepseek || ''} onChange={e => setAiKeys({...aiKeys, deepseek: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="sk-..." />
              </div>
            </div>
          </div>
        )}

        {/* IMAGES TAB */}
        {activeTab === 'images' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Auto-Blog Image Source</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Image Provider</label>
              <select 
                value={imageSource} 
                onChange={e => setImageSource(e.target.value)}
                className="w-full md:w-1/2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="unsplash">Unsplash (Free Stock Photos)</option>
                <option value="pexels">Pexels (Free Stock Photos)</option>
                <option value="ai">AI Generated (Requires OpenAI/OpenRouter Key)</option>
                <option value="none">No Images</option>
              </select>
            </div>
            
            <p className="text-sm text-gray-400 mt-4">
              Note: Unsplash and Pollinations AI do not require API keys for basic usage. If you choose "AI Generated", it will attempt to use your OpenAI key (DALL-E) or fallback to free Pollinations.
            </p>
          </div>
        )}

        {/* NEWS & SEO TAB */}
        {activeTab === 'news_seo' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Real-Time News & Google SEO</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">NewsData.io API Key</label>
                <input type="password" value={aiKeys.newsdata || ''} onChange={e => setAiKeys({...aiKeys, newsdata: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="pub_..." />
                <p className="text-xs text-gray-500 mt-1">Used to fetch real live news for "News" category blogs.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Google Indexing API JSON (Base64)</label>
                <input type="password" value={aiKeys.googleIndexing || ''} onChange={e => setAiKeys({...aiKeys, googleIndexing: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJ..." />
                <p className="text-xs text-gray-500 mt-1">Base64 encoded service account JSON to auto-ping Google when publishing.</p>
              </div>
            </div>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Newsletter / SMTP Settings</h2>
            <p className="text-sm text-gray-400 mb-4">Configure email sending. If you use Resend, just put your API key below. Or configure custom SMTP.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">Resend API Key (Recommended)</label>
              <input type="password" value={aiKeys.resend || ''} onChange={e => setAiKeys({...aiKeys, resend: e.target.value})} className="w-full md:w-1/2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="re_..." />
            </div>

            <h3 className="text-lg font-bold text-gray-300 border-t border-gray-800 pt-4 mt-4">Custom SMTP (Alternative)</h3>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">SMTP Host</label>
                <input type="text" value={emailKeys.smtpHost || ''} onChange={e => setEmailKeys({...emailKeys, smtpHost: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">SMTP Port</label>
                <input type="number" value={emailKeys.smtpPort || 587} onChange={e => setEmailKeys({...emailKeys, smtpPort: parseInt(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">SMTP User</label>
                <input type="text" value={emailKeys.smtpUser || ''} onChange={e => setEmailKeys({...emailKeys, smtpUser: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">SMTP Password</label>
                <input type="password" value={emailKeys.smtpPass || ''} onChange={e => setEmailKeys({...emailKeys, smtpPass: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL TAB */}
        {activeTab === 'social' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white border-b border-gray-800 pb-2">Social Media Auto-Poster</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <h3 className="font-bold text-blue-400 mb-3">Twitter / X</h3>
                <input type="password" value={socialKeys.twitter || ''} onChange={e => setSocialKeys({...socialKeys, twitter: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Bearer Token" />
              </div>

              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <h3 className="font-bold text-green-400 mb-3">WhatsApp Cloud API</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <input type="password" value={socialKeys.whatsappToken || ''} onChange={e => setSocialKeys({...socialKeys, whatsappToken: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Access Token" />
                  <input type="text" value={socialKeys.whatsappPhoneId || ''} onChange={e => setSocialKeys({...socialKeys, whatsappPhoneId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Phone Number ID" />
                  <input type="text" value={socialKeys.whatsappGroupId || ''} onChange={e => setSocialKeys({...socialKeys, whatsappGroupId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Target Group ID" />
                </div>
              </div>

              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <h3 className="font-bold text-blue-300 mb-3">Telegram</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input type="password" value={socialKeys.telegramToken || ''} onChange={e => setSocialKeys({...socialKeys, telegramToken: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Bot Token" />
                  <input type="text" value={socialKeys.telegramChatId || ''} onChange={e => setSocialKeys({...socialKeys, telegramChatId: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="Channel ID (e.g., @mychannel)" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
