const CACHE_NAME = 'akilda-kal-v1';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './styles.css',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // If both cache and network fail, return offline page
          return caches.match('./index.html');
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Tekrar zamanı geldi!',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iIzNiODJmNiIvPjx0ZXh0IHg9Ijk2IiB5PSIxMjAiIGZvbnQtc2l6ZT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIj7wn6eg8J+SrDwvdGV4dD48L3N2Zz4=',
    badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjM2I4MmY2Ii8+PHRleHQgeD0iNDgiIHk9IjY1IiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+8J+noDwvdGV4dD48L3N2Zz4=',
    vibrate: [200, 100, 200],
    tag: 'akilda-kal-reminder',
    requireInteraction: false,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('⏰ Akılda Kal', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Eğer uygulama zaten açıksa, ona odaklan
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Değilse yeni pencere aç
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync event (offline quiz sonuçlarını senkronize etmek için)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-quiz-results') {
    event.waitUntil(syncQuizResults());
  }
});

async function syncQuizResults() {
  // Offline quiz sonuçlarını senkronize et
  console.log('Syncing quiz results...');
  // Bu kısım backend entegrasyonu gerektirir
}

// Periodic background sync (günlük hatırlatmalar için)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(checkDailyReminder());
  }
});

async function checkDailyReminder() {
  // Günlük hatırlatma kontrolü
  console.log('Checking daily reminder...');
  
  // IndexedDB'den kullanıcı verilerini al ve kontrol et
  // Gerekirse bildirim gönder
}
