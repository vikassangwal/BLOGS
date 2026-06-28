'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type SiteSettingsContextType = {
  siteName: string;
  siteTagline: string;
};

const defaultSettings = {
  siteName: 'Our Blog',
  siteTagline: 'AI-Powered Platform',
};

const SiteSettingsContext = createContext<SiteSettingsContextType>(defaultSettings);

export const useSiteSettings = () => useContext(SiteSettingsContext);

export function SiteSettingsProvider({ 
  children, 
  initialSettings 
}: { 
  children: React.ReactNode;
  initialSettings?: Partial<SiteSettingsContextType>;
}) {
  const [settings, setSettings] = useState<SiteSettingsContextType>({
    siteName: initialSettings?.siteName || defaultSettings.siteName,
    siteTagline: initialSettings?.siteTagline || defaultSettings.siteTagline,
  });

  useEffect(() => {
    // Optionally fetch client-side if we want real-time updates without reload
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.siteName) {
            setSettings({
              siteName: data.siteName,
              siteTagline: data.siteTagline || defaultSettings.siteTagline
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch site settings', error);
      }
    };
    // Fetch immediately on mount just in case
    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
