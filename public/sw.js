// Service worker for Sonoplasma PWA
// App-shell caching only. Áudios (YouTube/Spotify/streams) NÃO são cacheados
// para não interferir na reprodução ao vivo.
//
// IMPORTANTE: bump a versão do CACHE sempre que o comportamento deste arquivo
// mudar — o activate abaixo remove caches antigos automaticamente.
const CACHE = 'sonoplasma-shell-v3';

// Só pré-carrega o index; ícones/manifest são buscados sob demanda em
// network-first para não ficarem "presos" numa versão antiga.
const PRECACHE = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Kill-switch remoto: a página pode postar {type: 'SKIP_WAITING'} ou
// {type: 'UNREGISTER'} para forçar atualização/limpeza.
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'UNREGISTER') {
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
      .catch(() => {});
  }
});

// Recursos que devem ser SEMPRE buscados na rede primeiro (fallback pro cache
// só se estiver offline). Evita "instalei o app e o ícone/manifest nunca muda".
const NETWORK_FIRST_SAME_ORIGIN = [
  '/manifest.webmanifest',
  '/favicon.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png',
  '/robots.txt',
];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Só lida com requisições da própria origem. Deixa áudio/APIs externas passarem direto.
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): network-first. NÃO cacheia a resposta sob a chave '/'
  // porque isso guardaria HTML de rotas internas como se fosse o shell — quando
  // o Vite gerar um novo bundle, o HTML velho referenciaria assets que já não
  // existem, resultando em tela branca no app instalado.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Só atualiza o shell '/' quando a própria raiz for requisitada.
          if (url.pathname === '/' && res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Recursos com nome fixo (manifest, ícones) → network-first.
  if (NETWORK_FIRST_SAME_ORIGIN.includes(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || Response.error()))
    );
    return;
  }

  // Demais assets estáticos (JS/CSS com hash do Vite): stale-while-revalidate.
  // Como os nomes são fingerprinted por build, cache-first aqui é seguro.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
