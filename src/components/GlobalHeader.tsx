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

  return (
    <header className="sticky top-0 z-50 glass-panel w-full" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold tracking-tight premium-gradient-text">
          {siteName || 'Our Blog'}
        </a>
        <div className="flex items-center gap-6">
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
          <div id="google_translate_element" className="[&>div]:!mb-0 scale-75 sm:scale-90 origin-right"></div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
