'use strict';
// 改任何檔案內容後，要把 VERSION 加一（p0-2、p0-3...），手機才會拿到新檔。
const VERSION = 'p0-2';
const CACHE = 'em3p0-' + VERSION;
const FILES = [
  './',
  'index.html',
  'app.js',
  'style.css',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-512.png',
  'vendor/qrcode.js',
  'vendor/jsQR.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:'reload' 繞過瀏覽器 HTTP 快取，避免存到舊檔
      return c.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('em3p0-') === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
