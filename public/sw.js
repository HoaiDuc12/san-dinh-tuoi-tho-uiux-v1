// Network-first for application code and HTML: avoid leaving players on a stale multiplayer protocol.
const CACHE='sandinh-v3-20261015b',ASSETS=['/','/index.html','/style.css','/app.js','/icon.svg','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(response=>{if(response.ok)caches.open(CACHE).then(c=>c.put(e.request,response.clone()));return response;}).catch(()=>caches.match(e.request)));});
