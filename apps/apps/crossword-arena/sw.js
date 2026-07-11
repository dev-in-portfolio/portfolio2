const APP_PREFIX = 'portfolio2-crossword-';
const CACHE_VERSION = 'v1';
const CACHE_NAME = `${APP_PREFIX}${CACHE_VERSION}`;

const REQUIRED_ASSETS = [
  './',
  './index.html',
  './app.js',
  './data/puzzles.json',
  './help.md',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  '/shared/tokens.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(REQUIRED_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const oldAppCaches = keys.filter((key) => key.startsWith(APP_PREFIX) && key !== CACHE_NAME);
    await Promise.all(oldAppCaches.map((key) => caches.delete(key)));
    if (oldAppCaches.length > 0) await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch (error) {
    return (
      await cache.match(request, { ignoreSearch: true }) ||
      await cache.match('./index.html') ||
      new Response('Crossword Arena is unavailable offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || await network || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!['http:', 'https:', 'arcade:'].includes(url.protocol)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
