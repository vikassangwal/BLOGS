import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anti Gravity | Premium AI Blogging',
  description: 'A dedicated platform for fully automated AI blogging and lead generation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-black text-white relative">
        <div className="bg-mesh"></div>
        {/* Minimalist Premium Navbar */}
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

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <footer className="glass-panel border-t border-white/10 mt-auto">
          <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Anti Gravity. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="/about" className="hover:text-white transition-colors">About Us</a>
              <a href="/admin/login" className="hover:text-white transition-colors">Editor / Admin Panel</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </footer>

        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
        <Script id="google-translate-init" strategy="lazyOnload">
          {`
            window.googleTranslateElementInit = function() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,hi,bn,te,mr,ta,ur,gu,kn,ml,pa,or,as',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
              }, 'google_translate_element');
            };
          `}
        </Script>
      </body>
    </html>
  );
}
