import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';

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
        <GlobalHeader />

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <GlobalFooter />

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
