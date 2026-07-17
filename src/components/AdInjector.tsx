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
        // API returns a flat array, not { ads: [...] }
        if (Array.isArray(data)) {
          const inContentAds = data.filter((ad: any) => ad.position === 'in-content' && ad.isActive);
          setAds(inContentAds);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current || ads.length === 0) return;

    const paragraphs = containerRef.current.querySelectorAll('p');
    const injectionInterval = 4;
    
    let adIndex = 0;
    
    for (let i = injectionInterval; i < paragraphs.length; i += injectionInterval) {
      if (adIndex >= ads.length) adIndex = 0;
      
      const ad = ads[adIndex];
      const adContainer = document.createElement('div');
      adContainer.className = 'ad-injection-block';
      adContainer.style.margin = '2rem 0';
      adContainer.style.padding = '1rem';
      adContainer.style.background = 'rgba(255, 255, 255, 0.02)';
      adContainer.style.border = '1px solid var(--color-border)';
      adContainer.style.borderRadius = '8px';
      adContainer.style.textAlign = 'center';
      
      // Use adCode (matching Prisma schema field name) and sanitize to prevent XSS
      const sanitizedAdCode = sanitizeHtml(ad.adCode || '');
      adContainer.innerHTML = `<span style="font-size:0.7rem; color:var(--color-text-secondary); display:block; margin-bottom:0.5rem">Advertisement</span>${sanitizedAdCode}`;
      
      paragraphs[i].parentNode?.insertBefore(adContainer, paragraphs[i].nextSibling);
      
      adIndex++;
    }
  }, [htmlContent, ads]);

  // Pre-process HTML: sanitize first, then wrap tables
  const processedHtml = sanitizeHtml(htmlContent).replace(
    /<table/g,
    '<div class="table-responsive-wrapper"><table'
  ).replace(
    /<\/table>/g,
    '</table></div>'
  );

  // Wrap dynamically inserted tables after ads injection
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
