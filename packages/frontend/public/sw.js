// Minimal Service Worker
const CACHE_NAME = 'hybridpos-v1';

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Passthrough all requests
});
