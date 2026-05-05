self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  self.registration.showNotification(data.title || "Notification", {
    body: data.body || "",
    icon: "/logo-icon-192.png",
    data: {
      url: data.url || "/"
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});