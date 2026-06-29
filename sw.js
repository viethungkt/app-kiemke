const CACHE = 'hl-kiemke-v5';
const ASSETS = [
  './index.html',
  './app.js',
  './auth.js',
  './data_nhansu.js',
  './data_vattu.js',
  './data_kho.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => 
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Let the browser fetch normally if online, otherwise fallback to cache (Network-First)
  e.respondWith(
    fetch(e.request)
      .then(nr => {
        if (nr.ok && e.request.method === 'GET') {
          const c = nr.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, c));
        }
        return nr;
      })
      .catch(() => {
        return caches.match(e.request).then(r => {
          if (r) return r;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
