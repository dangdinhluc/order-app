/// <reference lib="webworker" />

const CACHE_NAME = 'hybridpos-v1';
const STATIC_CACHE = 'hybridpos-static-v1';
const DYNAMIC_CACHE = 'hybridpos-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/sounds/notification.mp3',
    '/sounds/ding.mp3'
];

// API routes to cache
const API_CACHE_PATTERNS = [
    '/api/categories',
    '/api/products',
    '/api/tables',
    '/api/payment-methods'
];

declare const self: ServiceWorkerGlobalScope;

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

    // API requests - Network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets - Cache first, network fallback
    event.respondWith(cacheFirst(request));
});

// Cache first strategy
async function cacheFirst(request: Request): Promise<Response> {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        // Cache successful responses
        if (response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Return offline page if available
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;
        return new Response('Offline', { status: 503 });
    }
}

// Network first strategy for API
async function networkFirst(request: Request): Promise<Response> {
    try {
        const response = await fetch(request);

        // Cache GET API responses that match patterns
        const url = new URL(request.url);
        const shouldCache = API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern));

        if (response.status === 200 && shouldCache) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch {
        // Fallback to cache
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync for failed orders
self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrders());
    }
});

async function syncPendingOrders() {
    // Get pending orders from IndexedDB and sync with server
    console.log('[SW] Syncing pending orders...');
    // Implementation would go here
}

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() || {};

    const options: NotificationOptions = {
        body: data.body || 'Có thông báo mới',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'default',
        data: data.url || '/',
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Hybrid POS', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const urlToOpen = event.notification.data || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            // Focus existing window if open
            for (const client of clients) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return (client as WindowClient).focus();
                }
            }
            // Otherwise open new window
            return self.clients.openWindow(urlToOpen);
        })
    );
});

export { };
