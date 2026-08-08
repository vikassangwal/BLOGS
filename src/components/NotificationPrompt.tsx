'use client';

import React, { useState, useEffect } from 'react';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        // Delay 3 seconds before showing notification prompt banner
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setPermission('unsupported');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        setIsVisible(false);
        // Show confirmation toast/alert
        new Notification('🔔 KnowOra Job Alerts Enabled!', {
          body: 'You will now receive instant notification alerts for new Sarkari Vacancies & Admit Cards.',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  };

  if (!isVisible || permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gray-900/95 text-white p-4 rounded-2xl border border-blue-500/30 shadow-2xl backdrop-blur-md animate-bounce-subtle">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">🔔</div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-blue-400">sarkari Job Notification On Karein</h4>
          <p className="text-xs text-gray-300 mt-1">
            Nayi Bhartiyo, Admit Cards aur Sarkari Yojanao ke alert instant apne phone par paayein!
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-md"
            >
              Turn On Notification
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
