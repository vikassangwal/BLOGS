'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function BlogPostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Blog post error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-xl w-full mx-auto glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6">
          ⚠️ Notice
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          आर्टिकल लोड करने में त्रुटि हुई
        </h1>
        <p className="text-gray-300 text-sm sm:text-base mb-8">
          यह आर्टिकल लोड करते समय एक अस्थायी समस्या आई। कृपया पुनः प्रयास करें या हमारे मुख्य ब्लॉग पर अन्य आर्टिकल्स देखें।
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            🔄 पुनः प्रयास करें (Retry)
          </button>
          <Link
            href="/blog"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm transition-all"
          >
            📰 सभी आर्टिकल्स (All Blogs)
          </Link>
        </div>
      </div>
    </div>
  );
}
