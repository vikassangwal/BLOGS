'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    return function ForwardedQuill(props: any) {
      return <RQ ref={props.forwardedRef} {...props} />;
    }
  },
  { ssr: false }
);

const GRID_CATEGORIES = [
  { id: 'Job', label: '🔥 Latest Jobs' },
  { id: 'Upcoming', label: '🚀 Upcoming Jobs' },
  { id: 'Admit Card', label: '🎟️ Admit Cards' },
  { id: 'Results', label: '🏆 Results & Syllabus' },
  { id: 'University', label: '🎓 University Updates' },
  { id: 'Scheme', label: '🎁 Government Schemes' },
  { id: 'Scholarship', label: '🎓 Scholarships' },
  { id: 'Technology', label: '💻 Technology' },
  { id: 'Finance', label: '💰 Finance & Banking' },
  { id: 'Earning', label: '💸 Online Earning' },
];

const QUALIFICATIONS = [
  '8th Pass', '10th Pass', '12th Pass', 'ITI', 'Diploma', 'Graduate', 'B.Tech', 'B.Com', 'B.Ed', 'Post Graduate'
];

const STATES = [
  'All India', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir'
];

export default function BlogEditorPage() {
  return (
    <React.Suspense fallback={<div>Loading Editor...</div>}>
      <BlogEditor />
    </React.Suspense>
  );
}

function BlogEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams?.get('slug');
  const isEdit = !!slug;

  const quillRef = React.useRef<any>(null);

  const uploadToCloudinary = async (base64Str: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Str })
      });
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
      alert('Upload failed: ' + (data.error || 'Unknown error'));
      return null;
    } catch (err) {
      alert('Upload error: ' + String(err));
      return null;
    }
  };

  const imageHandler = React.useCallback(function(this: any) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const url = await uploadToCloudinary(reader.result as string);
          if (url) {
            const quill = this.quill; 
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  const memoizedModules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

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
    allowAutoUpdate: true,
    doubleLinkFormat: false
  });

  // Checkbox states
  const [selectedGrids, setSelectedGrids] = useState<string[]>([]);
  const [selectedQuals, setSelectedQuals] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [otherTags, setOtherTags] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [providerOverride, setProviderOverride] = useState('');
  const [modelOverride, setModelOverride] = useState('');

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
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
              allowAutoUpdate: data.allowAutoUpdate !== false,
              doubleLinkFormat: !!data.translations?.metadata?.doubleLinkFormat
            });

            // Parse tags back into checkboxes
            if (Array.isArray(data.tags)) {
              const allTags = data.tags;
              const g: string[] = [];
              const q: string[] = [];
              const s: string[] = [];
              const o: string[] = [];
              
              allTags.forEach((tag: string) => {
                if (GRID_CATEGORIES.some(c => c.id === tag)) g.push(tag);
                else if (QUALIFICATIONS.includes(tag)) q.push(tag);
                else if (STATES.includes(tag)) s.push(tag);
                else o.push(tag);
              });
              
              setSelectedGrids(g);
              setSelectedQuals(q);
              setSelectedStates(s);
              setOtherTags(o.join(', '));
            }
          }
        });
    } else {
      const savedDraft = localStorage.getItem('ag_draft_post');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title || parsed.content) {
            if (confirm('You have an unsaved draft. Would you like to restore it?')) {
              setFormData(parsed.formData || parsed);
              if (parsed.grids) setSelectedGrids(parsed.grids);
              if (parsed.quals) setSelectedQuals(parsed.quals);
              if (parsed.states) setSelectedStates(parsed.states);
              if (parsed.others) setOtherTags(parsed.others);
            } else {
              localStorage.removeItem('ag_draft_post');
            }
          }
        } catch(e) {}
      }
    }
  }, [isEdit, slug]);

  // Update Word Count
  useEffect(() => {
    const text = formData.content.replace(/<[^>]*>?/gm, '');
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
  }, [formData.content]);

  // Auto-save
  useEffect(() => {
    if (isEdit) return; 
    
    const interval = setInterval(() => {
      if (formData.title || formData.content) {
        localStorage.setItem('ag_draft_post', JSON.stringify({
          formData, grids: selectedGrids, quals: selectedQuals, states: selectedStates, others: otherTags
        }));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [formData, selectedGrids, selectedQuals, selectedStates, otherTags, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Combine all tags
    const finalTags = [
      ...selectedGrids,
      ...selectedQuals,
      ...selectedStates,
      ...otherTags.split(',').map(t => t.trim()).filter(t => t)
    ];

    const payload = {
      ...formData,
      newSlug: isEdit ? formData.slug : undefined,
      tags: finalTags
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
        alert(`Failed to save post: ${errorData.error || res.statusText}`);
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
        alert(`Error: ${data.error || 'Failed to generate'}`);
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

  const handleGenerateImage = async () => {
    if (!formData.title) {
      alert("Please enter a title to generate an image for.");
      return;
    }
    setAiImageLoading(true);
    try {
      const prompt = encodeURIComponent(`Professional editorial featured image for blog post titled: ${formData.title}`);
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true`;
      setFormData(prev => ({ ...prev, featuredImage: imageUrl }));
    } catch (err) {
      alert("Failed to generate image.");
    } finally {
      setAiImageLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const url = await uploadToCloudinary(reader.result as string);
        if (url) {
          setFormData(prev => ({ ...prev, featuredImage: url }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCheckbox = (value: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (state.includes(value)) {
      setState(state.filter(item => item !== value));
    } else {
      setState([...state, value]);
    }
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
            {isEdit ? 'Edit Post' : 'Manual Blogging System'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>Write manually, or use the AI Assistant on the right.</p>
        </div>
        <button onClick={() => router.push('/admin/blog')} className="btn-secondary">Cancel</button>
      </div>

      <style>{`
        /* Dark mode overrides for ReactQuill */
        .ql-toolbar.ql-snow {
          background: #1f2937 !important;
          border-color: #374151 !important;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          padding: 12px !important;
        }
        .ql-container.ql-snow {
          border-color: #374151 !important;
          background: #111827 !important;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          color: #f3f4f6 !important;
          font-size: 1.1rem !important;
        }
        .ql-editor {
          min-height: 600px;
          padding: 2rem !important;
          line-height: 1.8;
        }
        .ql-snow .ql-stroke { stroke: #d1d5db !important; }
        .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill { fill: #d1d5db !important; }
        .ql-snow .ql-picker { color: #d1d5db !important; }
        
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 700;
          color: #fff;
        }
        .ql-editor a {
          color: #60a5fa !important;
          text-decoration: underline;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: 0.3rem 0;
          transition: color 0.2s;
        }
        .checkbox-label:hover { color: var(--color-text-primary); }
        .checkbox-label input { width: 16px; height: 16px; accent-color: #3b82f6; }
      `}</style>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* LEFT COLUMN: Main Editor Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Post Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1.2rem', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              placeholder="Enter your compelling title here..."
              required
            />

            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Subtitle / Hook (Optional)</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Content Editor</label>
              <button 
                type="button" 
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid var(--color-border)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {isPreviewMode ? '✏️ Write Mode' : '👁️ Preview Mode'}
              </button>
            </div>
            
            {!isPreviewMode ? (
              <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <ReactQuill 
                  ref={quillRef}
                  theme="snow" 
                  value={formData.content} 
                  onChange={(content: string) => setFormData({ ...formData, content })} 
                  modules={memoizedModules}
                  placeholder="Start writing your manual blog post here. Use the toolbar to create headlines, bold text, and insert links..."
                />
              </div>
            ) : (
              <div 
                className="blog-content"
                style={{ width: '100%', padding: '2rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: '#111827', minHeight: '600px' }}
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Word count: <strong style={{ color: '#fff', marginLeft: '4px' }}>{wordCount}</strong>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Excerpt (Short summary for cards)</label>
            <textarea
              value={formData.excerpt}
              onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '100px', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Unified Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Publish Panel (Top) */}
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.5)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}
              >
                <option value="Draft">📝 Save as Draft</option>
                <option value="Published">🚀 Publish Immediately</option>
              </select>

              <button type="submit" disabled={isSaving} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(37,99,235,0.4)' }}>
                {isSaving ? 'Saving...' : (isEdit ? 'Update Post' : 'Save & Continue')}
              </button>
            </div>
          </div>

          {/* AI Assistant Panel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid #7c3aed33' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✨ AI Assistant
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>AI Model (Optional)</label>
              <select 
                value={providerOverride} 
                onChange={e => setProviderOverride(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
              >
                <option value="">Default (Settings)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="google_ai">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => handleAiGenerate('article')}
                disabled={aiLoading}
                style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', border: '1px solid rgba(124, 58, 237, 0.4)', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
              >
                {aiLoading ? '⏳ Generating Content...' : '📝 Generate Full Article'}
              </button>

              <button 
                type="button" 
                onClick={() => handleAiGenerate('seo')}
                disabled={aiLoading}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
              >
                🔍 Auto-Fill SEO Data
              </button>

              <button 
                type="button" 
                onClick={() => handleAiGenerate('captions')}
                disabled={aiLoading}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
              >
                📱 Auto-Generate Social Captions
              </button>
            </div>
          </div>

          {/* Grid Category Placements */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', fontWeight: 700 }}>🏠 Home Page Grid</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Select where this post should appear.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '200px', overflowY: 'auto' }}>
              {GRID_CATEGORIES.map(cat => (
                <label key={cat.id} className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedGrids.includes(cat.id)}
                    onChange={() => toggleCheckbox(cat.id, selectedGrids, setSelectedGrids)}
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>

          {/* Qualification Filters */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', fontWeight: 700 }}>🎓 Qualification Filter</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', maxHeight: '150px', overflowY: 'auto' }}>
              {QUALIFICATIONS.map(qual => (
                <label key={qual} className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedQuals.includes(qual)}
                    onChange={() => toggleCheckbox(qual, selectedQuals, setSelectedQuals)}
                  />
                  {qual}
                </label>
              ))}
            </div>
          </div>

          {/* State Filters */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', fontWeight: 700 }}>📍 State Filter</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '200px', overflowY: 'auto' }}>
              {STATES.map(state => (
                <label key={state} className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedStates.includes(state)}
                    onChange={() => toggleCheckbox(state, selectedStates, setSelectedStates)}
                  />
                  {state}
                </label>
              ))}
            </div>
          </div>

          {/* Other Tags */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem', fontWeight: 700 }}>🏷️ Custom Tags</h3>
            <input
              type="text"
              value={otherTags}
              onChange={e => setOtherTags(e.target.value)}
              placeholder="e.g. UPSC, Bank PO (comma separated)"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          {/* Featured Image */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>🖼️ Featured Image</h3>
            
            <button 
              type="button" 
              onClick={handleGenerateImage}
              disabled={aiImageLoading}
              style={{ width: '100%', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}
            >
              {aiImageLoading ? 'Generating Image...' : '🎨 AI Generate Image (Pollinations)'}
            </button>

            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Or upload from gallery</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.8rem' }} />

            <input
              type="url"
              placeholder="Or paste image URL directly"
              value={formData.featuredImage}
              onChange={e => setFormData({ ...formData, featuredImage: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
            />

            {formData.featuredImage && (
              <div style={{ width: '100%', marginTop: '1rem', borderRadius: '8px', overflow: 'hidden', position: 'relative', aspectRatio: '16/9' }}>
                <Image src={formData.featuredImage} fill alt="Preview" style={{ objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* SEO & Social Hidden Data Fields */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>⚙️ Advanced SEO & Social</summary>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>SEO Title</label>
                  <input type="text" value={formData.seoTitle} onChange={e => setFormData({ ...formData, seoTitle: e.target.value })} style={{ width: '100%', padding: '0.4rem', background: 'transparent', border: '1px solid #444', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>SEO Description</label>
                  <textarea value={formData.seoDescription} onChange={e => setFormData({ ...formData, seoDescription: e.target.value })} style={{ width: '100%', padding: '0.4rem', background: 'transparent', border: '1px solid #444', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem' }}>Social Captions</label>
                  <textarea value={formData.socialCaptions} onChange={e => setFormData({ ...formData, socialCaptions: e.target.value })} style={{ width: '100%', padding: '0.4rem', background: 'transparent', border: '1px solid #444', borderRadius: '4px' }} />
                </div>
              </div>
            </details>
          </div>

        </div>
      </form>
    </div>
  );
}
