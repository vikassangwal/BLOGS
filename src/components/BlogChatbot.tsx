'use client';
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface BlogChatbotProps {
  postTitle?: string;
  postId?: string;
  postTags?: any[];
  whatsappLinks?: any[];
}

export default function BlogChatbot({ postTitle, postId, postTags, whatsappLinks }: BlogChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialMsg = postTitle 
    ? `Hi! I am the AI assistant for "${postTitle}". What would you like to know?` 
    : `Hi! I'm your AI Blog Assistant. How can I help you explore our content today?`;
    
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: initialMsg }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const [isDismissed, setIsDismissed] = useState(false);

  // Determine WhatsApp Group Link from DB
  const links = whatsappLinks || [];
  
  // Helper to find a link by label keyword
  const findLink = (keyword: string) => {
    return links.find(l => l.label.toLowerCase().includes(keyword))?.url;
  };

  let whatsappLink = findLink('general') || '#';
  let groupName = 'Join Our WhatsApp Group';
  
  if (postTags && postTags.length > 0) {
    const tagNames = postTags.map(t => (t.tag?.name || t.name || '').toLowerCase());
    if (tagNames.some(t => t.includes('finance') || t.includes('earning') || t.includes('money'))) {
      whatsappLink = findLink('finance') || findLink('earn') || whatsappLink;
      groupName = 'Join Finance Group';
    } else if (tagNames.some(t => t.includes('education') || t.includes('study') || t.includes('career') || t.includes('exam') || t.includes('job'))) {
      whatsappLink = findLink('study') || findLink('education') || findLink('job') || whatsappLink;
      groupName = 'Join Study & Jobs Group';
    } else if (tagNames.some(t => t.includes('tech'))) {
      whatsappLink = findLink('tech') || whatsappLink;
      groupName = 'Join Tech Updates Group';
    }
  }

  // If we still don't have a valid link, fallback to the first active whatsapp link or hidden
  if (whatsappLink === '#' && links.length > 0) {
    whatsappLink = links[0].url;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          postId,
          history: messages
        })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'Sorry, I encountered an error.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Failed to connect to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
          
          {/* WhatsApp Group Logo Button (Always Show) */}
          <a
            href={whatsappLink === '#' ? 'https://chat.whatsapp.com/' : whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            title={groupName}
            style={{
              background: '#25D366',
              color: '#fff',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
              transition: 'transform 0.2s',
              marginBottom: '-0.5rem', // Bring it closer to chatbot button
              zIndex: 10
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>

          {/* Chatbot Button Container */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDismissed(true)}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 10
              }}
              title="Hide Chatbot"
            >
              ✕
            </button>
            <button
              onClick={() => setIsOpen(true)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent) 0%, #004999 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 8px 32px rgba(0, 102, 204, 0.4)',
                cursor: 'pointer',
                fontSize: '1.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              💬
            </button>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '380px',
            height: '550px',
            maxHeight: '80vh',
            maxWidth: 'calc(100vw - 4rem)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            color: '#111827'
          }}
          ref={chatRef}
        >
          {/* Header */}
          <div style={{
            padding: '1.2rem',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #004999 100%)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ fontSize: '1.5rem' }}>🤖</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Blog Assistant</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Ask me about this post</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'var(--color-accent, #3b82f6)' : '#f3f4f6',
                  color: msg.role === 'user' ? '#fff' : '#111827',
                  padding: '0.8rem 1.2rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#f3f4f6', padding: '0.8rem 1.2rem', borderRadius: '18px', display: 'flex', gap: '4px' }}>
                <span className="dot-bounce" style={{ animationDelay: '0s' }}>.</span>
                <span className="dot-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="dot-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid var(--color-border)',
            background: '#fff',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                borderRadius: '20px',
                border: '1px solid var(--color-border, #e5e7eb)',
                background: '#f9fafb',
                color: '#111827',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !input.trim()) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .dot-bounce {
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
          font-weight: bold;
        }
      `}</style>
    </>
  );
}
