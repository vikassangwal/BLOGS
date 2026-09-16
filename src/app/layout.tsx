import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';
import NotificationPrompt from '@/components/NotificationPrompt';

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
    title: settings?.seoTitle || settings?.siteName || 'Knowora | Sarkari Job, Educational News & Tech Portal',
    description: settings?.seoDescription || settings?.siteTagline || 'KnowOra: Latest Sarkari Job Alerts, Admit Cards, Exam Dates, Sarkari Yojana, Tech Updates & Educational News.',
    authors: [{ name: 'Vikas Sangwal' }],
    keywords: ['Knowora', 'Knowora.in', 'Sarkari Job', 'Sarkari Result', 'Vikas Sangwal', 'Admit Card', 'Govt Vacancy 2026', 'Education News'],
    openGraph: {
      type: 'website',
      locale: 'hi_IN',
      url: 'https://knowora.in',
      siteName: settings?.siteName || 'Knowora',
      title: settings?.seoTitle || 'Knowora | Sarkari Job & Educational Portal',
      description: settings?.seoDescription || 'Latest Sarkari Job Alerts, Admit Cards, Exam Dates & Educational News.',
      images: [
        {
          url: '/default-og.png',
          width: 1200,
          height: 630,
          alt: 'KnowOra - Sarkari Job & Educational Portal',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings?.seoTitle || 'Knowora | Sarkari Job & Educational Portal',
      description: settings?.seoDescription || 'Latest Sarkari Job Alerts, Admit Cards & Educational News.',
      images: ['/default-og.png'],
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

  const siteName = settings?.siteName || 'Knowora';
  const onesignalAppId = autoBlogSettings?.onesignalAppId || '';
  let apiKeys: any = {};
  try {
    if (settings?.aiApiKey?.startsWith('{')) {
      apiKeys = JSON.parse(settings.aiApiKey);
    }
  } catch (e) {}
  
  const isTranslateActive = apiKeys.translateActive === true;

  return (
    <html lang="hi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="google-adsense-account" content="ca-pub-2689010221295201" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2689010221295201"
          crossOrigin="anonymous"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context":"https://schema.org","@type":"WebSite","name": siteName,"url":"https://knowora.in","potentialAction":{ "@type":"SearchAction","target":"https://knowora.in/blog?search={search_term_string}","query-input":"required name=search_term_string" } }) }} />
        <Script id="cookie-consent" strategy="afterInteractive">{`
function setCookie(name,value,days){var d=new Date();d.setTime(d.getTime()+(days*24*60*60*1000));var expires="expires="+d.toUTCString();document.cookie=name+"="+value+";"+expires+";path=/";}
function getCookie(name){var nameEQ=name+"=";var ca=document.cookie.split(';');for(var i=0;i<ca.length;i++){var c=ca[i].trim();if(c.indexOf(nameEQ)==0)return c.substring(nameEQ.length);}return null;}
if(!getCookie('cookie_consent')){var banner=document.createElement('div');banner.id='cookie-banner';banner.style.position='fixed';banner.style.bottom='0';banner.style.width='100%';banner.style.background='#222';banner.style.color='#fff';banner.style.padding='1rem';banner.style.textAlign='center';banner.innerHTML='We use cookies to improve your experience. <button id="accept-cookie" style="margin-left:10px;padding:5px 10px;">Accept</button>';
document.body.appendChild(banner);
document.getElementById('accept-cookie').onclick=function(){setCookie('cookie_consent','1',365);banner.remove();};
}
`}</Script>
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
        <NextTopLoader color="var(--color-accent)" showSpinner={false} />
        <div className="bg-mesh"></div>
        <Suspense fallback={<div className="h-20 w-full" />}>
          <GlobalHeader siteName={siteName} translateActive={isTranslateActive} />
        </Suspense>

        <main className="flex-grow flex flex-col">
          {children}
        </main>

        <GlobalFooter siteName={siteName} />
        <NotificationPrompt />

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
