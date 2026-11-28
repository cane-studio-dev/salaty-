/* صلاتي — Service Worker: يخزّن التطبيق كاملاً ليعمل بدون إنترنت */
const VER = 'salaty-v1.9.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './style.css',
  './config.js', './duas.js', './core.js', './sync.js', './app.js', './admin.js', './mushaf.js', './extras.js', './amal.js', './videos.js', './adhkar2.js', './firebase-storage-compat.js', './quran.js', './boot.js',
  './firebase-app-compat.js', './firebase-auth-compat.js', './firebase-firestore-compat.js',
  './tajawal-arabic-400-normal.woff2', './tajawal-arabic-500-normal.woff2', './tajawal-arabic-700-normal.woff2',
  './amiri-quran-arabic-400-normal.woff2', './amiri-arabic-400-normal.woff2', './amiri-arabic-700-normal.woff2',
  './montserrat-latin-200-normal.woff2', './montserrat-latin-300-normal.woff2',
  './logo.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './shot-home.png', './shot-admin.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // طلبات Firebase تمر مباشرة

  const isStatic = /\.(woff2|png|svg)$/.test(url.pathname) || /\/quran\.js$/.test(url.pathname) || /\/firebase-[a-z]+-compat\.js$/.test(url.pathname);
  if (isStatic) { // الأولوية للكاش (ملفات لا تتغير)
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); return res; })));
    return;
  }
  // الشيفرة والصفحات: الشبكة أولاً بمهلة قصيرة ثم الكاش (يتحدّث التطبيق تلقائياً عند توفر نت)
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
    const t = setTimeout(() => { if (!done) fromCache().then(r => { if (r) { done = true; resolve(r); } }); }, 2500);
    fetch(req).then(res => {
      clearTimeout(t);
      if (res && res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(t); if (!done) fromCache().then(r => { done = true; resolve(r || new Response('offline', { status: 503 })); }); });
  }));
});
