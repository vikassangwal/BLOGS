'use client';
import React, { useEffect, useState } from 'react';

export default function SocialDigestAdmin() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [digestTitle, setDigestTitle] = useState('Knowora दैनिक जॉब बुलेटिन');
  const [bannerUrl, setBannerUrl] = useState('');
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActionActive, setIsActionActive] = useState(false);

  const fetchPendingPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/social-digest');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        // Select top 10 by default
        const top10Ids = (data.posts || []).slice(0, 10).map((p: any) => p.id);
        setSelectedIds(top10Ids);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  // Update default banner whenever selected posts change
  useEffect(() => {
    const selectedPosts = posts.filter(p => selectedIds.includes(p.id));
    const firstImg = selectedPosts.find(p => p.featuredImage)?.featuredImage || '';
    setBannerUrl(firstImg || 'https://www.knowora.in/logo-banner.png');
  }, [selectedIds, posts]);

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === posts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posts.map(p => p.id));
    }
  };

  const generateDigestText = () => {
    const selectedPosts = posts.filter(p => selectedIds.includes(p.id));
    if (selectedPosts.length === 0) return 'कोई ब्लॉग पोस्ट सेलेक्ट नहीं है।';

    const dateStr = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = `📢 <b>${digestTitle} - ${dateStr}</b>\n`;
    text += `आज के महत्वपूर्ण सरकारी भर्ती, एडमिट कार्ड और परिणाम अपडेट्स:\n\n`;

    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    selectedPosts.forEach((post, index) => {
      const numPrefix = emojiNumbers[index] || `${index + 1}.`;
      text += `${numPrefix} <b>${post.title}</b>\n`;
      text += `👉 <a href="https://www.knowora.in/blog/${post.slug}">यहाँ क्लिक करके पढ़ें</a>\n\n`;
    });

    if (customText.trim()) {
      text += `${customText.trim()}\n\n`;
    }

    text += `📲 सरकारी नौकरी और परीक्षा अपडेट तुरंत पाने के लिए हमारे ग्रुप्स से जुड़ें!\n`;
    text += `🔹 <b>टेलीग्राम चैनल:</b> t.me/knowora\n`;
    text += `🔹 <b>व्हाट्सएप ग्रुप:</b> knowora.in/whatsapp\n\n`;
    text += `#SarkariJob #GovtJobs #Knowora #JobAlert`;

    return text;
  };

  const handleCopyToClipboard = () => {
    const text = generateDigestText();
    // Strip HTML tags for simple clipboard sharing
    const cleanText = text.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(cleanText);
    alert('Digest text copied to clipboard (without HTML tags)!');
  };

  const handleMarkAsShared = async () => {
    if (selectedIds.length === 0) return alert('Please select at least one post.');
    if (!confirm('Are you sure you want to mark these posts as shared without broadcasting?')) return;

    setIsActionActive(true);
    try {
      const res = await fetch('/api/admin/social-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAsSharedOnly: true,
          postIds: selectedIds
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Posts marked as shared successfully.');
        fetchPendingPosts();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsActionActive(false);
    }
  };

  const handleBroadcast = async () => {
    if (selectedIds.length === 0) return alert('Please select at least one post.');
    
    setIsActionActive(true);
    try {
      const res = await fetch('/api/admin/social-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generateDigestText(),
          imageUrl: bannerUrl,
          postIds: selectedIds
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Digest broadcasted successfully to Telegram and WhatsApp!');
        fetchPendingPosts();
      } else {
        alert('Broadcast failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsActionActive(false);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Social Digest Manager</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Combine multiple posts into one beautiful single alert for WhatsApp and Telegram.</p>
        </div>
        <button
          onClick={fetchPendingPosts}
          disabled={isLoading || isActionActive}
          style={{ background: '#374151', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          🔄 Refresh Pending Posts
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: List of Pending Posts */}
        <div style={{ backgroundColor: 'var(--color-bg-card, #1f2937)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border, #374151)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Pending Posts ({posts.length})</h2>
            <button 
              onClick={handleSelectAll}
              style={{ background: 'transparent', color: '#10b981', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              {selectedIds.length === posts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading pending posts...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>🎉 All posts are already shared! No pending items.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {posts.map((post) => {
                const isSelected = selectedIds.includes(post.id);
                return (
                  <div 
                    key={post.id}
                    onClick={() => handleSelectToggle(post.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#10b981' : 'var(--color-border, #374151)'}`,
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {}} // handled by div onClick
                      style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{post.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        Published: {new Date(post.publishedAt).toLocaleDateString()} | Slug: {post.slug}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Digest Configuration and Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Form Controls */}
          <div style={{ backgroundColor: 'var(--color-bg-card, #1f2937)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border, #374151)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Digest Settings</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Digest Title (common prefix):</label>
              <input 
                type="text" 
                value={digestTitle}
                onChange={(e) => setDigestTitle(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border, #374151)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Banner Image URL (WhatsApp/Telegram):</label>
              <input 
                type="text" 
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border, #374151)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Custom Digest Notes (Optional):</label>
              <textarea 
                placeholder="Add any extra update notes..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                style={{ width: '100%', height: '60px', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border, #374151)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.9rem', resize: 'none' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                onClick={handleBroadcast}
                disabled={isActionActive || selectedIds.length === 0}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: (isActionActive || selectedIds.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isActionActive || selectedIds.length === 0) ? 0.7 : 1
                }}
              >
                {isActionActive ? 'Broadcasting...' : `🚀 Broadcast Digest (${selectedIds.length} Posts)`}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <button
                  onClick={handleCopyToClipboard}
                  disabled={selectedIds.length === 0}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  📋 Copy Text
                </button>
                <button
                  onClick={handleMarkAsShared}
                  disabled={isActionActive || selectedIds.length === 0}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Skip Sharing
                </button>
              </div>
            </div>
          </div>

          {/* Message Live Preview */}
          <div style={{ backgroundColor: 'var(--color-bg-card, #1f2937)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border, #374151)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.8rem 0', color: 'var(--color-text-secondary)' }}>Live Preview (HTML Format)</h2>
            <div 
              style={{
                flex: 1,
                padding: '1rem',
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#ddd',
                whiteSpace: 'pre-wrap',
                maxHeight: '350px',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              {generateDigestText()}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
