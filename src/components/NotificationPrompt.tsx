'use client';

import React, { useState, useEffect } from 'react';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [showBlockedGuide, setShowBlockedGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setIsVisible(true), 2000);
        return () => clearTimeout(timer);
      }
    } else if (typeof window !== 'undefined') {
      setPermission('unsupported');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Aapke browser me push notifications support nahi hai.');
      return;
    }

    // If already denied, show Chrome/Browser Unblock Guide
    if (Notification.permission === 'denied') {
      setShowBlockedGuide(true);
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);

      if (res === 'granted') {
        setIsVisible(false);
        setShowBlockedGuide(false);

        // Try Service Worker registration first for mobile Android/iOS
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('🔔 KnowOra Job Alerts Active!', {
              body: 'Sarkari Job Notification On Ho Gaya Hai! Nayi bhartiyon ka alert aapko milta rahega.',
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            });
          }).catch(() => {
            new Notification('🔔 KnowOra Job Alerts Active!', {
              body: 'Sarkari Job Notification On Ho Gaya Hai!',
              icon: '/favicon.ico'
            });
          });
        } else {
          new Notification('🔔 KnowOra Job Alerts Active!', {
            body: 'Sarkari Job Notification On Ho Gaya Hai!',
            icon: '/favicon.ico'
          });
        }
      } else if (res === 'denied') {
        setShowBlockedGuide(true);
      }
    } catch (e) {
      console.error('Notification permission error:', e);
      setShowBlockedGuide(true);
    }
  };

  if (showBlockedGuide) {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gray-900/95 text-white p-5 rounded-2xl border border-yellow-500/40 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0">🔒</div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-yellow-400">Notification Disabled Hai (Blocked)</h4>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Aapke browser me notifications Off hain. Unhe On karne ke liye:
            </p>
            <ol className="text-xs text-gray-300 mt-1 list-decimal list-inside space-y-1">
              <li>Address bar me **knowora.in** ke paas **Lock 🔒 / Settings** icon par click karein.</li>
              <li>**Permissions / Notifications** par jaakar **Allow** karein.</li>
              <li>Page ko Refresh 🔄 karein.</li>
            </ol>
            <button
              onClick={() => setShowBlockedGuide(false)}
              className="mt-3 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs w-full"
            >
              Samajh Gaya (Close)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isVisible || permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gray-900/95 text-white p-4 rounded-2xl border border-blue-500/30 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">🔔</div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-blue-400">Sarkari Job Notification On Karein</h4>
          <p className="text-xs text-gray-300 mt-1">
            Nayi Bhartiyo, Admit Cards aur Sarkari Yojanao ke alert instant apne phone par paayein!
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-md cursor-pointer"
            >
              Allow Notification 🔔
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
