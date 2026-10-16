/* Power Up — mode hors ligne (service worker).
   Ce fichier est un MODÈLE : outils/construire.py le copie dans dist/ en remplaçant __BUILD__ et __FILES__.
   - À l'installation : mise en cache de tous les fichiers du site.
   - Pages : réseau d'abord (toujours la dernière version en ligne), cache si pas de connexion.
   - Scripts et styles : réseau d'abord aussi ; sons, polices et icônes : cache d'abord. */
var BUILD = "__BUILD__";
var CACHE = "powerup-" + BUILD;
var FILES = __FILES__;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("powerup-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("index.html", copy); });
      return res;
    }).catch(function () { return caches.match("index.html"); }));
    return;
  }
  /* Sons, polices et icônes changent très rarement : cache d'abord. Le reste (scripts, styles, données) : réseau d'abord,
     pour ne jamais mélanger une ancienne version du code avec une nouvelle, et cache si l'on est hors ligne. */
  var stable = /\/(sons|css\/fonts)\//.test(url.pathname) || /\/icon-[^\/]*\.png$/.test(url.pathname);
  if (stable) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req); }));
});
