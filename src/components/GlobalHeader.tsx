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

  return (
    <header className="sticky top-0 z-50 glass-panel w-full" style={{ borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
      <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Left: Logo */}
        <a href="/" className="flex items-center" style={{ zIndex: 60, position: 'relative', height: '48px', width: '180px' }}>
          <Image src="/logo.png" alt={siteName || 'Knowora'} fill style={{ objectFit: 'contain', objectPosition: 'left' }} priority />
        </a>

        {/* Center: Desktop Navigation Links (Hidden on Mobile) */}
        <nav className="hidden md:flex gap-6 items-center font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>
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
                  onChange={(e) => {
                    const lang = e.target.value;
                    const domain = window.location.hostname;
                    const topDomain = '.' + domain.replace(/^www\./, '');
                    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
                    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${topDomain}`;

                    if (lang !== 'default') {
                      document.cookie = `googtrans=/auto/${lang}; path=/`;
                      document.cookie = `googtrans=/auto/${lang}; path=/; domain=${topDomain}`;
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
                  <option value="default">Default</option>
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                  <option value="bn">BN</option>
                  <option value="te">TE</option>
                  <option value="mr">MR</option>
                  <option value="ta">TA</option>
                  <option value="gu">GU</option>
                  <option value="ur">UR</option>
                  <option value="kn">KN</option>
                  <option value="ml">ML</option>
                  <option value="pa">PA</option>
                </select>
              </div>
            </>
          )}
          
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Hamburger Menu Toggle (Mobile Only) */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

      {/* Mobile Navigation Dropdown Panel */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden absolute left-0 right-0 border-b shadow-lg w-full" 
          style={{ 
            top: '100%', 
            background: 'var(--color-bg-secondary)', 
            borderColor: 'var(--color-border)', 
            zIndex: 9999,
            backdropFilter: 'blur(20px)'
          }}
        >
          <nav className="flex flex-col p-4 gap-3 font-semibold text-sm">
            {navLinks.map((link) => {
              const active = isActive(link.path, link.tag);
              return (
                <a 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    background: active ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    display: 'block',
                    width: '100%',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
