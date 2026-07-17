'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi there! I am the Automata Support Agent. How can I help you automate your business today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close chat when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue;
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages, postId: 'general' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Network error. Please try again later.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div ref={chatRef}>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--color-text-primary)',
          color: 'var(--color-bg-primary)',
          border: 'none',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'transform 0.3s ease'
        }}
        className="hover:scale-110"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '6rem',
          right: '2rem',
          width: '350px',
          height: '500px',
          background: 'var(--color-bg-primary)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--color-border)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpFade 0.3s ease-out forwards'
        }}>
          {/* Header */}
          <div style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34c759' }}></div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>AI Support Agent</h3>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: msg.role === 'user' ? 'var(--color-text-primary)' : 'var(--color-bg-secondary)',
                color: msg.role === 'user' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                fontSize: '0.9rem',
                border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', border: '1px solid var(--color-border)' }}>
                <span className="typing-dot">.</span><span className="typing-dot">.</span><span className="typing-dot">.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '0.8rem 1rem', 
                  borderRadius: '20px', 
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-secondary)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }} 
              />
              <button 
                type="submit" 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-bg-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ↑
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
