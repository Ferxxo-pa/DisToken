// DisToken Service Worker — Offline image caching
const CACHE_NAME = 'distoken-media-v1';
const MAX_CACHE_ITEMS = 200; // Limit cache size

// Cache NFT images as they're loaded
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache image/video requests from NFT sources
  const isNFTMedia =
    url.hostname.includes('nftstorage.link') ||
    url.hostname.includes('cloudflare-ipfs.com') ||
    url.hostname.includes('ipfs.io') ||
    url.hostname.includes('arweave.net') ||
    url.hostname.includes('pinata.cloud') ||
    url.hostname.includes('alchemy.com') ||
    url.hostname.includes('helius') ||
    url.hostname.includes('cdn.') ||
    url.pathname.includes('/ipfs/');

  if (isNFTMedia && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try cache first
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // Fetch from network
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // Clone and cache
            cache.put(event.request, response.clone());
            // Prune old entries if cache is too large
            pruneCache(cache);
          }
          return response;
        } catch (err) {
          // Network failed — return cached version if any
          const fallback = await cache.match(event.request);
          if (fallback) return fallback;
          throw err;
        }
      })
    );
  }
});

async function pruneCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHE_ITEMS) {
    // Delete oldest entries (first in = first out)
    const toDelete = keys.slice(0, keys.length - MAX_CACHE_ITEMS);
    for (const key of toDelete) {
      await cache.delete(key);
    }
  }
}

// Activate immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('install', () => {
  self.skipWaiting();
});
