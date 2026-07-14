self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname === '/launching-soon' ||
      url.pathname === '/coming-soon' ||
      url.pathname.includes('launching') ||
      url.pathname.includes('coming-soon')) {
    event.respondWith(
      fetch(new Request('/', { method: 'GET' }))
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
