import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const out = new URL('../dist/', import.meta.url);
const built = fs.readFileSync(new URL('sw.js', out), 'utf8');
const config = JSON.parse(built.split('\n')[0].slice('const CONFIG = '.length, -1));
const workerSource = built.slice(built.indexOf('\n') + 1);
const origin = 'https://offline.test';
const collections = new Map();
const key = (request) => typeof request === 'string' ? request : request.url || request.href;
const caches = {
  async open(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    const entries = collections.get(name);
    return {
      async match(request) { return entries.get(key(request))?.clone(); },
      async put(request, response) { entries.set(key(request), response.clone()); },
      async keys() { return [...entries.keys()].map((url) => ({ url })); },
    };
  },
  async keys() { return [...collections.keys()]; },
  async delete(name) { return collections.delete(name); },
};
let online = true, broken = '', networkCount = 0;
function worker(settings) {
  const listeners = new Map();
  const context = vm.createContext({
    URL, Response, Uint8Array, AbortSignal, crypto: webcrypto, caches,
    self: {
      location: new URL(origin + settings.base + 'sw.js'),
      clients: { async matchAll() { return []; }, async claim() {} },
      async skipWaiting() {},
      addEventListener(type, handler) { listeners.set(type, handler); },
    },
    async fetch(request) {
      networkCount++;
      if (!online) throw new Error('network disabled');
      const url = new URL(key(request));
      const relative = url.pathname.slice(settings.base.length);
      if (relative === broken) return new Response('changed during deployment');
      return new Response(fs.readFileSync(new URL(relative, out)));
    },
  });
  vm.runInContext('const CONFIG = ' + JSON.stringify(settings) + ';\n' + workerSource, context);
  return {
    async event(type, extra = {}) {
      let pending = Promise.resolve();
      listeners.get(type)({ ...extra, waitUntil(promise) { pending = promise; } });
      return pending;
    },
    async get(relative, method = 'GET') {
      let result;
      listeners.get('fetch')({ request: { url: new URL(relative, origin + settings.base).href, method }, respondWith(promise) { result = promise; } });
      return result;
    },
    async status() {
      let reply;
      await this.event('message', { data: { type: 'STATUS' }, ports: [{ postMessage(data) { reply = data; } }] });
      return reply;
    },
  };
}

for (const slug of ['astro1', 'emwaves', 'advmech', 'mechexp']) {
  for (const file of [`${slug}/index.html`, `data/${slug}/course.json`, `data/${slug}/cites.json`]) assert(config.assets.some((asset) => asset.url === config.base + file), file);
}
for (const file of ['index.html', 'finals/index.html', 'data/final-plan.json', 'vendor/mathjax/tex-svg-full.js', 'vendor/mathjax/ui/menu.js']) assert(config.assets.some((asset) => asset.url === config.base + file), file);
assert(config.assets.every((asset) => asset.url.startsWith(config.base) && !asset.url.includes('..')));
const first = worker(config);
assert.equal((await first.status()).ready, false);
await first.event('install');
await first.event('activate');
assert.equal((await first.status()).ready, true);
online = false;
const requestsBefore = networkCount;
for (const asset of config.assets) {
  const response = await first.get(asset.url);
  assert(response?.ok, 'offline asset: ' + asset.url);
}
for (const route of ['', 'astro1/', 'emwaves', 'advmech/index.html', 'mechexp/', 'finals/?mode=auto']) {
  assert.match(await (await first.get(route)).text(), /<!doctype html>/i, route);
}
assert.equal(networkCount, requestsBefore, 'Offline files must require no network requests');
assert.equal(await first.get('https://myetl.snu.ac.kr/courses/1'), undefined);
assert.equal(await first.get('/another-site/index.html'), undefined);
assert.equal(await first.get('data/site.json', 'POST'), undefined);

// A deployment changing while downloading must not replace the complete snapshot.
online = true; broken = 'data/final-plan.json';
const second = worker({ ...config, revision: 'broken-update' });
await assert.rejects(second.event('install'), /갱신 중/);
assert.equal((await first.status()).ready, true);
assert(![...collections.keys()].some((name) => name.endsWith(':broken-update')));
broken = ''; online = false;
await assert.rejects(worker({ ...config, revision: 'offline-update' }).event('install'), /network disabled/);
assert.equal((await first.status()).ready, true);

// Activation only cleans this site's old versions, preserving another site's cache.
online = true;
await caches.open('another-site:keep');
const third = worker({ ...config, revision: 'next-complete' });
await third.event('install'); await third.event('activate');
assert(collections.has('another-site:keep'));
assert.equal((await third.status()).ready, true);
const previousCache = await caches.open('lecture-notes:' + config.base + ':' + config.revision);
await previousCache.put(origin + config.base + 'assets/previous.js', new Response('old tab asset'));
online = false;
assert.equal(await (await third.get('assets/previous.js')).text(), 'old tab asset');
// Browser eviction must clear the ready claim.
await caches.delete('lecture-notes:' + config.base + ':next-complete');
assert.equal((await third.status()).ready, false);
online = true;
await third.event('message', { data: { type: 'REPAIR' } });
assert.equal((await third.status()).ready, true, 'An evicted cache can be saved again without a new deployment');

console.log(`Offline checks passed: ${config.count} saved assets, all courses, math extensions, plans, URL aliases, failed updates, cache isolation and eviction.`);
