/* Power Up — mode hors ligne (service worker).
   Ce fichier est un MODÈLE : outils/construire.py le copie dans dist/ en remplaçant 20261102142926 et ["./", "apercu.jpg", "css/fonts/OFL-Anton.txt", "css/fonts/OFL-Bangers.txt", "css/fonts/OFL-Space-Grotesk.txt", "css/fonts/anton-latin.woff", "css/fonts/bangers-latin.woff", "css/fonts/space-grotesk-latin.woff", "css/style.min.css", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "index.html", "js/app.min.js", "js/i18n/en-boss.js", "js/i18n/en-heros.js", "js/i18n/en-interface.js", "js/i18n/en-questions-complement.js", "js/i18n/en-questions-cyber.js", "js/i18n/en-questions-dev.js", "js/i18n/en-questions-ia.js", "js/i18n/en-questions-it.js", "js/i18n/en-questions-m365.js", "js/i18n/en-questions-vert.js", "js/power-up.min.js", "labo/index.html", "labo/labo.css", "labo/labo.js", "manifest.webmanifest", "sons/Bell.mp3", "sons/aura-survol.mp3"].
   - À l'installation : mise en cache de tous les fichiers du site.
   - Pages : réseau d'abord (toujours la dernière version en ligne), cache si pas de connexion.
   - Scripts et styles : réseau d'abord aussi ; sons, polices et icônes : cache d'abord. */
var BUILD = "20261102142926";
var CACHE = "powerup-" + BUILD;
var FILES = ["./", "apercu.jpg", "css/fonts/OFL-Anton.txt", "css/fonts/OFL-Bangers.txt", "css/fonts/OFL-Space-Grotesk.txt", "css/fonts/anton-latin.woff", "css/fonts/bangers-latin.woff", "css/fonts/space-grotesk-latin.woff", "css/style.min.css", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "index.html", "js/app.min.js", "js/i18n/en-boss.js", "js/i18n/en-heros.js", "js/i18n/en-interface.js", "js/i18n/en-questions-complement.js", "js/i18n/en-questions-cyber.js", "js/i18n/en-questions-dev.js", "js/i18n/en-questions-ia.js", "js/i18n/en-questions-it.js", "js/i18n/en-questions-m365.js", "js/i18n/en-questions-vert.js", "js/power-up.min.js", "labo/index.html", "labo/labo.css", "labo/labo.js", "manifest.webmanifest", "sons/Bell.mp3", "sons/aura-survol.mp3"];

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
  if (url.pathname.indexOf("/labo/") >= 0 && (req.mode === "navigate" || /\/labo\/?$/.test(url.pathname))) { /* page du laboratoire : ne jamais écraser la copie hors ligne de la page d'accueil */
    e.respondWith(fetch(req).catch(function () { return caches.match("labo/index.html"); }));
    return;
  }
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
