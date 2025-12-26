const CACHE_NAME = 'musicgy-audio-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/stream') {
    event.respondWith(handleAudioRequest(event));
    return;
  }

  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  }
});

async function handleAudioRequest(event) {
  const url = new URL(event.request.url);
  const songId = url.searchParams.get('id');
  const isPrefetch = url.searchParams.has('prefetch');
  const rangeHeader = event.request.headers.get('Range');
  
  const cacheKey = `audio-head-${songId}`;
  const cache = await caches.open(CACHE_NAME);

  // 1. Prefetch Logic: Download only the first 1MB
  if (isPrefetch) {
    const prefetchUrl = url.origin + url.pathname + '?id=' + songId;
    const prefetchReq = new Request(prefetchUrl, {
      headers: { 'Range': 'bytes=0-1048575' }
    });
    
    fetch(prefetchReq).then(response => {
      if (response.status === 206) {
        cache.put(cacheKey, response);
        console.log(`[SW] Pre-cached first 1MB for ${songId}`);
      }
    }).catch(() => {});
    
    return new Response(null, { status: 204 });
  }

  // 2. Playback Logic
  if (rangeHeader) {
    const bytes = /^bytes=(\d+)-/.exec(rangeHeader);
    const startByte = bytes ? Number(bytes[1]) : 0;

    // If browser asks for the start, and we have the head cached
    if (startByte === 0) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        console.log(`[SW] Hit cache head for ${songId}. Browser will request rest later.`);
        return cachedResponse;
      }
    }
  }

  // 3. Mid-song join or cache miss: Direct pass-through
  // The browser's native range handling will take over.
  return fetch(event.request);
}