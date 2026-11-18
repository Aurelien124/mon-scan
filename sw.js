/* Mon Scan : mode hors ligne.
   - Fichiers de l'appli (index.html, kb.js, top.json…) : réseau d'abord, copie locale si pas de réseau.
     Les mises à jour arrivent donc toujours dès qu'il y a du réseau.
   - Fiches produits Open Food/Beauty/Products Facts : réseau d'abord, copie locale sinon.
     Un produit déjà consulté reste lisible hors ligne.
   - Lecteur de codes-barres, polices, photos : copie locale d'abord (ils ne changent pas).
   - Ma Muscu (/muscu/) n'est pas concernée. */
const V = "ms-v1";
const APP = "ms-app-" + V, API = "ms-api-" + V, LIB = "ms-lib-" + V;
const SHELL = ["./", "index.html", "kb.js", "kbc.js", "cosmo.js", "top.json", "search.json",
  "https://cdn.jsdelivr.net/npm/barcode-detector@3.2.3/dist/iife/ponyfill.js"];
const MAX_API = 400, MAX_LIB = 300, TIMEOUT = 6000;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ms-") && ![APP, API, LIB].includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(name, max){
  const c = await caches.open(name); const ks = await c.keys();
  for(let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}
function timeout(p, ms){
  return new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error("timeout")), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });
}
// Réseau d'abord ; en cas d'échec ou de lenteur, la copie locale.
async function networkFirst(req, name, max, key){
  const c = await caches.open(name);
  const net = fetch(req).then(r => {
    if(r && r.ok){ c.put(key || req, r.clone()).then(() => max && trim(name, max)); }
    return r;
  });
  try{ return await timeout(net, TIMEOUT); }
  catch(e){
    const hit = await c.match(key || req, {ignoreVary: true});
    if(hit) return hit;
    return net; // pas de copie : on laisse la requête aboutir ou échouer normalement
  }
}
// Copie locale d'abord, mise à jour en arrière-plan.
async function cacheFirst(req, name, max){
  const c = await caches.open(name);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if(r && (r.ok || r.type === "opaque")) c.put(req, r.clone()).then(() => trim(name, max)); return r; });
  if(hit){ net.catch(() => {}); return hit; }
  return net;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const u = new URL(req.url);
  if(u.origin === location.origin){
    if(u.pathname.includes("/muscu/")) return;
    // Une seule copie par fichier, quels que soient les paramètres d'URL.
    const key = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : u.origin + u.pathname;
    e.respondWith(networkFirst(req, APP, 0, key));
    return;
  }
  if(/open(food|beauty|products)facts\.org$/.test(u.hostname) && u.pathname.startsWith("/api/")){
    e.respondWith(networkFirst(req, API, MAX_API));
    return;
  }
  if(/(^|\.)jsdelivr\.net$|fonts\.(googleapis|gstatic)\.com$|^images\.open(food|beauty|products)facts\.org$/.test(u.hostname)){
    e.respondWith(cacheFirst(req, LIB, MAX_LIB));
  }
});
