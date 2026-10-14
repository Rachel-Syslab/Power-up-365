/* =========================================================
   Power Up — version anglaise (interrupteur FR | EN)
   ---------------------------------------------------------
   Le site reste écrit en français. En anglais, ce script
   remplace les textes à l'affichage grâce aux dictionnaires
   du dossier js/i18n/ (chargés seulement si EN est choisi).

   - js/i18n/en-interface.js : menus, boutons, messages
   - js/i18n/en-heros.js     : héros, piliers, thèmes, fonds
   - js/i18n/en-boss.js      : boss et mission du Phisher
   - js/i18n/en-questions-*.js : questions (ajoutées par lots)

   Dictionnaire : "texte français": "English text"
   {0}, {1}… = partie variable (nombre, nom…), à garder telle quelle.
   Un texte absent du dictionnaire reste simplement en français.
   ========================================================= */
(function () {
  "use strict";
  var KEY = "powerup365.lang";
  var lang = "fr";
  try { lang = localStorage.getItem(KEY) === "en" ? "en" : "fr"; } catch (e) { }
  window.PU_LANG = lang;

  /* dictionnaires chargés en anglais (ajouter ici les futurs lots de questions, ex. "en-questions-m365") */
  var FILES = ["en-interface", "en-heros", "en-boss"];

  /* ---------- normalisation (espaces, insécables) ---------- */
  function norm(s) { return s.replace(/[ \t\r  ]+/g, " ").replace(/ ?\n ?/g, "\n").trim(); }
  function qKey(q) { var f = q.a || q.items || q.answers || (q.lines && q.lines[0] && [q.lines[0].map(function (s) { return s.t || ""; }).join("")]) || [""]; return norm(q.q || "") + " ¦ " + norm(String(f[0] == null ? "" : f[0])); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var exact = Object.create(null), patterns = [], cache = Object.create(null), outputs = Object.create(null);

  var I18N = window.PU_I18N = {
    lang: lang,
    /* ajoute des entrées "français": "anglais" */
    add: function (dict) {
      for (var fr in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, fr)) continue;
        var en = dict[fr], k = norm(fr);
        if (!en || en === fr) continue;
        outputs[norm(en)] = 1;
        if (/\{\d+\}/.test(k)) {
          var src = "^(?<pre>[^A-Za-zÀ-ÿ]*?)" + esc(k).replace(/(.?)\\\{(\d+)\\\}/g, function (m, before, n) { return before + (/[A-Za-zÀ-ÿ]/.test(before) ? "(?<p" + n + ">[a-zà-ÿ]{0,3})" : "(?<p" + n + ">[\\s\\S]*)"); }) + (/[a-zà-ÿ]$/.test(k) ? "(?<sfx>s?)" : "(?<sfx>)") + "(?<post>[^A-Za-zÀ-ÿ]*?)$";
          try { patterns.push({ re: new RegExp(src), en: en, len: k.replace(/\{\d+\}/g, "").length }); } catch (e) { }
        } else exact[k] = en;
      }
      patterns.sort(function (a, b) { return b.len - a.len; });
      cache = Object.create(null); bigRe = null;
    },
    /* traductions de questions : clé = question française + « ¦ » + première réponse (voir qKey) */
    qKey: qKey,
    questions: function (map) {
      var list = window.QUESTIONS || [];
      for (var i = 0; i < list.length; i++) {
        var qq = list[i], t = map[qKey(qq)] || map[norm(qq.q || "")];
        if (!t) continue;
        for (var f in t) if (Object.prototype.hasOwnProperty.call(t, f)) qq[f] = t[f];
        qq._en = true;
      }
    },
    /* boss : mots-clés anglais du coup de grâce (clé = libellé français du point clé)
       et réponses anglaises acceptées pour les questions à saisir (clé = question française) */
    extra: function (o) {
      var keys = o.keys || {}, answers = o.answers || {};
      function doQ(q) {
        if (!q || typeof q !== "object") return;
        if (q.format === "input" && q.answers && answers[norm(q.q || "")]) q.answers = q.answers.concat(answers[norm(q.q || "")]);
      }
      var M = window.BOSS_MISSIONS || {};
      for (var id in M) {
        var m = M[id]; if (!m) continue;
        (m.steps || []).forEach(function (s) { doQ(s.q); });
        if (m.bonus && m.bonus.checklist) m.bonus.checklist.forEach(function (c) { var k = keys[norm(c.label)]; if (k) c.keys = c.keys.concat(k); });
      }
      var A = window.BOSS_ALTS || {};
      for (var b in A) for (var st in A[b]) for (var lv in A[b][st]) doQ(A[b][st][lv]);
      (window.QUESTIONS || []).forEach(doQ);
    },
    t: tr
  };

  function tr(s) {
    if (lang !== "en" || !s) return s;
    var k = norm(s);
    if (!k || !/[A-Za-zÀ-ÿ]/.test(k)) return s;
    var hit = cache[k];
    if (hit === undefined) { hit = lookup(k); cache[k] = hit; }
    if (hit === null) return s;
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + hit + trail;
  }
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DATE_RE = new RegExp("(\\ble )?\\b(1er|\\d{1,2}) (" + MOIS.join("|") + ")( \\d{4})?( à (\\d{1,2}):(\\d{2}))?", "g");
  function dates(k) {
    return k.replace(DATE_RE, function (m, le, d, mo, y, t, hh, mm) { return (le ? "on " : "") + (d === "1er" ? "1" : d) + " " + MONTHS[MOIS.indexOf(mo)] + (y || "") + (t ? " at " + hh + ":" + mm : ""); });
  }
  /* une phrase : dictionnaire exact, puis modèles à trous {0} */
  function one(k, depth) {
    if (exact[k] !== undefined) return exact[k];
    for (var i = 0; i < patterns.length; i++) {
      var m = patterns[i].re.exec(k);
      if (m) return m.groups.pre + patterns[i].en.replace(/\{(\d+)\}/g, function (x, n) { var v = m.groups["p" + n]; if (v === undefined) return x; if (!v || depth > 2) return v; var r = lookup(v, depth + 1); return r == null ? v : r; }) + (/[a-z]$/.test(patterns[i].en) ? m.groups.sfx : "") + m.groups.post;
    }
    return null;
  }
  function lookup(k, depth) {
    depth = depth || 0;
    var r = one(k, depth); if (r != null) return r;
    if (outputs[k]) return null;
    /* dates « 27 septembre 2026 » */
    var kd = dates(k);
    if (kd !== k) { r = lookup(kd, depth + 1); if (r != null) return r; if (!/[A-Za-zÀ-ÿ]{3,}/.test(k.replace(DATE_RE, " "))) return kd; }
    /* nombres ou ponctuation autour : « 3 badges », « +20 XP », « …dessous. » */
    var edge = /^([^A-Za-zÀ-ÿ]*)([\s\S]*?)([^A-Za-zÀ-ÿ]*)$/.exec(k);
    if (edge && edge[2] && (edge[1] || edge[3])) {
      var c = [[edge[1], edge[2] + edge[3], ""], [edge[1], edge[2], edge[3]], ["", edge[1] + edge[2], edge[3]]];
      for (var ci = 0; ci < c.length; ci++) { if (!c[ci][0] && !c[ci][2]) continue; r = one(c[ci][1], depth); if (r != null) return c[ci][0] + r + c[ci][2]; }
    }
    if (depth > 2) return null;
    /* texte composé : « Technicien · 520 XP », « Chaos des versions · bronze : obtenu »… */
    var parts = k.split(/( · | — | – | : | \/ | \| |\n)/);
    if (parts.length > 1) {
      var changed = false;
      for (var j = 0; j < parts.length; j += 2) { if (!parts[j]) continue; var pr = lookup(parts[j], depth + 1); if (pr != null) { parts[j] = pr; changed = true; } }
      if (changed) { for (var q = 1; q < parts.length; q += 2) if (parts[q] === " : ") parts[q] = ": "; return parts.join(""); }
    }
    /* dernier recours : phrases connues dans un texte plus long (« …de plus. −1 bouclier »),
       seulement si tout le texte est couvert (sinon on laisse le français intact) */
    return cover(k);
  }
  var bigRe = null;
  function cover(k) {
    if (bigRe === null) {
      var keys = Object.keys(exact).filter(function (x) { return x.length >= 8; }).sort(function (a, b) { return b.length - a.length; });
      bigRe = keys.length ? new RegExp("(?<![A-Za-zÀ-ÿ])(?:" + keys.map(esc).join("|") + ")(?![A-Za-zÀ-ÿ])", "g") : false;
    }
    if (!bigRe) return null;
    var hit = false, rest = k.replace(bigRe, function () { hit = true; return " "; });
    if (!hit || /[A-Za-zÀ-ÿ]{3,}/.test(rest)) return null;
    return k.replace(bigRe, function (m) { return exact[m]; });
  }
  function lookupPat(k) { return one(k, 3); }

  /* ---------- interrupteur FR | EN (placé dans la barre du haut par app.js) ---------- */
  window.PU_langButton = function () {
    var en = lang === "en";
    return '<button type="button" class="lang-toggle" data-lang-toggle translate="no" aria-label="' + (en ? "Language: English. Passer en français" : "Langue : français. Switch to English") + '" title="' + (en ? "Passer en français" : "Switch to English") + '">' +
      '<span class="lang-opt' + (en ? "" : " on") + '" lang="fr">FR</span><span class="lang-opt' + (en ? " on" : "") + '" lang="en">EN</span></button>';
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-lang-toggle]"); if (!b) return;
    var next = lang === "en" ? "fr" : "en";
    try { localStorage.setItem(KEY, next); } catch (err) { }
    b.classList.add("switching");
    setTimeout(function () { location.reload(); }, 120);
  });

  if (lang !== "en") return;

  /* ---------- chargement des dictionnaires (avant app.js) ---------- */
  document.documentElement.lang = "en";
  var base = "js/i18n/";
  var me = document.currentScript && document.currentScript.getAttribute("src");
  if (me && /i18n\.js(\?.*)?$/.test(me)) base = me.replace(/i18n\.js(\?.*)?$/, "i18n/");
  if (!window.PU_I18N_BUNDLED) {
    for (var i = 0; i < FILES.length; i++) document.write('<script src="' + base + FILES[i] + '.js" onerror="this.remove()"><\/script>');
  }

  /* ---------- traduction de la page ---------- */
  var ATTRS = ["title", "aria-label", "placeholder", "alt"];
  function skip(el) { return !el || el.closest("script,style,noscript,textarea,[translate=\"no\"],[contenteditable]"); }
  function doText(n) {
    var v = n.nodeValue; if (!v || v.length < 2 && !/[A-Za-z]/.test(v)) return;
    if (skip(n.parentElement)) return;
    var t = tr(v); if (t !== v) n.nodeValue = t;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || skip(el)) return;
    for (var i = 0; i < ATTRS.length; i++) { var a = el.getAttribute(ATTRS[i]); if (a) { var t = tr(a); if (t !== a) el.setAttribute(ATTRS[i], t); } }
    if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) { var tv = tr(el.value); if (tv !== el.value) el.value = tv; }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skip(root)) return; doEl(root); }
    var w = document.createTreeWalker(root, 5 /* éléments + textes */), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  I18N.walk = walk;
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === "childList") { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
        else if (m.type === "characterData") doText(m.target);
        else if (m.type === "attributes") doEl(m.target);
      }
    } finally { mo.takeRecords(); busy = false; }
  });
  function start() {
    document.title = tr(document.title);
    walk(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  /* boîtes de dialogue du navigateur */
  ["alert", "confirm", "prompt"].forEach(function (fn) { var o = window[fn]; if (o) window[fn] = function (msg, d) { return o.call(window, tr(String(msg == null ? "" : msg)), d); }; });
})();
