/* sw.js — Portfolio Nexus offline cache (safe defaults)
   - cache-first for static same-origin assets
   - network for everything else
*/

const CACHE = 'nexus-cache-v5';
const PRECACHE = [
  '/lab-core.css',
  '/ui-helpers.js',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
].filter(Boolean);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Enable navigation preload if supported (faster navigations + better freshness)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }

    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

function isCacheable(reqUrl){
  try{
    const u = new URL(reqUrl);
    if (u.origin !== self.location.origin) return false;
    if (u.pathname.startsWith('/private/')) return false;
    const ext = (u.pathname.split('.').pop() || '').toLowerCase();
    return ['css','js','json','png','jpg','jpeg','webp','svg','ico','webmanifest','txt','xml'].includes(ext);
  }catch{ return false; }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never cache navigations/HTML. Always go to network for pages.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
    );
    return;
  }

  if (req.method !== 'GET') return;
  if (!isCacheable(req.url)) return;

  // Cache-first for static assets (CSS/JS/images/etc).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Update in background
        event.waitUntil(
          fetch(req).then((resp) => {
            if (resp && resp.ok) return caches.open(CACHE).then((c) => c.put(req, resp.clone())).catch((e)=>{console.warn("fetch failed", e);});
          }).catch(() => {})
        );
        return cached;
      }

      return fetch(req).then((resp) => {
        if (resp && resp.ok) caches.open(CACHE).then((c) => c.put(req, resp.clone())).catch((e)=>{console.warn("fetch failed", e);});
        return resp;
      }).catch(() => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }));
    })
  );
});
