// Service worker GetExp — anti-cache (réseau d'abord).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  const estNav = req.mode === 'navigate';
  const estBundle = url.pathname.indexOf('/_expo/') !== -1;
  if (estNav || estBundle) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function () { return fetch(req); })
    );
  }
});
