import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found (404) | Knowora',
  description: 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-2xl w-full mx-auto glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          Error 404: Page Not Found
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          ??? ???? ????
        </h1>

        <p className="text-gray-300 text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
          ?? ??? ??? ?? ???? ??? ??? ?? ???? ??? ???? ??? ??, ???? ??? ??? ??? ?? ?? ?? ??????? ??? ?? ???????? ???
        </p>

        {/* Search Bar */}
        <form action="/blog" method="GET" className="max-w-md mx-auto mb-8 flex gap-2">
          <input
            type="text"
            name="search"
            placeholder="Search jobs, results, syllabus, tech..."
            className="flex-grow bg-gray-900/80 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            Search
          </button>
        </form>

        {/* Quick Links */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Quick Categories
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/blog?jobType=active" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-blue-300 transition-colors">
              ?? Latest Jobs
            </Link>
            <Link href="/blog?jobType=admit_card" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-emerald-300 transition-colors">
              ?? Admit Cards
            </Link>
            <Link href="/blog?jobType=result" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-purple-300 transition-colors">
              ?? Results & Syllabus
            </Link>
            <Link href="/blog?tag=Technology" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-red-300 transition-colors">
              ? Tech News
            </Link>
            <Link href="/blog?tag=Finance%20%26%20Earning" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-amber-300 transition-colors">
              ?? Finance
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            ?? ????? ????? (Home) ?? ????
          </Link>
          <Link
            href="/blog"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm transition-all"
          >
            ?? ??? ????????? ?????
          </Link>
        </div>
      </div>
    </div>
  );
}
