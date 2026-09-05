// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

// This gives `self` the correct types
declare const self: ServiceWorkerGlobalScope;

const CACHE_PWA = `pwa-cache-${version}`;
const CACHE_RECORDS = 'bms-records-cache';
const REGEX_CACHE_RECORD = /^\/records\/\w+\/\w+\.(replay|json)$/;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
];

self.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE_PWA);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key.startsWith('pwa-cache') && key !== CACHE_PWA) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
  // ignore POST requests etc
  if (event.request.method !== 'GET') return;

  async function respond() {
    const url = new URL(event.request.url);
    const cachePWA = await caches.open(CACHE_PWA);
    const cacheRecords = await caches.open(CACHE_RECORDS);

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cachePWA.match(url.pathname);
      if (response) return response;
    }

    // BMS records can always be served from the cache
    if (REGEX_CACHE_RECORD.test(url.pathname)) {
      const response = await cacheRecords.match(url.pathname);
      if (!response || !response.body) {
        throw new Error('Record cache not found: ' + url.pathname);
      }

      const isCompressed = response.headers.get('content-type') === 'application/octet-stream';
      if (!isCompressed) return response;

      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // for everything else, try the network first, but
    // fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);
      // if we're offline, fetch can return a value that is not a Response
      // instead of throwing - and we can't pass this non-Response to respondWith
      if (!(response instanceof Response)) throw new Error('invalid response from fetch');

      const responseOK = response.status === 200 && url.protocol.startsWith('http');
      const cacheControl = response.headers.get('cache-control') ?? '';
      if (responseOK && !cacheControl.includes('no-store')) {
        cachePWA.put(event.request, response.clone());
      }

      return response;
    } catch (err) {
      const response = await cachePWA.match(event.request);
      if (response) return response;
      // if there's no cache, then just error out
      // as there is nothing we can do to respond to this request
      throw err;
    }
  }

  event.respondWith(respond());
});
