'use client';

import React, { useEffect } from 'react';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: string;
  className?: string;
}

export default function AdBanner({
  dataAdSlot,
  dataAdFormat = 'auto',
  dataFullWidthResponsive = 'true',
  className = ''
}: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_ID || '';

  if (!publisherId) {
    // Don't render ad slot if no publisher ID is configured
    return null;
  }

  return (
    <div className={`ad-banner-container my-8 flex justify-center w-full overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '300px', minHeight: '100px' }}
        data-ad-client={publisherId}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive}
      />
    </div>
  );
}
