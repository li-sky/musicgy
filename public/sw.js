const CACHE_NAME = 'musicgy-audio-v3';

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
  const cacheKey = `audio-data-${songId}`;
  const cache = await caches.open(CACHE_NAME);
  
  const cachedRes = await cache.match(cacheKey);
  if (cachedRes) {
    // If we have it in cache, handle Range requests locally for instant seeking
    return handleRangeRequest(event.request, cachedRes);
  }

  // If not in cache and it's a prefetch, download fully in background
  if (isPrefetch) {
    const fetchUrl = url.origin + url.pathname + '?id=' + songId;
    fetch(fetchUrl).then(response => {
      if (response.ok && response.status === 200) {
        cache.put(cacheKey, response);
      }
    }).catch(() => {});
    return new Response(null, { status: 204 });
  }

  // CRITICAL FIX: For real-time playback (especially mid-song join), 
  // do NOT use blob() or arrayBuffer() as it waits for the full download.
  // Instead, fetch directly from network and let the browser handle ranges.
  
  // We can also trigger a background cache for NEXT time
  const backgroundFetchUrl = url.origin + url.pathname + '?id=' + songId;
  cache.match(cacheKey).then(res => {
      if (!res) {
          fetch(backgroundFetchUrl).then(response => {
              if (response.ok && response.status === 200) cache.put(cacheKey, response);
          }).catch(() => {});
      }
  });

  return fetch(event.request);
}

async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader || response.status === 206) {
    return response;
  }

  // This part is only reached if the item is FULLY in cache
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