'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

export default function GlobalHeader({ siteName, translateActive }: { siteName?: string, translateActive?: boolean }) {
  const pathname = usePathname();
  
  if (pathname && pathname.startsWith('/admin')) {
    return null; // Hide on admin pages
  }

  const searchParams = useSearchParams();
  const currentTag = searchParams ? searchParams.get('tag') : null;

  const isActive = (path: string, tag?: string) => {
    if (tag) {
      return pathname === '/blog' && currentTag === tag;
    }
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const navLinks = [
    { name: 'Home', href: '/', path: '/' },
    { name: 'Technology', href: '/blog?tag=Technology', path: '/blog', tag: 'Technology' },
    { name: 'Education & Career', href: '/blog?tag=Education+%26+Career', path: '/blog', tag: 'Education & Career' },
    { name: 'Finance & Earning', href: '/blog?tag=Finance+%26+Earning', path: '/blog', tag: 'Finance & Earning' },
    { name: 'About Us', href: '/about', path: '/about' },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [currentLang, setCurrentLang] = React.useState('default');
  const [socialLinks, setSocialLinks] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/social-links')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter only WhatsApp, Telegram, Instagram
          const filtered = data.filter(link => {
            const p = link.platform.toLowerCase();
            return p.includes('whatsapp') || p.includes('telegram') || p.includes('instagram');
          });
          setSocialLinks(filtered);
        }
      })
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    try {
      const cookies = document.cookie.split(';');
      for (let c of cookies) {
        c = c.trim();
        if (c.startsWith('googtrans=')) {
          const parts = c.split('/');
          if (parts.length >= 3) {
            setCurrentLang(parts[2]);
            return;
          }
        }
      }
    } catch (e) {}
    setCurrentLang('default');
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 glass-panel w-full" style={{ borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
      <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Left: Logo */}
        <a href="/" className="flex items-center h-12 w-44 md:h-14 md:w-56" style={{ zIndex: 60, position: 'relative' }}>
          <Image src="/logo.png" alt={siteName || 'Knowora'} fill style={{ objectFit: 'contain', objectPosition: 'left' }} priority />
        </a>

        {/* Center: Desktop Navigation Links (Hidden on Mobile/Tablet) */}
        <nav className="hidden lg:flex gap-4 xl:gap-6 items-center font-bold text-xs lg:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {navLinks.map((link) => {
            const active = isActive(link.path, link.tag);
            return (
              <a 
                key={link.name} 
                href={link.href} 
                style={{
                  color: active ? 'var(--color-accent)' : 'inherit',
                  borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = active ? 'var(--color-accent)' : 'inherit'}
              >
                {link.name}
              </a>
            );
          })}
        </nav>
        
        {/* Right: Actions (Search, Lang, Theme, Hamburger) */}
        <div className="flex items-center gap-2 sm:gap-4" style={{ zIndex: 60 }}>
          {/* Search Icon */}
          <a href="/blog" title="Search Blogs" className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </a>

          {/* Google Translate Selector */}
          {translateActive && (
            <>
              <div id="google_translate_element" style={{ display: 'none' }}></div>
              <div className="flex items-center gap-1 notranslate">
                <span className="hidden lg:inline" style={{fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600}}>Lang:</span>
                <select
                  value={currentLang}
                  onChange={(e) => {
                    const lang = e.target.value;
                    const domain = window.location.hostname;
                    const topDomain = '.' + domain.replace(/^www\./, '');
                    
                    // Clear all possible cookies on default reset
                    const domains = [domain, topDomain, '.' + domain, ''];
                    domains.forEach(d => {
                      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${d ? ` domain=${d};` : ''}`;
                      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/blog;${d ? ` domain=${d};` : ''}`;
                    });

                    if (lang !== 'default') {
                      document.cookie = `googtrans=/auto/${lang}; path=/; domain=${topDomain}`;
                      document.cookie = `googtrans=/auto/${lang}; path=/; domain=${domain}`;
                      document.cookie = `googtrans=/auto/${lang}; path=/`;
                    }
                    window.location.reload();
                  }}
                  className="language-selector"
                  style={{
                    appearance: 'none',
                    background: 'var(--color-bg-secondary)',
                    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 6px center',
                    backgroundSize: '10px',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '4px 18px 4px 6px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: 'auto',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="default">Default (Original)</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="ur">Urdu (اردو)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
              </div>
            </>
          )}
          
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Hamburger Menu Toggle */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              // X Icon
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)', pointerEvents: 'none' }}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              // Hamburger Icon
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)', pointerEvents: 'none' }}>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Dropdown Panel */}
      {isMobileMenuOpen && (
        <div 
          className="absolute left-0 right-0 border-b shadow-lg w-full" 
          style={{ 
            top: '100%', 
            background: 'var(--color-bg-secondary)', 
            borderColor: 'var(--color-border)', 
            zIndex: 9999,
            backdropFilter: 'blur(20px)'
          }}
        >
          <nav className="flex flex-col p-4 gap-4 font-semibold text-sm max-h-[75vh] overflow-y-auto">
            {/* Standard Nav Links */}
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors text-white"
                >
                  {link.name === 'Home' ? '🏠 Home' : 
                   link.name === 'Technology' ? '💻 Technology' :
                   link.name === 'Education & Career' ? '🎓 Education & Career' :
                   link.name === 'Finance & Earning' ? '💰 Finance & Earning' :
                   link.name === 'About Us' ? 'ℹ️ About Us' : link.name}
                </a>
              ))}
            </div>

            <hr className="border-white/10" />

            {/* Grid Jump Links */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2.5 px-1">
                📂 Quick Jump to Grid (श्रेणियों के सीधे लिंक)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a 
                  href="/blog?tag=Education%20%26%20Career&jobType=active_upcoming" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-emerald-400 font-bold">🔥 नवीनतम नौकरियां</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Latest Jobs</span>
                </a>
                <a 
                  href="/blog?tag=Education%20%26%20Career&jobType=active_upcoming" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-sky-500/10 hover:border-sky-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-sky-400 font-bold">🚀 आगामी भर्ती</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Upcoming Jobs</span>
                </a>
                <a 
                  href="/blog?tag=Admit%20Card" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-blue-500/10 hover:border-blue-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-blue-400 font-bold">🎟️ प्रवेश पत्र</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Admit Cards</span>
                </a>
                <a 
                  href="/blog?tag=Education%20%26%20Career" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-purple-500/10 hover:border-purple-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-purple-400 font-bold">🏆 परिणाम & सिलेबस</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Results & Syllabus</span>
                </a>
                <a 
                  href="/blog?tag=Education%20%26%20Career" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-cyan-500/10 hover:border-cyan-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-cyan-400 font-bold">🎓 विश्वविद्यालय</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">University Info</span>
                </a>
                <a 
                  href="/blog?tag=Finance%20%26%20Earning" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-orange-500/10 hover:border-orange-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-orange-400 font-bold">🎁 सरकारी योजनाएं</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Govt Schemes</span>
                </a>
                <a 
                  href="/blog?tag=Scholarship" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-yellow-500/10 hover:border-yellow-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-yellow-400 font-bold">🎓 छात्रवृत्ति अलर्ट</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Scholarships</span>
                </a>
                <a 
                  href="/blog?tag=Technology" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-red-400 font-bold">📱 टेक और गैजेट्स</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Tech & Mobiles</span>
                </a>
                <a 
                  href="/blog?tag=Finance%20%26%20Earning" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-indigo-500/10 hover:border-indigo-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-indigo-400 font-bold">📊 फाइनेंस & बैंक</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Finance & Banking</span>
                </a>
                <a 
                  href="/blog?tag=Earning" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="flex flex-col p-2.5 bg-white/5 border border-pink-500/10 hover:border-pink-500/30 rounded-xl transition-all hover:bg-white/10"
                >
                  <span className="text-[11px] text-pink-400 font-bold">💸 कमाई & कोर्सेज</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">Earning & Courses</span>
                </a>
              </div>
            </div>
          </nav>
        </div>
      )}
      {/* Join Social Media groups bar (1 line always, scrollable on very small screens) */}
      {socialLinks.length > 0 && (
        <div className="w-full bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border-t border-white/10 py-2 px-4 overflow-hidden select-none">
          <div className="container mx-auto flex flex-row items-center justify-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none text-[10px] sm:text-xs">
            <span className="font-bold text-gray-300 flex items-center gap-1 shrink-0">
              📢 हमसे जुड़ें (Join Groups):
            </span>
            <div className="flex flex-row items-center gap-2">
              {socialLinks.map((link: any) => {
                const platform = link.platform.toLowerCase();
                let icon = '🔗';
                let styleClass = 'bg-white/5 text-white border-white/10 hover:bg-white/10';
                
                if (platform.includes('whatsapp')) {
                  icon = '💬';
                  styleClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20';
                } else if (platform.includes('telegram')) {
                  icon = '✈️';
                  styleClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20';
                } else if (platform.includes('instagram')) {
                  icon = '📸';
                  styleClass = 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20';
                } else if (platform.includes('youtube')) {
                  icon = '🎥';
                  styleClass = 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20';
                } else if (platform.includes('facebook')) {
                  icon = '📘';
                  styleClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
                } else if (platform.includes('twitter') || platform === 'x') {
                  icon = '🐦';
                  styleClass = 'bg-gray-500/10 text-gray-300 border-gray-500/20 hover:bg-gray-500/20';
                }

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 font-bold rounded-full border transition-all hover:scale-105 shrink-0 ${styleClass}`}
                  >
                    <span>{icon}</span>
                    <span>{link.label || link.platform}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
