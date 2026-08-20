// Service Worker for KnowOra Web Push Notifications & Offline Support
const CACHE_NAME = 'knowora-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'KnowOra Sarkari Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 KnowOra Sarkari Job & Exam Alert';
  const options = {
    body: data.body || 'Nayi Sarkari Bharti aur Yojana ka notification abhi check karein!',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || 'https://knowora.in'
    },
    actions: [
      { action: 'open', title: '👉 Abhi Dekhein' },
      { action: 'close', title: 'Band Karein' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || 'https://knowora.in';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
