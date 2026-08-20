'use client';

import React, { useState, useEffect } from 'react';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [showBlockedGuide, setShowBlockedGuide] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user dismissed or already granted previously
    const dismissed = localStorage.getItem('knowora_notification_prompt_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Auto-register Service Worker for mobile browsers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('SW registration error:', err));
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setIsVisible(true), 2500);
        return () => clearTimeout(timer);
      }
    } else {
      setPermission('unsupported');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Aapke browser me push notifications support nahi hai.');
      return;
    }

    // If already denied in browser settings, show Chrome Mobile Unblock Guide
    if (Notification.permission === 'denied') {
      setShowBlockedGuide(true);
      return;
    }

    try {
      // Handle both Promise-based and Callback-based requestPermission for Mobile Safari / Android
      let res: NotificationPermission;
      const requestResult = Notification.requestPermission();
      if (requestResult && typeof (requestResult as any).then === 'function') {
        res = await requestResult;
      } else {
        res = await new Promise((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }

      setPermission(res);

      if (res === 'granted') {
        setSuccessMsg(true);
        setShowBlockedGuide(false);
        localStorage.setItem('knowora_notification_prompt_dismissed', 'true');

        // Trigger welcome notification safely on mobile via ServiceWorker
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification('🔔 KnowOra Job Alerts Active!', {
              body: 'Sarkari Job Notification On Ho Gaya Hai! Nayi bhartiyon ka alert aapko sabse pehle milega.',
              icon: '/logo.png',
              badge: '/logo.png',
              data: { url: 'https://knowora.in' }
            } as any);
          } catch (e) {
            console.log('SW notification trigger fallback', e);
          }
        }

        setTimeout(() => {
          setIsVisible(false);
          setSuccessMsg(false);
        }, 3000);
      } else if (res === 'denied') {
        setShowBlockedGuide(true);
      }
    } catch (e) {
      console.error('Notification permission error:', e);
      setShowBlockedGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowBlockedGuide(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('knowora_notification_prompt_dismissed', 'true');
    }
  };

  if (showBlockedGuide) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm w-auto bg-gray-900/98 text-white p-5 rounded-2xl border border-yellow-500/40 shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0">🔒</div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-yellow-400">Notification Disabled Hai (Blocked)</h4>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Aapke phone browser me notification band hai. On karne ke liye:
            </p>
            <ol className="text-xs text-gray-300 mt-2 list-decimal list-inside space-y-1 bg-white/5 p-2 rounded-lg border border-white/10">
              <li>Address bar me **Lock 🔒 / Settings** icon dabayein.</li>
              <li>**Permissions ➔ Notifications** par **Allow** karein.</li>
              <li>Page ko Refresh 🔄 karein.</li>
            </ol>
            <button
              onClick={handleDismiss}
              className="mt-3 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs w-full font-medium"
            >
              Theek Hai (Close)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm w-auto bg-green-900/95 text-white p-4 rounded-2xl border border-green-500/40 shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <h4 className="font-bold text-sm text-green-300">Notification On Ho Gaye!</h4>
            <p className="text-xs text-green-100">Ab aapko naye sarkari alert sidhe phone par milenge.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isVisible || permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm w-auto bg-gray-900/98 text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl backdrop-blur-md animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0 animate-bounce">🔔</div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-blue-400">Sarkari Job Notification On Karein</h4>
          <p className="text-xs text-gray-300 mt-1 leading-normal">
            Nayi bhartiyo, admit cards aur yojanao ke alert sabse pehle apne phone par paayein!
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex-1 text-center"
            >
              Allow Notification 🔔
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-200 text-xs px-3 py-2 cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
