/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * TRABAJO SIN CONEXIÓN. Cachea recursos de interfaz; excluye la API y autenticación. La cola de operaciones se gestiona en client/app.mjs.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
const CACHE = 'ventexa-shell-v3';
const ASSETS = [
    '/workspace.html', '/style.css', '/assets/app.js', '/assets/demo-vano.svg', '/manifest.webmanifest', '/favicon.svg'
];
self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});
self.addEventListener('fetch', e => {
    const u = new URL(e.request.url);
    if (e.request.method !== 'GET' || u.origin !== self.location.origin || u.pathname.startsWith('/api/') || u.pathname.includes('signin') || u.pathname.includes('signout'))
        return;
    if (ASSETS.includes(u.pathname))
        e.respondWith(fetch(e.request).then(res => {
            if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
        }).catch(() => caches.match(e.request)));
});
