// ── DisToken Service Worker — Offline NFT Image Cache ──────
const CACHE_NAME = 'distoken-nft-cache-v1';
const MAX_CACHED_IMAGES = 200;

// Only cache NFT images/media, not API calls
const CACHEABLE_PATTERNS = [
  /\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp4|webm)(?:\?|$)/i,
  /nftstorage\.link/,
  /cloudflare-ipfs\.com/,
  /ipfs\.io/,
  /arweave\.net/,
  /img-cdn\.magiceden/,
  /i\.seadn\.io/,
  /res\.cloudinary\.com/,
  /gateway\.pinata\.cloud/,
  /cdn\.helius/,
];

function isCacheable(url) {
  return CACHEABLE_PATTERNS.some(p => p.test(url));
}

// Install — activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch — cache-first for NFT media, network-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Only cache NFT media
  if (!isCacheable(request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try cache first
      const cached = await cache.match(request);
      if (cached) return cached;

      // Fetch from network
      try {
        const response = await fetch(request);
        if (response.ok) {
          // Clone and cache (don't await — fire and forget)
          cache.put(request, response.clone()).catch(() => {});
          // Prune old entries if needed
          pruneCache(cache);
        }
        return response;
      } catch {
        // Network failed and nothing in cache — return offline placeholder
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })
  );
});

// Keep cache size bounded
async function pruneCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHED_IMAGES) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - MAX_CACHED_IMAGES);
    await Promise.all(toDelete.map(k => cache.delete(k)));
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then(cache => {
      urls.forEach(url => {
        cache.match(url).then(existing => {
          if (!existing) {
            fetch(url).then(res => {
              if (res.ok) cache.put(url, res);
            }).catch(() => {});
          }
        });
      });
    });
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
