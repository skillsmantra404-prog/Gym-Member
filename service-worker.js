/* Gym Manager service worker — self-updating, offline-capable.
 * - Pages (HTML) and manifest: NETWORK FIRST, so every new deploy shows up on the next open. Cache is only the offline fallback.
 * - Icons / other same-site files: serve from cache instantly, refresh in the background.
 * - Never touches localStorage (service workers cannot): members, payments and settings are safe across updates.
 * - Ignores cross-origin and non-GET requests (WhatsApp links, Google Apps Script sync).
 * You do NOT need to bump a version when you deploy; change CACHE only to force-wipe old cached files.
 */
const CACHE = 'gym-manager-cache';
const CORE = ['./', './index.html', './manifest.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png', './assets/icons/favicon-32.png'];
const NET_TIMEOUT = 4000; // slow network: fall back to the saved copy after 4s

self.addEventListener('install', e => {
  self.skipWaiting(); // activate the new worker immediately
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));   // remove caches from older worker versions
    await self.clients.claim();
    // If this was an UPDATE (old caches existed), reload open tabs once so they show the new version.
    if (old.length) {
      const tabs = await self.clients.matchAll({ type: 'window' });
      tabs.forEach(t => { try { t.navigate(t.url); } catch (_) {} });
    }
  })());
});

function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
    const timer = setTimeout(() => fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }), NET_TIMEOUT);
    fetch(req, { cache: 'no-cache' }).then(res => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then(r => { if (!done) { done = true; resolve(r || Response.error()); } });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || /\.(html|json)$/.test(url.pathname) || url.pathname.endsWith('/');
  e.respondWith(isPage ? networkFirst(req) : staleWhileRevalidate(req));
});
