'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import SmartBanners from '@/components/SmartBanners';
import BlogChatbot from '@/components/BlogChatbot';
import AdInjector from '@/components/AdInjector';
import AdBanner from '@/components/AdBanner';
import SocialJoinStrip from '@/components/SocialJoinStrip';

interface BlogPostClientProps {
  post: any;
  ads: any[];
  relatedPosts: any[];
  whatsappLinks?: any[];
  commentsEnabled?: boolean;
}

export default function BlogPostClient({ post, ads, relatedPosts, whatsappLinks, commentsEnabled = true }: BlogPostClientProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [activeTranslation, setActiveTranslation] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState(post.featuredImage);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    if (commentsEnabled && post?.slug) {
      fetch(`/api/blog/${post.slug}/comments`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setComments(data);
        })
        .catch(err => console.error('Failed to load comments:', err));
    }
  }, [post?.slug, commentsEnabled]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');
    setCommentMessage('');
    if (!commentName.trim() || !commentText.trim()) {
      setCommentError('Both Name and Comment are required.');
      return;
    }
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/blog/${post.slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: commentName, content: commentText })
      });
      const data = await res.json();
      if (data.success) {
        setComments([data.comment, ...comments]);
        setCommentText('');
        setCommentMessage('🎉 Comment posted successfully!');
      } else {
        setCommentError(data.error || 'Failed to post comment.');
      }
    } catch (err: any) {
      setCommentError('An error occurred. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (post.featuredImage && post.featuredImage.includes('source.unsplash.com')) {
      // Parse the search query parameter from old source.unsplash.com url
      let query = 'education';
      try {
        const urlObj = new URL(post.featuredImage);
        query = urlObj.search ? urlObj.search.replace('?', '') : 'education';
      } catch (e) {}
      setImageSrc(`https://image.pollinations.ai/prompt/professional%20education%20career%20banner%20design%20for%20${query}?width=800&height=450&nologo=true`);
    } else {
      setImageSrc(post.featuredImage);
    }
  }, [post.featuredImage]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Smart Fallback Translation Logic
    try {
      const cookies = document.cookie.split(';');
      let lang = '';
      for (const c of cookies) {
        if (c.trim().startsWith('googtrans=')) {
          const parts = c.split('/');
          if (parts.length === 3) lang = parts[2];
          break;
        }
      }
      if (lang && post?.translations && post.translations[lang]) {
        setActiveTranslation(post.translations[lang]);
      }
    } catch (e) {
      console.error('Translation fallback error:', e);
    }
    
    // Track Pageview
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname, postId: post?.id })
    }).catch(e => console.error('Analytics error:', e));

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [post?.id]);

  const handleListen = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in your browser.');
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    window.speechSynthesis.cancel();
    
    const textContent = activeTranslation ? activeTranslation.content : post.content;
    const text = textContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = post.content?.includes('है') ? 'hi-IN' : 'en-US';
    
    // Set playing state immediately for UI feedback
    setIsPlaying(true);
    setIsPaused(false);
    
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    // Small timeout to ensure cancel() finishes before speak()
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const stopListen = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const orderRes = await fetch('/api/payments/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, amount: 99 })
      });
      const orderData = await orderRes.json();

      if (orderData.error) {
        alert(orderData.error);
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Our Blog Premium',
        description: 'Unlock Premium Article',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                postId: post.id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setIsUnlocked(true);
              alert('Payment Successful! Content unlocked.');
            } else {
              alert('Payment verification failed.');
            }
          } catch (e) {
            alert('Verification Error');
          }
        },
        prefill: {
          name: 'Reader',
          email: 'reader@example.com',
          contact: ''
        },
        theme: {
          color: '#f59e0b'
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        alert(response.error.description);
      });
      rzp1.open();

    } catch (err) {
      console.error(err);
      alert('Could not initiate payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const headerAd = ads.find(a => a.position === 'header');
  const footerAd = ads.find(a => a.position === 'footer');

  const isPremium = post.tags?.some((t: any) => t.name === 'Premium' || t.tag?.name === 'Premium');
  const displayTitle = activeTranslation ? activeTranslation.title : post.title;
  let contentHtml = activeTranslation ? activeTranslation.content : (post.content || '');
  
  const doubleLinkFormat = !!(post.translations as any)?.metadata?.doubleLinkFormat;
  
  function formatHtmlLinks(html: string, useDoubleFormat: boolean): string {
    if (!useDoubleFormat) return html;
    return html.replace(/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, text) => {
      if (text.includes('<img') || text.includes(href) || text.includes('(' + href + ')')) {
        return match;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--color-accent); font-weight: bold; text-decoration: underline;">${text}</a> (${href})`;
    });
  }

  contentHtml = formatHtmlLinks(contentHtml, doubleLinkFormat);

  // --- Automatic Table of Contents (TOC) Generation ---
  const toc: { id: string, text: string, level: number }[] = [];
  let headingIndex = 0;
  contentHtml = contentHtml.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (match: string, tag: string, attrs: string, innerHTML: string) => {
    let idMatch = attrs.match(/id=["']([^"']+)["']/i);
    let id = idMatch ? idMatch[1] : `section-${headingIndex++}`;
    
    const cleanText = innerHTML.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (cleanText.length > 5) {
      toc.push({ id, text: cleanText, level: parseInt(tag.charAt(1)) });
    }
    
    if (idMatch) {
      return match;
    }
    return `<${tag} id="${id}"${attrs}>${innerHTML}</${tag}>`;
  });
  // ----------------------------------------------------

  if (isPremium && !isUnlocked) {
    const charLimit = Math.floor(contentHtml.length * 0.3);
    contentHtml = contentHtml.substring(0, charLimit) + '...';
  }

  const isJobPost = post.tags?.some((t: any) => {
    const name = typeof t === 'string' ? t : (t.tag?.name || t.name);
    return ['Vacancy', 'Career', 'Job', 'Job Digest'].includes(name);
  });

  const getApplyLink = (html: string) => {
    const match = html.match(/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    return match ? match[1] : null;
  };
  const applyLink = getApplyLink(post.content || '');

  return (
    <div style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      {/* Header Ad */}
      {headerAd && (
        <div className="ad-container" style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-bg-secondary)' }} dangerouslySetInnerHTML={{ __html: headerAd.adCode }} />
      )}

      <article className={activeTranslation ? "notranslate" : ""} style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Translate and TTS Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="flex gap-4">
            <button 
              onClick={handleListen}
              className="px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors"
              style={{ background: isPlaying ? 'var(--color-accent)' : 'rgba(0,102,204,0.1)', color: isPlaying ? '#fff' : 'var(--color-accent)' }}
              title={isPlaying ? (isPaused ? "Resume Audio" : "Pause Audio") : "Listen to Article"}
            >
              {isPlaying && !isPaused ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              )}
              {isPlaying ? (isPaused ? "Resume" : "Pause") : "Listen"}
            </button>
            {isPlaying && (
              <button 
                onClick={stopListen}
                className="px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                title="Stop Audio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Post Header */}
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {post.tags.map((t: any) => {
                const tagName = typeof t === 'string' ? t : (t.tag?.name || t.name);
                return (
                <span key={tagName} style={{ background: tagName === 'Premium' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-bg-secondary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: tagName === 'Premium' ? '#fff' : 'var(--color-accent)' }}>
                  {tagName === 'Premium' ? '👑 Premium' : tagName}
                </span>
              )})}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight leading-tight drop-shadow-sm px-2">
            {displayTitle}
          </h1>
          {post.subtitle && (
            <h2 style={{ fontSize: '1.25rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              {post.subtitle}
            </h2>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {post.author?.name && (
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{post.author.name}</span>
            )}
            <span className="text-gray-600 dark:text-gray-400">•</span>
            <time>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
            <span className="text-gray-600 dark:text-gray-400">•</span>
            <span>{Math.ceil((contentHtml?.length || 0) / 1000)} min read</span>
            {post.autoGenerated && (
              <>
                <span className="text-gray-600 dark:text-gray-400">•</span>
                <span style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#c084fc', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(147, 51, 234, 0.2)' }}>✨ AI Generated</span>
              </>
            )}
          </div>
          {/* Social Join Option below Title */}
          <div className="mt-6 max-w-xl mx-auto">
            <SocialJoinStrip title="लेटेस्ट अपडेट्स के लिए हमसे जुड़ें (Join Groups):" />
          </div>
        </header>

        {/* Featured Image */}
        {imageSrc && (
          <figure style={{ margin: '0 0 2rem', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative', width: '100%', aspectRatio: '16/9' }}>
            <Image 
              src={imageSrc} 
              alt={displayTitle} 
              fill 
              style={{ objectFit: 'cover' }} 
              sizes="(max-width: 768px) 100vw, 800px" 
              priority 
              onError={() => {
                setImageSrc('/default-og.png');
              }}
            />
          </figure>
        )}

        {/* Quick Job Summary Table (सर्करी जॉब त्वरित विवरण) */}
        {isJobPost && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Quick Job Facts (त्वरित भर्ती विवरण)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.2rem' }}>भर्ती विभाग (Department)</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {post.title.split(/[:|-]/)[0]?.trim() || 'Government Sector'}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.2rem' }}>अंतिम तिथि (Last Date)</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: post.expiryDate ? '#f87171' : 'var(--color-text-primary)' }}>
                  {post.expiryDate ? new Date(post.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Apply Soon'}
                </span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.2rem' }}>योग्यता (Qualification)</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {post.tags?.map((t: any) => typeof t === 'string' ? t : (t.tag?.name || t.name)).filter((name: string) => name.toLowerCase().includes('pass') || name.toLowerCase().includes('grad') || name.toLowerCase().includes('tech') || name.toLowerCase().includes('diploma')).join(', ') || '10th / 12th / Graduate'}
                </span>
              </div>
              {applyLink && (
                <div style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center' }}>
                  <a 
                    href={applyLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#fff',
                      padding: '0.8rem 1.2rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
                      display: 'inline-block',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    👉 Apply Online / Notification
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Content */}
        <div style={{ position: 'relative' }} className="blog-content">
          <AdBanner dataAdSlot="top-content" />

          {/* Table of Contents (TOC) Box */}
          {toc.length > 2 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📑 Table of Contents (विषय सूची)
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {toc.map(item => (
                  <li key={item.id} style={{ marginLeft: item.level === 3 ? '1.5rem' : '0' }}>
                    <a 
                      href={`#${item.id}`}
                      style={{ 
                        color: 'var(--color-text-secondary)', 
                        textDecoration: 'none', 
                        transition: 'color 0.2s, transform 0.2s', 
                        fontSize: item.level === 3 ? '0.9rem' : '1rem',
                        display: 'inline-block'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(item.id);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 80;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                      {item.level === 2 ? '🔹' : '◦'} {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AdInjector htmlContent={contentHtml} />
          <AdBanner dataAdSlot="bottom-content" />
          
          {/* Premium Paywall Blur */}
          {isPremium && !isUnlocked && (
            <div style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '400px',
              background: 'linear-gradient(to bottom, transparent, var(--color-bg-primary) 80%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '2rem'
            }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '2rem', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', width: '100%'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem 0' }}>👑 Premium Content</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>This article is exclusive to premium subscribers. Unlock it to read the rest.</p>
                <button 
                  onClick={handlePayment} 
                  disabled={isProcessingPayment}
                  className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', fontWeight: 800 }}
                >
                  {isProcessingPayment ? 'Processing...' : 'Unlock via Razorpay (₹99)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* YMYL Disclaimer */}
        {(post.tags?.some((t: any) => (t.tag?.name || t.name) === 'Finance & Earning')) && (
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span> SEBI Disclaimer & Educational Notice
            </h4>
            <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
              यह जानकारी केवल शैक्षिक (Educational) उद्देश्यों के लिए है। हम <strong>SEBI द्वारा रजिस्टर्ड वित्तीय सलाहकार (Financial Advisor) नहीं हैं</strong>। किसी भी शेयर, स्टॉक या योजना में निवेश करने से पहले कृपया अपने सर्टिफाइड वित्तीय सलाहकार से परामर्श लें। (This information is for educational purposes only. We are not SEBI-registered advisors.)
            </p>
          </div>
        )}

        {/* Author Box */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-6 md:p-8" style={{ marginTop: '3rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
            {post.author?.name ? post.author.name.substring(0, 1).toUpperCase() : 'AG'}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              Written by {post.author?.name || 'Our Blog Team'}
            </h3>
            <div className="flex gap-4 justify-center sm:justify-start mb-3">
              <button 
                onClick={handleListen}
                className="px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors text-sm"
                style={{ background: isPlaying ? 'var(--color-accent)' : 'rgba(0,102,204,0.1)', color: isPlaying ? '#fff' : 'var(--color-accent)' }}
                title={isPlaying ? (isPaused ? "Resume Audio" : "Pause Audio") : "Listen to Article"}
              >
                {isPlaying && !isPaused ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                )}
                {isPlaying ? (isPaused ? "Resume" : "Pause") : "Listen"}
              </button>
              {isPlaying && (
                <button 
                  onClick={stopListen}
                  className="px-4 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                  title="Stop Audio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  Stop
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {post.author?.name ? `${post.author.name} is a senior editor and subject matter expert.` : 'The Our Blog Team consists of industry experts and AI specialists dedicated to bringing you the most accurate and up-to-date information.'}
            </p>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Share this article</h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📱 WhatsApp
            </a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" style={{ background: '#0088cc', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✈️ Telegram
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" style={{ background: '#1877F2', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📘 Facebook
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" style={{ background: '#1DA1F2', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🐦 Twitter
            </a>
          </div>
        </div>

        {/* Smart Banners */}
        <SmartBanners />

        {/* Lead Capture */}
        <div style={{ marginTop: '4rem' }}>
          <LeadCaptureForm postId={post.id} />
        </div>

        {/* Dynamic Comments System */}
        {commentsEnabled && (
          <div style={{ marginTop: '4rem', borderTop: '1px solid var(--color-border)', paddingTop: '3rem' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
              💬 Comments & Discussion (टिप्पणियां)
            </h3>

            {/* Comment Messages */}
            {commentMessage && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                {commentMessage}
              </div>
            )}
            {commentError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                {commentError}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleCommentSubmit} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Write a Comment (अपनी टिप्पणी लिखें)</h4>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Name (आपका नाम)</label>
                <input 
                  type="text" 
                  placeholder="Enter your name..." 
                  value={commentName} 
                  onChange={(e) => setCommentName(e.target.value)} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                  required
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Comment (आपकी टिप्पणी)</label>
                <textarea 
                  placeholder="Write your comment here..." 
                  rows={4} 
                  value={commentText} 
                  onChange={(e) => setCommentText(e.target.value)} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem', resize: 'vertical' }} 
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={isSubmittingComment}
                  className="btn-primary" 
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), #2563eb)', border: 'none', fontWeight: 700, padding: '0.6rem 1.5rem', height: 'auto', minHeight: 'auto' }}
                >
                  {isSubmittingComment ? 'Posting...' : '🚀 Post Comment'}
                </button>
              </div>
            </form>

            {/* List of Comments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem 0', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                  💬 No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                      {comment.author.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{comment.author}</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>•</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer Ad */}
        {footerAd && (
          <div className="ad-container" style={{ textAlign: 'center', marginTop: '3rem' }} dangerouslySetInnerHTML={{ __html: footerAd.adCode }} />
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: '4rem', borderTop: '1px solid var(--color-border)', paddingTop: '3rem' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '2rem' }}>Related Articles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '2rem' }}>
              {relatedPosts.map((rp: any) => (
                <a href={`/blog/${rp.slug}`} key={rp.id} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', transition: 'all 0.3s ease' }} className="minimal-card">
                  <div style={{ width: '100%', height: '180px', background: rp.featuredImage ? `url(${rp.featuredImage}) center/cover` : 'linear-gradient(135deg, #1e1e2f, #2d2b42)' }} />
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{rp.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rp.excerpt || 'Read this article...'}</p>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.9rem' }}>Read Article →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Floating Chatbot & WhatsApp */}
      <BlogChatbot postId={post.id} postTitle={post.title} postTags={post.tags} whatsappLinks={whatsappLinks} />

      <style>{`
        .blog-content h2 { font-size: 2rem; font-weight: 700; margin: 2.5rem 0 1rem; color: var(--color-text-primary); letter-spacing: -0.5px; }
        .blog-content h3 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem; color: var(--color-text-primary); }
        .blog-content p { margin-bottom: 1.5rem; line-height: 1.8; color: var(--color-text-primary) !important; background: transparent !important; }
        .blog-content ul { margin: 0 0 1.5rem 2rem; list-style-type: disc; line-height: 1.8; color: var(--color-text-primary) !important; }
        .blog-content li { margin-bottom: 0.5rem; }
        .blog-content strong { color: var(--color-text-primary) !important; font-weight: 700; }
        .blog-content span { color: inherit; background: transparent; }
        .blog-content a { color: var(--color-accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        .blog-content a:hover { border-bottom-color: var(--color-accent); }
        .blog-content blockquote { border-left: 4px solid var(--color-accent); margin: 2rem 0; padding: 1.5rem; font-style: italic; color: var(--color-text-secondary) !important; background: rgba(255,255,255,0.05) !important; border-radius: 8px; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; text-align: left; background: rgba(255,255,255,0.02) !important; border-radius: 8px; overflow: hidden; border-spacing: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .blog-content th, .blog-content td { padding: 15px 20px; border-bottom: 1px solid var(--color-border); color: var(--color-text-primary) !important; background: transparent !important; }
        .blog-content th { background-color: rgba(255,255,255,0.05) !important; font-weight: 700; color: var(--color-text-primary) !important; }
        .blog-content tr:last-of-type td { border-bottom: none; }
        .blog-content tr:hover td { background-color: rgba(255,255,255,0.02) !important; }
        @media (max-width: 768px) {
          .blog-content h2 { font-size: 1.5rem; }
          .blog-content h3 { font-size: 1.25rem; }
          .blog-content table { font-size: 0.85rem; }
          .blog-content th, .blog-content td { padding: 10px 12px; }
        }
      `}</style>
    </div>
  );
}
