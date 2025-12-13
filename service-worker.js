const CACHE_NAME = 'family-icecream-map-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './stores.json',
    './icon/icon-192x192.png',
    './icon/icon-512x512.png',
    // Source files are bundled by Vite and not available in dist/src/...
    // We rely on runtime caching for the hashed JS/CSS bundles
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'
];

// Install Event - Cache Assets
self.addEventListener('install', (event) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    // Take control of all clients immediately
    event.waitUntil(clients.claim());
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network First for JSON, Cache First for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Strategy for store data: Network First (to get latest updates), fallback to Cache
    if (url.pathname.endsWith('stores.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with new data
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Strategy for others: Stale-While-Revalidate or Cache First
    // Here we use Cache First, falling back to Network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
