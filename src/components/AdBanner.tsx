'use client';

import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  dataAdSlot?: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: string;
  className?: string;
  adCode?: string;
}

export default function AdBanner({
  dataAdSlot = 'auto',
  dataAdFormat = 'auto',
  dataFullWidthResponsive = 'true',
  className = '',
  adCode
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-2689010221295201';

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense push error:', err);
    }
  }, []);

  if (adCode) {
    return (
      <div 
        ref={adRef} 
        className={`ad-banner-container my-8 flex justify-center w-full overflow-hidden ${className}`}
        dangerouslySetInnerHTML={{ __html: adCode }}
      />
    );
  }

  return (
    <div ref={adRef} className={`ad-banner-container my-8 flex justify-center w-full overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '300px', minHeight: '100px', width: '100%' }}
        data-ad-client={publisherId}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive}
      />
    </div>
  );
}
