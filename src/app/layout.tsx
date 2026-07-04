import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
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
    metadataBase: new URL('https://knowora.in'),
    title: settings?.seoTitle || settings?.siteName || 'Knowora | Premium Knowledge Base',
    description: settings?.seoDescription || settings?.siteTagline || 'A dedicated platform for fully automated AI blogging and lead generation.',
    openGraph: {
      type: 'website',
      siteName: settings?.siteName || 'Knowora',
    },
    verification: {
      google: '9xaLxx5SOf8hmaKdfKQ5Dgp5Y4abmT27VqN8CIlPdIM',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings = null;
  let autoBlogSettings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    autoBlogSettings = await prisma.autoBlogSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {}

  const siteName = settings?.siteName || 'Our Blog';
  const onesignalAppId = autoBlogSettings?.onesignalAppId || '';
  let apiKeys: any = {};
  try {
    if (settings?.aiApiKey?.startsWith('{')) {
      apiKeys = JSON.parse(settings.aiApiKey);
    }
  } catch (e) {}
  
  const isTranslateActive = apiKeys.translateActive === true;

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative transition-colors duration-300">
        {/* Google AdSense Global Script - only load if configured */}
        <Script 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" 
          crossOrigin="anonymous" 
          strategy="lazyOnload" 
        />
        <NextTopLoader color="var(--color-accent)" showSpinner={false} />
        <div className="bg-mesh"></div>
        <Suspense fallback={<div className="h-20 w-full" />}>
          <GlobalHeader siteName={siteName} translateActive={isTranslateActive} />
        </Suspense>

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <GlobalFooter siteName={siteName} />

        <Script id="google-translate-init" strategy="lazyOnload">
          {`
            window.googleTranslateElementInit = function() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                autoDisplay: false,
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
              }, 'google_translate_element');
            };
          `}
        </Script>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="lazyOnload"
        />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

        {/* OneSignal SDK */}
        {onesignalAppId && (
          <>
            <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
            <Script id="onesignal-init" strategy="lazyOnload">
              {`
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                window.OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: "${onesignalAppId}",
                    safari_web_id: "web.onesignal.auto.11111111-1111-1111-1111-111111111111",
                    notifyButton: { enable: true },
                  });
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
