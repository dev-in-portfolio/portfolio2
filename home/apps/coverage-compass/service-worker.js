/* Simple offline cache for Coverage Compass (static assets only). */
const CACHE_NAME = 'cc-cache-v1.0.3';
const ASSETS = [
  './',
  './index.html',
  './404.html',
  './styles.css',
  './app.js',
  './engine.js',
  './glossary.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './legal_pack_md/00_FILL_ME_FIRST.md',
  './legal_pack_md/01_Disclaimer.md',
  './legal_pack_md/02_Terms_of_Service.md',
  './legal_pack_md/03_Privacy_Policy.md',
  './legal_pack_md/04_Cookie_Policy.md',
  './legal_pack_md/05_Methodology_and_Risk_Disclosure.md',
  './legal_pack_md/06_Security_Practices_Summary.md',
  './legal_pack_md/07_Accessibility_Statement.md',
  './legal_pack_md/08_Third_Party_Notices.md',
  './legal_pack_md/09_State_Disclosure_Templates.md',
  './legal_pack_md/10_Changelog.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Avoid caching cross-origin requests.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        // Best-effort runtime cache for same-origin GET.
        const copy = res.clone().catch((e)=>{console.warn("fetch failed", e);});
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
