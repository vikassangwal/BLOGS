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
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Google AdSense Global Script (Replace with actual publisher ID) */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossOrigin="anonymous"></script>
        {/* OneSignal Push Notifications */}
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(function(OneSignal) {
              OneSignal.init({
                appId: "YOUR_ONESIGNAL_APP_ID",
              });
            });
          `
        }} />
      </head>
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

        {/* OneSignal SDK */}
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="beforeInteractive" />
        <Script id="onesignal-init" strategy="lazyOnload">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "${settings?.aiApiKey?.includes('onesignalAppId') ? JSON.parse(settings.aiApiKey).onesignalAppId : ''}",
                safari_web_id: "web.onesignal.auto.11111111-1111-1111-1111-111111111111",
                notifyButton: { enable: true },
              });
            });
          `}
        </Script>
      </body>
    </html>
  );
}
