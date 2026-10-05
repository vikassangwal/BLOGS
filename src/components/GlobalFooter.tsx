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
    <footer className="glass-panel border-t border-white/10 mt-auto w-full bg-neutral-950/80">
      <div className="container mx-auto px-6 pt-8 pb-10">
        <SocialJoinStrip title="चैनल ज्वाइन करें (Join Social Channels):" />

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-neutral-400">
          <div className="max-w-xl text-center md:text-left leading-relaxed">
            <p className="font-semibold text-white mb-1">
              © {new Date().getFullYear()} {siteName || 'Knowora'} — All Rights Reserved.
            </p>
            <p className="text-[11px] text-neutral-400">
              Knowora is an independent digital news and educational information platform. All government recruitment notices, exam dates, and admit cards are verified against official gazettes (.gov.in / .nic.in).
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-end font-medium text-xs">
            <a href="/about" className="hover:text-blue-400 transition-colors">About Us</a>
            <a href="/author/vikas-sangwal" className="hover:text-blue-400 transition-colors">Chief Editor</a>
            <a href="/editorial-policy" className="hover:text-blue-400 transition-colors">Editorial Policy</a>
            <a href="/fact-check-policy" className="hover:text-blue-400 transition-colors">Fact-Check Policy</a>
            <a href="/contact" className="hover:text-blue-400 transition-colors">Contact Us</a>
            <a href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-blue-400 transition-colors">Terms of Service</a>
            <a href="/disclaimer" className="hover:text-blue-400 transition-colors">Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
