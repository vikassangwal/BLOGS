'use client';
import React, { useEffect, useState } from 'react';

interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export default function SocialJoinStrip({ title = "हमसे जुड़ें (Join Groups):" }: { title?: string }) {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    fetch('/api/social-links')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort or filter if needed
          setLinks(data.filter(l => l.isActive));
        }
      })
      .catch(console.error);
  }, []);

  if (links.length === 0) return null;

  const getPlatformStyle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('whatsapp')) {
      return { icon: '💬', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25' };
    }
    if (p.includes('telegram')) {
      return { icon: '✈️', classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/25' };
    }
    if (p.includes('instagram')) {
      return { icon: '📸', classes: 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/25' };
    }
    if (p.includes('youtube')) {
      return { icon: '🎥', classes: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/25' };
    }
    if (p.includes('facebook')) {
      return { icon: '📘', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/25' };
    }
    if (p.includes('twitter') || p === 'x') {
      return { icon: '🐦', classes: 'bg-gray-500/10 text-gray-300 border-gray-500/20 hover:bg-gray-500/25' };
    }
    return { icon: '🔗', classes: 'bg-white/5 text-white border-white/10 hover:bg-white/10' };
  };

  return (
    <div className="w-full py-1.5 px-3 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md select-none my-2 shadow-sm">
      <div className="flex flex-row items-center justify-between gap-3 overflow-hidden">
        <span className="font-extrabold text-[10px] sm:text-xs text-gray-300 flex items-center gap-1 shrink-0">
          📢 {title}
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scroll-smooth py-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {links.map((link) => {
            const config = getPlatformStyle(link.platform);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-full border transition-all hover:scale-105 shrink-0 ${config.classes}`}
              >
                <span>{config.icon}</span>
                <span>{link.label || link.platform}</span>
              </a>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
