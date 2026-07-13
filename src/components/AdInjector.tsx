'use client';
import React, { useEffect, useState, useRef } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

export default function AdInjector({ htmlContent }: { htmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/ads')
      .then(r => r.json())
      .then(data => {
        if (data.ads) {
          // Filter ads that are meant for "in-content" placement
          const inContentAds = data.ads.filter((ad: any) => ad.position === 'in-content' && ad.isActive);
          setAds(inContentAds);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current || ads.length === 0) return;

    const paragraphs = containerRef.current.querySelectorAll('p');
    // Inject an ad every 4 paragraphs
    const injectionInterval = 4;
    
    let adIndex = 0;
    
    for (let i = injectionInterval; i < paragraphs.length; i += injectionInterval) {
      if (adIndex >= ads.length) adIndex = 0; // Loop through ads if not enough unique ones
      
      const ad = ads[adIndex];
      const adContainer = document.createElement('div');
      adContainer.className = 'ad-injection-block';
      adContainer.style.margin = '2rem 0';
      adContainer.style.padding = '1rem';
      adContainer.style.background = 'rgba(255, 255, 255, 0.02)';
      adContainer.style.border = '1px solid var(--color-border)';
      adContainer.style.borderRadius = '8px';
      adContainer.style.textAlign = 'center';
      
      // We use dangerouslySetInnerHTML logic here by directly setting innerHTML
      adContainer.innerHTML = `<span style="font-size:0.7rem; color:var(--color-text-secondary); display:block; margin-bottom:0.5rem">Advertisement</span>${ad.code}`;
      
      // Insert after the paragraph
      paragraphs[i].parentNode?.insertBefore(adContainer, paragraphs[i].nextSibling);
      
      adIndex++;
    }
  }, [htmlContent, ads]);

  // Pre-process HTML: sanitize first (blog content is author-supplied → XSS risk),
  // then wrap all tables in responsive wrappers.
  const processedHtml = sanitizeHtml(htmlContent).replace(
    /<table/g,
    '<div class="table-responsive-wrapper"><table'
  ).replace(
    /<\/table>/g,
    '</table></div>'
  );

  // Also wrap any dynamically inserted tables after ads injection
  useEffect(() => {
    if (!containerRef.current) return;
    const tables = containerRef.current.querySelectorAll('table');
    tables.forEach((table) => {
      if (table.parentElement && !table.parentElement.classList.contains('table-responsive-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive-wrapper';
        table.parentElement.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  }, [htmlContent, ads]);

  return (
    <div 
      ref={containerRef}
      className="prose prose-invert max-w-none blog-content" 
      style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--color-text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: processedHtml }} 
    />
  );
}
