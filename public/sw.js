const CACHE_NAME = 'musicgy-audio-v6';

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
  const cacheKey = `audio-data-${songId}`;
  const cache = await caches.open(CACHE_NAME);
  
  // 1. If fully cached, serve via Range Request local handler
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) {
    // Standard response if not a range request
    if (!event.request.headers.get('Range')) return cachedRes;
    return handleRangeRequest(event.request, cachedRes);
  }

  // 2. If it's a prefetch signal, download in background
  if (isPrefetch) {
    const downloadUrl = url.origin + url.pathname + '?id=' + songId;
    fetch(downloadUrl).then(response => {
      if (response.ok && response.status === 200) {
        cache.put(cacheKey, response);
        console.log(`[SW] Background download complete for ${songId}`);
      }
    }).catch(() => {});
    return new Response(null, { status: 204 });
  }

  // 3. Fallback: Always serve live playback directly from network to ensure sound
  // Do not use blob() or arrayBuffer() here.
  return fetch(event.request);
}

async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader || response.status === 206) {
    return response;
  }

  const blob = await response.blob();
  const bytes = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader);
  
  if (bytes) {
    const start = Number(bytes[1]);
    const end = bytes[2] ? Number(bytes[2]) : blob.size - 1;
    
    if (start >= blob.size) {
        return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${blob.size}` }
        });
    }

    const slicedBlob = blob.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set('Content-Type', blob.type || 'audio/mpeg');
    headers.set('Content-Range', `bytes ${start}-${end}/${blob.size}`);
    headers.set('Content-Length', String(slicedBlob.size));
    headers.set('Accept-Ranges', 'bytes');

    return new Response(slicedBlob, {
      status: 206,
      statusText: 'Partial Content',
      headers: headers
    });
  }

  return response;
}
