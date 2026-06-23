'use client';
import React, { useEffect, useState } from 'react';

interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export default function SmartBanners() {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    fetch('/api/social-links')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLinks(data);
      })
      .catch(console.error);
  }, []);

  if (links.length === 0) return null;

  const getPlatformConfig = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('whatsapp')) return { icon: '💬', bg: 'linear-gradient(135deg, #25D366, #128C7E)' };
    if (p.includes('telegram')) return { icon: '✈️', bg: 'linear-gradient(135deg, #0088cc, #005580)' };
    if (p.includes('instagram')) return { icon: '📸', bg: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' };
    if (p.includes('twitter') || p.includes('x.com')) return { icon: '🐦', bg: 'linear-gradient(135deg, #1DA1F2, #1a91da)' };
    if (p.includes('facebook')) return { icon: '📘', bg: 'linear-gradient(135deg, #1877F2, #166fe5)' };
    if (p.includes('youtube')) return { icon: '▶️', bg: 'linear-gradient(135deg, #FF0000, #cc0000)' };
    if (p.includes('phone') || p.includes('call')) return { icon: '📞', bg: 'linear-gradient(135deg, #1d1d1f, #434345)' };
    return { icon: '🔗', bg: 'linear-gradient(135deg, var(--color-accent), #004999)' };
  };

  return (
    <div style={{ marginTop: '3rem', padding: '2rem 0', borderTop: '1px solid var(--color-border)' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>Connect With Us</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {links.map(link => {
          const config = getPlatformConfig(link.platform);
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.2rem',
                background: config.bg,
                color: '#fff',
                borderRadius: '16px',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
              <span>{link.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
