'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

import SocialJoinStrip from './SocialJoinStrip';

export default function GlobalFooter({ siteName }: { siteName?: string }) {
  const pathname = usePathname();
  
  if (pathname && pathname.startsWith('/admin')) {
    return null; // Hide on admin pages
  }

  return (
    <footer className="glass-panel border-t border-white/10 mt-auto w-full">
      <div className="container mx-auto px-6 pt-6 pb-8">
        <SocialJoinStrip title="चैनल ज्वाइन करें (Join Social Channels):" />
        
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400 mt-6 pt-6 border-t border-white/5">
          <p>© {new Date().getFullYear()} {siteName || 'Our Blog'}. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 md:mt-0 justify-center md:justify-end">
            <a href="/about" className="hover:text-white transition-colors">About Us</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact Us</a>
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
