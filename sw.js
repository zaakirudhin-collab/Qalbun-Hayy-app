/* Qalbun Hayy — offline support.
   When you upload a new version of the app, change VERSION (e.g. v2, v3…)
   so phones fetch the fresh files. */
const VERSION = 'v1';
const CACHE = 'qalbun-hayy-' + VERSION;

const CORE = [
  './',
  'index.html',
  'manifest.json',
  'quran-data.js',
  'UthmanicHafs1Ver18.woff2',
  'indopak.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('qalbun-hayy-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: try the network first so updates show up, fall back to the saved copy offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Everything else (Quran data, fonts, icons, Google Fonts): use the saved copy, fetch and save it if missing.
  const sameSite = url.origin === self.location.origin;
  const googleFonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameSite && !googleFonts) return;

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
