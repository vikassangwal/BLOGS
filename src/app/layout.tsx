import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';

import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {}

  return {
    title: settings?.seoTitle || settings?.siteName || 'Anti Gravity | Premium AI Blogging',
    description: settings?.seoDescription || settings?.siteTagline || 'A dedicated platform for fully automated AI blogging and lead generation.',
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {}

  const siteName = settings?.siteName || 'Anti Gravity';

  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-black text-white relative">
        <div className="bg-mesh"></div>
        <GlobalHeader siteName={siteName} />

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <GlobalFooter siteName={siteName} />

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
