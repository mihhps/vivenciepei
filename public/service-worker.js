const CACHE_NAME = "vivenciepei-v2"; // Mude a versão para forçar a atualização
const OFFLINE_URL = "offline.html"; // A página que será mostrada quando não houver conexão

// 1. ATUALIZE ESTA LISTA com os arquivos gerados pelo seu projeto!
// Verifique sua pasta 'dist' ou 'build' para os nomes corretos.
const ASSETS_TO_CACHE = [
  "/", // A página inicial
  "/index.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  OFFLINE_URL,
  // Exemplo de como seriam os arquivos gerados:
  // '/assets/index.css',
  // '/assets/index.js'
];

// Evento de Instalação: Salva os assets principais da aplicação em cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pré-cache dos assets da aplicação");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Evento de Ativação: Limpa caches antigos.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Limpando cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Evento Fetch: Decide como responder às requisições (rede, cache ou offline).
self.addEventListener("fetch", (event) => {
  // Ignora requisições que não são GET
  if (event.request.method !== "GET") {
    return;
  }

  // Estratégia: Tenta buscar na rede primeiro. Se falhar, usa o cache.
  // Se não estiver no cache e for uma navegação de página, mostra a página offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta da rede for bem-sucedida, clona e salva no cache para futuras visitas
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // A busca na rede falhou (provavelmente offline)
        return caches.match(event.request).then((cachedResponse) => {
          // Se tivermos a resposta no cache, a retornamos
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se for uma navegação de página e não estiver no cache, mostra a página offline
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          // Para outros tipos de assets (imagens, etc.) que não estão no cache, o erro padrão ocorrerá
          return new Response("Asset not found in cache.", {
            status: 404,
            statusText: "Asset not found in cache.",
          });
        });
      })
  );
});
