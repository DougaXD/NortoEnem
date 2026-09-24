// Service Worker para Norto ENEM (PWA)
const CACHE_NAME = 'norto-enem-v3';

self.addEventListener('install', (event) => {
  // Pula a espera imediatamente para ativar a nova versão sem aguardar fechar abas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Deleta todos os caches legados (v1, v2 ou qualquer versão anterior)
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // NUNCA intercepta ou guarda em cache requisições de código, desenvolvimento Vite, HMR, APIs ou autenticação
  const url = event.request.url;
  if (
    url.includes('/@vite/') ||
    url.includes('/@fs/') ||
    url.includes('/src/') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('accounts.google.com') ||
    url.includes('apis.google.com') ||
    url.includes('firebaseinstallations.googleapis.com') ||
    url.endsWith('.tsx') ||
    url.endsWith('.ts') ||
    url.endsWith('.js') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass-through direto e irrestrito para a rede
  }

  // Network-first com fallback para cache apenas se estiver totalmente offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
