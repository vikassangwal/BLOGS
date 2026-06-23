'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalHeader() {
  const pathname = usePathname();
  
  if (pathname && pathname.startsWith('/admin')) {
    return null; // Hide on admin pages
  }

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 w-full">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold tracking-tight premium-gradient-text">
          Anti Gravity
        </a>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6 items-center font-medium text-sm text-gray-300">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/blog?tag=Technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/blog?tag=Education+%26+Career" className="hover:text-white transition-colors">Education & Career</a>
            <a href="/blog?tag=Finance+%26+Earning" className="hover:text-white transition-colors">Finance & Earning</a>
            <a href="/about" className="hover:text-white transition-colors">About Us</a>
          </nav>
          <div id="google_translate_element" className="hidden sm:block [&>div]:!mb-0 scale-90 origin-right"></div>
        </div>
      </div>
    </header>
  );
}
