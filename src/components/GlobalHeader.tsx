'use client';
import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
        <a href="/" className="flex items-center" style={{ zIndex: 60, position: 'relative', height: '48px', width: '200px' }}>
          <Image src="/logo.png" alt={siteName || 'Knowora'} fill style={{ objectFit: 'contain', objectPosition: 'left' }} priority />
        </a>
        
        {/* Desktop & Mobile Shared Actions */}
        <div className="flex items-center gap-3 md:gap-6" style={{ zIndex: 60 }}>
          {/* Nav Links (Scrollable on Mobile) */}
          <nav className="flex gap-4 md:gap-6 items-center font-medium text-sm overflow-x-auto hide-scrollbar max-w-[50vw] md:max-w-none" style={{ color: 'var(--color-text-secondary)' }}>
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
                select.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
            className="language-selector"
            style={{
              appearance: 'none',
              background: 'var(--color-bg-secondary)',
              backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '12px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              padding: '8px 36px 8px 16px',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 'auto',
              fontFamily: 'inherit',
            }}
          >
            <option value="en" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>English</option>
            <option value="hi" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Hindi (हिन्दी)</option>
            <option value="bn" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Bengali (বাংলা)</option>
            <option value="te" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Telugu (తెలుగు)</option>
            <option value="mr" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Marathi (मराठी)</option>
            <option value="ta" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Tamil (தமிழ்)</option>
            <option value="gu" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Gujarati (ગુજરાતી)</option>
            <option value="ur" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Urdu (اردو)</option>
            <option value="kn" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Kannada (ಕನ್ನಡ)</option>
            <option value="ml" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Malayalam (മലയാളം)</option>
            <option value="pa" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>Punjabi (ਪੰਜਾਬੀ)</option>
          </select>
          
          {/* Theme Toggle */}
          <ThemeToggle />

        </div>
      </div>


    </header>
  );
}
