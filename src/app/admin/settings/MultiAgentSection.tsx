'use client';
import React from 'react';

export default function MultiAgentSection({ apiKeys, setApiKeys }: any) {
  const renderAgentBlock = (
    agentId: string,
    agentNumber: number,
    title: string,
    description: string,
    colorHex: string,
    colorRgb: string
  ) => {
    return (
      <div style={{ background: `rgba(${colorRgb},0.08)`, padding: '1.2rem', borderRadius: '12px', border: `1px solid rgba(${colorRgb},0.2)`, marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: colorHex }}>
            {agentId === 'supervisor' ? '👑 ' : ''}Agent {agentNumber}: {title}
          </h4>
          
          {agentId === 'supervisor' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mode:</span>
              <select 
                value={apiKeys.supervisorMode || 'auto'} 
                onChange={e => setApiKeys({ ...apiKeys, supervisorMode: e.target.value })} 
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              >
                <option value="auto">Auto Update</option>
                <option value="manual">Manual (Notify Only)</option>
                <option value="off">Off</option>
              </select>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={apiKeys[`${agentId}Active`] !== false} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Active`]: e.target.checked })} 
                style={{ transform: 'scale(1.2)', marginRight: '0.5rem' }} 
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Enable</span>
            </label>
          )}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>{description}</p>
        
        {agentId === 'supervisor' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Priority Strategy (नया मॉडल चुनने का तरीका)</label>
            <select 
              value={apiKeys.supervisorStrategy || 'free'} 
              onChange={e => setApiKeys({ ...apiKeys, supervisorStrategy: e.target.value })} 
              style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            >
              <option value="free">💰 Cheapest / Free (सबसे सस्ता और फ्री मॉडल)</option>
              <option value="smart">🧠 Smartest / Highest IQ (सबसे अक्लमंद मॉडल - महंगा हो सकता है)</option>
              <option value="fast">⚡ Fastest (सबसे तेज़ रिप्लाई करने वाला)</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: agentId === 'supervisor' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Provider</label>
              <select 
                value={apiKeys[`${agentId}Provider`] || 'openrouter'} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Provider`]: e.target.value })} 
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              >
                {agentId === 'imageGen' && <option value="pollinations">Pollinations.ai</option>}
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
                <option value="mistral">Mistral</option>
                <option value="together">Together AI</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>{agentId === 'supervisor' ? 'Primary Model' : 'Model Name'}</label>
              <input 
                type="text" 
                value={apiKeys[`${agentId}Model`] || ''} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Model`]: e.target.value })} 
                placeholder="Model name" 
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
              />
            </div>
            {agentId !== 'supervisor' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Max Tokens</label>
                <input 
                  type="number" 
                  value={apiKeys[`${agentId}Tokens`] || 2000} 
                  onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Tokens`]: parseInt(e.target.value) || 2000 })} 
                  placeholder="2000" 
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
                />
              </div>
            )}
          </div>
          
          {/* Fallback Configuration */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: `1px dashed rgba(${colorRgb},0.3)` }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: colorHex }}>🔄 Backup Model (Fallback)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <select 
                value={apiKeys[`${agentId}FallbackProvider`] || ''} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}FallbackProvider`]: e.target.value })} 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              >
                <option value="">No Fallback</option>
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
                <option value="together">Together AI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
              <input 
                type="text" 
                value={apiKeys[`${agentId}FallbackModel`] || ''} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}FallbackModel`]: e.target.value })} 
                placeholder="Fallback Model Name" 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          {/* Custom Settings for Agent 11 & 12 */}
          {agentId === 'agent11' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: `1px solid rgba(${colorRgb},0.3)`, marginTop: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: colorHex }}>Keywords & Target Country</label>
              <input 
                type="text" 
                value={apiKeys.nicheSeedKeywords || ''} 
                onChange={e => setApiKeys({ ...apiKeys, nicheSeedKeywords: e.target.value })} 
                placeholder="e.g. Technology, AI, Finance (Comma separated)" 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', marginBottom: '0.5rem' }} 
              />
              <input 
                type="text" 
                value={apiKeys.targetCountry || 'Global'} 
                onChange={e => setApiKeys({ ...apiKeys, targetCountry: e.target.value })} 
                placeholder="Target Country (e.g. India, USA, Global)" 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
              />
            </div>
          )}

          {agentId === 'agent12' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: `1px solid rgba(${colorRgb},0.3)`, marginTop: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: colorHex }}>API Tokens (Medium, Blogger, Tumblr, Reddit)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <input 
                  type="text" 
                  value={apiKeys.mediumApiToken || ''} 
                  onChange={e => setApiKeys({ ...apiKeys, mediumApiToken: e.target.value })} 
                  placeholder="Medium Integration Token" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
                />
                <input 
                  type="text" 
                  value={apiKeys.bloggerApiToken || ''} 
                  onChange={e => setApiKeys({ ...apiKeys, bloggerApiToken: e.target.value })} 
                  placeholder="Blogger API Key" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
                />
                <input 
                  type="text" 
                  value={apiKeys.tumblrApiToken || ''} 
                  onChange={e => setApiKeys({ ...apiKeys, tumblrApiToken: e.target.value })} 
                  placeholder="Tumblr API Token" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
                />
                <input 
                  type="text" 
                  value={apiKeys.redditApiToken || ''} 
                  onChange={e => setApiKeys({ ...apiKeys, redditApiToken: e.target.value })} 
                  placeholder="Reddit API Token" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} 
                />
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
      <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>🤖 AI Agent Tools (Auto-Blog)</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Configure providers, models, and fallbacks for all 10 specialized AI agents.</p>

      {renderAgentBlock('researcher', 1, 'Topic & Keyword Researcher', 'Researches facts, data, and trends to build the content outline.', '#3B82F6', '59,130,246')}
      {renderAgentBlock('writer', 2, 'Content Writer', 'Writes the main body of the blog post, ensuring high quality and readability.', '#10B981', '16,185,129')}
      {renderAgentBlock('seo', 3, 'SEO Meta & Schema Generator', 'Generates SEO Title, Description, Keywords, Slug, and Google Schema.', '#F59E0B', '245,158,11')}
      {renderAgentBlock('imageGen', 4, 'Image Generation / Selection', 'Generates or selects relevant images for the blog post.', '#EC4899', '236,72,153')}
      {renderAgentBlock('social', 5, 'Social Media Manager', 'Writes social media captions and coordinates auto-posting.', '#8B5CF6', '139,92,246')}
      {renderAgentBlock('webstory', 6, 'Web Story Creator', 'Extracts highlights from the blog to create engaging Web Stories.', '#F43F5E', '244,63,94')}
      {renderAgentBlock('supervisor', 7, 'Supervisor (Master Orchestrator)', 'यह एजेंट हर दिन सभी AI मॉडल्स की हेल्थ चेक करेगा। अगर कोई बेहतर मॉडल मिलता है, तो यह बाकी एजेंट्स को खुद अपडेट कर देगा।', '#10B981', '16,185,129')}
      {renderAgentBlock('editor', 8, 'Editor / QA Agent', 'Reviews content for grammar, tone, and formatting before final publish.', '#F97316', '249,115,22')}
      {renderAgentBlock('translator', 9, 'AI Translator Agent', 'Translates the blog into multiple languages automatically.', '#06B6D4', '6,182,212')}
      
      {renderAgentBlock('updater', 10, 'Auto Blog Updater', 'Constantly monitors old blogs and rewrites/updates them with fresh news and links.', '#EAB308', '234,179,8')}
      {renderAgentBlock('agent11', 11, 'SEO Keyword Researcher', 'Automatically finds low-competition, high-volume keywords in your niche.', '#2DD4BF', '45,212,191')}
      {renderAgentBlock('agent12', 12, 'Auto Backlink & Syndicator', 'Automatically publishes summaries of new blogs to Medium, Blogger, Tumblr & Reddit.', '#F472B6', '244,114,182')}

    </div>
  );
}
