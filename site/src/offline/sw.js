/* CONFIG is injected by the build, including a digest for every saved file. */
const PREFIX = 'lecture-notes:' + CONFIG.base + ':';
const CACHE = PREFIX + CONFIG.revision;
const absolute = (url) => new URL(url, self.location.origin).href;
const MARKER = absolute(CONFIG.base + '__offline_complete__');
const assetURLs = new Set(CONFIG.assets.map((asset) => absolute(asset.url)));

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) if (client.url.startsWith(absolute(CONFIG.base))) client.postMessage({ offlineNotes: true, ...message });
}

let saving;
function saveSnapshot() {
  return saving ||= downloadSnapshot().finally(() => { saving = null; });
}
async function downloadSnapshot() {
    const cache = await caches.open(CACHE);
    if (await cache.match(MARKER) && (await cache.keys()).length >= CONFIG.count + 1) return;
    let next = 0, done = 0;
    try {
      const results = await Promise.allSettled(Array.from({ length: 4 }, async () => {
        while (next < CONFIG.assets.length) {
          const asset = CONFIG.assets[next++];
          const response = await fetch(absolute(asset.url), { cache: 'reload', signal: AbortSignal.timeout(60000) });
          if (!response.ok || response.type === 'opaque') throw new Error('자료 다운로드 실패');
          const bytes = await response.clone().arrayBuffer();
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) => n.toString(16).padStart(2, '0')).join('');
          if (digest !== asset.sha256) throw new Error('사이트 갱신 중입니다. 잠시 후 다시 저장하세요.');
          await cache.put(absolute(asset.url), response);
          await broadcast({ type: 'progress', done: ++done, total: CONFIG.count });
        }
      }));
      const failed = results.find((result) => result.status === 'rejected');
      if (failed) throw failed.reason;
      await cache.put(MARKER, new Response(JSON.stringify({ revision: CONFIG.revision, builtAt: CONFIG.builtAt, count: CONFIG.count, bytes: CONFIG.bytes })));
    } catch (error) {
      await caches.delete(CACHE);
      await broadcast({ type: 'error', message: error.message });
      throw error;
    }
}
self.addEventListener('install', (event) => {
  event.waitUntil(saveSnapshot());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Retain one previous snapshot for assets requested by already-open pages.
    const older = (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== CACHE);
    await Promise.all(older.slice(0, -1).map((name) => caches.delete(name)));
    await self.clients.claim();
    await broadcast({ type: 'ready' });
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (event.data?.type === 'REPAIR') {
    event.waitUntil(saveSnapshot().then(() => broadcast({ type: 'ready' })).catch(() => {}));
    return;
  }
  if (event.data?.type !== 'STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(MARKER);
    const keys = await cache.keys();
    event.ports[0]?.postMessage(saved && keys.length >= CONFIG.count + 1 ? { ready: true, ...await saved.json() } : { ready: false });
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(CONFIG.base)) return;
  url.search = ''; url.hash = '';
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  else if (!assetURLs.has(url.href) && assetURLs.has(url.href + '/index.html')) url.pathname += '/index.html';
  const currentAsset = assetURLs.has(url.href);
  const previousAsset = url.pathname.startsWith(CONFIG.base + 'assets/');
  if (!currentAsset && !previousAsset) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(url.href);
    if (cached) return cached;
    if (previousAsset) {
      for (const name of (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CACHE).reverse()) {
        const previous = await (await caches.open(name)).match(url.href);
        if (previous) return previous;
      }
    }
    // Never silently claim an evicted cache is complete.
    return fetch(event.request);
  })());
});
