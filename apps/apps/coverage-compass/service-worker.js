/* Coverage Compass modular offline worker. */
const CACHE_NAME = 'coverage-compass-cache-v2-modular-14';
const APP_SHELL = [
  './',
  './index.html',
  './404.html',
  './styles.css',
  './accessibility.css',
  './preflight.js',
  './engine.js',
  './glossary.js',
  './reports.js',
  './app.js',
  './src/browser/storage-adapter.js',
  './src/browser/report-snapshot-adapter.js',
  './src/browser/export-controller.js',
  './src/browser/data-lifecycle.js',
  './src/browser/result-status-controller.js',
  './src/browser/runtime.js',
  './src/browser/modal-accessibility.js',
  './src/config/versions.js',
  './src/assessment/question-metadata.js',
  './src/assessment/readiness.js',
  './src/assessment/validation.js',
  './src/engine/audit.js',
  './src/engine/calculate.js',
  './src/engine/confidence.js',
  './src/engine/legacy-score-model.js',
  './src/engine/question-execution.js',
  './src/engine/overrides.js',
  './src/engine/scoring.js',
  './src/reports/readiness.js',
  './src/reports/snapshot.js',
  './src/storage/keys.js',
  './src/storage/migrations.js',
  './manifest.webmanifest',
  './build-metadata.json',
  './metadata/app-store-listing.json',
  './metadata/pricing.json',
  './metadata/privacy-labels.json',
  './data/model-assumptions.json',
  './data/state-rules.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: 'COVERAGE_COMPASS_UPDATE_READY', cacheName: CACHE_NAME })))
  );
});

function isNavigation(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isKnownStaticAsset(url) {
  return APP_SHELL.some((asset) => new URL(asset, self.location.href).pathname === url.pathname);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match('./index.html'));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isKnownStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
