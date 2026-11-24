// Service worker: dùng được khi mất mạng. Trả bản đã lưu ngay, đồng thời tải bản mới về cho lần mở sau.
const CACHE = 'auh-v3';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'src/app.js',
  'src/nutrition.js',
  'src/plan.js',
  'src/storage.js',
  'data/ingredients.json',
  'data/dishes.json',
  'data/week-plan.json',
  'icons/icon.svg',
  'fonts/be-vietnam-pro-vietnamese-400-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-500-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-600-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-700-normal.woff2',
  'fonts/be-vietnam-pro-latin-400-normal.woff2',
  'fonts/be-vietnam-pro-latin-500-normal.woff2',
  'fonts/be-vietnam-pro-latin-600-normal.woff2',
  'fonts/be-vietnam-pro-latin-700-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-400-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-500-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-600-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-700-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('auh-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
