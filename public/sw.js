const CACHE_NAME = 'musicgy-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon.svg',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. 绝对不要拦截 API 请求，让它们正常走网络
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. 也不要拦截跨域请求（如网易云图片）
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});