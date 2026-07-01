'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function GlobalHeader({ siteName }: { siteName?: string }) {
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
    <header className="sticky top-0 z-50 glass-panel w-full" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <a href="/" className="flex items-center" style={{ zIndex: 60 }}>
          <img src="/logo.png" alt={siteName || 'Knowora'} className="h-12 md:h-14 w-auto object-contain" />
        </a>
        
        {/* Desktop & Mobile Shared Actions */}
        <div className="flex items-center gap-3 md:gap-6" style={{ zIndex: 60 }}>
          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6 items-center font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>
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

          {/* Search Icon */}
          <a href="/blog" title="Search Blogs" className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </a>

          {/* Hidden Original Google Translate */}
          <div id="google_translate_element" style={{ display: 'none' }}></div>
          
          {/* Custom Sleek Language Selector */}
          <select
            onChange={(e) => {
              const lang = e.target.value;
              const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
              if (select) {
                select.value = lang;
                select.dispatchEvent(new Event('change'));
              }
            }}
            className="language-selector"
            style={{
              appearance: 'none',
              background: 'rgba(255, 255, 255, 0.05) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 12px center',
              backgroundSize: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              padding: '8px 36px 8px 16px',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '160px',
              fontFamily: 'inherit',
            }}
          >
            <option value="en" style={{ background: '#121212', color: '#fff' }}>English</option>
            <option value="hi" style={{ background: '#121212', color: '#fff' }}>Hindi (हिन्दी)</option>
            <option value="bn" style={{ background: '#121212', color: '#fff' }}>Bengali (বাংলা)</option>
            <option value="te" style={{ background: '#121212', color: '#fff' }}>Telugu (తెలుగు)</option>
            <option value="mr" style={{ background: '#121212', color: '#fff' }}>Marathi (मराठी)</option>
            <option value="ta" style={{ background: '#121212', color: '#fff' }}>Tamil (தமிழ்)</option>
            <option value="gu" style={{ background: '#121212', color: '#fff' }}>Gujarati (ગુજરાતી)</option>
            <option value="ur" style={{ background: '#121212', color: '#fff' }}>Urdu (اردو)</option>
            <option value="kn" style={{ background: '#121212', color: '#fff' }}>Kannada (ಕನ್ನಡ)</option>
            <option value="ml" style={{ background: '#121212', color: '#fff' }}>Malayalam (മലയാളം)</option>
            <option value="pa" style={{ background: '#121212', color: '#fff' }}>Punjabi (ਪੰਜਾਬੀ)</option>
          </select>
          
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Hamburger Menu (Mobile) */}
          <button 
            className="md:hidden flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-primary)' }}>
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full glass-panel shadow-lg" style={{ borderBottom: '1px solid var(--color-border)', animation: 'slideDown 0.3s ease' }}>
          <nav className="flex flex-col p-4 gap-4 font-medium text-base">
            {navLinks.map((link) => {
              const active = isActive(link.path, link.tag);
              return (
                <a 
                  key={link.name} 
                  href={link.href} 
                  style={{
                    color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: active ? 'rgba(0,102,204,0.1)' : 'transparent',
                    display: 'block'
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
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
