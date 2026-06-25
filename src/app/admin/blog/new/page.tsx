'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BlogEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams?.get('slug');
  const isEdit = !!slug;

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    status: 'Draft',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    socialCaptions: '',
    socialHashtags: '',
    tags: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [providerOverride, setProviderOverride] = useState('');
  const [modelOverride, setModelOverride] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    // Edit mode: fetch from server
    if (isEdit && slug) {
      fetch(`/api/blog/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setFormData({
              title: data.title || '',
              subtitle: data.subtitle || '',
              slug: data.slug || '',
              content: data.content || '',
              excerpt: data.excerpt || '',
              featuredImage: data.featuredImage || '',
              status: data.status || 'Draft',
              seoTitle: data.seoTitle || '',
              seoDescription: data.seoDescription || '',
              seoKeywords: data.seoKeywords || '',
              socialCaptions: data.socialCaptions || '',
              socialHashtags: data.socialHashtags || '',
              tags: Array.isArray(data.tags) ? data.tags.join(', ') : ''
            });
          }
        });
    } else {
      // New post mode: Check for saved draft
      const savedDraft = localStorage.getItem('ag_draft_post');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title || parsed.content) {
            if (confirm('You have an unsaved draft. Would you like to restore it?')) {
              setFormData(parsed);
            } else {
              localStorage.removeItem('ag_draft_post');
            }
          }
        } catch(e) {}
      }
    }
  }, [isEdit, slug]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (isEdit) return; // Don't auto-save over existing published posts locally to avoid confusion, only for new posts
    
    const interval = setInterval(() => {
      if (formData.title || formData.content) {
        localStorage.setItem('ag_draft_post', JSON.stringify(formData));
        console.log('Draft auto-saved');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = {
      ...formData,
      newSlug: isEdit ? formData.slug : undefined,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
      const url = isEdit ? `/api/blog/${slug}` : '/api/blog';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        localStorage.removeItem('ag_draft_post');
        router.push('/admin/blog');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to save post: ${errorData.error || res.statusText || 'Unknown error (Are you logged in?)'}`);
      }
    } catch (error: any) {
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiGenerate = async (type: string) => {
    if (!formData.title && type !== 'seo') {
      alert('Please enter a title first');
      return;
    }
    
    setAiLoading(true);
    try {
      let payload = { 
        type, 
        topic: formData.title, 
        title: formData.title, 
        content: formData.content,
        providerOverride: providerOverride || undefined,
        modelOverride: modelOverride || undefined
      };
      
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        alert(`Error: ${data.error || 'Failed to generate content'}`);
        return;
      }
      
      if (data.result) {
        if (type === 'article') {
          setFormData(prev => ({ ...prev, content: data.result }));
        } else if (type === 'captions') {
          setFormData(prev => ({ ...prev, socialCaptions: data.result }));
        } else if (type === 'hashtags') {
          setFormData(prev => ({ ...prev, socialHashtags: data.result }));
        } else if (type === 'seo') {
          // Parse SEO result
          const lines = data.result.split('\n');
          const updates: any = {};
          lines.forEach((line: string) => {
            if (line.startsWith('SEO Title:')) updates.seoTitle = line.replace('SEO Title:', '').trim();
            if (line.startsWith('SEO Description:')) updates.seoDescription = line.replace('SEO Description:', '').trim();
            if (line.startsWith('Keywords:')) updates.seoKeywords = line.replace('Keywords:', '').trim();
          });
          setFormData(prev => ({ ...prev, ...updates }));
        }
      }
    } catch (error) {
      alert('AI Generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, featuredImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
          {isEdit ? 'Edit Post' : 'Create New Post'}
        </h1>
        <button onClick={() => router.push('/admin/blog')} className="btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>AI Model Selector (Override)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Select a specific AI model for generating this content. Leave default to use Site Settings.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select 
                value={providerOverride} 
                onChange={e => setProviderOverride(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', flex: 1, background: 'transparent' }}
              >
                <option value="" style={{color: 'black'}}>Default (from Settings)</option>
                <option value="openrouter" style={{color: 'black'}}>OpenRouter</option>
                <option value="openai" style={{color: 'black'}}>OpenAI</option>
                <option value="google_ai" style={{color: 'black'}}>Google Gemini</option>
                <option value="anthropic" style={{color: 'black'}}>Anthropic Claude</option>
                <option value="deepseek" style={{color: 'black'}}>DeepSeek</option>
              </select>
              <input 
                type="text" 
                placeholder="Model ID (e.g. meta-llama/llama-3.3-70b-instruct)" 
                value={modelOverride}
                onChange={e => setModelOverride(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', flex: 2, background: 'transparent' }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Post Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1.1rem', background: 'transparent', color: 'var(--color-text-primary)' }}
              required
            />

            <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Subtitle (Optional)</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'transparent', color: 'var(--color-text-primary)' }}
            />
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Content (HTML)</label>
              <button 
                type="button" 
                onClick={() => handleAiGenerate('article')}
                disabled={aiLoading}
                style={{ background: 'linear-gradient(135deg, #9333ea, #c084fc)', color: 'rgba(255, 255, 255, 0.05)', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {aiLoading ? 'Generating...' : '✨ Generate with AI'}
              </button>
            </div>
            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '400px', fontFamily: 'monospace' }}
              required
            />
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Excerpt</label>
            <textarea
              value={formData.excerpt}
              onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '100px' }}
            />
          </div>
          
          {/* SEO Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>SEO Settings</h3>
              <button 
                type="button" 
                onClick={() => handleAiGenerate('seo')}
                disabled={aiLoading}
                style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                🤖 Auto-Fill SEO
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>SEO Title</label>
                <input
                  type="text"
                  value={formData.seoTitle}
                  onChange={e => setFormData({ ...formData, seoTitle: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>SEO Description</label>
                <textarea
                  value={formData.seoDescription}
                  onChange={e => setFormData({ ...formData, seoDescription: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', minHeight: '80px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Keywords (comma separated)</label>
                <input
                  type="text"
                  value={formData.seoKeywords}
                  onChange={e => setFormData({ ...formData, seoKeywords: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>
            </div>
          </div>

          {/* Social Media Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Social Media Content</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Social Captions (Insta/Twitter)</label>
                  <button 
                    type="button" 
                    onClick={() => handleAiGenerate('captions')}
                    disabled={aiLoading}
                    style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    ✨ Auto-Generate
                  </button>
                </div>
                <textarea
                  value={formData.socialCaptions}
                  onChange={e => setFormData({ ...formData, socialCaptions: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', minHeight: '120px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Trending Hashtags</label>
                  <button 
                    type="button" 
                    onClick={() => handleAiGenerate('hashtags')}
                    disabled={aiLoading}
                    style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    ✨ Auto-Generate
                  </button>
                </div>
                <textarea
                  value={formData.socialHashtags}
                  onChange={e => setFormData({ ...formData, socialHashtags: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', minHeight: '60px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Publishing</h3>
            
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Scheduled">Scheduled</option>
            </select>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsPreviewOpen(true)} className="btn-secondary" style={{ flex: 1 }}>
                Preview
              </button>
              <button type="submit" disabled={isSaving} className="btn-primary" style={{ flex: 2 }}>
                {isSaving ? 'Saving...' : (isEdit ? 'Update Post' : 'Publish Post')}
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Featured Image</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Upload from Gallery</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }} />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Or paste an image URL:</p>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.featuredImage}
              onChange={e => setFormData({ ...formData, featuredImage: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            />
            {formData.featuredImage && (
              <img src={formData.featuredImage} alt="Preview" style={{ width: '100%', marginTop: '1rem', borderRadius: '8px', objectFit: 'cover' }} />
            )}
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Tags</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Comma separated tags</p>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            />
          </div>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>URL Slug</h3>
            <input
              type="text"
              value={formData.slug}
              onChange={e => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Auto-generated if empty"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            />
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--color-bg-primary)', width: '100%', maxWidth: '800px', height: '100%', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Preview</h2>
              <button onClick={() => setIsPreviewOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>{formData.title || 'Untitled Post'}</h1>
              {formData.subtitle && <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{formData.subtitle}</h2>}
              {formData.featuredImage && <img src={formData.featuredImage} alt="Featured" style={{ width: '100%', borderRadius: '12px', marginBottom: '2rem' }} />}
              <div dangerouslySetInnerHTML={{ __html: formData.content }} className="blog-content" style={{ fontSize: '1.1rem', lineHeight: 1.8 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogEditorPage() {
  return (
    <React.Suspense fallback={<div>Loading Editor...</div>}>
      <BlogEditor />
    </React.Suspense>
  );
}
