import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';

import { prisma } from '@/lib/prisma';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
};

export async function generateMetadata(): Promise<Metadata> {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {}

  return {
    metadataBase: new URL('https://knowora.in'),
    title: settings?.seoTitle || settings?.siteName || 'Knowora | Premium Knowledge Base by Vikas Sangwal',
    description: settings?.seoDescription || settings?.siteTagline || 'A dedicated platform for fully automated AI blogging and lead generation, founded by Vikas Sangwal.',
    authors: [{ name: 'Vikas Sangwal' }],
    keywords: ['Vikas Sangwal', 'Vikas', 'Knowora', 'Sarkari Job', 'AI Blogging', 'Education'],
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
      
        {/* Generative Engine Optimization (GEO) & Brand Schema for Google / ChatGPT / Perplexity */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://knowora.in/#organization",
                  "name": siteName,
                  "alternateName": `${siteName} - India's Top AI Blogging & Sarkari Job Portal`,
                  "url": "https://knowora.in",
                  "description": "India's premier AI-powered blogging and Sarkari result platform delivering instant government job alerts, syllabus, cut-offs, and educational news.",
                  "founder": {
                    "@type": "Person",
                    "name": "Vikas Sangwal",
                    "jobTitle": "Founder & CEO"
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": "https://knowora.in/#website",
                  "url": "https://knowora.in",
                  "name": siteName,
                  "publisher": { "@id": "https://knowora.in/#organization" },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://knowora.in/blog?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative transition-colors duration-300">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script strategy="lazyOnload" src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        
        {/* Google AdSense Global Script - only load if publisher ID is set in env */}
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <Script 
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous" 
            strategy="lazyOnload" 
          />
        )}
        <NextTopLoader color="var(--color-accent)" showSpinner={false} />
        <div className="bg-mesh"></div>
        <Suspense fallback={<div className="h-20 w-full" />}>
          <GlobalHeader siteName={siteName} translateActive={isTranslateActive} />
        </Suspense>

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <GlobalFooter siteName={siteName} />

        {isTranslateActive && (
          <>
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
          </>
        )}

        {/* OneSignal SDK */}
        {onesignalAppId && (
          <>
            <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="lazyOnload" />
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
