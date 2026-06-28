'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalFooter({ siteName }: { siteName?: string }) {
  const pathname = usePathname();
  
  if (pathname && pathname.startsWith('/admin')) {
    return null; // Hide on admin pages
  }

  return (
    <footer className="glass-panel border-t border-white/10 mt-auto">
      <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
        <p>© {new Date().getFullYear()} {siteName || 'Our Blog'}. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="/about" className="hover:text-white transition-colors">About Us</a>
          <a href="/admin/login" className="hover:text-white transition-colors">Editor / Admin Panel</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
