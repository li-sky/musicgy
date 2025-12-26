const CACHE_NAME = 'musicgy-audio-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('[SW] Installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('[SW] Activated');
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Music Stream specifically
  if (url.pathname === '/api/stream') {
    event.respondWith(handleAudioRequest(event));
    return;
  }

  // Handle static assets
  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

async function handleAudioRequest(event) {
  const url = new URL(event.request.url);
  const songId = url.searchParams.get('id');
  const isPrefetch = url.searchParams.has('prefetch');
  
  // Use a stable key without query params for caching the blob
  const cacheKey = `audio-data-${songId}`;
  const cache = await caches.open(CACHE_NAME);
  
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) {
    // console.log(`[SW] Cache Hit: ${songId}`);
    return handleRangeRequest(event.request, cachedRes);
  }

  // console.log(`[SW] Network Fetch: ${songId} (Prefetch: ${isPrefetch})`);
  
  try {
    // For audio, we always fetch without range first if we want to cache the whole thing,
    // but the browser might send a Range request. 
    // If it's a prefetch signal, we force a full download.
    const fetchRequest = isPrefetch ? new Request(url.origin + url.pathname + '?id=' + songId) : event.request;
    
    const response = await fetch(fetchRequest);
    
    if (response.ok && (response.status === 200)) {
      const copy = response.clone();
      cache.put(cacheKey, copy).catch(err => console.error('[SW] Cache put error', err));
    }
    
    return handleRangeRequest(event.request, response);
  } catch (e) {
    return fetch(event.request); // Fallback
  }
}

async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader || response.status === 206) {
    return response;
  }

  const blob = await response.blob();
  const bytes = /^bytes=(\d+)-(\d+)?$/g.exec(rangeHeader);
  
  if (bytes) {
    const start = Number(bytes[1]);
    const end = bytes[2] ? Number(bytes[2]) : blob.size - 1;
    
    const slicedBlob = blob.slice(start, end + 1);
    return new Response(slicedBlob, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        ...Object.fromEntries(response.headers),
        'Content-Type': blob.type || 'audio/mpeg',
        'Content-Range': `bytes ${start}-${end}/${blob.size}`,
        'Content-Length': slicedBlob.size,
        'Accept-Ranges': 'bytes'
      }
    });
  }

  return response;
}
