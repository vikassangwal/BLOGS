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
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: colorHex }}>Agent {agentNumber}: {title}</h4>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={apiKeys[`${agentId}Active`] !== false} 
              onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Active`]: e.target.checked })} 
              style={{ transform: 'scale(1.2)', marginRight: '0.5rem' }} 
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Enable</span>
          </label>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.8rem' }}>{description}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
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
              <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>Model Name</label>
              <input 
                type="text" 
                value={apiKeys[`${agentId}Model`] || ''} 
                onChange={e => setApiKeys({ ...apiKeys, [`${agentId}Model`]: e.target.value })} 
                placeholder="Model name" 
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
              />
            </div>
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
          </div>
          
          {/* Fallback Configuration */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: `1px dashed rgba(${colorRgb},0.3)` }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: colorHex }}>🔄 Fallback (Backup) AI</label>
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
        </div>
      </div>
    );
  };

  return (
    <div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
      <h3 style={{ margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>🤖 Multi-Agent AI Configuration (Auto-Blog)</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '-1rem 0 0 0' }}>Configure providers, models, and fallbacks for all 10 specialized AI agents.</p>

      {renderAgentBlock('researcher', 1, 'Topic & Keyword Researcher', 'Researches facts, data, and trends to build the content outline.', '#3B82F6', '59,130,246')}
      {renderAgentBlock('writer', 2, 'Content Writer', 'Writes the main body of the blog post, ensuring high quality and readability.', '#10B981', '16,185,129')}
      {renderAgentBlock('seo', 3, 'SEO Meta & Schema Generator', 'Generates SEO Title, Description, Keywords, Slug, and Google Schema.', '#F59E0B', '245,158,11')}
      {renderAgentBlock('imageGen', 4, 'Image Generation / Selection', 'Generates or selects relevant images for the blog post.', '#EC4899', '236,72,153')}
      {renderAgentBlock('social', 5, 'Social Media Manager', 'Writes social media captions and coordinates auto-posting.', '#8B5CF6', '139,92,246')}
      {renderAgentBlock('webstory', 6, 'Web Story Creator', 'Extracts highlights from the blog to create engaging Web Stories.', '#F43F5E', '244,63,94')}
      {renderAgentBlock('supervisor', 7, 'Supervisor (Master Orchestrator)', 'Manages the flow between agents, handles errors, and ensures completion.', '#14B8A6', '20,184,166')}
      {renderAgentBlock('editor', 8, 'Editor / QA Agent', 'Reviews content for grammar, tone, and formatting before final publish.', '#F97316', '249,115,22')}
      {renderAgentBlock('translator', 9, 'AI Translator Agent', 'Translates the blog into multiple languages automatically.', '#06B6D4', '6,182,212')}
      {renderAgentBlock('updater', 10, 'Auto Blog Updater', 'Constantly monitors old blogs and rewrites/updates them with fresh news and links.', '#EAB308', '234,179,8')}
    </div>
  );
}
