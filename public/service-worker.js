// The site no longer uses a service worker. Browsers that installed the old one
// fetch this file on their next visit; it removes itself and its caches so
// visitors always get the live site straight from the network.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach(client => client.navigate(client.url));
  })());
});
