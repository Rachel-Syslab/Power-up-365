/* =========================================================
   Power Up — application
   Un site 100 % statique : pas de serveur, la progression
   est enregistrée dans le navigateur (localStorage).
   ========================================================= */
(function () {
  "use strict";

  /* ---------------- réglages du jeu ---------------- */
  var RANKS = [
    { n: "Recrue", min: 0 },
    { n: "Technicien", min: 500 },
    { n: "Super technicien", min: 1500 },
    { n: "Super admin", min: 3000 },
    { n: "Super directeur technique", min: 5000 }
  ];
  var LEVELS = {
    recrue:  { name: "Débutant",  tag: "NIVEAU 1", gain: 10, loss: 0,  shield: false, floor: true,  color: "#4CC37A", by: "volt", focus: "« Chaque héros a commencé par cliquer sur Suivant. » — Captain Reboot", desc: "Tu montes doucement, mais tu ne perds jamais d'XP. Idéal pour découvrir." },
    hero:    { name: "Confirmé",  tag: "NIVEAU 2", gain: 20, loss: 5,  shield: true,  shieldStreak: 5, floor: true,  color: "#6E88FF", by: "patch", focus: "« Des mises à jour ? Je peux faire ça toute la journée. » — Hotfix", desc: "Tu progresses deux fois plus vite. Une erreur te coûte un peu, mais ton grade est protégé." },
    super:   { name: "Expert",    tag: "NIVEAU 3", gain: 35, loss: 15, shield: true,  shieldStreak: 7, floor: false, color: "#B98CFF", by: "sudo", focus: "« Avec de grands droits admin viennent de grandes responsabilités. » — Sudo", desc: "Pour ceux qui maîtrisent déjà les bases. Ça grimpe vite, ça chute aussi." },
    legende: { name: "Légende",   tag: "NIVEAU 4", gain: 50, loss: 30, shield: false, floor: false, color: "#FF3D6E", by: "sentinelle", focus: "« Le phishing est inévitable. Toi aussi. » — Phishbuster", desc: "Le mode ultime. Aucun bouclier, rétrogradation immédiate. Seuls les meilleurs y survivent." }
  };
  var LEVEL_ORDER = ["recrue", "hero", "super", "legende"];
  var STREAK_FOR_SHIELD = 5;
  var RANKED_SESSION = 8;
  var FORMAT = {
    single: { label: "Choix unique", hint: "Une seule bonne réponse." },
    tf:     { label: "Vrai ou faux", hint: "Vrai ou faux ?" },
    multi:  { label: "Plusieurs réponses", hint: "Coche toutes les bonnes réponses, puis valide." },
    order:  { label: "Remets dans l'ordre", hint: "Fais glisser les étapes pour les remettre dans l'ordre, puis valide." },
    clues:  { label: "Repère les indices", hint: "Clique sur tous les éléments suspects, puis valide." },
    input:  { label: "Réponse à saisir", hint: "Tape ta réponse (les majuscules et les accents ne comptent pas), puis valide." }
  };

  /* Conseil adapté au type de question (pas d'élimination possible sur un vrai ou faux, par exemple) */
  var FORMAT_TIP = {
    single: "Tu hésites ? Élimine d'abord les réponses qui ne tiennent pas, puis choisis.",
    multi: "Plusieurs réponses peuvent être justes : passe-les en revue une par une avant de valider.",
    tf: "Méfie-toi des mots absolus (toujours, jamais, uniquement) : ils rendent souvent une phrase fausse.",
    order: "Cherche d'abord la première et la dernière étape : le reste se place autour.",
    clues: "Un indice seul peut sembler anodin : c'est leur accumulation qui doit t'alerter.",
    input: "Tape le terme exact : les majuscules et les accents ne comptent pas."
  };
  var QUESTIONS = window.QUESTIONS || [];
  var THEMES = window.THEMES || [];
  var PILLARS = window.PILLARS || [];
  function pillarById(id) { for (var i = 0; i < PILLARS.length; i++) if (PILLARS[i].id === id) return PILLARS[i]; return null; }
  function pillarOfTheme(theme) { for (var i = 0; i < PILLARS.length; i++) if (PILLARS[i].subs.indexOf(theme) !== -1) return PILLARS[i]; return null; }
  function matchScope(q, pillar, theme) {
    if (theme && theme !== "all") return q.theme === theme;
    if (pillar && pillar !== "all") { var p = pillarById(pillar); return !!p && p.subs.indexOf(q.theme) !== -1; }
    return true;
  }
  var MISSION = window.MISSION_PHISHER || [];
  /* Pages de développement (maintenance, démo) : réservées à l'ordinateur du créateur (fichier local ou localhost), jamais sur le site publié */
  var DEV_PAGES = !window.PU_TESTER && /^(localhost|127\.0\.0\.1|\[::1\])?$/.test(location.hostname);
  /* Taille de la banque de questions : visible uniquement sur l'ordinateur du créateur (comme les pages de développement), jamais sur le site publié */
  var SHOW_COUNTS = false;

  /* ---------------- sauvegarde ---------------- */
  var STORE_KEY = "powerup365.profile.v1";
  function defaultProfile() { return { xp: 0, streak: 0, shield: false, bestStreak: 0, missionWon: false, pseudo: "", avatar: "patch", bosses: {} }; }
  function loadProfile() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) { var p = JSON.parse(raw); var d = defaultProfile(); for (var k in d) if (!(k in p)) p[k] = d[k]; return p; }
    } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
    return defaultProfile();
  }
  function saveProfile() {
    if (window.__puXfr) return; /* import en cours : on ne réécrit pas le profil */
    try { var sg = xfrSigOf(P); if (sg !== xfrLast) { P.savedAt = Date.now(); xfrLast = sg; } } catch (e) { } /* date de dernière progression, pour le transfert entre appareils */
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { }
  }
  function xfrSigOf(p) { return JSON.stringify([p.xp, p.bestStreak, p.pseudo, p.avatar, p.cape, p.bg, p.frame, Object.keys(p.badgeDates || {}).length, Object.keys(p.bosses || {}).length]); }
  var P = loadProfile();
  var xfrLast = xfrSigOf(P);
  /* Migration : l'ancienne mission Phisher gagnée compte comme le niveau 1 du nouveau boss */
  if (P.missionWon) { P.bosses = P.bosses || {}; var ph = P.bosses.phisher || {}; ph.levels = ph.levels || {}; if (!ph.levels[1]) { ph.levels[1] = true; ph.won = true; ph.wins = ph.wins || 1; P.bosses.phisher = ph; try { localStorage.setItem("powerup365.profile.v1", JSON.stringify(P)); } catch (e) { } } }

  /* ---------- statistiques du joueur ---------- */
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  var PUBLIC_DEFAULT = { rank: true, bestStreak: true, favTheme: true, badges: true, time: false, answered: false, accuracy: false, days: false };
  function ensureStats() {
    var d = { time: 0, answered: 0, correct: 0, themes: {}, modes: {}, days: [], firstSeen: todayStr(), legendRuns: 0, legendPerfect: 0, promotions: 0 };
    if (!P.stats || typeof P.stats !== "object") P.stats = {};
    for (var k in d) if (!(k in P.stats)) P.stats[k] = d[k];
    if (!P.pub || typeof P.pub !== "object") P.pub = {};
    for (var q in PUBLIC_DEFAULT) if (!(q in P.pub)) P.pub[q] = PUBLIC_DEFAULT[q];
  }
  ensureStats();
  var capeWelcomeGap = 0;
  if (P.stats.legendRuns && !P.legendSeen) P.legendSeen = true;
  (function markToday() {
    var t = todayStr();
    if (P.stats.days.indexOf(t) === -1) {
      var last = P.stats.days.length ? P.stats.days[P.stats.days.length - 1] : null;
      if (last) { var gap = Math.round((new Date(t) - new Date(last)) / 86400000); if (gap >= 3) capeWelcomeGap = gap; }
      P.stats.days.push(t); if (P.stats.days.length > 400) P.stats.days = P.stats.days.slice(-400); saveProfile(); }
  })();
  function dayStreak() {
    var set = {}, n = 0, d = new Date();
    P.stats.days.forEach(function (x) { set[x] = 1; });
    while (set[todayStr(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function recordAnswer(theme, good, mode) {
    ensureStats();
    var st = P.stats; st.answered++; if (good) st.correct++;
    var t = st.themes[theme] || (st.themes[theme] = { a: 0, c: 0 }); t.a++; if (good) t.c++;
    st.modes[mode] = (st.modes[mode] || 0) + 1;
    saveProfile();
  }
  /* ---------- révision espacée (boîtes de Leitner) ----------
     Chaque question a une boîte (0 à 5) et une date de prochaine révision : une erreur la ramène à
     aujourd'hui, une réussite l'espace de plus en plus (1, 3, 7, 16 puis 35 jours). Tout reste dans le navigateur. */
  var SRS_DAYS = [0, 1, 3, 7, 16, 35], QIDX = null;
  function dayNum() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  function qidOf(q) {
    if (q._id) return q._id;
    var s = q.theme + "|" + q.q, h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (q._id = (h >>> 0).toString(36));
  }
  function qById(id) { if (!QIDX) { QIDX = {}; QUESTIONS.forEach(function (q) { QIDX[qidOf(q)] = q; }); } return QIDX[id] || null; }
  function srsRecord(q, good) {
    if (!q || !q.theme || !q.q || !qById(qidOf(q))) return;
    if (!P.srs || typeof P.srs !== "object") P.srs = {};
    var id = qidOf(q), e = P.srs[id] || { b: 0, d: 0, m: 0, n: 0, w: 0 };
    e.n++;
    if (good) { e.b = Math.min(e.b + 1, 5); e.d = dayNum() + SRS_DAYS[e.b]; e.w = 0; }
    else { e.b = 0; e.d = dayNum(); e.m++; e.w = 1; }
    P.srs[id] = e;
  }
  function srsList(kind) {
    var t = dayNum(), S = P.srs || {};
    return QUESTIONS.filter(function (q) { var e = S[qidOf(q)]; return e && legendOpen(q) && (kind === "errors" ? e.w === 1 : e.d <= t); });
  }

  var lastActive = Date.now();
  ["click", "keydown", "pointermove", "scroll", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { lastActive = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (document.visibilityState === "visible" && Date.now() - lastActive < 90000) { ensureStats(); P.stats.time += 15; saveProfile(); }
  }, 15000);
  function fmtTime(sec) {
    if (sec < 60) return "< 1 min";
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? h + " h " + ("0" + m).slice(-2) + " min" : m + " min";
  }


  /* ---------------- outils ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rankIndex(xp) { var r = 0; RANKS.forEach(function (k, i) { if (xp >= k.min) r = i; }); return r; }
  function rankInfo(xp) {
    var i = rankIndex(xp), cur = RANKS[i], nxt = RANKS[i + 1];
    return {
      index: i, name: cur.n, next: nxt ? nxt.n : null,
      pct: nxt ? Math.round(((xp - cur.min) / (nxt.min - cur.min)) * 100) : 100,
      label: nxt ? (nxt.min - xp) + " XP avant " + nxt.n : "Rang maximum atteint"
    };
  }
  function themeLabel(id) { var t = THEMES.filter(function (x) { return x.id === id; })[0]; return t ? t.label : "Tous les thèmes"; }
  function avatarInfo(id) { var l = window.AVATARS || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  var DETENTE_TARGET = 4000; /* score au tri du courrier qui débloque le personnage Combo */
  var DETENTE_GOALS = { mail: 2500, pwd: 800, fw: 1500, mem: 700 }; /* objectif par jeu : Combo se débloque quand les 4 sont atteints */
  function detenteBest(k) { return (P.detente && P.detente[k] && P.detente[k].best) || 0; }
  function comboCount() { return Object.keys(DETENTE_GOALS).filter(function (k) { return detenteBest(k) >= DETENTE_GOALS[k]; }).length; }
  function comboGot() { return comboCount() === 4 || detenteBest("mail") >= DETENTE_TARGET; } /* l'ancien déblocage (4 000 au courrier) reste valable */
  function avatarUnlocked(a) { if (a && a.gate === "detente") return comboGot(); return a && (!a.locked || P.xp >= (a.unlockXp || 0)); }
  function validAvatarId(id) { var a = avatarInfo(id); return avatarUnlocked(a) ? id : (window.DEFAULT_AVATAR || "patch"); }
  function myAvatar(size, capeId) { var av = window.avatarSvg ? (window.avatarSvg(validAvatarId(P.avatar), size) || "") : ""; return capeWrap(av, size, capeId); }
  function heroSayHtml(hero, text, extraCls) {
    if (!hero || !window.heroSvg) return "";
    return '<div class="hero-say' + (extraCls ? " " + extraCls : "") + '"><span class="hero-say-face">' + window.heroSvg(hero, 56) + '</span><div><b>' + esc(hero.name) + "</b><p>" + esc(text) + "</p></div></div>";
  }
  /* Encart « ce qui a changé » sous l'explication : champ facultatif maj de la question
     maj = { date: "AAAA-MM-JJ", precision: "mois" | "annee" (facultatif), texte: "…", url: "https://…", source: "…" } */
  var MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var MOIS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  /* « quand » d'un changement, en toutes lettres : « le 30 mai 2025 », « en octobre 2026 », « en 2025 » */
  function majWhen(m) {
    var en = window.PU_LANG === "en", y = +m.date.slice(0, 4), mo = +m.date.slice(5, 7) - 1, d = +m.date.slice(8, 10), p = m.precision;
    if (en) return p === "annee" ? "in " + y : p === "mois" ? "in " + MOIS_EN[mo] + " " + y : "on " + MOIS_EN[mo] + " " + d + ", " + y;
    return p === "annee" ? "en " + y : p === "mois" ? "en " + MOIS_FR[mo] + " " + y : "le " + (d === 1 ? "1er" : d) + " " + MOIS_FR[mo] + " " + y;
  }
  function majFutur(m) { return new Date(+m.date.slice(0, 4), +m.date.slice(5, 7) - 1, +m.date.slice(8, 10)) > new Date(); }
  /* Phrase d'accroche après la réponse : « Tu as raison ! Attention, ce point a évolué… » ou, si le joueur a donné l'ancienne bonne réponse (maj.avant), « Pas tout à fait : ta réponse était juste avant… » */
  function majLead(m, run) {
    if (!m || !m.date || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || !run || !run.validated || run.timeout || !run.q || run.q.format === "clues") return "";
    var en = window.PU_LANG === "en", at = majWhen(m), futur = majFutur(m), txt = "", head = "";
    if (run.good) {
      head = en ? "You're right!" : "Tu as raison !";
      if (m.projet) txt = en ? " A change has been proposed " + at + " but is not adopted yet." : " Un changement est proposé " + at + ", mais il n'est pas encore adopté.";
      else if (futur) txt = en ? " And this is going to change " + at + "." : " Et ça va évoluer " + at + ".";
      else txt = en ? " Heads-up: this point changed " + at + "." : " Attention, ce point a évolué " + at + ".";
    } else if (m.avant && m.avant.length && !futur && !m.projet) {
      var q = run.q, chosen = null;
      if (q.format === "single" || q.format === "tf") chosen = run.hard ? (run.multi.filter(Boolean).length === 1 ? run.multi.indexOf(true) : null) : run.picked;
      if (chosen === null || m.avant.indexOf(chosen) === -1) return "";
      head = en ? "Not quite:" : "Pas tout à fait :";
      txt = en ? " your answer was right before, but it changed " + at + "." : " ta réponse était juste avant, mais ça a changé " + at + ".";
    } else return "";
    return '<span class="maj-lead"><b>' + esc(head) + "</b>" + esc(txt) + "</span> ";
  }
  function majNote(m, run) {
    if (!m || !m.date || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) return "";
    var en = window.PU_LANG === "en", y = +m.date.slice(0, 4), mo = +m.date.slice(5, 7) - 1, d = +m.date.slice(8, 10);
    var futur = majFutur(m), p = m.precision, quand;
    if (en) {
      var de = p === "annee" ? String(y) : p === "mois" ? MOIS_EN[mo] + " " + y : MOIS_EN[mo] + " " + d + ", " + y;
      quand = m.projet ? "Proposed " + (p ? "in " : "on ") + de : (futur ? "Planned " + (p ? "for " : "on ") : "Changed " + (p ? "in " : "on ")) + de;
    } else {
      var df = p === "annee" ? String(y) : p === "mois" ? MOIS_FR[mo] + " " + y : (d === 1 ? "1er" : d) + " " + MOIS_FR[mo] + " " + y;
      var voy = /^[aeiouyéèêàâîôû]/i.test(df);
      quand = m.projet ? (p ? "Proposé en " : "Proposé le ") + df
        : futur ? (p === "annee" ? "Prévu en " : p === "mois" ? "Prévu en " : "Prévu le ") + df
        : (p === "annee" ? "Changement de " : p === "mois" ? (voy ? "Changement d'" : "Changement de ") : "Changement du ") + df;
    }
    quand += en ? ":" : " :";
    var lien = /^https:\/\//.test(m.url || "") ? ' <a class="maj-lien" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">' + (en ? "Read the source" : "Voir l'article") + (m.source ? " (" + esc(m.source) + ")" : "") + " ↗</a>" : "";
    var at = majWhen(m), pill = m.projet ? (en ? "Proposed change" : "Changement proposé") : futur ? (en ? "What will change " : "Ce qui va changer ") + at : (en ? "What changed " : "Ce qui a changé ") + at;
    return '<div class="maj-wrap"><p class="maj-note"><span class="maj-quand">' + esc(quand) + "</span> " + esc(m.texte || "") + lien + '</p><button type="button" class="maj-pill" data-maj-open><span aria-hidden="true">🆕</span> ' + esc(pill) + ' <span aria-hidden="true">›</span></button></div>';
  }
  /* Sur téléphone, le détail du changement s'ouvre dans une fenêtre qui monte du bas de l'écran */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-maj-open]") : null;
    if (!t) return;
    var wrap = t.closest(".maj-wrap"), note = wrap && wrap.querySelector(".maj-note"); if (!note) return;
    var c = note.cloneNode(true), quand = (c.querySelector(".maj-quand") || {}).textContent || "", lien = c.querySelector(".maj-lien");
    if (c.querySelector(".maj-quand")) c.querySelector(".maj-quand").remove();
    if (lien) lien.remove();
    var en = window.PU_LANG === "en", old = document.querySelector(".maj-sheet"); if (old) old.remove();
    var ov = document.createElement("div"); ov.className = "maj-sheet";
    ov.innerHTML = '<div class="maj-sheet-bg" data-maj-close></div><section class="maj-sheet-card" role="dialog" aria-modal="true" aria-labelledby="maj-sh-t"><span class="maj-grip" aria-hidden="true"></span><div class="maj-sheet-head"><h2 id="maj-sh-t"></h2><button type="button" class="maj-x" data-maj-close aria-label="' + (en ? "Close" : "Fermer") + '">×</button></div><p class="maj-sheet-p"></p></section>';
    ov.querySelector("h2").textContent = quand.replace(/\s*:\s*$/, "");
    ov.querySelector(".maj-sheet-p").textContent = c.textContent.trim();
    if (lien) { var a = lien.cloneNode(true); a.className = "maj-sheet-link"; ov.querySelector(".maj-sheet-card").appendChild(a); }
    var cb = document.createElement("button"); cb.type = "button"; cb.className = "maj-sheet-close"; cb.setAttribute("data-maj-close", ""); cb.textContent = en ? "Close" : "Fermer";
    ov.querySelector(".maj-sheet-card").appendChild(cb);
    document.body.appendChild(ov);
    function close() { ov.remove(); document.removeEventListener("keydown", onKey, true); try { t.focus(); } catch (er) { } }
    function onKey(ev) { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); } }
    ov.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("[data-maj-close]")) close(); });
    document.addEventListener("keydown", onKey, true);
    try { ov.querySelector(".maj-x").focus(); } catch (er) { }
  });
  function heroExplain(theme, text, maj, run) {
    var h = window.heroForTheme ? window.heroForTheme(theme) : null, lead = majLead(maj, run);
    if (!h) return "<p>" + lead + esc(text) + "</p>" + majNote(maj, run);
    return '<div class="hero-say explain"><span class="hero-say-face">' + window.heroSvg(h, 48) + '</span><div><b>' + esc(h.name) + " t'explique</b><p>" + lead + esc(text) + "</p>" + majNote(maj, run) + "</div></div>";
  }
  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }

  /* ---------------- icônes ---------------- */
  var I = {
    bolt: function (c, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2 5 11h4l-1 7 6-9h-4z" fill="' + (c || "#fff") + '"/></svg>'; },
    logo: '<svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M11 9.5a12 12 0 1 0 14 0" stroke="#E8ECF4" stroke-width="3" stroke-linecap="round"/><path d="M19.5 4 13 18.5h5L16.5 30 23 15.5h-5z" fill="#4C6BFF"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    grip: '<svg width="16" height="22" viewBox="0 0 16 22" fill="#6E7686" aria-hidden="true"><circle cx="5" cy="5" r="1.8"/><circle cx="11" cy="5" r="1.8"/><circle cx="5" cy="11" r="1.8"/><circle cx="11" cy="11" r="1.8"/><circle cx="5" cy="17" r="1.8"/><circle cx="11" cy="17" r="1.8"/></svg>',
    flame: '<svg class="flame-svg" width="16" height="20" viewBox="0 0 24 30" aria-hidden="true">' +
      '<path class="fl-outer" fill="#FF4B2B" d="M12 1C13.5 5 10 7.5 10.5 11C11 13 12.8 13.5 13.5 12C14.5 10 14 8 15.5 6.5C17 9.5 20 13 20 18.5C20 24 16.5 28 12 28C7.5 28 4 24.5 4 19.5C4 15 6.5 12.5 7.5 10C8 12 8.8 13 9.6 13.2C8.8 9 10 4.5 12 1Z"/>' +
      '<path class="fl-mid" fill="#FF9A2E" d="M12 7C12.5 10 11 12 11.8 14.5C12.4 16 14 16 14.6 14.2C15 13 15 12 15.8 11C17.2 13.5 18 16 18 19C18 23.2 15.4 26 12 26C8.6 26 6 23.4 6 20C6 17 7.5 15 8.5 13.5C9 15 9.6 15.8 10.3 16C9.8 12.5 10.5 9.5 12 7Z"/>' +
      '<path class="fl-in" fill="#FFE27A" d="M12 14C12.3 16 11.6 17.5 12.4 19C13 20 14.2 19.8 14.5 18.6C15.6 20 16 21.5 16 22.6C16 25 14.2 26.5 12 26.5C9.8 26.5 8 25 8 22.8C8 20.8 9.2 19.2 10 18.2C10.2 19 10.7 19.6 11.2 19.7C10.8 17.5 11.2 15.6 12 14Z"/>' +
      '<ellipse class="fl-core" fill="#FFF6D6" cx="12" cy="24.2" rx="2.2" ry="1.8"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#3651F5" stroke="#8EA2FF" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 9.5 8.5 3 9.3l4.9 4.4L6.5 20 12 16.8 17.5 20l-1.4-6.3L21 9.3l-6.5-.8z"/></svg>',
    shield: function (on, s) { return '<svg width="' + (s || 26) + '" height="' + (s || 26) + '" viewBox="0 0 24 24" fill="' + (on ? "#3651F5" : "none") + '" stroke="' + (on ? "#B7C4FF" : "#3A4456") + '" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/></svg>'; },
    chat: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8EA2FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>',
    folder: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8EA2FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5"/></svg>',
    chart: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8EA2FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    shieldCheck: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8EA2FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    leaf: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7CC596" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 13 11"/></svg>',
    robot: '<svg width="280" height="340" viewBox="0 0 300 360" fill="none" role="img" aria-label="Mascotte robot casqué"><path d="M150 18v34" stroke="#D9A35B" stroke-width="5"/><path d="M160 6 142 30h12l-6 18 18-24h-12z" fill="#D9A35B"/><path d="M58 170c0-62 41-112 92-112s92 50 92 112v28c0 12-10 22-22 22H80c-12 0-22-10-22-22z" fill="#DDE3EE" stroke="#0B0E13" stroke-width="5"/><path d="M78 150c0-8 6-14 14-14h116c8 0 14 6 14 14v24c0 8-6 14-14 14H92c-8 0-14-6-14-14z" fill="#0B0E13"/><path d="M92 158h116" stroke="#6E88FF" stroke-width="10" stroke-linecap="round"/><circle cx="120" cy="160" r="5" fill="#E8ECF4"/><circle cx="180" cy="160" r="5" fill="#E8ECF4"/><path d="M70 100c20-26 48-40 80-40" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/><path d="M96 220h108l20 140H76z" fill="#1B2233" stroke="#0B0E13" stroke-width="5"/><circle cx="150" cy="276" r="26" fill="#0B0E13" stroke="#6E88FF" stroke-width="4"/><path d="M154 258 142 280h9l-5 16 12-22h-9z" fill="#6E88FF"/><path d="M96 232 40 360h56z" fill="#3651F5" stroke="#0B0E13" stroke-width="5"/><path d="M204 232 260 360h-56z" fill="#3651F5" stroke="#0B0E13" stroke-width="5"/></svg>',
    boss: '<svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 40c0-12 7-22 16-22s16 10 16 22z" fill="#1B0E16" stroke="#FF6B8A" stroke-width="2.5"/><path d="M12 22c2-10 7-16 12-16s10 6 12 16" stroke="#FF6B8A" stroke-width="2.5" stroke-linecap="round"/><circle cx="19" cy="28" r="2.5" fill="#FF6B8A"/><circle cx="29" cy="28" r="2.5" fill="#FF6B8A"/><path d="M34 10v8a4 4 0 0 1-8 0" stroke="#D9A35B" stroke-width="2.5" stroke-linecap="round"/></svg>'
  };

  /* =========================================================
     MOTEUR DE QUESTIONS (commun aux 3 modes)
     ========================================================= */
  /* hard = mode boss / Légende : on n'indique pas s'il y a une ou plusieurs bonnes réponses,
     et le choix unique se valide avec un bouton (comme le choix multiple) */
  function newRun(q, hard) {
    var run = { q: q, picked: null, multi: [], ord: [], clues: [], validated: false, good: false };
    run.hard = !!hard && (q.format === "single" || q.format === "tf" || q.format === "multi");
    if (q.format === "multi" || run.hard) run.multi = q.a.map(function () { return false; });
    if (q.format === "order") {
      var idx = q.items.map(function (_, k) { return k; });
      do { run.ord = shuffle(idx); } while (idx.length > 1 && run.ord.every(function (v, k) { return v === k; }));
    }
    if (q.format === "clues") { var n = 0; q.lines.forEach(function (l) { n += l.length; }); for (var i = 0; i < n; i++) run.clues.push(false); }
    return run;
  }

  /* Réponses saisies : on ignore la casse, les accents, les espaces en trop et la ponctuation finale */
  function normAnswer(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[«»"'`’]/g, "").replace(/\s+/g, " ").replace(/[\s.;!?]+$/, "").trim();
  }
  function checkRun(run) {
    var q = run.q;
    if (q.format === "input") { var t = normAnswer(run.typed); return !!t && q.answers.some(function (x) { var n = normAnswer(x); return n === t || n.replace(/ /g, "") === t.replace(/ /g, ""); }); }
    if (run.hard && (q.format === "single" || q.format === "tf")) return run.multi.filter(Boolean).length === 1 && run.multi[q.g];
    if (q.format === "single" || q.format === "tf") return run.picked === q.g;
    if (q.format === "multi") return q.a.every(function (_, k) { return run.multi[k] === (q.g.indexOf(k) !== -1); });
    if (q.format === "order") return run.ord.every(function (v, k) { return v === k; });
    if (q.format === "clues") {
      var n = 0, ok = true;
      q.lines.forEach(function (l) { l.forEach(function (sg) { if (run.clues[n] !== !!sg.c) ok = false; n++; }); });
      return ok;
    }
    return false;
  }

  function renderScenario(sc) {
    if (!sc) return "";
    var cta = "";
    if (sc.cta) cta = '<div class="mail-cta"><span class="cta">' + esc(sc.cta) + "</span>" + (sc.hover ? '<span class="hover">Au survol : ' + esc(sc.hover) + "</span>" : "") + "</div>";
    return '<div class="mail-frame halftone-warm"><span class="mail-kicker">' + esc(sc.kicker) + '</span><div class="mail"><div class="mail-head"><span class="from">' + esc(sc.from) + '</span><span class="addr">' + esc(sc.fromAddr) + '</span><span class="subject">' + esc(sc.subject) + '</span></div><div class="mail-body">' + esc(sc.body) + "</div>" + cta + "</div></div>";
  }

  function renderRun(run) {
    var q = run.q, v = run.validated, f = q.format, h = "";
    h += renderScenario(q.scenario);
    h += '<h2 class="h-m" id="question-title">' + esc(q.q) + "</h2>";
    h += '<p class="q-hint">' + esc(run.hard ? "Fais ton choix, puis valide." : FORMAT[f].hint) + "</p>";
    var letters = "ABCDE";

    if ((f === "single" || f === "tf") && !run.hard) {
      h += '<div class="answers" role="group" aria-labelledby="question-title">';
      q.a.forEach(function (t, k) {
        var cls = "";
        if (v) cls = k === q.g ? " ok" : (k === run.picked ? " ko" : " dim");
        h += '<button type="button" class="answer' + cls + '" data-action="pick" data-i="' + k + '" data-key="a' + k + '"' + (v ? " disabled" : "") + '><span class="letter">' + letters[k] + "</span><span>" + esc(t) + "</span></button>";
      });
      h += "</div>";
    }

    if (f === "multi" || run.hard) {
      h += '<div class="answers' + (run.hard ? " hard" : "") + '" role="group" aria-labelledby="question-title">';
      q.a.forEach(function (t, k) {
        var on = run.multi[k], right = f === "multi" ? q.g.indexOf(k) !== -1 : k === q.g, cls = on ? " on" : "";
        if (v) cls = right ? " ok" : (on ? " ko" : " dim");
        h += '<button type="button" class="answer' + cls + '" data-action="toggle" data-i="' + k + '" data-key="m' + k + '" aria-pressed="' + on + '"' + (v ? " disabled" : "") + '>' + (run.hard ? '<span class="letter">' + letters[k] + "</span>" : '<span class="box">' + (on ? I.check : "") + "</span>") + "<span>" + esc(t) + "</span></button>";
      });
      h += "</div>";
    }

    if (f === "order") {
      h += '<ol class="answers order-list" style="list-style:none;padding:0;margin:0">';
      run.ord.forEach(function (itemIdx, pos) {
        var cls = v ? (itemIdx === pos ? " ok" : " ko") : " draggable";
        h += '<li class="order-row' + cls + '" data-item="' + itemIdx + '" data-pos="' + pos + '" data-key="r' + pos + '"' +
          (v ? "" : ' tabindex="0" aria-label="Étape en position ' + (pos + 1) + ' : ' + esc(q.items[itemIdx]) + '. Flèches haut et bas pour la déplacer."') + ">" +
          (v ? "" : '<span class="grip" aria-hidden="true">' + I.grip + "</span>") +
          '<span class="pos">' + (pos + 1) + '</span><span class="txt">' + esc(q.items[itemIdx]) + "</span></li>";
      });
      h += "</ol>";
    }

    if (f === "clues") {
      h += '<div class="mail-frame halftone-warm"><div class="mail"><div class="clue-mail">';
      var n = 0;
      q.lines.forEach(function (line) {
        h += '<div class="clue-line">';
        line.forEach(function (sg) {
          var k = n++, on = run.clues[k], cls = on ? " on" : "";
          if (v) cls = sg.c ? " ok" : (on ? " ko" : " plain");
          h += '<button type="button" class="seg' + cls + '" data-action="clue" data-i="' + k + '" data-key="c' + k + '" aria-pressed="' + on + '"' + (v ? " disabled" : "") + ">" + esc(sg.t) + "</button>";
        });
        h += "</div>";
      });
      h += "</div></div></div>";
    }

    if (f === "input") {
      if (!v) h += '<div class="type-wrap"><label class="sr-only" for="type-answer">Ta réponse</label><input id="type-answer" class="type-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(q.placeholder || "Ta réponse…") + '" data-key="typed" value="' + esc(run.typed || "") + '"></div>';
      else h += '<div class="type-result ' + (run.good ? "ok" : "ko") + '"><div><small>Ta réponse</small><code>' + esc(run.typed || "(vide)") + '</code></div>' + (run.good ? "" : '<div><small>Réponse attendue</small><code>' + esc(q.answers[0]) + "</code></div>") + "</div>";
    }
    if (!v && (f === "multi" || run.hard || f === "order" || f === "clues" || f === "input")) {
      h += '<div style="margin-top:18px"><button type="button" class="btn btn-primary" data-action="validate" data-key="validate">Valider ma réponse</button></div>';
    }
    return h;
  }

  var RUN_ACTIONS = {
    pick: function (d) { if (V.run.validated) return; V.run.picked = +d.i; finishRun(); },
    toggle: function (d) { if (V.run.validated) return; V.run.multi[+d.i] = !V.run.multi[+d.i]; },
    clue: function (d) { if (V.run.validated) return; V.run.clues[+d.i] = !V.run.clues[+d.i]; },
    validate: function () { if (V.run.validated) return; if (V.run.hard && !V.run.multi.some(Boolean)) return; if (V.run.q.format === "input") { var inp = document.getElementById("type-answer"); V.run.typed = inp ? inp.value : ""; if (!normAnswer(V.run.typed)) { if (inp) inp.focus(); return; } } finishRun(); }
  };
  function move(pos, dir) {
    var r = V.run; if (r.validated) return;
    var t = pos + dir; if (t < 0 || t >= r.ord.length) return;
    var tmp = r.ord[pos]; r.ord[pos] = r.ord[t]; r.ord[t] = tmp;
    V._focusKey = "r" + t;
  }
  function finishRun() {
    V.run.validated = true;
    V.run.good = checkRun(V.run);
    if (V.onAnswer) V.onAnswer(V.run.good);
    recordAnswer(V.run.q.theme, V.run.good, V.nav);
    srsRecord(V.run.q, V.run.good);
    saveProfile();
    sfx(V.run.good ? "good" : "bad");
    V._focusKey = "next";
  }

  /* =========================================================
     MISE EN PAGE COMMUNE
     ========================================================= */
  /* =========================================================
     SONS (Web Audio, générés à la volée : aucun fichier à télécharger)
     Désactivés par défaut ; bouton haut-parleur dans la barre du haut.
     ========================================================= */
  var SOUND_KEY = "powerup365.sound";
  var soundOn = true; /* sons actifs par défaut : seul un choix explicite « coupé » est mémorisé */
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { }
  var VOL_KEY = "powerup365.volume", volume = 0.7, sndOpen = false;
  try { var vs = localStorage.getItem(VOL_KEY); if (vs !== null && !isNaN(+vs)) volume = Math.max(0, Math.min(1, +vs)); } catch (e) { }
  var actx = null;
  function audio() {
    if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    var ac = audio(); if (!ac) return;
    var t = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, (vol || 0.12) * volume * 1.4), t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseBurst(start, dur, vol, type, freq) {
    var ac = audio(); if (!ac) return;
    var t = ac.currentTime + start, len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = type || "lowpass"; f.frequency.value = freq || 1200; g.gain.value = vol * volume * 1.4;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + dur);
  }
  var SFX = {
    /* Survol de « super-pouvoirs » : 4 propositions à tester dans Maintenance */
    pwZap: function () { tone(180, 0, 0.18, "sawtooth", 0.05, 1400); [0, 0.05, 0.11, 0.16].forEach(function (t, i) { noiseBurst(t, 0.035, 0.09 - i * 0.015, "highpass", 3500); }); tone(1760, 0.14, 0.18, "sine", 0.035); },
    pwCharge: function () { tone(220, 0, 0.55, "triangle", 0.06, 1320); tone(330, 0.04, 0.5, "sine", 0.035, 1980); [1568, 2093].forEach(function (f, i) { tone(f, 0.5 + i * 0.07, 0.3, "sine", 0.04); }); },
    pwArc: function () { var ac = audio(); if (!ac) return; try { var t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.type = "sawtooth"; o.frequency.value = 98; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 4; l.frequency.value = 22; lg.gain.value = 600; l.connect(lg); lg.connect(f.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * volume * 1.4, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(f); f.connect(g); g.connect(ac.destination); o.start(t); l.start(t); o.stop(t + 0.52); l.stop(t + 0.52); } catch (e) { } noiseBurst(0, 0.04, 0.08, "highpass", 4000); noiseBurst(0.22, 0.04, 0.06, "highpass", 4000); },
    pwAura: function () { auraFx({ dur: 1.15, f0: 55, f1: 98, rumble: 0.075, roar: 0.07, flut: 14, crackles: 7 }); },
    pwAuraBurst: function () { auraFx({ dur: 0.85, f0: 49, f1: 131, cut: 900, rumble: 0.08, roar: 0.075, n1: 2600, flut: 16, crackles: 5, burst: true }); },
    pwShine: function () { [1319, 1760, 2349, 3136].forEach(function (f, i) { tone(f, i * 0.045, 0.4, "sine", 0.035); }); noiseBurst(0, 0.25, 0.025, "highpass", 6000); },
    tab: function () { tone(880, 0, 0.07, "triangle", 0.05); },
    good: function () { tone(784, 0, 0.12, "triangle", 0.11); tone(1175, 0.09, 0.22, "triangle", 0.11); },
    bad: function () { tone(220, 0, 0.18, "square", 0.05, 150); tone(165, 0.12, 0.22, "square", 0.045, 110); },
    shield: function () { [988, 1319, 1760].forEach(function (f, i) { tone(f, i * 0.06, 0.25, "sine", 0.07); }); },
    promo: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.3, "triangle", 0.12); }); tone(1319, 0.46, 0.55, "sine", 0.1); tone(1568, 0.46, 0.55, "sine", 0.06); },
    demote: function () { [523, 440, 349].forEach(function (f, i) { tone(f, i * 0.16, 0.3, "sawtooth", 0.045); }); tone(262, 0.5, 0.5, "sawtooth", 0.045, 196); },
    open: function () { tone(520, 0, 0.16, "sine", 0.06, 880); },
    end: function () { [659, 784, 988].forEach(function (f, i) { tone(f, i * 0.09, 0.2, "triangle", 0.09); }); },
    /* Rang max : la fanfare habituelle, prolongée d'un petit carillon scintillant (discret) */
    maxRank: function () {
      SFX.promo();
      [2093, 2637, 3136].forEach(function (f, i) { tone(f, 1.05 + i * 0.09, 0.9, "sine", 0.045); tone(f * 2, 1.05 + i * 0.09, 0.5, "sine", 0.012); });
      tone(1047, 1.3, 1.2, "sine", 0.04);
    },
    bossWin: function () { noiseBurst(0.35, 0.6, 0.18, "lowpass", 1800); noiseBurst(0.38, 0.35, 0.08, "highpass", 4000); tone(90, 0.35, 0.5, "sine", 0.14, 40); [659, 784, 988, 1319].forEach(function (f, i) { tone(f, 0.95 + i * 0.1, 0.3, "triangle", 0.1); }); },
    bossLose: function () { [220, 208, 196].forEach(function (f, i) { tone(f, i * 0.18, 0.2, "sawtooth", 0.05); }); tone(110, 0.6, 0.9, "sawtooth", 0.05, 55); noiseBurst(0.6, 0.4, 0.06, "lowpass", 600); },
    mail: function () { tone(700, 0, 0.25, "sine", 0.06, 1400); },
    toggle: function () { tone(660, 0, 0.08, "sine", 0.08); tone(990, 0.07, 0.12, "sine", 0.08); },
    /* Nouveaux sons, volontairement courts et doux */
    badge: function () { [1319, 1760, 2349].forEach(function (f, i) { tone(f, i * 0.07, 0.35, "sine", 0.05); }); tone(2637, 0.24, 0.5, "sine", 0.025); },
    /* Envol de cape : souffle grave et puissant, comme un départ en vol (variante E choisie par Rachel) */
    cape: function () { capeNoise(0, 0.8, "lowpass", 200, 1200, 250, 0.7, 0.6, 0, 0); tone(110, 0.1, 0.5, "sine", 0.05, 70); },
    /* Déblocage de Légende : les chaînes cliquettent, se brisent en éclats métalliques, puis la flamme repart */
    ignite: function () {
      var ac = audio(); if (!ac) return;
      function clank(start, base, vol) {
        var t = ac.currentTime + start;
        [[1, 1], [2.4, .6], [3.9, .45], [5.8, .3], [8.1, .18]].forEach(function (p) {
          var o = ac.createOscillator(), g = ac.createGain(), v = Math.max(0.0002, vol * p[1] * volume * 1.4), d = 0.35 / Math.sqrt(p[0]);
          o.type = "square"; o.frequency.value = base * p[0];
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
        });
        noiseBurst(start, 0.05, vol * 0.8, "highpass", 3500);
      }
      clank(0, 620, 0.03); clank(0.09, 700, 0.03);
      clank(0.3, 520, 0.05); noiseBurst(0.3, 0.35, 0.16, "highpass", 2500); noiseBurst(0.32, 0.25, 0.08, "bandpass", 1200);
      [0.42, 0.5, 0.57, 0.66, 0.78].forEach(function (d, k) { clank(d, 900 + k * 170, 0.018); });
      capeNoise(0.55, 0.6, "bandpass", 300, 1200, 2800, 0.8, 0.25, 0, 0);
      [1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.9 + i * 0.06, 0.5, "triangle", 0.035); });
    },
    /* Entrée dans un combat : coup de gong grave + annonceur « Round one… Fight ! » (voix de synthèse du navigateur, « Final round » au niveau 3) */
    /* Entrée dans un combat : « ROUND » (coup sourd) puis « FIGHT ! » (impact lourd), synchronisés avec l'annonce à l'écran.
       Si un fichier audio libre de droits est déposé dans sons/ (combat-1.mp3, combat-2.mp3, combat-3.mp3), il est joué à la place. */
    bossStart: function (lv) {
      var ac = audio(); if (!ac) return;
      function boom(start, f0, f1, len, v, type) {
        var t = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain();
        o.type = type || "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * volume * 1.6), t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + len + 0.05);
      }
      /* ROUND : coup de caisse grave + cloche métallique */
      boom(0, 150, 45, 0.7, 0.4); noiseBurst(0, 0.18, 0.16, "lowpass", 900);
      [[440, .06], [660, .04], [990, .025]].forEach(function (p) { tone(p[0] * (lv >= 3 ? 0.84 : 1), 0.02, 1.1, "sine", p[1]); });
      if (lv >= 3) { boom(0.35, 120, 40, 0.6, 0.35); }
    },
    bossStart3: function () { SFX.bossStart(3); },
    fightReal: function () { soundOn = true; playFight(1); },
    fightReal3: function () { soundOn = true; playFight(3); },
    /* Entrée au QG (intro) : souffle qui monte et accord lumineux */
    enter: function () {
      var ac = audio(); if (!ac) return;
      capeNoise(0, 0.9, "bandpass", 300, 2600, 900, 0.9, 0.35, 0, 0);
      var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.7);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * volume * 1.4, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.85);
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.55 + i * 0.05, 0.9, "triangle", 0.04); });
    },
    /* Remise à zéro : souffle qui s'éteint en descendant, puis petit carillon clair de « nouveau départ » */
    wipe: function () {
      var ac = audio(); if (!ac) return;
      noiseBurst(0, 0.7, 0.08, "lowpass", 1800);
      var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
      o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * volume * 1.4, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.7);
      [659, 880, 1319].forEach(function (f, i) { tone(f, 0.7 + i * 0.12, 0.5, "triangle", 0.04); });
    },
    /* Recomposition du QG : arpège montant qui se range, puis note claire de fin */
    rebuild: function () {
      var ac = audio(); if (!ac) return;
      [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.09, 0.22, "square", 0.025); });
      [1047, 1319, 1568].forEach(function (f) { tone(f, 0.7, 0.9, "triangle", 0.035); });
    },
    /* Plantage de Captain Reboot : glitchs numériques puis extinction qui descend en fréquence */
    shutdown: function () {
      var ac = audio(); if (!ac) return;
      [0, 0.07, 0.15, 0.2, 0.31].forEach(function (d, i) { tone(1800 - i * 260, d, 0.04, "square", 0.045); noiseBurst(d, 0.03, 0.06, "bandpass", 2500 - i * 300); });
      var t = ac.currentTime + 0.4, o = ac.createOscillator(), g = ac.createGain(); o.type = "sawtooth";
      o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(40, t + 1.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * volume * 1.4, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.3);
    },
    /* Redémarrage : bourdonnement qui monte, bips de diagnostic, accord de démarrage */
    boot: function () {
      var ac = audio(); if (!ac) return;
      var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle";
      o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.9);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * volume * 1.4, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.05);
      [1.0, 1.1, 1.2, 1.3].forEach(function (d, i) { tone([1319, 1568, 1319, 2093][i], d, 0.05, "square", 0.035); });
      [523, 784, 1047, 1568].forEach(function (f, i) { tone(f, 1.55 + i * 0.07, 0.8, "sine", 0.05); tone(f * 1.005, 1.55 + i * 0.07, 0.8, "triangle", 0.02); });
    },
    read: function () { tone(1046, 0, 0.06, "sine", 0.04); },
    vol: function () { tone(880, 0, 0.06, "sine", 0.08); }
  };

  /* Aura de combattant (étape 80) : grondement grave qui monte, souffle qui vibre (« vrrrr »), crépitements d'énergie.
     Son synthétisé, original, dans l'esprit des auras des héros de mangas. Renvoie une fonction pour l'arrêter (version « tant qu'on survole »). */
  function auraFx(o) {
    var ac = audio(); if (!ac || !soundOn) return function () { };
    var t = ac.currentTime + 0.01, dur = o.dur, V = Math.max(0.0002, volume * 1.4), nodes = [], master = ac.createGain();
    master.gain.setValueAtTime(1, t); master.connect(ac.destination);
    function env(g, peak, att, end) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak * V, t + att); g.gain.setValueAtTime(peak * V, t + Math.max(att, end - 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + end); }
    /* grondement : deux dents de scie désaccordées, filtrées en grave, qui montent */
    [[1, 0], [1.012, 7]].forEach(function (d) {
      var osc = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(o.f0 * d[0], t); osc.frequency.exponentialRampToValueAtTime(o.f1 * d[0], t + dur * 0.8); osc.detune.value = d[1];
      f.type = "lowpass"; f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(o.cut || 700, t + dur * 0.8); f.Q.value = 3;
      env(g, o.rumble, dur * 0.3, dur); osc.connect(f); f.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05); nodes.push(osc);
    });
    /* souffle de l'aura : bruit filtré qui balaie vers l'aigu, avec un tremblement rapide */
    var len = Math.floor(ac.sampleRate * (dur + 0.1)), buf = ac.createBuffer(1, len, ac.sampleRate), dd = buf.getChannelData(0);
    for (var i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    var src = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain(), trem = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 1.1; bp.frequency.setValueAtTime(o.n0 || 350, t); bp.frequency.exponentialRampToValueAtTime(o.n1 || 1800, t + dur * 0.85);
    env(ng, o.roar, dur * 0.35, dur); trem.gain.value = 0.65; lfo.type = "sine"; lfo.frequency.setValueAtTime(o.flut || 13, t); lfo.frequency.linearRampToValueAtTime((o.flut || 13) * 1.6, t + dur); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(trem.gain);
    src.connect(bp); bp.connect(ng); ng.connect(trem); trem.connect(master); src.start(t); src.stop(t + dur + 0.08); lfo.start(t); lfo.stop(t + dur + 0.08); nodes.push(src, lfo);
    /* crépitements d'énergie */
    for (var k = 0; k < (o.crackles || 6); k++) noiseBurst(0.15 + Math.random() * (dur - 0.3), 0.02 + Math.random() * 0.03, 0.03 + Math.random() * 0.04, "highpass", 3000 + Math.random() * 3000);
    /* explosion finale (variante « qui explose ») */
    if (o.burst) { capeNoise(dur - 0.05, 0.6, "lowpass", 1800, 500, 90, 0.8, 0.5, 0, 0); tone(70, dur - 0.05, 0.5, "sine", 0.09, 40); }
    return function () { try { var n = ac.currentTime; master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.exponentialRampToValueAtTime(0.0001, n + 0.25); nodes.forEach(function (x) { try { x.stop(n + 0.3); } catch (e) { } }); } catch (e) { } };
  }
  /* Variantes de son de cape à comparer (onglet Sons) */
  function capeNoise(start, dur, type, f0, f1, f2, q, peak, lfoF, lfoDepth) {
    var ac = audio(); if (!ac) return;
    var t = ac.currentTime + start, len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), v = Math.max(0.0002, peak * volume * 1.4);
    src.buffer = buf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lfoF) { var l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = lfoF; lg.gain.value = v * lfoDepth; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + dur); }
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + dur);
  }
  /* Voix de l'annonceur : on précharge les voix (elles arrivent en différé) et on choisit la plus grave des voix masculines anglaises */
  var ANN_VOICES = [/google uk english male/i, /microsoft (guy|davis|christopher|eric|roger|steffan|ryan|thomas|george|david|mark)/i, /daniel/i, /arthur/i, /(alex|fred|aaron|gordon|oliver|reed|rocko|grandpa)/i];
  function announcerVoice() {
    var sp = window.speechSynthesis; if (!sp) return null;
    var vs = (sp.getVoices() || []).filter(function (v) { return /^en/i.test(v.lang) && !/female|zira|hazel|susan|samantha|karen|moira|tessa|victoria|aria|jenny|libby|sonia|natasha/i.test(v.name); });
    for (var i = 0; i < ANN_VOICES.length; i++) { var m = vs.filter(function (v) { return ANN_VOICES[i].test(v.name); })[0]; if (m) return m; }
    return vs[0] || null;
  }
  try { if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); }; } } catch (e) { }
  function sfx(name, arg) { if (!soundOn) return; try { SFX[name](arg); } catch (e) { } }
  var I_SOUND_ON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var I_SOUND_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var I_GEAR = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13.4c.05-.46.1-.92.1-1.4s-.05-.94-.1-1.4l2-1.56a.48.48 0 0 0 .12-.6l-1.9-3.28a.48.48 0 0 0-.58-.21l-2.36.95a7.4 7.4 0 0 0-1.24-.72l-.36-2.5a.47.47 0 0 0-.47-.4h-3.8a.47.47 0 0 0-.47.4l-.36 2.5c-.45.18-.87.42-1.24.72l-2.36-.95a.48.48 0 0 0-.58.21L3.5 8.44a.48.48 0 0 0 .12.6l2 1.56c-.05.46-.1.93-.1 1.4s.05.94.1 1.4l-2 1.56a.48.48 0 0 0-.12.6l1.9 3.28c.13.22.39.31.58.21l2.36-.95c.37.3.79.54 1.24.72l.36 2.5c.04.24.24.4.47.4h3.8c.23 0 .43-.16.47-.4l.36-2.5c.45-.18.87-.42 1.24-.72l2.36.95c.2.1.45.01.58-.21l1.9-3.28a.48.48 0 0 0-.12-.6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  /* Menu Paramètres : mode nuit, son, langue regroupés (le bouton de fermeture du site reste hors du menu, à droite du profil) */
  function soundButton() {
    var pct = Math.round(volume * 100), light = theme === "light", unlocked8 = !!(P.secrets && P.secrets.konami);
    var row = '<div class="snd-row snd-sep">';
    return '<div class="snd' + (sndOpen ? " open" : "") + '"><button type="button" class="sound-toggle" data-sound-toggle aria-expanded="' + sndOpen + '" aria-haspopup="true" title="Paramètres"><span class="sr-only">Paramètres</span>' + I_GEAR + "</button>" +
      '<div class="snd-pop"' + (sndOpen ? "" : " hidden") + ' role="group" aria-label="Paramètres">' +
      '<div class="snd-row"><b>Mode nuit</b><button type="button" class="snd-switch' + (!light ? " on" : "") + '" data-stg-theme role="switch" aria-checked="' + !light + '"><span class="knob"></span><span class="sr-only">Activer le mode nuit</span></button></div>' +
      '<div class="snd-row"><b>Sons</b><button type="button" class="snd-switch' + (soundOn ? " on" : "") + '" data-snd-onoff role="switch" aria-checked="' + soundOn + '"><span class="knob"></span><span class="sr-only">Activer les sons</span></button></div>' +
      '<label class="snd-fader"><span class="snd-lbl">Volume <b data-vol-out>' + pct + ' %</b></span><span class="fader-wrap"><span class="fader-ticks" aria-hidden="true"></span><input type="range" class="fader" min="0" max="100" step="5" value="' + pct + '" data-snd-vol aria-label="Volume des sons"></span></label>' +
      row + '<b>Langue</b>' + (window.PU_langButton ? window.PU_langButton() : "") + "</div>" +
      '<div class="snd-row"><b title="Moins de calculs, moins de batterie">Animations légères</b><button type="button" class="snd-switch' + (liteOn() ? " on" : "") + '" data-lite-onoff role="switch" aria-checked="' + liteOn() + '"><span class="knob"></span><span class="sr-only">Activer les animations légères</span></button></div>' +
      '<div class="snd-row"><b title="Bonnet de Noël, fantôme d\'Halloween… sur les gardiens les jours de fête">Décorations de fête</b><button type="button" class="snd-switch' + (feteOn() ? " on" : "") + '" data-fete-onoff role="switch" aria-checked="' + feteOn() + '"><span class="knob"></span><span class="sr-only">Activer les décorations de fête</span></button></div>' +
      (unlocked8 ? '<div class="snd-row"><b title="La flèche en pixels des vieux jeux vidéo">Curseur rétro 8-bit</b><button type="button" class="snd-switch' + (retroCursorOn() ? " on" : "") + '" data-retro-cursor role="switch" aria-checked="' + retroCursorOn() + '"><span class="knob"></span><span class="sr-only">Activer le curseur rétro 8-bit</span></button></div>' +
        '<div class="snd-row"><b title="Tout le QG en pixels, comme au code des anciens">Thème visuel 8-bit</b><button type="button" class="snd-switch' + (retroThemeOn() ? " on" : "") + '" data-retro-theme role="switch" aria-checked="' + retroThemeOn() + '"><span class="knob"></span><span class="sr-only">Activer le thème visuel 8-bit</span></button></div>' : "") +
      row + '<small class="muted">Des sons courts et discrets, jamais de musique.</small></div></div></div>';
  }
  /* Sobriété (étape 76) : animations légères (boucles arrêtées), réglage mémorisé ; activé d'office si l'appareil demande moins d'animations */
  var LITE_KEY = "powerup365.lite";
  function liteOn() { var v = null; try { v = localStorage.getItem(LITE_KEY); } catch (e) { } if (v === "on") return true; if (v === "off") return false; return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function applyLite() { document.documentElement.classList.toggle("lite", liteOn()); }
  applyLite();
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lite-onoff]"); if (!b) return; var on = !liteOn(); try { localStorage.setItem(LITE_KEY, on ? "on" : "off"); } catch (err) { } applyLite(); b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); sfx("toggle"); });
  /* Étape 83 : aperçus du style de la page d'accueil — test réservé à Maintenance, n'affecte que le QG
     "défaut" (BD, tel quel) · "équilibré" (même énergie, moins criard) · "pro" (sobre, pour montrer le projet) */
  var HOME_STYLE_KEY = "powerup365.homestyle";
  var HOME_STYLES = [["defaut", "Original (test)"], ["equilibre", "Équilibré"], ["pro", "Pro (test)"]];
  function homeStyleOn() { var v = "equilibre"; try { v = localStorage.getItem(HOME_STYLE_KEY) || "equilibre"; } catch (e) { } return HOME_STYLES.some(function (s) { return s[0] === v; }) ? v : "equilibre"; }
  function applyHomeStyle() { var v = homeStyleOn(), root = document.documentElement; root.classList.toggle("theme-soft", v === "equilibre"); root.classList.toggle("theme-pro", v === "pro"); }
  try { applyHomeStyle(); } catch (e) { }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-home-style]"); if (!b) return;
    var v = b.getAttribute("data-home-style"); try { localStorage.setItem(HOME_STYLE_KEY, v); } catch (err) { }
    applyHomeStyle(); sfx("toggle");
    document.querySelectorAll("[data-home-style]").forEach(function (x) { x.classList.toggle("btn-primary", x.getAttribute("data-home-style") === v); x.classList.toggle("btn-ghost", x.getAttribute("data-home-style") !== v); });
  });
  /* onglet caché : toutes les animations en pause et le bourdonnement coupé */
  document.addEventListener("visibilitychange", function () { var h = document.hidden; document.documentElement.classList.toggle("tab-hidden", h); try { if (h) humStop(); else if (document.querySelector(".intro")) humStart(); } catch (e) { } });
  function refreshSound() { document.querySelectorAll(".snd").forEach(function (x) { x.outerHTML = soundButton(); }); }
  document.addEventListener("input", function (e) {
    var r = e.target.closest && e.target.closest("[data-snd-vol]"); if (!r) return;
    volume = (+r.value) / 100; try { localStorage.setItem(VOL_KEY, String(volume)); } catch (err) { }
    var out = document.querySelector("[data-vol-out]"); if (out) out.textContent = r.value + " %";
    r.style.setProperty("--v", r.value + "%");
    if (!soundOn && volume > 0) { soundOn = true; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } var sw = document.querySelector("[data-snd-onoff]"); if (sw) { sw.classList.add("on"); sw.setAttribute("aria-checked", "true"); } }
  });
  document.addEventListener("change", function (e) { if (e.target.closest && e.target.closest("[data-snd-vol]")) { if (volume === 0) { soundOn = false; try { localStorage.setItem(SOUND_KEY, "off"); } catch (err) { } refreshSound(); var nr = document.querySelector("[data-snd-vol]"); if (nr) nr.focus(); } else { SFX.vol(); var btn = document.querySelector(".sound-toggle"); if (btn) btn.innerHTML = '<span class="sr-only">Réglages du son</span>' + I_SOUND_ON; } } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sndOpen) { sndOpen = false; refreshSound(); var b = document.querySelector("[data-sound-toggle]"); if (b) b.focus(); } });
  document.addEventListener("click", function (e) {
    if (sndOpen && !(e.target.closest && e.target.closest(".snd"))) { sndOpen = false; refreshSound(); }
    var sw = e.target.closest && e.target.closest("[data-snd-onoff]");
    if (sw) {
      soundOn = !soundOn; if (soundOn && volume === 0) volume = 0.5;
      try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); localStorage.setItem(VOL_KEY, String(volume)); } catch (err) { }
      refreshSound(); var ns = document.querySelector("[data-snd-onoff]"); if (ns) ns.focus();
      if (soundOn) SFX.toggle();
      announce(soundOn ? "Sons activés" : "Sons coupés");
    }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-sound-toggle]"); if (!b) return;
    sndOpen = !sndOpen; refreshSound();
    var nb = document.querySelector(sndOpen ? "[data-snd-onoff]" : "[data-sound-toggle]"); if (nb) nb.focus();
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-stg-theme]"); if (!b) return;
    theme = theme === "light" ? "dark" : "light"; try { localStorage.setItem(THEME_KEY, theme); } catch (err) { }
    applyTheme(); var on = theme !== "light"; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on));
    sfx("tab"); announce(theme === "light" ? "Mode clair activé" : "Mode sombre activé");
  });
  /* ---------- Mode clair / sombre (mémorisé ; sombre par défaut) ---------- */
  var THEME_KEY = "powerup365.theme", theme = "dark";
  try { theme = localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch (e) { }
  function applyTheme() { document.documentElement.setAttribute("data-theme", theme); var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", theme === "light" ? "#F2F4F9" : "#0B0E13"); }
  applyTheme();
  var I_SUN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var I_MOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
  function themeButton() {
    var light = theme === "light";
    return '<button type="button" class="theme-toggle" data-theme-toggle aria-pressed="' + light + '" title="' + (light ? "Passer en mode sombre" : "Passer en mode clair") + '"><span class="sr-only">Mode clair</span>' + (light ? I_SUN : I_MOON) + "</button>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]"); if (!b) return;
    theme = theme === "light" ? "dark" : "light"; try { localStorage.setItem(THEME_KEY, theme); } catch (err) { }
    applyTheme(); document.querySelectorAll("[data-theme-toggle]").forEach(function (x) { x.outerHTML = themeButton(); });
    var nb = document.querySelector("[data-theme-toggle]"); if (nb) nb.focus();
    sfx("tab"); announce(theme === "light" ? "Mode clair activé" : "Mode sombre activé");
  });
  function announce(msg) {
    var live = document.getElementById("sr-live");
    if (!live) { live = document.createElement("div"); live.id = "sr-live"; live.className = "sr-only"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
    live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 30);
  }

  /* =========================================================
     SECRETS DU QG (easter eggs) : collection visible dans le profil
     ========================================================= */
  var HERO_BIRTHDAYS = { patch: "09-09", calcula: "09-30", uptime: "01-01", proxy: "03-12", nimbus: "08-01" }; /* héros dont on connaît le jour exact, sourcé (les autres n'ont qu'une année) */
  var SECRETS = [
    { id: "reboot", title: "Le redémarrage forcé", done: "7 clics sur Captain Reboot, comme les 7 appuis qui débloquent le mode développeur d'un téléphone Android : il a planté… puis redémarré tout le QG.", hint: "Captain Reboot n'aime pas qu'on insiste trop sur lui. Sur l'accueil, clique vite sur lui, 7 fois d'affilée, comme pour débloquer un mode secret…" },
    { id: "konami", title: "Le code des anciens", done: "Haut, haut, bas, bas, gauche, droite, gauche, droite, B, A : le QG est passé en 8-bit.", hint: "Les vieux joueurs connaissent un code secret. Au clavier, flèches comprises…" },
    { id: "terminal", title: "Appel en ligne de commande", done: "Tu as appelé Sudo et Miss Ping par leur commande, et ils t'ont répondu tous les deux.", hint: "Deux gardiens portent le nom d'une commande. Tape leurs deux noms au clavier (ou dans le champ pseudo sur mobile)." },
    { id: "password", title: "Le pire mot de passe", done: "Tu as tapé un des mots de passe les plus utilisés au monde : Phishbuster a déclenché l'alarme.", hint: "Phishbuster monte la garde. Tape au clavier (ou dans le champ pseudo) un des pires mots de passe du monde…" },
    { id: "sobre", title: "Lumières éteintes", done: "Green Byte a passé le QG en mode sobriété : moins de couleurs, moins d'animations, moins d'énergie.", hint: "Tout en bas de la page, une petite feuille fait pousser les économies d'énergie. Clique-la trois fois de suite." },
    { id: "birthday", title: "Joyeux anniversaire !", done: "Tu as souhaité son anniversaire à un gardien le bon jour.", hint: "Certains gardiens ont aussi une date d'anniversaire précise (les autres, on ne connaît que leur année). Consulte leurs fiches… et reviens le bon jour." },
    { id: "rmrf", title: "Permission refusée", done: "Tu as tenté la pire commande de Linux, rm -rf /. Sudo a refusé, et le QG l'a échappé belle.", hint: "Sudo connaît une commande que personne ne devrait jamais lancer en root… Tape-la au clavier (ou dans le champ pseudo). Attention aux espaces !" },
    { id: "bsod", title: "L'écran bleu", done: "Tu as déclenché le célèbre écran bleu de la mort, version QG.", hint: "Chaque utilisateur de Windows l'a déjà croisé. Son sigle fait quatre lettres : tape-le au clavier." },
    { id: "e404", title: "Gardien introuvable", done: "Tu as visité une adresse qui n'existe pas dans le QG : Uptime a cherché, sans succès.", hint: "Uptime surveille chaque porte du QG, même celles qui n'existent pas. Va frapper là où il n'y a rien à ouvrir…" },
    { id: "arpanet", title: "Le premier message d'Internet", done: "Tu as tapé ARPANET, le nom du réseau qui a transporté le tout premier message d'Internet (seules les 2 premières lettres, « LO », sont arrivées le 29 octobre 1969), puis cassé trois chiffres de César par déduction.", hint: "Le 29 octobre 1969, le tout premier message envoyé d'un ordinateur à un autre est tombé en panne après deux lettres : « LO ». Tape le nom du réseau qui le transportait, l'ancêtre militaire d'Internet. Son nom commence par celui de l'agence américaine qui l'a financé et se termine par « net »." }
  ];
  var SECRET_IC = {
    reboot: '<path d="M12 3v8"/><path d="M6.300 6.300a8 8 0 1 0 11.400 0"/>',
    konami: '<rect x="3" y="8" width="18" height="10" rx="4"/><path d="M8 11v4M6 13h4"/><circle cx="15" cy="12" r=".8"/><circle cx="17.500" cy="14" r=".8"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 10l3 2-3 2M12 15h5"/>',
    password: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    sobre: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6 9-8"/>',
    birthday: '<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M12 12V8M12 5c.8 1 .8 2 0 2s-.8-1 0-2"/>',
    rmrf: '<circle cx="12" cy="12" r="9"/><path d="M5.600 5.600l12.800 12.800"/>',
    bsod: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M9 9v1M15 9v1M9.500 14c1-1 4-1 5 0"/>',
    e404: '<circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500L21 21M8.500 9a2 2 0 1 1 3 1.700c-.7.400-1 .8-1 1.500"/>',
    arpanet: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6 8l5 8M18 8l-5 8"/>'
  };
  function secretIcon(id) { var d = SECRET_IC[id]; return d ? '<svg class="ic secret-svg" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>" : "★"; }
  function secretsFound() { return SECRETS.filter(function (x) { return P.secrets && P.secrets[x.id]; }).length; }
  function todayMD() { var d = new Date(); return ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function birthdayHero() { var md = todayMD(), id = null; Object.keys(HERO_BIRTHDAYS).forEach(function (k) { if (HERO_BIRTHDAYS[k] === md) id = k; }); return id; }
  function nextBirthday() {
    var now = new Date(), best = null;
    Object.keys(HERO_BIRTHDAYS).forEach(function (k) { var p = HERO_BIRTHDAYS[k].split("-"), d = new Date(now.getFullYear(), +p[0] - 1, +p[1]); if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1); if (!best || d < best.d) best = { id: k, d: d }; });
    return best;
  }
  function nextSecretHint() { var left = SECRETS.filter(function (x) { return !(P.secrets && P.secrets[x.id]); }); return left.length ? left[Math.floor(Math.random() * left.length)].hint : ""; }
  function unlockSecret(id) {
    P.secrets = P.secrets || {}; if (P.secrets[id]) return false;
    var sc = SECRETS.filter(function (x) { return x.id === id; })[0]; if (!sc) return false;
    P.secrets[id] = new Date().toISOString().slice(0, 10); var before = rankIndex(P.xp); P.xp += 20; saveProfile();
    var n = secretsFound(), toast = document.createElement("div"); toast.className = "rb-toast"; toast.setAttribute("role", "status");
    toast.innerHTML = '<span class="ico">★</span><span><b>' + (n === SECRETS.length ? "Dernier secret trouvé !" : "Secret débloqué") + "</b>" + esc(sc.title) + " · +20 XP" + (id === "konami" ? " · Curseur et thème 8-bit débloqués dans ⚙️ Paramètres" : "") + (n === SECRETS.length ? " · Tu as découvert tous les secrets du QG, bravo !" : "") + "</span>";
    document.body.appendChild(toast); setTimeout(function () { toast.remove(); }, 4700);
    sfx("shield"); setTimeout(render, 50);
    var after = rankIndex(P.xp); if (after > before) setTimeout(function () { rankCeremony(true, after); }, 1500);
    return true;
  }
  /* =========================================================
     CALENDRIER DU QG : événements et jours spéciaux (Halloween, Noël, Patch Tuesday…)
     Chaque jour spécial : bandeau sur l'accueil, pluie d'emojis, message d'un gardien, +10 XP la première fois
     ========================================================= */
  function easterDate(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  function easterNear(d) { var e = easterDate(d.getFullYear()), t = new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff = Math.round((t - e) / 86400000); return diff >= -1 && diff <= 1; }
  var EVENTS = [
    { id: "arpanet", emoji: "📡", hero: "echo", fx: ["L", "O", "📡", "▒"], title: "Premier message d'Internet", banner: "29 octobre 1969 : le premier message d'Internet plante après deux lettres.", say: "Le 29 octobre 1969, le premier message envoyé sur ARPANET devait dire LOGIN. Seul « LO » est arrivé avant la panne ! Et si tu retrouvais le nom du réseau qui l'a transporté ? Tape-le au clavier…", done: "Tu es venu·e au QG pour l'anniversaire du premier message d'Internet.", win: function (d, m, day, wd, hr) { return m===10&&day===29; } },
    { id: "halloween", emoji: "🎃", hero: "volt", fx: ["🎃", "👻", "🦇", "🕸️"], title: "Halloween", banner: "Halloween au QG : Captain Reboot s'est déguisé en fantôme.", say: "Bouh ! Cette nuit, les seuls fantômes du QG sont les mails de phishing. Ne clique sur aucun lien suspect !", done: "Tu es venu·e au QG pour Halloween.", win: function (d, m, day, wd, hr) { return m===10&&day>=25; } },
    { id: "noel", emoji: "🎄", hero: "nimbus", fx: ["❄️", "🎄", "⭐", "🎁"], title: "Noël", banner: "Noël au QG : Docteur Backup a sauvegardé la liste du Père Noël.", say: "Joyeux Noël ! J'ai sauvegardé la liste du Père Noël, avec une copie hors site. Règle 3-2-1 : même les lutins la respectent.", done: "Tu es venu·e au QG pour Noël.", win: function (d, m, day, wd, hr) { return m===12&&day>=20&&day<=26; } },
    { id: "nouvelan", emoji: "🎆", hero: "uptime", fx: ["🎆", "🎉", "✨", "🥂"], title: "Nouvel An", banner: "Nouvel An au QG : Uptime fête 365 jours de disponibilité.", say: "Bonne année ! 365 jours à 99,99 % de disponibilité. Cette année, je vise le 100 %… et toi, ton prochain grade.", done: "Tu es venu·e au QG pour le Nouvel An.", win: function (d, m, day, wd, hr) { return (m===12&&day===31)||(m===1&&day<=2); } },
    { id: "valentin", emoji: "💘", hero: "echo", fx: ["💘", "💖", "💌", "💕"], title: "Saint-Valentin", banner: "Saint-Valentin au QG : Miss Ping t'envoie un petit message.", say: "PING ! Réponse : <3 Temps = 1 battement de cœur. Joyeuse Saint-Valentin, et n'oublie pas de répondre à tes mails.", done: "Tu es venu·e au QG pour la Saint-Valentin.", win: function (d, m, day, wd, hr) { return m===2&&day>=12&&day<=14; } },
    { id: "poisson", emoji: "🐟", hero: "volt", fx: ["🐟", "🐠", "🎣"], title: "Poisson d'avril", banner: "Poisson d'avril : rien n'est truqué ici… à part ce poisson.", say: "Poisson d'avril ! Ce n'était pas du phishing, juste un poisson. D'ailleurs, vérifie toujours l'expéditeur : en vrai, personne ne rigole avec ça.", done: "Tu es venu·e au QG pour le 1er avril.", win: function (d, m, day, wd, hr) { return m===4&&day===1; } },
    { id: "paques", emoji: "🥚", hero: "sylva", fx: ["🥚", "🐣", "🐰", "🌷"], title: "Pâques", banner: "Pâques au QG : Green Byte a caché des œufs, sans gaspillage.", say: "Joyeuses Pâques ! J'ai caché des œufs dans tout le QG, mais sans emballage ni vidéo : 100 % sobre. Cherche aussi les secrets…", done: "Tu es venu·e au QG pour Pâques.", win: function (d, m, day, wd, hr) { return easterNear(d); } },
    { id: "pi", emoji: "🥧", hero: "calcula", fx: ["🥧", "π", "3,14"], title: "Jour de Pi", banner: "Jour de Pi : Excelsa calcule avec une précision infinie.", say: "=PI() renvoie 3,14159265358979. Dans Excel comme dans la vie, la précision, c'est important. Bon jour de Pi !", done: "Tu es venu·e au QG le jour de Pi.", win: function (d, m, day, wd, hr) { return m===3&&day===14; } },
    { id: "backup", emoji: "💾", hero: "nimbus", fx: ["💾", "☁️", "🛟"], title: "Journée de la sauvegarde", banner: "Journée mondiale de la sauvegarde : Docteur Backup a une question pour toi.", say: "Journée mondiale de la sauvegarde ! Question : quand as-tu sauvegardé tes fichiers pour la dernière fois ? Règle 3-2-1 : 3 copies, 2 supports, 1 hors site.", done: "Tu es venu·e au QG pour la Journée de la sauvegarde.", win: function (d, m, day, wd, hr) { return m===3&&day===31; } },
    { id: "patch", emoji: "🩹", hero: "patch", fx: ["🩹", "🛠️", "🔧"], title: "Patch Tuesday", banner: "C'est le Patch Tuesday : Hotfix passe les mises à jour en revue.", say: "C'est le Patch Tuesday : Microsoft publie ses mises à jour de sécurité le deuxième mardi du mois. Pense à les installer… après un redémarrage !", done: "Tu es venu·e au QG un jour de Patch Tuesday.", win: function (d, m, day, wd, hr) { return wd===2&&day>=8&&day<=14; } },
    { id: "motdepasse", emoji: "🔑", hero: "sentinelle", fx: ["🔑", "🔒", "🛡️"], title: "Journée du mot de passe", banner: "Journée mondiale du mot de passe : Phishbuster fait le ménage.", say: "Journée mondiale du mot de passe ! Aujourd'hui, change un mot de passe faible, utilise une phrase de passe longue et active la double authentification.", done: "Tu es venu·e au QG pour la Journée du mot de passe.", win: function (d, m, day, wd, hr) { return m===5&&wd===4&&day<=7; } },
    { id: "may4", emoji: "⚔️", hero: "sudo", fx: ["⭐", "✨", "🌌"], title: "Star Wars Day", banner: "4 mai : que le root soit avec toi.", say: "Que le root soit avec toi ! (Mais n'utilise pas sudo à la légère : un grand pouvoir implique de grandes responsabilités.)", done: "Tu es venu·e au QG le 4 mai.", win: function (d, m, day, wd, hr) { return m===5&&day===4; } },
    { id: "musique", emoji: "🎵", hero: "echo", fx: ["🎵", "🎶", "🎧"], title: "Fête de la musique", banner: "Fête de la musique : Miss Ping met le son (réglable dans ⚙️).", say: "C'est la Fête de la musique ! Ma playlist du jour : le bruit du ping qui répond. Baisse le volume si ton open space dort.", done: "Tu es venu·e au QG pour la Fête de la musique.", win: function (d, m, day, wd, hr) { return m===6&&day===21; } },
    { id: "quatorze", emoji: "🎇", hero: "ignis", fx: ["🎇", "🎆", "🇫🇷"], title: "14 juillet", banner: "14 juillet : Lady Firewall autorise exceptionnellement les feux d'artifice.", say: "Feu d'artifice autorisé ! Aujourd'hui, une exception à mes règles : tout le reste du trafic suspect reste bloqué.", done: "Tu es venu·e au QG un 14 juillet.", win: function (d, m, day, wd, hr) { return m===7&&day===14; } },
    { id: "vendredi13", emoji: "🐈‍⬛", hero: "uptime", fx: ["🐈‍⬛", "🍀", "🪞"], title: "Vendredi 13", banner: "Vendredi 13 : Uptime croise les doigts.", say: "Vendredi 13 : superstition ! Les vraies pannes n'ont pas besoin de date, mais ne déploie rien en production un vendredi.", done: "Tu es venu·e au QG un vendredi 13.", win: function (d, m, day, wd, hr) { return wd===5&&day===13; } },
    { id: "nuit", emoji: "🌙", hero: "uptime", fx: ["🌙", "⭐", "🦉"], title: "Nuit blanche", banner: "Il est tard : les admins ne dorment jamais.", say: "Il est entre 2 h et 5 h du matin et tu révises sur Power Up ? Les admins ne dorment jamais… mais ils boivent de l'eau, eux. Va dormir !", done: "Tu es venu·e au QG en pleine nuit.", win: function (d, m, day, wd, hr) { return hr>=2&&hr<5; } },
    { id: "cybermois", emoji: "🛡️", hero: "sentinelle", fx: ["🛡️", "🔒"], title: "Mois de la cybersécurité", banner: "Octobre, c'est le mois européen de la cybersécurité.", say: "Octobre est le mois européen de la cybersécurité ! Un bon réflexe ce mois-ci : active la double authentification partout où c'est possible.", done: "Tu es venu·e au QG pendant le mois de la cybersécurité.", win: function (d, m, day, wd, hr) { return m===10; } }
  ];
  /* Pour en savoir plus : un lien par événement quand il existe une bonne source (ouvert dans un nouvel onglet) */
  var EVENT_LINKS = {
    halloween: "https://fr.wikipedia.org/wiki/Halloween", noel: "https://fr.wikipedia.org/wiki/No%C3%ABl", nouvelan: "https://fr.wikipedia.org/wiki/Nouvel_An",
    valentin: "https://fr.wikipedia.org/wiki/Saint-Valentin", poisson: "https://fr.wikipedia.org/wiki/Poisson_d%27avril", paques: "https://fr.wikipedia.org/wiki/P%C3%A2ques",
    pi: "https://fr.wikipedia.org/wiki/Pi", backup: "https://www.worldbackupday.com", patch: "https://msrc.microsoft.com/update-guide",
    motdepasse: "https://www.cnil.fr/fr/generer-un-mot-de-passe-solide", musique: "https://fr.wikipedia.org/wiki/F%C3%AAte_de_la_musique",
    quatorze: "https://fr.wikipedia.org/wiki/F%C3%AAte_nationale_fran%C3%A7aise",
    arpanet: "https://fr.wikipedia.org/wiki/ARPANET",
    cybermois: "https://www.enisa.europa.eu/topics/cyber-hygiene/european-cybersecurity-month"
  };
  function eventsOn(d) { var m = d.getMonth() + 1, day = d.getDate(), wd = d.getDay(), hr = d.getHours(); return EVENTS.filter(function (x) { return x.win(d, m, day, wd, hr); }); }
  function eventsFound() { return EVENTS.filter(function (x) { return P.events && P.events[x.id]; }).length; }
  /* Aperçu en local seulement : index.html?evt=noel force un événement (jamais sur le site public) */
  function urlForced() { if (!DEV_PAGES) return null; var m = /[?&]evt=([a-z0-9]+)/.exec(location.search || ""); return m ? EVENTS.filter(function (x) { return x.id === m[1]; })[0] || null : null; }
  /* Test de thème de fête (onglet Maintenance, jamais sur le site public) : mémorisé pour l'onglet en cours seulement */
  var EVTEST_KEY = "powerup365.evtest";
  function testEvt() { if (!DEV_PAGES) return null; var id = null; try { id = sessionStorage.getItem(EVTEST_KEY); } catch (e) { } return id ? EVENTS.filter(function (x) { return x.id === id; })[0] || null : null; }
  function forcedEvent() { return urlForced() || testEvt(); }
  function todayEvents() { var f = forcedEvent(); return f ? [f] : eventsOn(new Date()); }
  /* Décorations de fête : déguisement du gardien du jour (et de Captain Reboot pour les accessoires de tête) + décor dans les coins.
     Réglage « Décorations de fête » dans ⚙️ Paramètres (activé par défaut, mémorisé). Priorité en cas de jours qui se chevauchent. */
  var FETE_KEY = "powerup365.fete";
  var COSTUME_ORDER = ["halloween", "noel", "nouvelan", "valentin", "paques", "poisson", "may4", "quatorze", "vendredi13", "musique", "patch", "motdepasse", "backup", "pi", "arpanet", "nuit", "cybermois"];
  function feteOn() { var v = null; try { v = localStorage.getItem(FETE_KEY); } catch (e) { } return v !== "off"; }
  /* Déco marquée du QG (grandes fêtes seulement) : guirlande en haut + grand motif sur le côté gauche */
  var QG_DECO = {
    noel: { cols: ["#E5412D", "#3DBE6B", "#FFC83D", "#4C9BFF"], side: "🎄", wire: "#2F7A45", santa: true },
    halloween: { cols: ["#FF8A1F", "#9B5DE5", "#7CD957"], side: "🎃", wire: "#3a2a4a", corner: "🕸️" },
    valentin: { cols: ["#FF5C8A", "#FF8FB0", "#E8456F"], side: "💘", wire: "#7a2a44", heart: true },
    paques: { cols: ["#F5A3C0", "#7ED6A5", "#FFD66B", "#9CC8FF"], side: "🌷", wire: "#6a8a5a", bunny: "🐰" },
    nouvelan: { cols: ["#F5C451", "#E8ECF4", "#B98CFF", "#5FE1FF", "#FF6FAE"], side: "🥂", wire: "#8a7a3a", fw: true }
  };
  /* Scène du Père Noël : mains, tête, marche jusqu'au sapin, cadeau, retour (les jambes ne bougent que pendant la marche) */
  var santaToken = 0, santaBusy = false;
  function santaScene(auto) {
    var S = document.querySelector(".qgd-santa"), G = document.querySelector(".qgd-gift"), V = document.querySelector(".qgd-sv"), T = document.querySelector(".qgd-side");
    if (!S || !G || !V || !T) return;
    if (santaBusy && !auto) return;
    var tok = ++santaToken, root = document.documentElement; santaBusy = true;
    var alive = function () { return tok === santaToken && document.body.contains(S); };
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var move = function (x, flip, sec, ease, rise) { S.style.transition = (sec ? "transform " + sec + "s " + (ease || "linear") : "transform 0s") + ", translate " + (rise ? rise : 0) + "s ease-in-out, clip-path .7s ease"; S.style.transform = "translateX(" + x + "px) scaleX(" + (flip ? -1 : 1) + ")"; };
    var calm = function () { return root.classList.contains("lite") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || getComputedStyle(S).display === "none"; };
    (async function () {
      if (auto) await wait(2500);
      if (!alive()) return;
      if (calm() || document.hidden) { G.classList.add("on"); santaBusy = false; return; }
      var tr = T.getBoundingClientRect(), target = tr.left + tr.width * 0.08;
      var nGift = 1; try { nGift = Math.min(5, rankIndex(P.xp) + 1); } catch (e) { }
      G.classList.remove("on"); G.innerHTML = Array.apply(null, Array(nGift)).map(function (z, k) { return '<i style="--k:' + k + ";--h:" + [0, 130, 200, 290, 60][k % 5] + "deg;--r:" + [-6, 8, -10, 5, -4][k % 5] + 'deg">🎁</i>'; }).join("");
      S.style.translate = "0 0px"; move(-130, false, 0); V.classList.remove("walking", "running", "crouch", "peek"); S.classList.remove("peekclip");
      await wait(900); if (!alive()) return;
      await wait(600); if (!alive()) return;
      V.classList.add("walking"); move(target, false, 14); await wait(14000); if (!alive()) return;
      V.classList.remove("walking"); V.classList.add("crouch"); await wait(1000); if (!alive()) return;
      G.style.left = (target + 84) + "px"; G.classList.add("on"); await wait(2300 + nGift * 650); if (!alive()) return;
      move(target, true, 0); V.classList.remove("crouch"); await wait(450); V.classList.add("walking", "running"); move(-130, true, 2.3, "ease-in"); await wait(2400); V.classList.remove("walking", "running");
      if (alive()) { santaBusy = false; try { sessionStorage.setItem("powerup365.santa", "1"); } catch (e) { } }
    })();
  }
  /* Clic sur le sapin : la guirlande et les lumières clignotent, et le Père Noël revient (comme Cupidon) */
  var xmasBlinkT = 0;
  function xmasBlink() {
    var g = document.querySelector(".qgd-garland"), tr = document.querySelector(".qgd-side.tree"); if (!g) return;
    g.classList.add("blink"); if (tr) tr.classList.add("blink"); sfx("badge");
    clearTimeout(xmasBlinkT); xmasBlinkT = setTimeout(function () { g.classList.remove("blink"); if (tr) tr.classList.remove("blink"); }, 3600);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-santa]")) { xmasBlink(); santaScene(false); } });
  /* Nouvel an : compte à rebours jusqu'à minuit (le 31 décembre), puis message « Bonne année » */
  var nyTimer = 0;
  function nyCountdown() {
    clearInterval(nyTimer);
    var el = document.getElementById("qgd-count"); if (!el) return;
    var tick = function () {
      if (!document.body.contains(el)) { clearInterval(nyTimer); return; }
      if (document.hidden) return;
      var now = new Date(), y = now.getFullYear(), isNewYearDay = now.getMonth() === 0, target = new Date(isNewYearDay ? y : y + 1, 0, 1, 0, 0, 0), left = target - now;
      if (isNewYearDay && !forcedEvent()) { el.innerHTML = "🎆 Bonne année " + y + " !"; el.className = "qgd-count party"; return; }
      var s = Math.max(0, Math.floor(left / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60, p = function (n) { return (n < 10 ? "0" : "") + n; };
      el.className = "qgd-count";
      el.innerHTML = "🥂 Bonne année dans <b>" + (d ? d + " j " : "") + p(h) + ":" + p(m) + ":" + p(sec) + "</b>";
    };
    tick(); nyTimer = setInterval(tick, 1000);
  }
  /* Sapin de Noël dessiné (plus réaliste que l'emoji) : étages de branches, guirlande, lumières et boules discrètes */
  function xmasTree() {
    var tiers = [[14, 46, 21], [32, 70, 29], [54, 96, 37], [78, 122, 44], [102, 138, 49]], o = "", i, k, seed = 11, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    o += '<defs><linearGradient id="xtg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2C7A45"/><stop offset=".55" stop-color="#17542F"/><stop offset="1" stop-color="#0C3320"/></linearGradient></defs>';
    o += '<rect x="45" y="132" width="10" height="17" rx="1.5" fill="#4A2F1B"/><rect x="45" y="132" width="3.5" height="17" fill="#6B4528"/>';
    for (i = tiers.length - 1; i >= 0; i--) {
      var y0 = tiers[i][0], y1 = tiers[i][1], w = tiers[i][2], n = 7, r = "M50 " + y0, l = "", j, tt, x, y;
      for (j = 1; j <= n; j++) { tt = j / n; x = 50 + w * tt + (j % 2 ? 2.6 : 0); y = y0 + (y1 - y0) * tt - (j % 2 ? 0 : 3.5); r += " L" + x.toFixed(1) + " " + y.toFixed(1); l = " L" + (100 - x).toFixed(1) + " " + y.toFixed(1) + l; }
      r += " Q50 " + (y1 + 5) + " " + (50 - w - 2.6).toFixed(1) + " " + (y1 - 0).toFixed(1) + l.replace(/^ L[^L]*/, "") + " Z";
      o += '<path d="' + r + '" fill="url(#xtg)"/><path d="M' + (50 - w * .7).toFixed(1) + " " + (y1 - 2) + " Q50 " + (y1 + 4) + " " + (50 + w * .7).toFixed(1) + " " + (y1 - 2) + '" fill="none" stroke="#06241A" stroke-opacity=".55" stroke-width="3"/>';
      for (k = 0; k < 6; k++) { var bx = 50 + (rnd() - .5) * w * 1.5, by = y0 + (y1 - y0) * (.35 + rnd() * .6); o += '<path d="M' + bx.toFixed(1) + " " + by.toFixed(1) + " l" + ((rnd() - .5) * 9).toFixed(1) + " 4" + '" stroke="#3E9159" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>'; }
      o += '<path d="M' + (50 - w * .85).toFixed(1) + " " + (y1 - 6) + " Q50 " + (y1 + 8) + " " + (50 + w * .85).toFixed(1) + " " + (y1 - 6) + '" fill="none" stroke="#E2B94E" stroke-width="1.3" stroke-dasharray="1.6 2.2" opacity=".9"/>';
      for (k = 0; k < 5; k++) { var lx = 50 + (rnd() - .5) * w * 1.6, ly = y0 + (y1 - y0) * (.4 + rnd() * .55); o += '<circle class="xl" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="1.4" fill="#FFE39A" style="animation-delay:-' + (rnd() * 3).toFixed(1) + 's"/>'; }
    }
    o += '<circle cx="39" cy="86" r="2.4" fill="#B3262B"/><circle cx="62" cy="106" r="2.4" fill="#D9A21F"/><circle cx="45" cy="124" r="2.4" fill="#B3262B"/><circle cx="58" cy="64" r="2.2" fill="#D9A21F"/><circle cx="52" cy="40" r="2" fill="#B3262B"/>';
    o += '<path d="M50 3 L52.2 9.4 L59 9.6 L53.6 13.6 L55.6 20 L50 16 L44.4 20 L46.4 13.6 L41 9.6 L47.8 9.4 Z" fill="#F0C75A" stroke="#B88A1E" stroke-width=".8"/>';
    return '<svg class="xt" viewBox="0 0 100 150" aria-hidden="true">' + o + "</svg>";
  }
  /* Du 1er au 30 décembre : petite pastille « Bonne année dans N jours » (texte seul, sans animation) */
  function placeNyPill() {
    var old = document.getElementById("qgd-pill"); if (old) old.remove();
    if (!V || V.nav !== "qg" || !feteOn()) return;
    var now = new Date(); if (now.getMonth() !== 11 || now.getDate() > 30) return;
    var left = Math.ceil((new Date(now.getFullYear() + 1, 0, 1) - now) / 86400000);
    document.body.insertAdjacentHTML("beforeend", '<span class="qgd-count qgd-pill" id="qgd-pill" role="note">🥂 Bonne année dans <b>' + left + " jour" + (left > 1 ? "s" : "") + "</b></span>");
  }
  /* Nouvel an : deux flûtes de champagne dessinées qui trinquent puis restent collées */
  function flutes() {
    var one = function (cls, tx, rot, d) {
      var b = "", i;
      for (i = 0; i < 6; i++) b += '<circle class="fb" cx="' + (-3.5 + (i * 2.7) % 7).toFixed(1) + '" cy="58" r="' + (0.7 + (i % 3) * 0.3).toFixed(1) + '" style="animation-delay:-' + (i * 0.55 + d).toFixed(2) + 's"/>';
      return '<g transform="translate(' + tx + ' 38)"><g class="' + cls + '"><ellipse cx="0" cy="106" rx="15" ry="4" fill="#C9D4E8" opacity=".9"/><ellipse cx="0" cy="105" rx="15" ry="3.6" fill="url(#fgl)" stroke="#F4F8FF" stroke-opacity=".7" stroke-width=".8"/><rect x="-1.7" y="62" width="3.4" height="43" fill="url(#fgl)" stroke="#F4F8FF" stroke-opacity=".5" stroke-width=".6"/>' +
        '<path d="M-8.5 0 C-9.5 24 -7.5 50 -3.2 62 L3.2 62 C7.5 50 9.5 24 8.5 0 Z" fill="rgba(235,244,255,.16)" stroke="#F4F8FF" stroke-opacity=".75" stroke-width="1"/>' +
        '<path d="M-8.9 13 C-8.5 32 -6.6 50 -3.2 62 L3.2 62 C6.6 50 8.5 32 8.9 13 Z" fill="url(#fch)"/><ellipse cx="0" cy="13" rx="8.9" ry="1.6" fill="#FBE7A1" opacity=".85"/>' + b +
        '<ellipse cx="0" cy="0" rx="8.5" ry="1.9" fill="none" stroke="#F4F8FF" stroke-opacity=".9" stroke-width="1"/><path d="M-5.6 6 C-6 22 -4.8 38 -2.4 52" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></g>';
    };
    return '<svg class="fl" viewBox="0 0 110 150" aria-hidden="true"><defs><linearGradient id="fgl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9FB0CC"/><stop offset=".5" stop-color="#F4F8FF"/><stop offset="1" stop-color="#8A9BB8"/></linearGradient><linearGradient id="fch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7DB84"/><stop offset="1" stop-color="#D9A93A"/></linearGradient></defs>' +
      one("fl-a", 37, 0, 0) + one("fl-b", 73, 0, 0.3) + '<g class="fl-spark" transform="translate(55 34)"><path d="M0 -13 L2.4 -2.4 L13 0 L2.4 2.4 L0 13 L-2.4 2.4 L-13 0 L-2.4 -2.4 Z" fill="#FFF3B8"/><circle r="3" fill="#fff"/></g></svg>';
  }
  /* Poisson d'avril : un poisson malin traverse le QG ; il fuit le pointeur. Attrapé, il ne repasse plus (+5 XP une fois) */
  var fishTok = 0, fishPtr = { x: -999, y: -999 };
  document.addEventListener("pointermove", function (e) { fishPtr.x = e.clientX; fishPtr.y = e.clientY; }, { passive: true });
  var FISH_JOKES = ["Bien pêché ! C'est le seul « phishing » inoffensif du site.", "Poisson d'avril ! Celui-là n'était pas dans ton réseau… maintenant il est dans ton filet.", "Attrapé ! Et sans cliquer sur un lien suspect : à part celui-ci.", "Un poisson d'avril de moins dans la nature. Ton antivirus n'a rien vu passer."];
  function fishSvg() {
    return '<svg viewBox="0 0 84 46" width="76" height="42" aria-hidden="true"><g class="fish-tail"><path d="M14 23 L1 7 Q9 23 1 39 Z" fill="#2A6FC4"/></g><path d="M34 9 Q42 -2 52 9 Z" fill="#2A6FC4"/><ellipse cx="42" cy="23" rx="29" ry="15" fill="#5AA9F0"/><path d="M14 25 Q42 44 71 25 Q60 36 42 37 Q24 36 14 25 Z" fill="#DCEBFA"/><path d="M30 12 Q34 23 30 34 M40 10 Q44 23 40 36" stroke="#2F7FD6" stroke-opacity=".5" stroke-width="2" fill="none"/><path d="M58 13 Q64 23 58 33" stroke="#2A6FC4" stroke-width="2" fill="none"/><circle cx="64" cy="19" r="4.2" fill="#fff"/><circle cx="65.2" cy="19" r="2.1" fill="#0B0E13"/><path d="M70 28 Q73 30 75 28" stroke="#2A6FC4" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  }
  function aprilFish() {
    var tok = ++fishTok, old = document.getElementById("apfish"); if (old) old.remove();
    if (!V || V.nav !== "qg") return;
    var evs = todayEvents().filter(function (x) { return x.id === "poisson"; }), ev = evs[0];
    if (!ev || (!feteOn() && !forcedEvent())) return;
    if (document.documentElement.classList.contains("lite") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    if (gameGet(ev).caught) return;
    var test = !gameReal(), wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    (async function () {
      await wait(test ? 2000 : 8000);
      while (tok === fishTok && V && V.nav === "qg") {
        if (document.hidden) { await wait(3000); continue; }
        await new Promise(function (done) {
          var W = window.innerWidth, H = window.innerHeight, dir = Math.random() < .5 ? 1 : -1, x = dir > 0 ? -90 : W + 20, y = H * (.3 + Math.random() * .4), base = y, ph = Math.random() * 6, last = performance.now(), vy = 0;
          var b = document.createElement("button"); b.type = "button"; b.id = "apfish"; b.className = "apfish"; b.setAttribute("aria-label", "Un poisson d'avril ! Clique pour l'attraper."); b.innerHTML = fishSvg();
          document.body.appendChild(b);
          var end = function () { cancelAnimationFrame(raf); if (b.parentNode) b.remove(); done(); }, raf = 0;
          b.addEventListener("click", function (e) {
            e.stopPropagation(); var st = gameGet(ev); st.caught = true; gameSet(ev, st); sfx("badge");
            var gain = gameReward(ev, 5); toastMsg("🐟 " + FISH_JOKES[Math.floor(Math.random() * FISH_JOKES.length)] + (gain ? " +" + gain + " XP" : ""));
            fishTok++; end();
          });
          var step = function (now) {
            if (tok !== fishTok || !document.body.contains(b)) { end(); return; }
            var dt = Math.min(.05, (now - last) / 1000); last = now;
            var dx = x + 38 - fishPtr.x, dy = y + 21 - fishPtr.y, d = Math.sqrt(dx * dx + dy * dy), flee = d < 120;
            var sp = (W / 13) * (flee ? 1.5 : 1); x += dir * sp * dt;
            ph += dt * 5;
            if (flee) vy += (dy >= 0 ? 1 : -1) * 520 * dt * (1 - d / 120); else vy *= .9;
            base = Math.max(70, Math.min(H - 90, base + vy * dt));
            y = base + Math.sin(ph) * 26;
            b.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scaleX(" + dir + ")";
            if ((dir > 0 && x > W + 20) || (dir < 0 && x < -100)) { end(); return; }
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
        if (tok !== fishTok) return;
        await wait(test ? 6000 : 25000 + Math.random() * 20000);
      }
    })();
  }
  /* Citrouille d'Halloween cliquable (test local) : s'ouvre, projette bonbons / araignée / fantôme et affiche une astuce cyber */
  var PUMP_TIPS = ["Un mail t'offre des bonbons gratuits ? C'est du phishing : ne clique pas !", "Une phrase de passe longue vaut mieux qu'un mot de passe « compliqué ».", "Active la double authentification : même si on vole ton mot de passe, la porte reste fermée.", "Avant de cliquer, survole le lien : la vraie adresse s'affiche en bas du navigateur.", "Les mises à jour bouchent les trous que les pirates utilisent. Fais-les !", "Un faux support t'appelle pour « réparer » ton PC ? Raccroche.", "Un mot de passe par site : un seul vol et tout tomberait, sinon.", "Une clé USB trouvée par terre ? Ne la branche jamais : c'est un piège classique."];
  var pumpBusy = false, pumpTipIdx = Math.floor(Math.random() * 8);
  function pumpkinSvg() {
    var lobes = [[26, 25, 40], [114, 25, 40], [43, 27, 43], [97, 27, 43], [70, 30, 46]], l = "", i;
    lobes.forEach(function (o) { l += '<ellipse cx="' + o[0] + '" cy="78" rx="' + o[1] + '" ry="' + o[2] + '" fill="url(#pul)"/>'; });
    var grooves = "M70 36 Q60 78 70 120 M56 38 Q36 78 52 118 M84 38 Q104 78 88 118 M38 46 Q10 78 30 112 M102 46 Q130 78 110 112";
    var carve = function (st) { return '<path d="M38 66 L55 66 L46.5 49 Z M85 66 L102 66 L93.5 49 Z M70 74 L63 86 L77 86 Z" ' + st + '/><path d="M36 91 Q70 118 104 91 L97 88 L91 97 L83 90 L76 100 L70 91 L64 100 L57 90 L49 97 L43 88 Z" ' + st + "/>"; };
    return '<svg class="pu-svg" viewBox="0 0 140 132" aria-hidden="true"><defs>' +
      '<linearGradient id="pul" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A2F03"/><stop offset=".22" stop-color="#E2600A"/><stop offset=".5" stop-color="#FF9B35"/><stop offset=".78" stop-color="#E2600A"/><stop offset="1" stop-color="#7A2802"/></linearGradient>' +
      '<radialGradient id="pub" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#2A0C00" stop-opacity=".6"/><stop offset="1" stop-color="#2A0C00" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="put" cx=".5" cy="0" r=".7"><stop offset="0" stop-color="#FFD58A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="pug2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".5" stop-color="#FFC94D"/><stop offset="1" stop-color="#FF8A1F"/></linearGradient>' +
      '<linearGradient id="pus" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2F4416"/><stop offset=".4" stop-color="#7FA23A"/><stop offset="1" stop-color="#3A5219"/></linearGradient>' +
      '<radialGradient id="pui" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".6" stop-color="#FF9A2E"/><stop offset="1" stop-color="#5A1E02"/></radialGradient></defs>' +
      '<ellipse cx="70" cy="124" rx="56" ry="6" fill="#000" opacity=".4"/>' + l +
      '<path d="' + grooves + '" fill="none" stroke="#6A2302" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M18 62 Q24 48 36 44 M58 46 Q66 42 74 44 M104 46 Q112 50 118 60" fill="none" stroke="#FFE0A0" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="14" y="40" width="112" height="84" rx="40" fill="url(#pub)"/><rect x="14" y="36" width="112" height="40" rx="30" fill="url(#put)"/>' +
      '<ellipse cx="70" cy="36" rx="30" ry="8.5" fill="#1A0A02" stroke="#6A2302" stroke-width="1.5"/><ellipse class="pu-in" cx="70" cy="38" rx="24" ry="5.5" fill="url(#pui)"/>' +
      '<g class="pu-face">' + carve('fill="#2A0C00" stroke="#2A0C00" stroke-width="5" stroke-linejoin="round" transform="translate(1.5 2)"') + carve('class="pu-g" fill="url(#pug2)" stroke="#8A3304" stroke-width="2" stroke-linejoin="round"') + '</g>' +
      '<g class="pu-lid"><ellipse cx="70" cy="34" rx="31" ry="9.5" fill="#E0600B" stroke="#7A2802" stroke-width="1.6"/><ellipse cx="70" cy="32" rx="25" ry="6" fill="#FF9B35" opacity=".55"/><path d="M63 33 Q59 14 67 7 Q76 4 79 12 Q73 20 76 33 Z" fill="url(#pus)" stroke="#2F4416" stroke-width="1.6" stroke-linejoin="round"/><path d="M65 28 Q64 18 68 11 M71 30 Q70 20 74 12" fill="none" stroke="#2F4416" stroke-opacity=".5" stroke-width="1.4"/><path d="M78 24 Q92 18 90 8 Q86 2 82 7 Q86 10 84 14" fill="none" stroke="#6E9A2E" stroke-width="2.2" stroke-linecap="round"/><path d="M48 30 Q36 22 40 12 Q50 12 54 24 Z" fill="#5E8A27" stroke="#2F4416" stroke-width="1.4" stroke-linejoin="round"/></g></svg>';
  }
  function pumpkinClick() {
    if (pumpBusy) return; var el = document.querySelector(".qgd-side.pump"); if (!el) return; pumpBusy = true;
    var fx = el.querySelector(".qgd-pumpfx"), tip = el.querySelector(".pump-tip"), r = Math.random(), kind = r < .6 ? "bonbons" : r < .82 ? "araignee" : "fantome";
    el.classList.add("shake"); sfx("open");
    setTimeout(function () {
      el.classList.remove("shake"); el.classList.add("open"); sfx("badge");
      if (kind === "fantome") batFlock(7);
      var items = kind === "bonbons" ? ["🍬", "🍭", "🍫", "🍬", "🍭", "🍫", "🍬", "🍭", "🍫", "🍬"] : kind === "araignee" ? ["🕷️", "🕸️", "🕷️"] : ["👻", "✨", "✨", "🦇"], h = "";
      items.forEach(function (c, i) { var a = (i / items.length) * 2 - 1; h += '<i style="--dx:' + Math.round(a * 120 + (Math.random() * 30 - 15)) + "px;--hy:-" + Math.round(110 + Math.random() * 90) + "px;--rot:" + Math.round(Math.random() * 600 - 300) + "deg;--d:" + (i * 0.05).toFixed(2) + 's">' + c + "</i>"; });
      fx.innerHTML = h;
      var head = kind === "bonbons" ? "Des bonbons !" : kind === "araignee" ? "Une araignée !" : "Bouh !";
      tip.innerHTML = "<b>" + head + "</b>" + esc(PUMP_TIPS[pumpTipIdx++ % PUMP_TIPS.length]); tip.classList.add("on");
      setTimeout(function () { tip.classList.remove("on"); el.classList.remove("open"); fx.innerHTML = ""; pumpBusy = false; }, 6500);
    }, 520);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-pump]")) pumpkinClick(); });
  /* Motifs dessinés des autres thèmes (cœur, tulipes, toile d'araignée) */
  var ARROW_SHAFT = '<rect x="-38" y="69.2" width="156" height="5.6" rx="2.8" fill="url(#hrs)" stroke="#3E2610" stroke-width="1.3"/><rect x="-36" y="70" width="152" height="1.6" rx=".8" fill="#fff" opacity=".35"/>',
    ARROW_HEAD = '<g transform="translate(-14 0)"><path d="M128 72 L134 60 L156 72 L134 84 Z" fill="url(#hra)" stroke="#4B5566" stroke-width="1.5" stroke-linejoin="round"/><path d="M134 60 L127 55 L131 69 M134 84 L127 89 L131 75" fill="#B7C2D4" stroke="#4B5566" stroke-width="1.3" stroke-linejoin="round"/><path d="M130 72 L154 72" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/><rect x="124" y="67.5" width="6" height="9" rx="2" fill="#8A93A3" stroke="#3E4656" stroke-width="1.2"/></g>',
    ARROW_TAIL = '<g transform="translate(-40 0)"><path d="M44 70 L30 56 L8 54 L14 70 Z M44 74 L30 88 L8 90 L14 74 Z" fill="#FF6C95" stroke="#8E1E44" stroke-width="1.4" stroke-linejoin="round"/><path d="M40 70 L28 58 M34 70 L22 57 M28 70 L16 56 M40 74 L28 86 M34 74 L22 87 M28 74 L16 88" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round"/><path d="M36 71 L22 66 L6 69 L14 72 L6 75 L22 78 Z" fill="#E9548B" stroke="#8E1E44" stroke-width="1.2" stroke-linejoin="round"/><rect x="2" y="70" width="8" height="4" rx="2" fill="#5B3A1C"/></g>',
    ARROW_WOUND = '<ellipse cx="7" cy="72" rx="4" ry="9.5" fill="#4A0518" opacity=".9"/><ellipse cx="114" cy="72" rx="4" ry="9.5" fill="#4A0518" opacity=".9"/>',
    ARROW_STUBS = '<rect x="-4" y="69.2" width="18" height="5.6" rx="2.8" fill="url(#hrs)" stroke="#3E2610" stroke-width="1.3"/><rect x="104" y="69.2" width="18" height="5.6" rx="2.8" fill="url(#hrs)" stroke="#3E2610" stroke-width="1.3"/>';
  function heartSvg() {
    return '<svg class="qgd-art-svg" viewBox="-22 -10 206 156" aria-hidden="true"><defs><radialGradient id="hrg" cx=".35" cy=".28" r=".95"><stop offset="0" stop-color="#FF9DB8"/><stop offset=".35" stop-color="#F23F6C"/><stop offset=".8" stop-color="#B8123F"/><stop offset="1" stop-color="#7C0A2B"/></radialGradient><linearGradient id="hra" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F7FB"/><stop offset=".5" stop-color="#AEB9CB"/><stop offset="1" stop-color="#6B7587"/></linearGradient><linearGradient id="hrs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A5A2B"/><stop offset=".5" stop-color="#D9A566"/><stop offset="1" stop-color="#6E4520"/></linearGradient></defs>' +
      '<ellipse cx="72" cy="132" rx="42" ry="5" fill="#000" opacity=".35"/>' +
      '<g class="hr-arrow"><g transform="rotate(146 72 72)">' + ARROW_SHAFT + ARROW_HEAD + ARROW_TAIL + "</g></g>" +
      '<path d="M72 124 C14 86 4 50 22 28 C38 10 64 14 72 36 C80 14 106 10 122 28 C140 50 130 86 72 124 Z" fill="url(#hrg)" stroke="#6E0825" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M26 40 C30 28 42 22 54 26" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6"/><ellipse cx="38" cy="56" rx="5" ry="9" transform="rotate(-24 38 56)" fill="#fff" opacity=".35"/>' +
      '<path d="M72 124 C30 92 14 66 20 48" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="10" stroke-linecap="round"/>' +
      '<g class="hr-arrow"><g transform="rotate(146 72 72)">' + ARROW_WOUND + ARROW_STUBS + "</g></g>" +
      '</svg>';
  }
  function tulipsSvg() {
    var defs = '<linearGradient id="tgs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2F7A33"/><stop offset=".5" stop-color="#58B24E"/><stop offset="1" stop-color="#2F7A33"/></linearGradient>' +
      '<linearGradient id="tgl" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2A6B2D"/><stop offset=".6" stop-color="#4FAE49"/><stop offset="1" stop-color="#8AD36F"/></linearGradient>' +
      '<radialGradient id="teg" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#FFF6DF"/><stop offset=".6" stop-color="#F6DDAE"/><stop offset="1" stop-color="#DDB56F"/></radialGradient>' +
      '<clipPath id="tec"><path d="M0 -26 C16 -26 24 -6 24 10 C24 26 12 36 0 36 C-12 36 -24 26 -24 10 C-24 -6 -16 -26 0 -26 Z"/></clipPath>';
    var cols = [["#D23A74", "#FF6FA0", "#FFC4D8"], ["#E39B00", "#FFD23F", "#FFF1A6"], ["#6C46C9", "#A58BFF", "#E3D8FF"]];
    cols.forEach(function (c, i) {
      defs += '<linearGradient id="tb' + i + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>' +
        '<linearGradient id="tf' + i + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + c[1] + '"/><stop offset=".75" stop-color="' + c[2] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>';
    });
    var head = function (i, x, y, rot) {
      return '<g transform="translate(' + x + " " + y + ") rotate(" + rot + ')">' +
        '<path d="M0 26 C-24 26 -29 -2 -23 -28 C-14 -20 -6 -10 0 6 Z" fill="url(#tb' + i + ')" stroke="' + cols[i][0] + '" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M0 26 C24 26 29 -2 23 -28 C14 -20 6 -10 0 6 Z" fill="url(#tb' + i + ')" stroke="' + cols[i][0] + '" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M0 29 C-17 27 -19 1 -10 -20 C-6 -29 -2 -34 0 -40 C2 -34 6 -29 10 -20 C19 1 17 27 0 29 Z" fill="url(#tf' + i + ')" stroke="' + cols[i][0] + '" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M0 26 C-4 8 -4 -12 0 -34 M-8 22 C-12 6 -11 -10 -7 -22 M8 22 C12 6 11 -10 7 -22" stroke="' + cols[i][0] + '" stroke-opacity=".28" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
        '<path d="M-11 6 C-12 -4 -9 -14 -5 -22" stroke="#fff" stroke-opacity=".75" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M-7 31 C-3 36 3 36 7 31 L5 26 L-5 26 Z" fill="#3A8F3A" stroke="#2A6B2D" stroke-width="1"/></g>';
    };
    var stem = function (bx, hx, hy) { return '<path d="M' + bx + " 162 C" + bx + " 134 " + hx + " " + (hy + 70) + " " + hx + " " + (hy + 30) + '" stroke="#3F9A3F" stroke-width="5.5" fill="none" stroke-linecap="round"/>'; };
    return '<svg class="qgd-art-svg tul" viewBox="0 0 160 170" aria-hidden="true"><defs>' + defs + '</defs><ellipse cx="80" cy="164" rx="66" ry="6" fill="#000" opacity=".3"/>' +
      '<path d="M76 163 C46 156 30 116 38 78 C54 106 70 134 76 163 Z" fill="url(#tgl)" stroke="#2A6B2D" stroke-width="1.4" stroke-linejoin="round"/><path d="M75 160 C60 136 48 112 40 86" stroke="#B6E8A0" stroke-opacity=".6" stroke-width="1.3" fill="none"/>' +
      '<path d="M84 163 C114 156 130 120 124 84 C108 110 90 136 84 163 Z" fill="url(#tgl)" stroke="#2A6B2D" stroke-width="1.4" stroke-linejoin="round"/><path d="M85 160 C100 138 114 114 122 90" stroke="#B6E8A0" stroke-opacity=".6" stroke-width="1.3" fill="none"/>' +
      stem(70, 40, 56) + stem(92, 120, 60) + stem(80, 80, 32) +
      head(0, 40, 56, -8) + head(2, 120, 60, 9) + head(1, 80, 34, 0) +
      '<path d="M8 166 Q16 148 22 166 M30 167 Q38 150 46 167 M118 167 Q126 150 132 167 M136 167 Q146 154 154 166" stroke="#3E8A3C" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<g transform="translate(24 140) rotate(-10) scale(.82)"><ellipse cx="0" cy="38" rx="20" ry="4" fill="#000" opacity=".28"/><path d="M0 -26 C16 -26 24 -6 24 10 C24 26 12 36 0 36 C-12 36 -24 26 -24 10 C-24 -6 -16 -26 0 -26 Z" fill="url(#teg)"/>' +
      '<g clip-path="url(#tec)"><rect x="-26" y="-6" width="52" height="11" fill="#FF7FA8"/><path d="M-26 11 L-17 5 L-9 11 L0 5 L9 11 L17 5 L26 11" stroke="#4C8DFF" stroke-width="3.4" fill="none" stroke-linejoin="round"/><g fill="#fff"><circle cx="-16" cy="-0.5" r="1.8"/><circle cx="-5" cy="-0.5" r="1.8"/><circle cx="6" cy="-0.5" r="1.8"/><circle cx="17" cy="-0.5" r="1.8"/></g>' +
      '<path d="M-26 22 C-16 17 -8 27 0 22 C8 17 16 27 26 22 L26 40 L-26 40 Z" fill="#7ED6A5"/><g fill="#fff" opacity=".85"><circle cx="-12" cy="30" r="2"/><circle cx="2" cy="31" r="2"/><circle cx="14" cy="30" r="2"/></g>' +
      '<g transform="translate(0 -17)"><g fill="#FFD23F"><circle cx="0" cy="-4" r="2.6"/><circle cx="4" cy="0" r="2.6"/><circle cx="-4" cy="0" r="2.6"/><circle cx="0" cy="4" r="2.6"/></g><circle r="2" fill="#E9548B"/></g></g>' +
      '<path d="M0 -26 C16 -26 24 -6 24 10 C24 26 12 36 0 36 C-12 36 -24 26 -24 10 C-24 -6 -16 -26 0 -26 Z" fill="none" stroke="#9A743A" stroke-width="1.8"/><ellipse cx="-9" cy="-9" rx="4" ry="9" transform="rotate(18 -9 -9)" fill="#fff" opacity=".6"/></g></svg>';
  }
  function webSvg() {
    var r = "", i, k, W = 100;
    for (i = 0; i <= 6; i++) { var a = (Math.PI / 2) * (i / 6); r += "M100 0 L" + (100 - Math.sin(a) * 96).toFixed(1) + " " + (Math.cos(a) * 96 * 0 + Math.sin(Math.PI / 2 - a) * 96).toFixed(1) + " "; }
    var rings = ""; for (k = 1; k <= 5; k++) { var rr = k * 17, d = ""; for (i = 0; i <= 6; i++) { var a2 = (Math.PI / 2) * (i / 6), px = 100 - Math.sin(a2) * rr, py = Math.sin(Math.PI / 2 - a2) * rr; if (i) { var a1 = (Math.PI / 2) * ((i - .5) / 6), cxp = 100 - Math.sin(a1) * rr * .86, cyp = Math.sin(Math.PI / 2 - a1) * rr * .86; d += " Q" + cxp.toFixed(1) + " " + cyp.toFixed(1) + " " + px.toFixed(1) + " " + py.toFixed(1); } else d = "M" + px.toFixed(1) + " " + py.toFixed(1); } rings += '<path d="' + d + '"/>'; }
    return '<svg class="qgd-web" viewBox="0 0 100 150" aria-hidden="true"><g stroke="#E8ECFA" stroke-opacity=".7" stroke-width="1.1" fill="none" stroke-linecap="round"><path d="' + r + '"/>' + rings + '</g>' +
      '<path d="M36 40 L36 98" stroke="#E8ECFA" stroke-opacity=".7" stroke-width="1"/><g class="web-spider"><ellipse cx="36" cy="106" rx="7" ry="8.5" fill="#1A1226" stroke="#6A4DA8" stroke-width="1"/><circle cx="36" cy="97" r="4.6" fill="#1A1226" stroke="#6A4DA8" stroke-width="1"/><path d="M33 105 L36 111 L39 105 Z" fill="#E5342B"/><g stroke="#1A1226" stroke-width="1.8" fill="none" stroke-linecap="round"><path d="M31 100 L21 94 L16 102 M31 105 L19 106 L15 114 M32 110 L22 118 L20 126 M33 102 L26 90 L29 84 M41 100 L51 94 L56 102 M41 105 L53 106 L57 114 M40 110 L50 118 L52 126 M39 102 L46 90 L43 84"/></g><circle cx="34.4" cy="96.4" r="1.2" fill="#FF6C6C"/><circle cx="37.6" cy="96.4" r="1.2" fill="#FF6C6C"/></g></svg>';
  }
  /* Cupidon : un petit ange arrive de la gauche, vise le cœur et y plante une flèche ; clic sur le cœur pour le rappeler */
  var cupidBusy = false, cupidTok = 0;
  function cupidSvg() {
    var feather = function (rot, len) { return '<path d="M0 0 C-6 -' + (len * .4) + ' -4 -' + (len * .85) + ' 0 -' + len + ' C4 -' + (len * .85) + ' 6 -' + (len * .4) + ' 0 0 Z" transform="rotate(' + rot + ')" fill="url(#cpw)" stroke="#9FB2D8" stroke-width="1.2"/>'; };
    var wing = ""; [-70, -48, -26, -4, 18].forEach(function (r, i) { wing += feather(r, 52 - i * 3); });
    return '<svg class="cp-svg" viewBox="0 0 170 150" aria-hidden="true"><defs><linearGradient id="cpw" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#DDE6FA"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient><radialGradient id="cps" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#FFE2C8"/><stop offset=".7" stop-color="#F6B98C"/><stop offset="1" stop-color="#D98A5E"/></radialGradient><radialGradient id="cph" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#FFE9A0"/><stop offset="1" stop-color="#D9A32B"/></radialGradient></defs>' +
      '<g transform="translate(70 70)"><g class="cp-wing b">' + wing + '</g></g>' +
      '<path d="M66 100 C54 112 50 128 58 140 C64 134 70 124 76 110 Z" fill="url(#cps)" stroke="#B9703F" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M84 104 C98 112 110 118 118 112 C120 120 112 130 100 128 C92 124 86 114 84 104 Z" fill="url(#cps)" stroke="#B9703F" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<ellipse cx="78" cy="80" rx="22" ry="28" fill="url(#cps)" stroke="#B9703F" stroke-width="1.8"/>' +
      '<path d="M56 92 C66 108 92 110 102 92 C98 104 86 118 76 118 C64 118 56 104 56 92 Z" fill="#fff" stroke="#9FB2D8" stroke-width="1.6" stroke-linejoin="round"/><path d="M66 100 L72 114 M78 104 L80 118 M90 100 L88 114" stroke="#C9D6F0" stroke-width="1.4" stroke-linecap="round"/>' +
      '<g transform="translate(76 66)"><g class="cp-wing f">' + wing + '</g></g>' +
      '<g class="cp-bow"><path d="M142 26 Q172 78 142 130" fill="none" stroke="#7A4A1E" stroke-width="5" stroke-linecap="round"/><path d="M142 26 Q172 78 142 130" fill="none" stroke="#E0A85A" stroke-width="1.8" stroke-linecap="round" opacity=".7"/><path class="cp-rest" d="M142 26 L142 130" stroke="#F4EBD0" stroke-width="1.6"/><path class="cp-pull" d="M142 26 L104 78 L142 130" fill="none" stroke="#F4EBD0" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      '<g class="cp-nock"><rect x="96" y="76.2" width="50" height="3.6" rx="1.8" fill="#9A6A33"/><path d="M142 78 L134 72 L156 78 L134 84 Z" fill="#DCE4F0" stroke="#5B6678" stroke-width="1.2" stroke-linejoin="round"/><path d="M100 78 L92 71 L90 78 L92 85 Z" fill="#FF6C95"/></g>' +
      '<path class="cp-arm1" d="M86 72 C104 70 124 74 142 78" fill="none" stroke="#F0A878" stroke-width="9" stroke-linecap="round"/><path class="cp-arm2" d="M82 78 C92 82 100 80 106 78" fill="none" stroke="#F0A878" stroke-width="8" stroke-linecap="round"/><circle cx="142" cy="78" r="5.6" fill="#F6B98C" stroke="#B9703F" stroke-width="1.2"/><circle class="cp-hand" cx="106" cy="78" r="5.2" fill="#F6B98C" stroke="#B9703F" stroke-width="1.2"/>' +
      '<circle cx="82" cy="44" r="25" fill="url(#cps)" stroke="#B9703F" stroke-width="1.8"/>' +
      '<g fill="url(#cph)" stroke="#B07A12" stroke-width="1.4"><circle cx="60" cy="38" r="9"/><circle cx="66" cy="26" r="10"/><circle cx="80" cy="21" r="10"/><circle cx="95" cy="24" r="9.5"/><circle cx="104" cy="34" r="8"/><circle cx="58" cy="52" r="6.5"/></g>' +
      '<ellipse cx="82" cy="12" rx="17" ry="4.5" fill="none" stroke="#F5C451" stroke-width="3.2"/>' +
      '<circle cx="96" cy="46" r="2.8" fill="#2A1608"/><circle cx="97" cy="45" r=".9" fill="#fff"/><circle cx="76" cy="46" r="2.8" fill="#2A1608"/><circle cx="77" cy="45" r=".9" fill="#fff"/>' +
      '<ellipse cx="102" cy="55" rx="5" ry="3.2" fill="#FF7FA0" opacity=".7"/><ellipse cx="68" cy="55" rx="5" ry="3.2" fill="#FF7FA0" opacity=".7"/>' +
      '<path d="M80 57 Q87 63 94 57" fill="none" stroke="#8A3A2A" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function cupidScene(auto) {
    var C = document.querySelector(".qgd-cupid"), H = document.querySelector(".qgd-side.heart");
    if (!C || !H || cupidBusy) return;
    var hr = H.getBoundingClientRect(); if (hr.width < 20) return;
    cupidBusy = true; var tok = ++cupidTok, wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var go = function () { return tok === cupidTok && !!document.body.contains(C) && !!V && V.nav === "qg"; };
    var move = function (x, y, sec, ease) { C.style.transition = "transform " + sec + "s " + (ease || "ease-in-out"); C.style.transform = "translate(" + x + "px," + y + "px)"; };
    (async function () {
      try {
        var hx = hr.left + hr.width * .62 + 120, hy = Math.max(70, hr.top - 150);
        H.classList.remove("stuck"); C.className = "qgd-cupid"; C.style.transition = "none"; C.style.transform = "translate(-220px," + (hy - 90) + "px)"; void C.offsetWidth;
        C.classList.add("on", "fly"); sfx("open");
        move(hx, hy, 2.6, "cubic-bezier(.3,.7,.4,1)"); await wait(2700); if (!go()) throw 0;
        C.classList.remove("fly"); C.classList.add("face", "aim"); await wait(1100); if (!go()) throw 0;
        var sx = hx + 24, sy = hy + 78, tx = hr.left + hr.width * .62, ty = hr.top + hr.height * .36, ang = Math.atan2(ty - sy, tx - sx) * 180 / Math.PI;
        var fa = document.createElement("div"); fa.className = "qgd-farrow"; fa.innerHTML = '<svg viewBox="-42 60 188 24" aria-hidden="true">' + ARROW_SHAFT + ARROW_HEAD + ARROW_TAIL + "</svg>"; document.body.appendChild(fa);
        fa.style.transform = "translate(" + (sx - 100) + "px," + (sy - 8) + "px) rotate(" + ang.toFixed(1) + "deg)"; void fa.offsetWidth;
        C.classList.remove("aim"); C.classList.add("shot"); sfx("doorSlide");
        fa.style.transition = "transform .5s cubic-bezier(.5,0,.9,.6)"; fa.style.transform = "translate(" + (tx - 100) + "px," + (ty - 8) + "px) rotate(" + ang.toFixed(1) + "deg)"; await wait(520);
        fa.remove(); H.classList.add("stuck", "hit"); sfx("badge");
        var burst = document.createElement("div"); burst.className = "qgd-hburst"; burst.style.left = tx + "px"; burst.style.top = ty + "px";
        burst.innerHTML = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<i style="--a:' + (i * 51 - 150) + "deg;--d:" + (i * .04).toFixed(2) + 's">' + (i % 2 ? "💕" : "💖") + "</i>"; }).join(""); document.body.appendChild(burst); setTimeout(function () { burst.remove(); }, 1800);
        setTimeout(function () { H.classList.remove("hit"); }, 700);
        setTimeout(function () { H.classList.remove("stuck"); }, 14000);
        await wait(900); if (!go()) throw 0;
        C.classList.remove("shot"); C.classList.add("fly"); move(-240, hy - 120, 2, "ease-in"); await wait(2100);
      } catch (e) { }
      C.className = "qgd-cupid"; cupidBusy = false;
    })();
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-cupid]")) cupidScene(false); });
  function qgSide(ev, cf) {
    var cls = "", attr = "", html = cf.side;
    if (ev.id === "noel") { cls = " tree"; html = xmasTree(); attr = ' data-santa="1" title="Clique sur le sapin"'; }
    else if (ev.id === "nouvelan") { cls = " tree flutes"; html = flutes(); }
    else if (ev.id === "halloween") { cls = " art" + " pump"; html = pumpkinSvg() + '<span class="qgd-pumpfx"></span><span class="pump-tip"></span>'; attr = ' data-pump="1" title="Clique sur la citrouille"'; }
    else if (ev.id === "valentin") { cls = " art heart"; html = heartSvg(); attr = ' data-cupid="1" title="Clique sur le cœur"'; }
    else if (ev.id === "paques") { cls = " art tulips"; html = tulipsSvg(); }
    return '<span class="qgd-side' + cls + '"' + attr + ">" + html + "</span>" + (ev.id === "valentin" ? '<span class="qgd-cupid">' + cupidSvg() + "</span>" : "");
  }
  function placeQgDeco() {
    var old = document.getElementById("qg-deco"); if (old) old.remove();
    if (!V || V.nav !== "qg") return;
    var ev = null; try { ev = costumeEvent(); } catch (e) { } var cf = ev && QG_DECO[ev.id]; if (!cf) return;
    var main = document.querySelector("#app main"); if (!main) return;
    var W = 1200, n = 9, seg = W / n, g = "", i, b = "";
    for (i = 0; i < n; i++) {
      var x0 = i * seg, x1 = x0 + seg, cx = x0 + seg / 2;
      g += (i ? "" : "M" + x0 + " 4 ") + "Q" + cx + " 46 " + x1 + " 4 ";
      for (var k = 1; k <= 3; k++) {
        var t = k / 4, bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, by = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 46 + t * t * 4;
        var col = cf.cols[(i * 3 + k) % cf.cols.length];
        b += cf.heart ? '<text x="' + bx.toFixed(0) + '" y="' + (by + 8).toFixed(0) + '" font-size="15" text-anchor="middle" fill="' + col + '" class="qgd-b" style="animation-delay:-' + ((i * 3 + k) % 5 * .4).toFixed(1) + 's">♥</text>' : '<circle cx="' + bx.toFixed(0) + '" cy="' + (by + 5).toFixed(0) + '" r="6" fill="' + col + '" class="qgd-b" style="animation-delay:-' + ((i * 3 + k) % 5 * .4).toFixed(1) + 's"/>';
      }
    }
    var svg = '<svg class="qgd-garland" viewBox="0 0 ' + W + ' 60" preserveAspectRatio="none" aria-hidden="true"><path d="' + g + '" fill="none" stroke="' + cf.wire + '" stroke-width="3"/>' + b + "</svg>";
    main.style.position = "relative";
    main.insertAdjacentHTML("afterbegin", '<div id="qg-deco" class="qg-deco" aria-hidden="true">' + svg + qgSide(ev, cf) + (cf.corner ? '<span class="qgd-corner">' + (ev.id === "halloween" ? webSvg() : cf.corner) + "</span>" : "") + (cf.santa ? '<span class="qgd-santa"><svg class="qgd-sv" viewBox="0 0 100 150" width="112" height="168" aria-hidden="true"><g class="sv-bob"><g class="sv-lean"><g class="sv-sack"><path d="M44 38 C16 34 0 58 4 86 C6 103 24 109 38 102 C52 95 56 72 49 46 Z" fill="#A87C4F"/><path d="M8 90 C10 102 24 108 38 102 C30 100 16 98 8 90Z" fill="#7A5733" opacity=".75"/><path d="M11 60 Q24 54 40 62 M9 76 Q24 70 44 78" stroke="#8A6339" stroke-width="2" fill="none"/><path d="M38 34 L52 36 L50 47 L40 46 Z" fill="#7A5733"/><rect x="26" y="25" width="12" height="11" rx="1.5" fill="#2F9E5B" transform="rotate(-16 32 30)"/><rect x="38" y="21" width="11" height="13" rx="1.5" fill="#3F7FE0" transform="rotate(10 43 27)"/><path d="M38 21 V34" stroke="#F5C451" stroke-width="2" transform="rotate(10 43 27)"/><rect x="20" y="31" width="9" height="9" rx="1.5" fill="#D9A21F"/></g><g class="sv-th2"><path d="M47 98 H69 L67 124 H49 Z" fill="#8E1B1B"/><g class="sv-sh2"><path d="M49 122 H67 L66 138 H50 Z" fill="#8E1B1B"/><path d="M49 136 H66 V139 Q76 140 78 146 V149 H48 Z" fill="#2C201B"/><rect x="48" y="146.5" width="30" height="2.5" fill="#150E0C"/></g></g><g class="sv-th1"><path d="M47 98 H69 L67 124 H49 Z" fill="#6E1414"/><g class="sv-sh1"><path d="M49 122 H67 L66 138 H50 Z" fill="#6E1414"/><path d="M49 136 H66 V139 Q76 140 78 146 V149 H48 Z" fill="#1F1512"/><rect x="48" y="146.5" width="30" height="2.5" fill="#0E0908"/></g></g><path d="M39 38 Q27 72 34 106 H86 Q96 72 76 41 Q58 31 39 38 Z" fill="#C62828"/><path d="M62 35 Q86 42 87 106 H62 Z" fill="#A91F1F" opacity=".5"/><rect x="74" y="42" width="6" height="64" rx="3" fill="#F4F6FB"/><rect x="33" y="102" width="55" height="8" rx="4" fill="#F4F6FB"/><rect x="33" y="71" width="55" height="8" fill="#151515"/><rect x="55" y="69.5" width="11" height="11" rx="1.5" fill="none" stroke="#F5C451" stroke-width="2.6"/><path d="M48 46 L36 42" stroke="#A71F1F" stroke-width="11" stroke-linecap="round"/><circle cx="33.5" cy="41" r="5.2" fill="#F4F6FB"/><g class="sv-arm"><rect x="62" y="42" width="13" height="36" rx="6.5" fill="#D63B3B"/><rect x="61.5" y="72" width="14" height="6" rx="3" fill="#F4F6FB"/><circle cx="68.5" cy="83" r="5.6" fill="#F4F6FB"/></g><g class="sv-head"><rect x="54" y="30" width="9" height="8" fill="#E5AF88"/><circle cx="59" cy="24" r="10.5" fill="#F0BF99"/><path d="M48 25 Q45 48 59 57 Q73 48 70 25 Q66 37 59 36 Q52 37 48 25 Z" fill="#F6F7FB"/><path d="M57 31 Q66 28 73 31 Q66 37 57 34 Z" fill="#fff"/><circle cx="68.5" cy="27.5" r="2.8" fill="#E6A28E"/><circle cx="64" cy="22.5" r="1.5" fill="#1A0A12"/><path d="M60 19.5 L67 18.5" stroke="#F4F6FB" stroke-width="2.2" stroke-linecap="round"/><path d="M48 20 Q50 4 65 5 Q70 13 70 20 Z" fill="#C62828"/><path d="M52 6 Q39 3 35 16" stroke="#C62828" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="34" cy="17" r="4.8" fill="#fff"/><rect x="46.5" y="18" width="25" height="6.5" rx="3.2" fill="#F4F6FB"/></g></g></g></svg></span><span class="qgd-gift">🎁</span>' : "") + (cf.fw ? '<span class="qgd-count" id="qgd-count" role="timer"></span><span class="qgd-fw f1">🎆</span><span class="qgd-fw f2">🎇</span><span class="qgd-fw f3">🎆</span><span class="qgd-fw f4">🎇</span>' : "") + (cf.bunny ? '<span class="qgd-run" title="Suis-moi : chasse aux œufs !" role="button"><span class="qgd-trail" aria-hidden="true"><i style="right:0px;top:0px;animation-delay:-0.0s">ｱ</i><i style="right:15px;top:17px;animation-delay:-0.4s">ｶ</i><i style="right:30px;top:34px;animation-delay:-0.7s">ﾊ</i><i style="right:45px;top:5px;animation-delay:-1.1s">ｦ</i><i style="right:60px;top:22px;animation-delay:-1.5s">ｵ</i><i style="right:75px;top:39px;animation-delay:-1.9s">1</i><i style="right:90px;top:10px;animation-delay:-0.0s">0</i><i style="right:105px;top:27px;animation-delay:-0.4s">ｴ</i><i style="right:120px;top:44px;animation-delay:-0.8s">0</i></span><b class="qgd-follow">Suis le lapin blanc…</b><span class="qgd-hop"><svg class="qgd-rabbit" viewBox="0 0 120 84" width="92" height="64" aria-hidden="true"><ellipse cx="62" cy="80" rx="46" ry="3.5" fill="#000" opacity=".28"/><ellipse cx="13" cy="52" rx="8" ry="7.5" fill="#fff"/><g class="rb-hind2"><ellipse cx="48" cy="75" rx="18" ry="5" fill="#CDD3E2"/><ellipse cx="44" cy="55" rx="18" ry="16" fill="#E1E5F0"/></g><g class="rb-hind"><ellipse cx="40" cy="75" rx="21" ry="5.5" fill="#E4E8F2"/><ellipse cx="34" cy="53" rx="22" ry="20" fill="#F4F6FB"/></g><ellipse cx="58" cy="55" rx="31" ry="17" fill="#fff"/><ellipse cx="58" cy="62" rx="26" ry="8" fill="#E4E8F2" opacity=".7"/><g class="rb-front2"><ellipse cx="72" cy="69" rx="4.5" ry="10" fill="#D6DBE8"/><ellipse cx="74" cy="78" rx="6.5" ry="2.8" fill="#C9CFDF"/></g><g class="rb-front"><ellipse cx="80" cy="69" rx="5" ry="11" fill="#EEF1F8"/><ellipse cx="82" cy="78" rx="7" ry="3" fill="#E4E8F2"/></g><g transform="rotate(-20 84 30)"><ellipse cx="84" cy="14" rx="5.6" ry="19" fill="#DDE2EE"/></g><g transform="rotate(-6 90 30)"><ellipse cx="90" cy="12" rx="5.8" ry="20" fill="#fff"/><ellipse cx="90" cy="13" rx="2.8" ry="14" fill="#F6B8CC"/></g><ellipse cx="94" cy="41" rx="15" ry="12.5" fill="#fff"/><ellipse cx="107" cy="45" rx="8.5" ry="6.2" fill="#F4F6FB"/><circle cx="114" cy="43" r="2.2" fill="#E98FAD"/><circle cx="98" cy="37" r="3" fill="#C2185B"/><circle cx="98" cy="37" r="1.5" fill="#1A0A12"/><circle cx="98.9" cy="36" r=".7" fill="#fff"/><path d="M104 47 q4 3 8 0" stroke="#C9CEDD" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg></span></span>' : "") + "</div>");
    if (cf.santa) { var seenS = false; try { seenS = !!sessionStorage.getItem("powerup365.santa"); } catch (e) { } santaBusy = false; if (!seenS && !navigator.webdriver) santaScene(true); else { var G0 = document.querySelector(".qgd-gift"); if (G0) G0.classList.remove("on"); } }
    if (ev.id === "nouvelan") nyCountdown();
    if (ev.id === "valentin") { var seenC = false; try { seenC = !!sessionStorage.getItem("powerup365.cupid"); } catch (e) { } if (!seenC && !liteOn() && !navigator.webdriver) { try { sessionStorage.setItem("powerup365.cupid", "1"); } catch (e) { } setTimeout(function () { if (V && V.nav === "qg") cupidScene(true); }, 6000); } }
  }
  function introEvDeco() {
    var ev = null; try { ev = costumeEvent(); } catch (e) { }
    if (!ev) return "";
    var pics = ev.fx.filter(function (x) { var c = x.charCodeAt(0); return x !== ev.emoji && (c >= 0xD800 || (c >= 0x2600 && c < 0x2C00)); }), b = pics.length ? pics[pics.length - 1] : ev.emoji;
    return '<span class="ie ie-tl">' + ev.emoji + '</span><span class="ie ie-tr">' + b + '</span><span class="ie ie-bl">' + b + '</span><span class="ie ie-br">' + ev.emoji + '</span><span class="ie ie-top">' + ev.emoji + "</span>";
  }
  function costumeEvent() {
    if (!feteOn() && !forcedEvent()) return null;
    var l = todayEvents();
    for (var i = 0; i < COSTUME_ORDER.length; i++) for (var j = 0; j < l.length; j++) if (l[j].id === COSTUME_ORDER[i]) return l[j];
    return null;
  }
  window.puCostume = function () { var ev = costumeEvent(); return ev ? { id: ev.id, hero: ev.hero } : null; };
  /* Fond des grandes fêtes : de petits éléments qui tombent, montent ou dérivent, derrière le contenu. Masqués par « Animations légères » (la teinte reste). */
  var FETE_BG = {
    noel: { k: "fall", n: 30, c: ["❄", "❅", "❆"] },
    halloween: { k: "drift", n: 12, c: ["🦇", "👻", "🦇", "🎃"] },
    valentin: { k: "rise", n: 20, c: ["💗", "💖", "💕"] },
    paques: { k: "sway", n: 16, c: ["🐣", "🌷", "🐰", "🌷"] },
    nouvelan: { k: "sway", n: 30, c: ["🎊", "✨", "🎉", "✨", "⭐", "🎊"] },
    may4: { k: "twinkle", n: 120, c: ["✦", "•", "✧", "⋆", "•", "✦", "·", "✺"] }
  };
  function applyFete() {
    var ev = costumeEvent(), root = document.documentElement, box = document.getElementById("ev-deco"), bg = document.getElementById("ev-bg");
    if (ev) root.setAttribute("data-evt", ev.id); else root.removeAttribute("data-evt");
    if (!ev) { if (box) box.remove(); if (bg) bg.remove(); return; }
    if (!box) { box = document.createElement("div"); box.id = "ev-deco"; box.className = "ev-deco"; box.setAttribute("aria-hidden", "true"); document.body.appendChild(box); }
    var pics = ev.fx.filter(function (x) { var c = x.charCodeAt(0); return x !== ev.emoji && (c >= 0xD800 || (c >= 0x2600 && c < 0x2C00)); }); /* garde les emojis, écarte « L », « π », « ▒ »… */
    box.innerHTML = '<span class="l">' + ev.emoji + '</span><span class="r">' + (pics.length ? pics[pics.length - 1] : ev.emoji) + "</span>";
    var cfg = FETE_BG[ev.id];
    if (!cfg) { if (bg) bg.remove(); return; }
    if (!bg) { bg = document.createElement("div"); bg.id = "ev-bg"; bg.setAttribute("aria-hidden", "true"); document.body.insertBefore(bg, document.body.firstChild); }
    bg.className = "ev-bg ev-bg-" + cfg.k;
    var h = "", i, big = cfg.k === "drift" ? 22 : cfg.k === "twinkle" ? 7 : 14;
    for (i = 0; i < cfg.n; i++) h += '<i style="left:' + (Math.random() * 96).toFixed(1) + "%;top:" + (cfg.k === "drift" || cfg.k === "twinkle" ? (4 + Math.random() * 90).toFixed(0) + "%" : "0") + ";font-size:" + (big + Math.random() * 16).toFixed(0) + "px;" + (cfg.k === "twinkle" && i % 9 === 0 ? "color:#8FE9FF;" : cfg.k === "twinkle" && i % 7 === 0 ? "color:#FFD66B;" : "") + "animation-delay:-" + (Math.random() * 20).toFixed(1) + "s;animation-duration:" + ((cfg.k === "drift" ? 22 : cfg.k === "twinkle" ? 3 : 14) + Math.random() * (cfg.k === "twinkle" ? 5 : 14)).toFixed(1) + "s;--dx:" + Math.round(-60 + Math.random() * 120) + 'px">' + cfg.c[i % cfg.c.length] + "</i>";
    bg.innerHTML = h;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-fete-test]");
    if (t) {
      var id = t.getAttribute("data-fete-test"); try { if (id) sessionStorage.setItem(EVTEST_KEY, id); else sessionStorage.removeItem(EVTEST_KEY); } catch (err) { }
      applyFete(); sfx("toggle"); setTimeout(render, 30); return;
    }
    var rp = e.target.closest && e.target.closest("[data-fete-replay]");
    if (rp) { var ev = testEvt(); if (ev) { try { localStorage.removeItem("powerup365.evfx." + ev.id + "." + todayStr(new Date())); } catch (err) { } eventFx(ev); eventToast(ev, false); } return; }
    var b = e.target.closest && e.target.closest("[data-fete-onoff]"); if (!b) return;
    var on = !feteOn(); try { localStorage.setItem(FETE_KEY, on ? "on" : "off"); } catch (err) { }
    applyFete(); b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); sfx("toggle"); setTimeout(render, 50);
  });
  function nextEvent() {
    var now = new Date(), base = new Date(now.getFullYear(), now.getMonth(), now.getDate()), active = eventsOn(now).map(function (x) { return x.id; });
    for (var i = 1; i < 800; i++) { var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12), l = eventsOn(d).filter(function (x) { return x.id !== "nuit" && active.indexOf(x.id) === -1; }); if (l.length) return { ev: l[0], d: d, n: i }; }
    return null;
  }
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function dayLabel(day, mo) { return window.PU_LANG === "en" ? MONTHS_EN[mo] + " " + day : day + " " + MONTHS_FR[mo]; }
  var MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function eventFx(ev) {
    var key = "powerup365.evfx." + ev.id + "." + todayStr(new Date()); try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch (e) { }
    if (liteOn()) return;
    var box = document.createElement("div"); box.className = "ev-fx"; box.setAttribute("aria-hidden", "true"); var h = "";
    for (var i = 0; i < 28; i++) h += '<i style="left:' + (Math.random() * 96).toFixed(1) + '%;font-size:' + (16 + Math.random() * 22).toFixed(0) + 'px;animation-delay:' + (Math.random() * 3.5).toFixed(2) + 's;animation-duration:' + (5 + Math.random() * 4).toFixed(2) + 's;--dx:' + Math.round(-50 + Math.random() * 100) + 'px">' + ev.fx[i % ev.fx.length] + "</i>";
    box.innerHTML = h; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 10000);
  }
  function eventToast(ev, isNew) {
    var h = window.heroById(ev.hero), el = document.createElement("div"); el.className = "hero-toast ev-toast"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="ht-face">' + window.heroSvg(h, 48) + "</span><div><b>" + ev.emoji + " " + esc(ev.title) + " · " + esc(h.name) + "</b><code>" + esc(ev.say) + "</code>" + (isNew ? '<small class="ht-next">Nouvel événement au calendrier · +10 XP</small>' : "") + playBtn(ev, true) + "</div>" +
      '<button type="button" class="rel-x ev-x" data-ev-x aria-haspopup="true" aria-expanded="false" aria-label="' + (window.PU_LANG === "en" ? "Close" : "Fermer") + '">✕</button>' +
      '<div class="ev-menu" hidden><button type="button" data-ev-act="later" data-ev-id="' + ev.id + '">' + (window.PU_LANG === "en" ? "Remind me in 3 days" : "Me le rappeler dans 3 jours") + '</button><button type="button" data-ev-act="forever" data-ev-id="' + ev.id + '">' + (window.PU_LANG === "en" ? "Don\'t show again" : "Ne plus l\'afficher") + "</button></div>";
    document.body.appendChild(el); sfx(isNew ? "badge" : "open"); dismissToast(el, isNew ? 9000 : 6500);
  }
  function checkEvents() {
    if (!urlForced() && testEvt()) return; /* pendant un test de thème, pas de message automatique : le bouton « Rejouer » s'en charge */
    var list = todayEvents(), t = 0; if (!list.length) return;
    P.events = P.events || {};
    list.forEach(function (ev) {
      var isNew = !P.events[ev.id], force = !!forcedEvent();
      if (!isNew && !force && !!(function () { try { return localStorage.getItem("powerup365.evt." + ev.id + "." + todayStr(new Date())); } catch (e) { return null; } })()) return;
      setTimeout(function fire() {
        /* jamais pendant une question, un combat de boss ou un défi : on attend la fin pour ne pas masquer les réponses */
        if (document.querySelector(".q-layout, .boss-hud, .df-count, .evg-q")) { setTimeout(fire, 3000); return; }
        var before = rankIndex(P.xp);
        if (isNew && !force) { P.events[ev.id] = todayStr(new Date()); P.xp += 10; saveProfile(); }
        try { localStorage.setItem("powerup365.evt." + ev.id + "." + todayStr(new Date()), "1"); } catch (e) { }
        eventFx(ev); eventToast(ev, isNew && !force); setTimeout(render, 80);
        var after = rankIndex(P.xp); if (after > before) setTimeout(function () { rankCeremony(true, after); }, 1800);
      }, 5000 + t * 9500); t++;
    });
  }
  /* =========================================================
     MINI-JEUX DE FÊTE : un petit jeu interactif pour 3 fêtes (sauvegarde, Halloween, Pâques)
     Bouton dans le bandeau du QG et dans le message du gardien. +5 XP une seule fois par fête et par année.
     En test (Maintenance) : progression gardée dans l'onglet seulement, aucun XP.
     ========================================================= */
  var EV_GAMES = { backup: "Répondre à Docteur Backup", halloween: "Fantôme ou vrai mail ?", paques: "Chasse aux œufs" };
  var EGG_SPOTS = [
    { nav: "qg", sel: ".welcome, .hs-track", at: "top", dx: 520 },
    { nav: "jouer", sel: ".jouer-modes .mode-card[href=\"#/classe\"]", at: "bottom", dx: -70 },
    { nav: "detente", sel: ".dtp-card.soon", at: "top", dx: 30 }
  ];
  var EGG_HINTS = [
    "Green Byte n'a pas laissé les œufs en plein milieu : il aime les bords des choses.",
    "Chaque œuf se glisse derrière un bloc de la page, et il n'en dépasse qu'un petit bout. Regarde les contours.",
    "Il y en a un par page : l'accueil, Jouer et Détente. Cherche près d'un grand encadré ou d'une carte."
  ];
  var EVG = null;
  function gameReal() { return !forcedEvent(); }
  function gameKey(ev) { return ev.id + "-" + new Date().getFullYear(); }
  function gameGet(ev) {
    if (gameReal()) { P.evGames = P.evGames || {}; return P.evGames[gameKey(ev)] || {}; }
    try { return JSON.parse(sessionStorage.getItem("powerup365.evgame." + ev.id) || "{}") || {}; } catch (e) { return {}; }
  }
  function gameSet(ev, st) {
    if (gameReal()) { P.evGames = P.evGames || {}; P.evGames[gameKey(ev)] = st; saveProfile(); }
    else { try { sessionStorage.setItem("powerup365.evgame." + ev.id, JSON.stringify(st)); } catch (e) { } }
  }
  /* +5 XP, une seule fois ; renvoie les XP gagnés (0 en test ou si déjà reçus) */
  function gameReward(ev, xp) {
    var st = gameGet(ev); if (st.rewarded || !gameReal()) return 0;
    var before = rankIndex(P.xp); st.rewarded = true; gameSet(ev, st); P.xp += xp; saveProfile();
    setTimeout(render, 80); var after = rankIndex(P.xp); if (after > before) setTimeout(function () { rankCeremony(true, after); }, 1500);
    return xp;
  }
  function eggsFound(ev) { var st = gameGet(ev); return (st.found || []).length; }
  function playBtn(ev, small) {
    if (!EV_GAMES[ev.id]) return "";
    var st = gameGet(ev), tail = ev.id === "paques" ? " " + eggsFound(ev) + "/3" : "", ok = st.done ? "✓ " : "";
    return '<button type="button" class="btn btn-small ' + (st.done ? "btn-ghost" : "btn-primary") + ' ev-play" data-ev-play="' + ev.id + '">' + ok + esc(EV_GAMES[ev.id]) + tail + "</button>";
  }
  var EVG_MAILS = [
    { from: "support@micros0ft-securite.com", subj: "URGENT : votre compte sera supprimé dans 24 h", body: "Nous avons détecté une activité suspecte. Cliquez sur le lien ci-dessous et saisissez votre mot de passe pour éviter la suppression.", phish: true, why: "Le domaine met un zéro à la place du « o », le message joue sur l'urgence et il réclame ton mot de passe. Un vrai service ne te le demande pas par mail." },
    { from: "dsi@ton-entreprise.fr", subj: "Maintenance de la messagerie ce soir à 22 h", body: "La messagerie sera indisponible 30 minutes ce soir. Aucune action n'est nécessaire de ta part. Pour toute question, ouvre un ticket sur l'intranet.", phish: false, why: "Adresse interne attendue, information claire, aucune action demandée et aucun lien à suivre : c'est un message normal." },
    { from: "Colis Express <suivi@colis-express-livraison.top>", subj: "Colis bloqué : 1,99 € de frais à payer maintenant", body: "Votre colis est retenu. Réglez les frais de livraison en cliquant ici avant ce soir, sinon il sera renvoyé.", phish: true, why: "Adresse étrange en « .top », petite somme pour te faire payer vite, pression du temps. Va plutôt sur le site officiel du transporteur, sans passer par le lien." },
    { from: "Service informatique <it@ton-entreprise.fr>", subj: "Ton mot de passe expire dans 14 jours", body: "Pense à le changer depuis les paramètres de ton compte. Ce message ne contient aucun lien : va toi-même sur la page habituelle.", phish: false, why: "Pas de lien ni de pièce jointe, et il te demande d'aller toi-même sur le site habituel. C'est le bon réflexe, et le message est cohérent." }
  ];
  var EVG_BACKUP = [
    ["Hier ou aujourd'hui", "Bravo, c'est le bon réflexe ! Vérifie quand même que tu as plusieurs copies, pas une seule."],
    ["Cette semaine", "Pas mal ! Pour ne plus y penser, automatise-la : OneDrive ou l'historique des fichiers le font tout seuls."],
    ["Je ne sais plus", "Aïe : une sauvegarde dont on ignore la date protège mal. Programme-la une bonne fois : 5 minutes d'effort, et ça tourne ensuite sans toi."],
    ["Jamais", "Courage, le meilleur moment, c'est maintenant. Commence par copier tes fichiers essentiels sur OneDrive et sur un disque externe."]
  ];
  function evgEvent(id) { return EVENTS.filter(function (x) { return x.id === id; })[0]; }
  function evgBody() {
    var ev = EVG.ev, st = gameGet(ev), real = gameReal(), h = "", i;
    if (ev.id === "backup") {
      if (EVG.step === 0) {
        h = '<p class="evg-q">Quand as-tu sauvegardé tes fichiers importants pour la dernière fois ?</p><div class="evg-choices">' + EVG_BACKUP.map(function (c, k) { return '<button type="button" class="btn btn-ghost" data-evg-pick="' + k + '">' + esc(c[0]) + "</button>"; }).join("") + "</div>";
      } else {
        h = '<p class="evg-verdict"><b>' + esc(EVG_BACKUP[EVG.picked][0]) + "</b></p><p>" + esc(EVG_BACKUP[EVG.picked][1]) + '</p><div class="evg-321"><span><b>3</b> copies</span><span><b>2</b> supports différents</span><span><b>1</b> copie hors site</span></div><p class="muted" style="margin:10px 0 0">C\'est la règle 3-2-1 : disque ou clé, plus le nuage, et plus rien ne te fait peur.</p>' + evgReward();
      }
    } else if (ev.id === "halloween") {
      var m = EVG_MAILS[EVG.step];
      if (EVG.step >= EVG_MAILS.length) {
        var sc = EVG.score, msg = sc === 4 ? "Parfait ! Aucun fantôme ne t'a échappé." : sc === 3 ? "Bien joué, un seul t'a piégé." : sc === 2 ? "Moitié-moitié : prends toujours le temps de regarder l'adresse de l'expéditeur." : "Aïe… Entraîne-toi encore, les vrais pièges sont moins faciles à repérer.";
        h = '<p class="evg-q">Ton score : ' + sc + " / " + EVG_MAILS.length + "</p><p>" + msg + "</p>" + evgReward();
      } else {
        h = '<p class="muted" style="margin:0 0 8px">Mail ' + (EVG.step + 1) + " sur " + EVG_MAILS.length + ' · phishing ou légitime ?</p><div class="evg-mail"><small>De : ' + esc(m.from) + "</small><b>" + esc(m.subj) + "</b><p>" + esc(m.body) + "</p></div>";
        if (EVG.answered === null) h += '<div class="evg-choices two"><button type="button" class="btn btn-ghost" data-evg-pick="p">👻 Phishing</button><button type="button" class="btn btn-ghost" data-evg-pick="l">✅ Légitime</button></div>';
        else h += '<p class="evg-verdict ' + (EVG.answered ? "good" : "bad") + '"><b>' + (EVG.answered ? "Bien vu !" : "Raté…") + " C'était " + (m.phish ? "un phishing." : "un vrai message.") + "</b></p><p>" + esc(m.why) + '</p><div class="evg-choices"><button type="button" class="btn btn-primary" data-evg-next>' + (EVG.step === EVG_MAILS.length - 1 ? "Voir mon score" : "Mail suivant") + "</button></div>";
      }
    } else if (ev.id === "paques") {
      var fnd = st.found || [];
      h = '<p class="evg-q">Green Byte a caché 3 œufs dans le site. Sauras-tu les retrouver ?</p><p class="evg-count">' + EGG_SPOTS.map(function (sp, k) { return fnd.indexOf(k) !== -1 ? "🥚" : "❔"; }).join(" ") + " <b>" + fnd.length + " / 3</b></p>" + (EVG.hint ? '<ul class="evg-hints">' + EGG_HINTS.slice(0, EVG.hint).map(function (x) { return "<li>💡 " + esc(x) + "</li>"; }).join("") + "</ul>" : "") + (fnd.length < 3 && (EVG.hint || 0) < EGG_HINTS.length ? '<button type="button" class="evg-hintbtn" data-egg-hint>💡 ' + (EVG.hint ? "Un autre indice ?" : "Un indice ?") + "</button>" : "") + (fnd.length >= 3 ? '<p class="evg-verdict good"><b>Les trois œufs sont dans le panier, bravo !</b></p>' + evgReward() : "");
    }
    return h;
  }
  function evgReward() {
    var ev = EVG.ev, st = gameGet(ev);
    if (!gameReal()) return '<p class="evg-xp muted">Mode test : aucun XP gagné.</p>';
    return st.rewarded ? (EVG.gained ? '<p class="evg-xp">+' + EVG.gained + " XP pour ta participation !</p>" : '<p class="evg-xp muted">Tu as déjà reçu ton bonus pour cette fête.</p>') : "";
  }
  function evgPaint() {
    var d = document.getElementById("evg"); if (!d || !EVG) return;
    var ev = EVG.ev, h = window.heroById(ev.hero);
    d.innerHTML = '<div class="evg-card"><div class="evg-head"><span class="evg-face">' + window.heroSvg(h, 64) + '</span><div><span class="eyebrow" style="color:var(--gold)">' + ev.emoji + " " + esc(ev.title) + "</span><h2 class=\"h-s\" id=\"evg-t\" style=\"margin:2px 0 0\">" + esc(EV_GAMES[ev.id]) + "</h2></div></div>" +
      '<div class="evg-body">' + evgBody() + '</div><div class="evg-foot"><button type="button" class="btn btn-ghost btn-small" data-evg-close>Fermer</button></div></div>';
    var f = d.querySelector(".evg-body button"); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function evgKey(e) { if (e.key === "Escape") evgClose(); }
  function evgOpen(id) {
    var ev = evgEvent(id); if (!ev || !EV_GAMES[id] || document.getElementById("evg")) return;
    var st = gameGet(ev);
    EVG = { ev: ev, step: 0, score: 0, picked: null, answered: null, gained: 0 };
    if (id === "backup" && st.done && st.pick !== undefined) { EVG.step = 1; EVG.picked = st.pick; }
    var d = document.createElement("div"); d.className = "evg"; d.id = "evg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "evg-t");
    document.body.appendChild(d); evgPaint(); sfx("open");
    d.addEventListener("click", function (e) { if (e.target === d || (e.target.closest && e.target.closest("[data-evg-close]"))) evgClose(); });
    document.addEventListener("keydown", evgKey);
  }
  function evgClose() { var d = document.getElementById("evg"); if (d) d.remove(); document.removeEventListener("keydown", evgKey); EVG = null; setTimeout(render, 30); }
  function evgPick(v) {
    var ev = EVG.ev, st = gameGet(ev);
    if (ev.id === "backup") {
      EVG.picked = +v; EVG.step = 1; st.done = true; st.pick = +v; gameSet(ev, st); EVG.gained = gameReward(ev, 5); sfx("good");
    } else if (ev.id === "halloween") {
      var m = EVG_MAILS[EVG.step]; if (EVG.answered !== null) return;
      EVG.answered = (v === "p") === m.phish; if (EVG.answered) { EVG.score++; sfx("good"); } else sfx("bad");
    }
    evgPaint();
  }
  function evgNext() {
    var ev = EVG.ev; EVG.step++; EVG.answered = null;
    if (ev.id === "halloween" && EVG.step >= EVG_MAILS.length) { var st = gameGet(ev); st.done = true; st.score = EVG.score; gameSet(ev, st); if (EVG.score >= 3) EVG.gained = gameReward(ev, 5); sfx(EVG.score >= 3 ? "badge" : "tab"); }
    evgPaint();
  }
  /* Pâques : les œufs cachés dans trois pages, posés après chaque affichage */
  function easterEvent() { var l = todayEvents().filter(function (x) { return x.id === "paques"; }); return l[0] || null; }
  function placeEggs() {
    document.querySelectorAll(".egg-hunt").forEach(function (x) { x.remove(); });
    var ev = easterEvent(); if (!ev || !V) return;
    var fnd = gameGet(ev).found || [];
    EGG_SPOTS.forEach(function (sp, k) {
      if (sp.nav !== V.nav || fnd.indexOf(k) !== -1) return;
      var tg = document.querySelector("#app " + sp.sel), par = tg && tg.parentElement; if (!tg || !par) return;
      if (getComputedStyle(par).position === "static") par.style.position = "relative";
      if (getComputedStyle(tg).position === "static") tg.style.position = "relative";
      tg.style.zIndex = "2";
      var x = sp.dx < 0 ? tg.offsetLeft + tg.offsetWidth + sp.dx : tg.offsetLeft + sp.dx;
      var y = sp.at === "top" ? tg.offsetTop - 13 : tg.offsetTop + tg.offsetHeight - 9;
      par.insertAdjacentHTML("beforeend", '<button type="button" class="egg-hunt" style="left:' + x + "px;top:" + y + 'px" data-egg="' + k + '" aria-label="Un œuf de Pâques caché ! Clique pour le ramasser.">🥚</button>');
    });
  }
  function eggFound(k) {
    var ev = easterEvent(); if (!ev) return;
    var st = gameGet(ev); st.found = st.found || []; if (st.found.indexOf(k) !== -1) return;
    st.found.push(k); var all = st.found.length >= 3; if (all) st.done = true; gameSet(ev, st);
    sfx(all ? "badge" : "good");
    var gain = all ? gameReward(ev, 5) : 0;
    toastMsg(all ? "Les 3 œufs sont trouvés ! Green Byte est fier de toi." + (gain ? " +" + gain + " XP" : "") : "Œuf trouvé : " + st.found.length + " / 3");
    placeEggs(); setTimeout(render, 60);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var pl = t.closest("[data-ev-play]"); if (pl) { e.preventDefault(); evgOpen(pl.getAttribute("data-ev-play")); return; }
    var pk = t.closest("[data-evg-pick]"); if (pk && EVG) { evgPick(pk.getAttribute("data-evg-pick")); return; }
    if (t.closest("[data-evg-next]") && EVG) { evgNext(); return; }
    if (t.closest("[data-egg-hint]") && EVG) { EVG.hint = Math.min(EGG_HINTS.length, (EVG.hint || 0) + 1); sfx("tab"); evgPaint(); return; }
    var rbt = t.closest(".qgd-run"); if (rbt) { evgOpen("paques"); return; }
    var eg = t.closest("[data-egg]"); if (eg) { eggFound(+eg.getAttribute("data-egg")); return; }
    var rs = t.closest("[data-fete-gamereset]"); if (rs) { var ev = testEvt(); if (ev) { try { sessionStorage.removeItem("powerup365.evgame." + ev.id); } catch (err) { } sfx("toggle"); setTimeout(render, 30); } }
  });
  /* =========================================================
     NOUVEAUTÉS : liste des grosses évolutions (bandeau sur le QG, pastille dorée sur l'onglet, page « Nouveautés »).
     Pour annoncer une évolution : ajouter une entrée EN TÊTE de la liste. Ne pas y mettre les secrets.
     ========================================================= */
  var RELEASES = [
    { id: "refonte-labo-portail", date: "2026-10-28", href: "#/",
      fr: { t: "Un QG réorganisé, le Labo et le Portail", cta: "Voir le QG", d: "L'accueil est réorganisé autour de quatre façons de progresser. Le Labo arrive en bêta : missions, terminal, SOC et M365 pour s'entraîner en situation. Et le Portail te permet de mettre ton héros à l'abri et de le retrouver sur un autre appareil." },
      en: { t: "A reorganised HQ, the Lab and the Portal", cta: "See the HQ", d: "The home page is rebuilt around four ways to progress. The Lab arrives in beta: missions, terminal, SOC and M365 to practise in real situations. And the Portal lets you keep your hero safe and carry it to another device." } },
    { id: "allies", date: "2026-10-26", href: "#/",
      fr: { t: "Chaque gardien a ses alliés", cta: "Rencontrer les alliés", d: "Trois nouveaux alliés rejoignent le QG : Alerta (SOC et incidents), Garde-Fou (éthique et sécurité de l'IA) et Low Watt (sobriété et réparabilité). Les gardiens de pilier se repèrent grâce à leur halo et à leur étoile." },
      en: { t: "Every guardian has allies", cta: "Meet the allies", d: "Three new allies join the HQ: Alerta (SOC and incidents), Safeguard (AI ethics and security) and Low Watt (sobriety and repairability). Pillar guardians stand out with a halo and a star." } },
    { id: "defis", date: "2026-10-26", tab: "collectif", href: "#/collectif",
      fr: { t: "Défie un collègue", cta: "Aller à l'onglet Défis", d: "Joue une partie chronométrée (15 secondes par question), envoie le lien : ton collègue répond aux mêmes questions et voit ton score et ton temps à battre. Un défi reçu reste dans l'onglet Défis. L'onglet « Collectif » devient « Défis »." },
      en: { t: "Challenge a colleague", cta: "Go to the Challenges tab", d: "Play a timed game (15 seconds per question) and send the link: your colleague answers the same questions and sees your score and time to beat. A received challenge stays in the Challenges tab. The \u201cCo-op\u201d tab is now \u201cChallenges\u201d." } },
    { id: "fetes-anim", date: "2026-10-25", href: "#/",
      fr: { t: "Des surprises pour les grandes dates", cta: "Voir le QG", d: "De nouvelles décorations animées sont apparues pour certains événements de l'année. Je ne te dis ni lesquelles ni quand : à toi de les découvrir." },
      en: { t: "Surprises for the big dates", cta: "See the HQ", d: "New animated decorations have appeared for some events of the year. I won't tell you which ones or when: it's up to you to find them." } },
    { id: "detente", date: "2026-10-24", tab: "detente", href: "#/detente",
      fr: { t: "L'espace Détente", cta: "Aller à l'onglet Détente", d: "Quatre mini-jeux liés au site (tri du courrier, mot de passe en béton, pare-feu, memory des héros), des scores, un badge et un personnage bonus à débloquer : Combo." },
      en: { t: "The Chill zone", cta: "Go to the Chill tab", d: "Four mini-games tied to the site (mail sorting, concrete password, firewall, heroes memory), scores, a badge and a bonus character to unlock: Combo." } },
    { id: "jouer", date: "2026-10-24", tab: "jouer", href: "#/jouer",
      fr: { t: "Un seul onglet « Jouer »", cta: "Aller à l'onglet Jouer", d: "L'Entraînement et le Mode classé sont réunis dans un seul onglet. Les missions Boss restent à part." },
      en: { t: "One “Play” tab", cta: "Go to the Play tab", d: "Training and Ranked mode now live in a single tab. Boss missions stay separate." } },
    { id: "feu", date: "2026-10-20", hist: 1, href: "#/profil",
      fr: { t: "L'entrée en feu", d: "Cinq jours de suite au QG : ta cape devient flamboyante et la première ouverture du jour s'enflamme." },
      en: { t: "Fiery entrance", d: "Five days in a row at the HQ: your cape turns blazing and the first opening of the day catches fire." } },
    { id: "favoris", date: "2026-10-18", hist: 1, href: "#/veille",
      fr: { t: "Favoris de la veille et cartes dépliantes", d: "Une étoile pour mettre une actu en favori, un filtre « Mes favoris », et des cartes d'accueil qui se déplient pour expliquer Entraînement, Classé et Boss." },
      en: { t: "News favourites and unfolding cards", d: "A star to favourite a news item, a \u201cMy favourites\u201d filter, and home cards that unfold to explain Training, Ranked and Boss." } },
    { id: "calendrier", date: "2026-10-14", hist: 1, href: "#/profil",
      fr: { t: "Le calendrier du QG et les pastilles « nouveau »", d: "Des jours spéciaux avec le message d'un gardien, une pastille dorée sur tout ce que tu viens de débloquer, et une zone sensible pour remettre ta progression à zéro." },
      en: { t: "The HQ calendar and \u201cnew\u201d dots", d: "Special days with a guardian\'s message, a golden dot on everything you just unlocked, and a sensitive zone to reset your progress." } },
    { id: "enligne", date: "2026-10-14", hist: 1, href: "#/confidentialite",
      fr: { t: "Le site est en ligne", d: "Mise en ligne publique, polices hébergées avec le site, page Confidentialité : aucun compte, aucun cookie, ta progression reste dans ton navigateur." },
      en: { t: "The site goes live", d: "Public launch, fonts hosted with the site, a Privacy page: no account, no cookies, your progress stays in your browser." } },
    { id: "anglais", date: "Octobre 2026", dateEn: "October 2026", hist: 1, href: "#/",
      fr: { t: "Version anglaise", d: "Un interrupteur FR | EN : interface, héros et boss traduits." },
      en: { t: "English version", d: "An FR | EN switch: interface, heroes and bosses translated." } },
    { id: "sobriete", date: "Octobre 2026", dateEn: "October 2026", hist: 1, href: "#/apropos",
      fr: { t: "Sobriété numérique", d: "Animations légères, pause quand l'onglet est caché, site allégé : 40 requêtes réduites à 3." },
      en: { t: "Digital sobriety", d: "Light animations, pause when the tab is hidden, a lighter site: 40 requests down to 3." } },
    { id: "intro", date: "Septembre – octobre 2026", dateEn: "September – October 2026", hist: 1, href: "#/",
      fr: { t: "Les portes du QG, les sons et la mascotte", d: "Intro « Prêt à entrer au QG ? », portes futuristes qui s'ouvrent et se referment, sons, mascotte vivante, mode clair « ciel BD »." },
      en: { t: "The HQ doors, sounds and mascot", d: "\u201cReady to enter the HQ?\u201d intro, futuristic doors that open and close, sounds, a living mascot, a \u201ccomic sky\u201d light mode." } },
    { id: "personnalisation", date: "Septembre – octobre 2026", dateEn: "September – October 2026", hist: 1, href: "#/profil",
      fr: { t: "Capes, cadres, fonds et badges", d: "Personnalise ton héros : capes de plus en plus travaillées, cadres d'avatar, fonds de carte, vitrine de badges avec étoiles." },
      en: { t: "Capes, frames, backgrounds and badges", d: "Customize your hero: ever more elaborate capes, avatar frames, card backgrounds, a badge showcase with stars." } },
    { id: "boss", date: "Septembre – octobre 2026", dateEn: "September – October 2026", hist: 1, href: "#/mission",
      fr: { t: "Les missions Boss", d: "Des boss à vaincre sur trois niveaux, avec des questions différentes à chaque niveau, jusqu'au boss ultime « le Grand Blackout »." },
      en: { t: "Boss missions", d: "Bosses to defeat across three levels, with different questions each time, up to the ultimate boss \u201cthe Great Blackout\u201d." } },
    { id: "questions", date: "Septembre – octobre 2026", dateEn: "September – October 2026", hist: 1, href: "#/entrainement",
      fr: { t: "Plus de 1 700 questions, six piliers", d: "Microsoft 365, cybersécurité, informatique, développement, intelligence artificielle et numérique responsable, avec une explication à chaque réponse." },
      en: { t: "Over 1,700 questions, six pillars", d: "Microsoft 365, cybersecurity, IT, development, artificial intelligence and responsible digital use, with an explanation for every answer." } },
    { id: "veille", date: "Septembre 2026", dateEn: "September 2026", hist: 1, href: "#/veille",
      fr: { t: "La veille technologique", d: "Un fil d'actualités sur Microsoft 365, la cybersécurité et l'IA pour rester à jour." },
      en: { t: "Tech watch", d: "A news feed on Microsoft 365, cybersecurity and AI to keep you up to date." } },
    { id: "naissance", date: "2026-09-23", hist: 1, href: "#/apropos",
      fr: { t: "La naissance de Power Up", d: "Première version jouable : des quêtes, des rangs et des héros pour réviser en s'amusant." },
      en: { t: "Power Up is born", d: "First playable version: quests, ranks and heroes to revise while having fun." } }
  ];
  function relEn() { return window.PU_LANG === "en"; }
  function relTxt(x) { return relEn() ? x.en : x.fr; }
  function relState() {
    if (!P.rel) { P.rel = { ban: [], tab: [] }; if (!(P.xp > 0 || P.pseudo)) { P.rel.ban = RELEASES.map(function (x) { return x.id; }); P.rel.tab = P.rel.ban.slice(); } saveProfile(); }
    return P.rel;
  }
  function relMark(kind, id) { var st = relState(); if (st[kind].indexOf(id) === -1) { st[kind].push(id); saveProfile(); } }
  function relTabDot(tab) {
    var st = relState(), hit = RELEASES.some(function (x) { return x.tab === tab && !x.hist && st.tab.indexOf(x.id) === -1; });
    return hit ? '<i class="new-dot inline" aria-hidden="true"></i><span class="sr-only">' + (relEn() ? " (new)" : " (nouveau)") + "</span>" : "";
  }
  function relBanner() {
    var st = relState(), x = RELEASES.filter(function (y) { return !y.hist && st.ban.indexOf(y.id) === -1; })[0]; if (!x) return "";
    var t = relTxt(x), en = relEn();
    return '<div class="ev-banner rel-banner" role="note"><span class="ev-emoji" aria-hidden="true">✨</span><span class="ev-text"><b>' + (en ? "New: " : "Nouveau : ") + esc(t.t) + "</b> · " + esc(t.d) + ' <a class="ev-more" href="' + x.href + '" data-rel-go="' + x.id + '">' + (t.cta || (en ? "Take a look" : "Voir")) + '</a> <a class="ev-more rel-all" href="#/nouveautes" data-rel-go="' + x.id + '">' + (en ? "Read all updates" : "Lire toutes les nouveautés") + '</a></span><button type="button" class="rel-x" data-rel-x="' + x.id + '" aria-label="' + (en ? "Dismiss" : "Fermer l\'annonce") + '">✕</button></div>';
  }
  function relDate(x) { var iso = x.date; if (iso.length < 10 || iso.indexOf("-") !== 4) return relEn() && x.dateEn ? x.dateEn : iso; var p = iso.split("-"); return relEn() ? MONTHS_EN[+p[1] - 1] + " " + (+p[2]) + ", " + p[0] : (+p[2]) + " " + MONTHS_FR[+p[1] - 1] + " " + p[0]; }
  document.addEventListener("click", function (e) {
    var rt = e.target.closest && e.target.closest("[data-rel-test]");
    if (rt) { delete P.rel; delete P.evHide; saveProfile(); toastMsg("Annonces remises à zéro : retourne au QG."); rt.textContent = "✓ Remis à zéro : retourne au QG"; return; }
    var go = e.target.closest && e.target.closest("[data-rel-go]"); if (go) { relMark("ban", go.getAttribute("data-rel-go")); return; }
    var x = e.target.closest && e.target.closest("[data-rel-x]"); if (x) { relMark("ban", x.getAttribute("data-rel-x")); var b = x.closest(".rel-banner"); if (b) b.remove(); }
  });
  function ReleasesView() {
    return {
      nav: "",
      render: function () {
        var en = relEn();
        var items = RELEASES.map(function (x) { var t = relTxt(x); return '<li class="rel-item' + (x.hist ? "" : " rel-new") + '"><span class="rel-dot" aria-hidden="true"></span><time' + (x.date.length === 10 ? ' datetime="' + x.date + '"' : "") + '>' + relDate(x) + '</time><h2><a href="' + x.href + '">' + esc(t.t) + '</a></h2><p>' + esc(t.d) + "</p></li>"; }).join("");
        var idea = '<aside class="rel-idea"><span class="rel-idea-ico" aria-hidden="true">💡</span><div><h2>' + (en ? "Got an idea for what\'s next?" : "Une idée pour la suite ?") + '</h2><p>' + (en ? "A feature, a game, a boss, a question you would like to see: tell us." : "Une fonction, un jeu, un boss, une question que tu aimerais voir : dis-le-nous.") + '</p></div><button type="button" class="btn btn-primary" data-feedback>' + (en ? "Open the idea box" : "Ouvrir la boîte à idées") + "</button></aside>";
        return '<main class="container page"><span class="eyebrow">' + (en ? "Roadmap" : "Feuille de route") + '</span><h1 class="h-l">' + (en ? "What\'s new" : "Les nouveautés de Power Up") + '</h1><p class="lead">' + (en ? "The big changes, newest first." : "Les grosses évolutions du site, de la plus récente à la plus ancienne.") + '</p><ol class="rel-list">' + items + "</ol>" + idea + '<div class="btn-row"><a class="btn btn-ghost" href="#/">' + (en ? "Back to home" : "Retour à l\'accueil") + "</a></div></main>";
      }
    };
  }
  function evKey(ev) { return ev.id + "-" + new Date().getFullYear(); }
  function evHidden(ev) { var h = P.evHide && P.evHide[evKey(ev)]; return !!(h && (h === "forever" || Date.now() < h)); }
  function eventBanner() {
    var forced = !!forcedEvent(), l = todayEvents().filter(function (x) { return forced || !evHidden(x); }); if (!l.length) return ""; l.sort(function (a, b) { var x = COSTUME_ORDER.indexOf(a.id), y = COSTUME_ORDER.indexOf(b.id); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); }); var ev = l[0], url = EVENT_LINKS[ev.id], en = window.PU_LANG === "en";
    var inner = '<span class="ev-emoji" aria-hidden="true">' + ev.emoji + "</span><span class=\"ev-text\"><b>" + esc(ev.title) + "</b> · " + esc(ev.banner) + (url ? ' <span class="ev-more">En savoir plus ↗</span>' : "") + "</span>";
    var main = url ? '<a class="ev-inner ev-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>" : '<div class="ev-inner">' + inner + "</div>";
    return '<div class="ev-banner ev-wrap" role="note">' + main + playBtn(ev) + '<button type="button" class="rel-x ev-x" data-ev-x aria-haspopup="true" aria-expanded="false" aria-label="' + (en ? "Close this banner" : "Fermer ce bandeau") + '">✕</button>' +
      '<div class="ev-menu" hidden><button type="button" data-ev-act="later" data-ev-id="' + ev.id + '">' + (en ? "Remind me in 3 days" : "Me le rappeler dans 3 jours") + '</button><button type="button" data-ev-act="forever" data-ev-id="' + ev.id + '">' + (en ? "Don\'t show again" : "Ne plus l\'afficher") + "</button></div></div>";
  }
  document.addEventListener("click", function (e) {
    var t = e.target, x = t.closest && t.closest("[data-ev-x]");
    if (x) { var m = x.parentNode.querySelector(".ev-menu"), open = m.hidden; m.hidden = !open; x.setAttribute("aria-expanded", open ? "true" : "false"); if (open) { var f = m.querySelector("button"); if (f) f.focus(); } return; }
    var act = t.closest && t.closest("[data-ev-act]");
    if (act) {
      var ev = EVENTS.filter(function (y) { return y.id === act.getAttribute("data-ev-id"); })[0]; if (ev) { P.evHide = P.evHide || {}; P.evHide[evKey(ev)] = act.getAttribute("data-ev-act") === "forever" ? "forever" : Date.now() + 3 * 86400000; saveProfile(); }
      var bn = act.closest(".ev-banner"); if (bn) bn.remove();
      var tt = act.closest(".ev-toast"); if (tt) { tt.classList.add("out"); setTimeout(function () { tt.remove(); }, 380); document.querySelectorAll(".ev-banner").forEach(function (b) { b.remove(); }); }
      return;
    }
    document.querySelectorAll(".ev-menu:not([hidden])").forEach(function (m) { m.hidden = true; var b = m.parentNode.querySelector("[data-ev-x]"); if (b) b.setAttribute("aria-expanded", "false"); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") document.querySelectorAll(".ev-menu:not([hidden])").forEach(function (m) { m.hidden = true; var b = m.parentNode.querySelector("[data-ev-x]"); if (b) { b.setAttribute("aria-expanded", "false"); b.focus(); } }); });
  function renderCalendar() {
    var found = eventsFound(), nx = nextEvent();
    var tilesE = EVENTS.filter(function (x) { return P.events && P.events[x.id]; }).map(function (x) {
      var p = P.events[x.id].split("-");
      return '<details class="vt-sheet" data-pg="ve-' + x.id + '"' + (openPG["ve-" + x.id] ? " open" : "") + '><summary class="vt-tile"><span class="vt-emoji" aria-hidden="true">' + x.emoji + '</span><span class="vt-v">' + esc(x.title) + '</span><span class="vt-s">' + dayLabel(+p[2], +p[1] - 1) + '</span></summary><div class="vt-body"><div class="vt-head"><b>' + esc(x.title) + '</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div><p class="vt-text">' + esc(x.done) + ' <span class="muted">(' + dayLabel(+p[2], +p[1] - 1) + ")</span></p></div></details>";
    }).join("");
    var cards = EVENTS.filter(function (x) { return P.events && P.events[x.id]; }).map(function (x) {
      var p = P.events[x.id].split("-");
      return '<div class="secret-card found vt-desk"><span class="secret-ico" aria-hidden="true">' + x.emoji + "</span><div><b>" + esc(x.title) + "</b><p>" + esc(x.done) + " <span>(" + dayLabel(+p[2], +p[1] - 1) + ")</span></p></div></div>";
    }).join("");
    if (nx) { var en = window.PU_LANG === "en"; cards += '<div class="secret-card"><span class="secret-ico" aria-hidden="true">' + nx.ev.emoji + '</span><div><b>Prochain rendez-vous</b><p>' + esc(nx.ev.title) + (en ? ": " + (nx.n === 1 ? "tomorrow" : "in " + nx.n + " days") + " (" + dayLabel(nx.d.getDate(), nx.d.getMonth()) + "). Come back that day, the HQ will have a little something for you." : " : " + (nx.n === 1 ? "demain" : "dans " + nx.n + " jours") + " (" + dayLabel(nx.d.getDate(), nx.d.getMonth()) + "). Reviens ce jour-là, le QG aura un petit quelque chose pour toi.") + "</p></div></div>"; }
    return '<section class="section secrets" aria-labelledby="cal-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--gold)">Jours spéciaux</span><h2 class="h-l" id="cal-title">Le calendrier du QG</h2></div><p class="muted" style="margin:0">' + found + " / " + EVENTS.length + (window.PU_LANG === "en" ? " events celebrated · +10 XP for each new one" : " événements fêtés · +10 XP à chaque nouveau") + "</p></div>" +
      '<p class="muted" style="margin:0 0 14px">Halloween, Noël, Pâques, Patch Tuesday… Certains jours, le QG et ses gardiens ont un message pour toi. Reviens le bon jour pour les découvrir.</p><div class="vt-mobile vt-grid">' + tilesE + '</div><div class="secrets-grid">' + cards + "</div></section>";
  }

  function renderSecrets() {
    var nb = nextBirthday(), found = secretsFound(), all = found === SECRETS.length;
    var tilesS = SECRETS.filter(function (x) { return P.secrets && P.secrets[x.id]; }).map(function (x) {
      return '<details class="vt-sheet" data-pg="vs-' + x.id + '"' + (openPG["vs-" + x.id] ? " open" : "") + '><summary class="vt-tile"><span class="vt-emoji" aria-hidden="true">' + secretIcon(x.id) + '</span><span class="vt-v">' + esc(x.title) + '</span><span class="vt-s">Secret trouvé</span></summary><div class="vt-body"><div class="vt-head"><b>' + esc(x.title) + '</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div><p class="vt-text">' + esc(x.done) + "</p></div></details>";
    }).join("");
    var cards = SECRETS.filter(function (x) { return P.secrets && P.secrets[x.id]; }).map(function (x) {
      return '<div class="secret-card found vt-desk"><span class="secret-ico" aria-hidden="true">' + secretIcon(x.id) + '</span><div><b>' + esc(x.title) + "</b><p>" + esc(x.done) + "</p></div></div>";
    }).join("");
    if (!all) {
      var left = SECRETS.filter(function (x) { return !(P.secrets && P.secrets[x.id]); }), pick = left[new Date().getDate() % left.length];
      var pp = P.secretsProgress || {};
      if (!(P.secrets && P.secrets.terminal) && (pp.sudo || pp.ping)) pick = SECRETS.filter(function (x) { return x.id === "terminal"; })[0];
      var hint = (pick.id === "terminal" && (pp.sudo || pp.ping) ? "Tu as déjà appelé " + (pp.sudo ? "Sudo" : "Miss Ping") + ". Un deuxième gardien répond à son nom tapé au clavier : lequel ?" : pick.hint) + (pick.id === "birthday" && nb ? " Prochain anniversaire : " + window.heroById(nb.id).name + ", le " + nb.d.getDate() + " " + ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][nb.d.getMonth()] + "." : "");
      cards += '<div class="secret-card"><span class="secret-ico" aria-hidden="true">?</span><div><b>' + (found ? "D'autres secrets t'attendent…" : "Des secrets se cachent dans le QG…") + "</b><p>Indice du jour : " + esc(hint) + "</p></div></div>";
    }
    var howTo = '<div class="secret-how"><b>Comment taper un secret ?</b><p><span>💻 Sur ordinateur :</span> tape directement au clavier, n\'importe où sur le site (pas dans le Labo ni dans une zone de texte).</p><p><span>📱 Sur téléphone :</span> ouvre ton profil, appuie dans le champ « Ton pseudo » et tape le mot-secret. Pas besoin d\'enregistrer, tu peux l\'effacer ensuite.</p></div>';
    return '<section class="section secrets" aria-labelledby="secrets-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--gold)">Chasse aux secrets</span><h2 class="h-l" id="secrets-title">Les secrets du QG</h2></div><p class="muted" style="margin:0">' + (all ? "Tous les secrets sont trouvés · badge Chasseur de secrets obtenu !" : (found ? found + " secret" + (found > 1 ? "s" : "") + " trouvé" + (found > 1 ? "s" : "") + " · +20 XP par secret" : "+20 XP par secret trouvé")) + '</p></div>' + howTo + '<div class="vt-mobile vt-grid">' + tilesS + '</div><div class="secrets-grid">' + cards + "</div></section>";
  }


  /* =========================================================
     BADGES : vitrine de médailles néon (étape 26)
     ========================================================= */
  var openPG = {};
  document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.dataset && d.dataset.pg) openPG[d.dataset.pg] = d.open;
    if (d && d.open && d.classList && (d.classList.contains("custom-step") || d.classList.contains("vt-sheet"))) [].forEach.call(document.querySelectorAll(".custom-step[open], .vt-sheet[open]"), function (o) { if (o !== d) o.open = false; });
  }, true);
  document.addEventListener("click", function (e) { var t = e.target, bb = t.closest && t.closest(".vt-b");
    if (bb) { var bx = bb.closest(".vt-body"), dt = bx && bx.querySelector(".vt-det"); [].forEach.call(bx.querySelectorAll(".vt-b"), function (o) { o.setAttribute("aria-pressed", String(o === bb)); }); if (dt) dt.innerHTML = "<b>" + esc(bb.getAttribute("data-bn")) + "</b><small>" + esc(bb.getAttribute("data-bs") + " · " + bb.getAttribute("data-bd")) + "</small>"; return; }
    var st = t.closest && t.closest(".custom-step, .vt-sheet"); if (!st || !st.open) return;
    if (t.closest("[data-sheet-close]") || t === st) { e.preventDefault(); st.open = false; var sm = st.querySelector("summary"); if (sm) sm.focus(); } });
  function factOfDay(st, id) {
    var list = st.facts && st.facts.length ? st.facts : [st.fact], day = Math.floor(Date.now() / 86400000), off = 0;
    for (var i = 0; i < (id || "").length; i++) off += id.charCodeAt(i);
    return list[(day + off) % list.length];
  }
  /* Chaînes par-dessus Légende verrouillée (elles se brisent au déblocage) */
  function chainStrip(side) {
    var links = "";
    for (var k = 0; k < 9; k++) { var x = 4 + k * 22; links += (k % 2 ? '<rect x="' + (x + 2) + '" y="10" width="22" height="6" rx="3" fill="url(#chm)" stroke="#5A6272" stroke-width="1"/>' : '<rect x="' + x + '" y="4" width="26" height="18" rx="9" fill="none" stroke="url(#chm)" stroke-width="4.5"/><rect x="' + x + '" y="4" width="26" height="18" rx="9" fill="none" stroke="#3B4150" stroke-width="1" opacity=".6"/>'); }
    return '<svg class="chain ' + side + '" viewBox="0 0 208 26" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8ECF4"/><stop offset=".5" stop-color="#9AA3B5"/><stop offset="1" stop-color="#5A6272"/></linearGradient></defs>' + links + "</svg>";
  }
  function chainsHtml(breaking) {
    var lock = '<svg class="chain-lock" viewBox="0 0 40 46" aria-hidden="true"><path d="M11 20v-7a9 9 0 0 1 18 0v7" fill="none" stroke="#D9A35B" stroke-width="5" stroke-linecap="round"/><rect x="5" y="19" width="30" height="24" rx="5" fill="#F5C451" stroke="#8A5A12" stroke-width="2"/><circle cx="20" cy="29" r="3.5" fill="#6B4E12"/><rect x="18.5" y="30" width="3" height="7" rx="1.5" fill="#6B4E12"/></svg>';
    return '<span class="lv-chains' + (breaking ? " breaking" : "") + '" aria-hidden="true"><span class="ch-diag d1">' + chainStrip("l") + chainStrip("r") + '</span><span class="ch-diag d2">' + chainStrip("l") + chainStrip("r") + "</span>" + lock + "</span>";
  }
  function legendUnlocked() { return rankIndex(P.xp) >= 2; }
  function legendOpen(q) { return q.level !== "legende" || q.trial || legendUnlocked(); }
  function markRunEnd() { var h = new Date().getHours(); if (h >= 22) P.stats.night = 1; if (h < 8 && h >= 4) P.stats.early = 1; }
  var BI = {
    shield: '<path d="M0-22 L18-14 V2 C18 13 9 20 0 24 C-9 20-18 13-18 2 V-14 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M-8 1 L-2 7 L9-5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    skull: '<path d="M-15 2 C-15-12-8-19 0-19 C8-19 15-12 15 2 C15 7 11 9 9 10 V17 H-9 V10 C-11 9-15 7-15 2 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><circle cx="-6" cy="-1" r="3.8" fill="currentColor"/><circle cx="6" cy="-1" r="3.8" fill="currentColor"/><path d="M-4 17 V12 M0 17 V12 M4 17 V12" stroke="currentColor" stroke-width="2.4"/>',
    crown: '<path d="M-18 12 L-20-10 L-8 0 L0-16 L8 0 L20-10 L18 12 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M-18 18 H18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    bolt: '<path d="M4-22 L-13 3 H-1 L-5 22 L13-4 H1 Z" fill="currentColor"/>',
    portal: '<ellipse cx="0" cy="0" rx="11" ry="19" fill="none" stroke="currentColor" stroke-width="3.2"/><ellipse cx="0" cy="0" rx="5" ry="10" fill="none" stroke="currentColor" stroke-width="3"/>',
    cal: '<rect x="-17" y="-14" width="34" height="31" rx="4" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M-17-5 H17 M-9-20 V-10 M9-20 V-10" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M-7 6 L-2 11 L8 1" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    key: '<circle cx="-8" cy="-6" r="9" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M-1 1 L17 19 M9 11 L14 6 M13 15 L18 10" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    trophy: '<path d="M-11-18 H11 V-4 C11 5 5 10 0 10 C-5 10-11 5-11-4 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M-11-13 H-18 C-18-4-14-1-10 0 M11-13 H18 C18-4 14-1 10 0 M0 10 V17 M-9 20 H9" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    run: '<circle cx="4" cy="-17" r="4.5" fill="currentColor"/><path d="M-12-2 L-2-9 L7-6 L13 2 M-2-9 L-5 5 L4 11 L1 21 M-5 5 L-14 13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
    target: '<circle r="18" fill="none" stroke="currentColor" stroke-width="3"/><circle r="10.5" fill="none" stroke="currentColor" stroke-width="3"/><circle r="3.8" fill="currentColor"/>',
    grid: '<rect x="-17" y="-17" width="14" height="14" rx="3" fill="currentColor"/><rect x="3" y="-17" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="-17" y="3" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="3" y="3" width="14" height="14" rx="3" fill="currentColor"/>',
    sword: '<path d="M14-18 L-6 2 M16-20 L10-19 L-9 0 L-5 4 L14-15 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M-12-3 L3 12 M-7 7 L-15 15" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    feather: '<path d="M16-20 C-4-16-14 0-12 16 C2 14 16 2 16-20 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M-16 21 L8-11 M-4 4 H6 M-8 10 H1" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>',
    heart: '<path d="M0 18 C-22 4-20-14-9-15 C-4-15-1-11 0-8 C1-11 4-15 9-15 C20-14 22 4 0 18 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M-10-1 H-5 L-2-7 L2 5 L5-1 H10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    moon: '<path d="M6-19 C-8-18-17-7-15 6 C-13 17 1 22 12 15 C1 14-6 5-4-6 C-3-12 1-17 6-19 Z" fill="currentColor"/><circle cx="12" cy="-9" r="2" fill="currentColor"/><circle cx="16" cy="1" r="1.5" fill="currentColor"/>',
    sun: '<circle r="8" fill="currentColor"/><path d="M0-20 V-14 M0 14 V20 M-20 0 H-14 M14 0 H20 M-14-14 L-10-10 M10 10 L14 14 M14-14 L10-10 M-10 10 L-14 14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    eye: '<path d="M-20 0 C-12-12 12-12 20 0 C12 12-12 12-20 0 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><circle r="6" fill="currentColor"/>'
  };
  function bNum(t) { return '<text x="0" y="' + (t.length > 3 ? 6 : 8) + '" text-anchor="middle" font-family="Anton,sans-serif" font-size="' + (t.length > 3 ? 19 : 23) + '" fill="currentColor">' + t + "</text>"; }
  var BTIER = { bronze: "#D08A4E", argent: "#C9D3E3", or: "#F5C451" };
  function medalSvg(color, icon, shape, tier, size) {
    var ring = tier ? BTIER[tier] : color, s = "", fill = "var(--medal-bg, rgba(11,14,19,.85))";
    if (shape === "hex") s = '<path d="M0-44 L38-22 V22 L0 44 L-38 22 V-22 Z" fill="' + fill + '" stroke="' + ring + '" stroke-width="3"/><path d="M0-37 L32-18.5 V18.5 L0 37 L-32 18.5 V-18.5 Z" fill="none" stroke="' + color + '" stroke-opacity=".45" stroke-width="1.5"/>';
    else if (shape === "shield") s = '<path d="M0-44 L36-32 V2 C36 24 18 38 0 45 C-18 38-36 24-36 2 V-32 Z" fill="' + fill + '" stroke="' + ring + '" stroke-width="3"/><path d="M0-37 L29-27 V2 C29 19 15 31 0 37 C-15 31-29 19-29 2 V-27 Z" fill="none" stroke="' + color + '" stroke-opacity=".45" stroke-width="1.5"/>';
    else if (shape === "star") { var pts = []; for (var k = 0; k < 16; k++) { var r = k % 2 ? 36 : 45, a = Math.PI * k / 8 - Math.PI / 2; pts.push((r * Math.cos(a)).toFixed(1) + "," + (r * Math.sin(a)).toFixed(1)); } s = '<polygon points="' + pts.join(" ") + '" fill="' + fill + '" stroke="' + ring + '" stroke-width="3" stroke-linejoin="round"/><circle r="29" fill="none" stroke="' + color + '" stroke-opacity=".45" stroke-width="1.5"/>'; }
    else s = '<circle r="43" fill="' + fill + '" stroke="' + ring + '" stroke-width="3"/><circle r="36" fill="none" stroke="' + color + '" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 4"/>';
    return '<svg class="medal" viewBox="-50 -50 100 100" width="' + (size || 84) + '" height="' + (size || 84) + '" style="color:' + color + '" aria-hidden="true">' + s + '<g transform="scale(.95)">' + icon + "</g></svg>";
  }
  function computeBadges() {
    ensureStats();
    var st = P.stats, C = { gold: "#F5C451", prog: "#6E88FF", mast: "#3FE0C5", boss: "#FF5A6E", defi: "#B57BFF" };
    var read = 0; try { read = Object.keys(veilleRead || {}).length; } catch (e) { }
    function pil(id) { var a = 0, c = 0; THEMES.forEach(function (t) { if (t.pillar === id && st.themes[t.id]) { a += st.themes[t.id].a; c += st.themes[t.id].c; } }); return { a: a, c: c }; }
    var fams = [
      { id: "base", title: "Les classiques", color: C.gold, items: [
        { n: "Bouclier niv. 1", d: "Vaincre le Phisher", i: BI.shield, s: "shield", on: !!P.missionWon },
        { n: "Survivant·e Légende", d: "Terminer une partie en niveau Légende", i: BI.skull, s: "hex", on: st.legendRuns > 0 },
        { n: "Légende absolue", d: "Une partie Légende sans aucune erreur", i: BI.crown, s: "star", on: st.legendPerfect > 0 },
        { n: "Série de 10", d: "10 bonnes réponses d'affilée", i: BI.bolt, s: "circle", on: P.bestStreak >= 10 },
        { n: "Assidu·e", d: "Jouer 7 jours différents", i: BI.cal, s: "circle", on: st.days.length >= 7 },
        { n: "Chasseur de secrets", d: "Trouver tous les secrets du QG", i: BI.key, s: "star", on: secretsFound() >= SECRETS.length },
        { n: "Touche-à-tout", d: "Essayer les quatre jeux de l'espace détente", i: BI.eye, s: "hex", on: !!(P.detente && P.detente.mail && P.detente.mail.plays && P.detente.pwd && P.detente.pwd.plays && P.detente.fw && P.detente.fw.plays && P.detente.mem && P.detente.mem.plays) },
        { n: "Œil de lynx", d: "Faire " + DETENTE_TARGET + " points au tri du courrier (espace détente)", i: BI.eye, s: "hex", on: detenteData().best >= DETENTE_TARGET },
        { n: "Fêtard·e du QG", d: "Fêter 5 événements du calendrier au QG", i: BI.cal, s: "circle", on: eventsFound() >= 5, p: [Math.min(eventsFound(), 5), 5] },
        { n: "Passeur·se de portail", d: "Créer ton premier code ou lien dans le Portail pour mettre ton héros à l'abri", i: BI.portal, s: "circle", on: !!(P.portal && P.portal.at) }
      ] },
      { id: "prog", title: "Progression", color: C.prog, items: [
        { n: "Première victoire", d: "Finir une partie classée avec au moins la moitié de bonnes réponses", i: BI.trophy, s: "circle", on: (st.rankedWins || 0) > 0 },
        { n: "Centurion·ne", d: "100 bonnes réponses", i: bNum("100"), s: "hex", t: "bronze", on: st.correct >= 100, p: [st.correct, 100] },
        { n: "Centurion·ne II", d: "500 bonnes réponses", i: bNum("500"), s: "hex", t: "argent", on: st.correct >= 500, p: [st.correct, 500] },
        { n: "Centurion·ne III", d: "1000 bonnes réponses", i: bNum("1000"), s: "hex", t: "or", on: st.correct >= 1000, p: [st.correct, 1000] },
        { n: "Marathonien·ne", d: "Jouer 30 jours différents", i: BI.run, s: "circle", on: st.days.length >= 30, p: [st.days.length, 30] }
      ] },
      { id: "mast", title: "Maîtrise", color: C.mast, items: PILLARS.map(function (pl) {
        var x = pil(pl.id), ok = x.a >= 50 && x.c / x.a >= 0.8;
        return { n: "Expert " + pl.short, d: "80 % de réussite sur au moins 50 questions " + (pl.id === "vert" ? "de numérique responsable" : "du pilier " + pl.short), i: BI.target, s: "hex", c: pl.color, on: ok, p: x.a < 50 ? [x.a, 50] : null };
      }).concat([{ n: "Touche-à-tout", d: "Répondre à des questions de chaque pilier", i: BI.grid, s: "circle", on: PILLARS.every(function (pl) { return pil(pl.id).a > 0; }) }]) },
      { id: "boss", title: "Boss", color: C.boss, items: [] },
      { id: "defi", title: "Défis", color: C.defi, items: [
        { n: "Sans filet", d: "Vaincre un boss sans perdre un seul bouclier", i: BI.heart, s: "hex", on: (st.flawlessBoss || 0) > 0 },
        { n: "Oiseau de nuit", d: "Finir une partie classée ou un boss après 22 h", i: BI.moon, s: "circle", on: !!st.night },
        { n: "Lève-tôt", d: "Finir une partie classée ou un boss avant 8 h", i: BI.sun, s: "circle", on: !!st.early },
        { n: "Veilleur·se", d: "Lire 20 articles de la veille", i: BI.eye, s: "circle", on: read >= 20, p: [read, 20] }
      ] }
    ];
    var bossItems = fams[3].items;
    (window.BOSSES || []).filter(function (b) { return b.status === "live"; }).forEach(function (b) {
      var lv = (P.bosses && P.bosses[b.id] && P.bosses[b.id].levels) || {}, nm = b.name.replace(/^(le |la |l')/i, ""), cap = nm.charAt(0).toUpperCase() + nm.slice(1);
      [["bronze", 1], ["argent", 2], ["or", 3]].forEach(function (t) { bossItems.push({ n: cap + " · " + t[0], d: "Vaincre " + b.name + " au niveau " + t[1], i: BI.sword, s: "shield", t: t[0], on: !!lv[t[1]] }); });
    });
    bossItems.push({ n: "Plume d'or", d: "Trouver les 4 points d'un coup de grâce", i: BI.feather, s: "star", on: !!st.graceFull });
    return fams;
  }
  function earnedBadges() { var out = []; computeBadges().forEach(function (f) { f.items.forEach(function (b) { if (b.on) out.push(b.n); }); }); return out; }
  function renderVitrine() {
    var fams = computeBadges(), total = 0, got = 0;
    fams.forEach(function (f) { f.items.forEach(function (b) { total++; if (b.on) got++; }); });
    var html = fams.map(function (f) {
      var items = f.items.filter(function (b) { return b.on; }).concat(f.items.filter(function (b) { return !b.on; }));
      function card(b) {
        var col = b.c || f.color, glow = b.t ? BTIER[b.t] : col;
        var prog = !b.on && b.p ? '<span class="vit-prog"><i style="width:' + Math.min(100, Math.round(b.p[0] / b.p[1] * 100)) + '%"></i></span><em class="vit-pnum">' + Math.min(b.p[0], b.p[1]) + " / " + b.p[1] + "</em>" : "";
        return '<div class="vit-badge ' + (b.on ? "on" : "off") + '" style="--c:' + glow + '" tabindex="0" aria-label="' + esc(b.n + " : " + (b.on ? "obtenu" : "à débloquer, " + b.d)) + '">' + medalSvg(col, b.i, b.s, b.t) + "<b>" + esc(b.n) + "</b><p>" + esc(b.d) + "</p>" + prog + '<span class="vit-state">' + (b.on ? "Obtenu" : "À débloquer") + "</span>" + (b.on && P.badgeDates && P.badgeDates[b.n] ? '<small class="vit-date">le ' + esc(frDate(P.badgeDates[b.n])) + "</small>" : "") + "</div>";
      }
      var lim = items.length <= 10 ? items.length : 14, first = items.slice(0, lim), rest = items.slice(lim);
      return '<div class="vit-fam"><h3 class="vit-title" style="color:' + f.color + '">' + esc(f.title) + ' <small>' + f.items.filter(function (b) { return b.on; }).length + " / " + f.items.length + '</small></h3><div class="vit-grid">' + first.map(card).join("") + "</div>" +
        (rest.length ? '<details class="vit-more" data-pg="vit-' + f.id + '"' + (openPG["vit-" + f.id] ? " open" : "") + '><summary>Voir les ' + rest.length + " autres badges" + ' <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="vit-grid">' + rest.map(card).join("") + "</div></details>" : "") + "</div>";
    }).join("");
    var tilesM = fams.map(function (f) {
      var items = f.items.filter(function (b) { return b.on; }).concat(f.items.filter(function (b) { return !b.on; })), on = f.items.filter(function (b) { return b.on; }).length;
      var med = items.slice(0, 5).map(function (b) { return '<span class="vt-m ' + (b.on ? "on" : "off") + '">' + medalSvg(b.c || f.color, b.i, b.s, b.t, 24) + "</span>"; }).join("");
      var btns = items.map(function (b) {
        var d = b.d + (!b.on && b.p ? " · " + Math.min(b.p[0], b.p[1]) + " / " + b.p[1] : "") + (b.on && P.badgeDates && P.badgeDates[b.n] ? " · obtenu le " + frDate(P.badgeDates[b.n]) : "");
        return '<button type="button" class="vt-b ' + (b.on ? "on" : "off") + '" data-bn="' + esc(b.n) + '" data-bd="' + esc(d) + '" data-bs="' + (b.on ? "Obtenu" : "À débloquer") + '" aria-pressed="false" aria-label="' + esc(b.n + " : " + (b.on ? "obtenu" : "à débloquer")) + '">' + medalSvg(b.c || f.color, b.i, b.s, b.t, 48) + "</button>";
      }).join("");
      return '<details class="vt-sheet" data-pg="vtf-' + f.id + '"' + (openPG["vtf-" + f.id] ? " open" : "") + '><summary class="vt-tile" style="--c:' + f.color + '"><span class="vt-k">Famille</span><span class="vt-v">' + esc(f.title) + '</span><span class="vt-medals" aria-hidden="true">' + med + '</span><span class="vt-s">' + on + " / " + f.items.length + ' obtenus</span><span class="vt-bar" aria-hidden="true"><i style="width:' + Math.round(100 * on / Math.max(1, f.items.length)) + '%"></i></span></summary><div class="vt-body"><div class="vt-head"><b>' + esc(f.title) + " · " + on + " / " + f.items.length + '</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div><div class="vt-grid4">' + btns + '</div><div class="vt-det" role="status"><b>Touche un badge</b><small>Son nom et sa condition s\'affichent ici.</small></div></div></details>';
    }).join("");
    return '<section class="section vitrine" aria-labelledby="vit-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--gold)">Mes récompenses</span><h2 class="h-l" id="vit-title">La vitrine des badges</h2></div><p class="muted" style="margin:0">' + got + " badge" + (got > 1 ? "s" : "") + " sur " + total + ". Touche une famille pour voir ses médailles et leurs conditions.</p></div>" + '<div class="vt-grid vt-always">' + tilesM + "</div></section>";
  }

  /* =========================================================
     FICHE D'UN MONDE : contenu + « Pour aller plus loin » (étape 27)
     Liens vérifiés en septembre 2026 : les offres gratuites peuvent évoluer.
     ========================================================= */
  var FURTHER = {
    m365: [
      { n: "Microsoft Learn · parcours Microsoft 365", u: "https://learn.microsoft.com/fr-fr/training/browse/?products=m365", d: "Des modules gratuits et interactifs, du débutant à l'administrateur.", t: "Cours gratuit" },
      { n: "Microsoft Applied Skills", u: "https://learn.microsoft.com/fr-fr/credentials/applied-skills/", d: "Des attestations de compétences pratiques, évaluées par un atelier en ligne.", t: "Certification gratuite" },
      { n: "Microsoft 365 Fundamentals (MS-900)", u: "https://learn.microsoft.com/fr-fr/credentials/certifications/microsoft-365-fundamentals/", d: "La certification d'entrée Microsoft 365. Préparation gratuite, examen payant.", t: "Certification" },
      { n: "Formation Microsoft 365 (support Microsoft)", u: "https://support.microsoft.com/fr-fr/training", d: "Tutoriels courts sur Teams, Outlook, OneDrive, Word, Excel…", t: "Tutoriels" }
    ],
    cyber: [
      { n: "SecNumacadémie (ANSSI)", u: "https://secnumacademie.gouv.fr/", d: "Le MOOC officiel de l'ANSSI pour les bases de la cybersécurité, avec attestation.", t: "Attestation gratuite" },
      { n: "Introduction to Cybersecurity (Cisco NetAcad)", u: "https://www.netacad.com/courses/introduction-to-cybersecurity", d: "Cours en ligne gratuit avec badge numérique à la clé.", t: "Badge gratuit" },
      { n: "L'atelier RGPD (CNIL)", u: "https://atelier-rgpd.cnil.fr/", d: "Le MOOC de la CNIL pour comprendre le RGPD, avec attestation de suivi.", t: "Attestation gratuite" },
      { n: "Cybermalveillance.gouv.fr", u: "https://www.cybermalveillance.gouv.fr/", d: "Fiches pratiques, kit de sensibilisation et alertes sur les arnaques.", t: "Ressources" },
      { n: "Root Me", u: "https://www.root-me.org/", d: "Des centaines de challenges de hacking éthique, en français.", t: "Entraînement" },
      { n: "TryHackMe", u: "https://tryhackme.com/", d: "Des salles guidées pour pratiquer l'attaque et la défense (en partie gratuit, en anglais).", t: "Entraînement" }
    ],
    it: [
      { n: "Introduction to Linux (LFS101)", u: "https://training.linuxfoundation.org/training/introduction-to-linux/", d: "Le cours gratuit de la Linux Foundation, avec badge numérique.", t: "Badge gratuit" },
      { n: "Catalogue Cisco NetAcad", u: "https://www.netacad.com/catalog", d: "Réseaux, matériel, systèmes : de nombreux cours gratuits avec badges.", t: "Badges gratuits" },
      { n: "IT-Connect", u: "https://www.it-connect.fr/", d: "Tutoriels français sur Windows Server, Active Directory, Linux et réseau.", t: "Tutoriels" },
      { n: "Professor Messer", u: "https://www.professormesser.com/", d: "Vidéos gratuites pour préparer les certifications CompTIA A+ et Network+ (en anglais).", t: "Cours gratuit" },
      { n: "Azure Fundamentals (AZ-900)", u: "https://learn.microsoft.com/fr-fr/credentials/certifications/azure-fundamentals/", d: "Les bases du cloud Microsoft. Préparation gratuite, examen payant.", t: "Certification" }
    ],
    dev: [
      { n: "freeCodeCamp", u: "https://www.freecodecamp.org/", d: "Des certifications gratuites en développement web, JavaScript, Python…", t: "Certification gratuite" },
      { n: "MDN Web Docs", u: "https://developer.mozilla.org/fr/", d: "La référence du HTML, du CSS et du JavaScript, avec des guides pour débuter.", t: "Documentation" },
      { n: "Documentation PowerShell", u: "https://learn.microsoft.com/fr-fr/powershell/", d: "Pour apprendre à automatiser l'administration Windows et Microsoft 365.", t: "Documentation" },
      { n: "OWASP Top 10", u: "https://owasp.org/www-project-top-ten/", d: "Les 10 risques de sécurité les plus critiques des applications web.", t: "Référence" }
    ],
    ia: [
      { n: "Elements of AI", u: "https://www.elementsofai.com/", d: "Un cours gratuit pour comprendre l'IA sans prérequis, avec certificat.", t: "Certificat gratuit" },
      { n: "Applied Skills · sécurité pour Microsoft 365 Copilot", u: "https://learn.microsoft.com/fr-fr/credentials/applied-skills/prepare-security-and-compliance-to-support-microsoft-365-copilot/", d: "Préparer la sécurité et la conformité avant de déployer Copilot.", t: "Certification gratuite" },
      { n: "L'IA vue par la CNIL", u: "https://www.cnil.fr/fr/intelligence-artificielle", d: "Fiches pratiques sur l'IA et la protection des données personnelles.", t: "Ressources" }
    ],
    vert: [
      { n: "MOOC Numérique Responsable (INR)", u: "https://institutnr.org/mooc-numerique-responsable-complet", d: "Le MOOC de l'Institut du Numérique Responsable, gratuit.", t: "Cours gratuit" },
      { n: "Académie NR", u: "https://www.academie-nr.org/", d: "Plusieurs MOOC gratuits sur le numérique responsable.", t: "Cours gratuit" },
      { n: "GreenIT.fr", u: "https://www.greenit.fr/", d: "Études et bonnes pratiques sur la sobriété numérique.", t: "Ressources" }
    ]
  };
  function openWorld(id) {
    var pl = pillarById(id); if (!pl) return;
    var hero = window.heroById ? window.heroById(pl.hero) : null, boss = (window.BOSSES || []).filter(function (b) { return b.pillar === id; })[0];
    var qs = QUESTIONS.filter(function (q) { return pl.subs.indexOf(q.theme) !== -1; });
    var subs = pl.subs.map(function (t) { return '<li><a href="#/entrainement?theme=' + t + '" data-wm-close>' + esc(themeLabel(t)) + ' <span aria-hidden="true">→</span></a></li>'; }).join("");
    var approx = qs.length >= 100 ? Math.floor(qs.length / 50) * 50 : Math.floor(qs.length / 10) * 10;
    var lv = LEVEL_ORDER.map(function (l) { var n = qs.filter(function (q) { return q.level === l; }).length; return '<span class="wm-lv" style="--c:' + LEVELS[l].color + '"><b>' + n + "</b>" + esc(LEVELS[l].name) + "</span>"; }).join("");
    var links = (FURTHER[id] || []).map(function (r) { return '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener noreferrer"><span class="wm-tag' + (/gratuit/i.test(r.t) ? " free" : "") + '">' + esc(r.t) + "</span><b>" + esc(r.n) + ' <span aria-hidden="true">↗</span></b><small>' + esc(r.d) + '</small><span class="sr-only"> (nouvel onglet)</span></a></li>'; }).join("");
    var d = document.createElement("dialog"); d.className = "fb-modal world-modal"; d.style.setProperty("--c", pl.color); d.setAttribute("aria-labelledby", "wm-title");
    d.innerHTML = '<div class="fb-inner"><button type="button" class="hm-close" data-wm-close aria-label="Fermer">×</button>' +
      '<div class="wm-head">' + (hero ? '<span class="wm-hero">' + window.heroSvg(hero, 64) + "</span>" : "") + '<div><span class="eyebrow" style="color:' + pl.color + '">' + "Pilier" + (hero ? " · gardien : " + esc(hero.name) : "") + '</span><h2 class="h-m" id="wm-title">' + esc(pl.label) + '</h2><p class="muted" style="margin:4px 0 0">' + esc(pl.desc) + "</p></div></div>" +
      '<h3 class="wm-h">Au programme' + (SHOW_COUNTS ? " · plus de " + approx + " questions" : "") + "</h3>" + '<details class="wm-subs"><summary>' + pl.subs.length + " sous-rubrique" + (pl.subs.length > 1 ? "s" : "") + ' <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><ul>' + subs + "</ul></details>" +
      (boss ? (function () { var rec = (P.bosses || {})[boss.id] || {}, won = rec.levels ? Object.keys(rec.levels).length : 0, nl = Math.min(3, won + 1), acc = bossAccess(boss.id, nl);
        return '<div class="wm-boss"><span class="wm-boss-art">' + window.bossArt(boss.id, boss.color, nl) + '</span><div class="wm-boss-txt"><div class="wm-boss-row"><b>Boss : ' + esc(boss.name) + '</b><a class="btn btn-small ' + (acc.ok ? "btn-primary wm-fight" : "btn-ghost") + '" href="' + esc(boss.href || "#/mission") + '" data-wm-close>' + (acc.ok ? "Affronter" : "Voir") + "</a></div><small>" + esc(boss.teaser) + "</small>" + (acc.ok || won >= 3 ? "" : '<small class="wm-acc">Accès au niveau ' + nl + " : prêt à " + acc.pct + ' %</small><span class="acc-bar mini"><i style="width:' + acc.pct + '%"></i></span>') + "</div></div>"; })() : "") +
      '<div class="wm-actions"><a class="btn btn-primary" href="#/entrainement?pillar=' + id + '" data-wm-close>' + I.bolt() + "S'entraîner sur ce pilier</a></div>" +
      (links ? '<h3 class="wm-h">Pour aller plus loin</h3><ul class="wm-links">' + links + '</ul><p class="wm-note">Ressources externes, gratuites ou avec une préparation gratuite. Les offres peuvent évoluer : vérifie les conditions sur chaque site.</p>' : "") + "</div>";
    document.body.appendChild(d);
    d.addEventListener("click", function (e) { if (e.target === d || (e.target.closest && e.target.closest("[data-wm-close]"))) d.close(); });
    d.addEventListener("close", function () { d.remove(); });
    sfx("open"); if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  /* Accueil « Trois façons de progresser » : la carte se déplie (un seul volet ouvert) ; le bouton du volet mène à l'onglet */
  document.addEventListener("click", function (e) {
    var card = e.target.closest && e.target.closest(".mode-fold"); if (!card) return;
    if (e.target.closest("a")) return;
    var willOpen = !card.classList.contains("open");
    document.querySelectorAll(".mode-fold.open").forEach(function (c) {
      c.classList.remove("open"); var pn = c.querySelector(".mode-panel"), bt = c.querySelector(".mode-more");
      if (pn) pn.hidden = true; if (bt) bt.setAttribute("aria-expanded", "false");
    });
    if (willOpen) {
      card.classList.add("open"); var pn2 = card.querySelector(".mode-panel"), bt2 = card.querySelector(".mode-more");
      if (pn2) pn2.hidden = false; if (bt2) bt2.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", function (e) { var w = e.target.closest && e.target.closest("[data-world]"); if (w) openWorld(w.getAttribute("data-world")); });

  /* =========================================================
     ACCÈS AUX BOSS : grade + maîtrise du pilier (calcul discret sur toutes les réponses du pilier)
     Niv. 1 : grade Technicien + 60 % sur 20 questions · Niv. 2 : niv. 1 vaincu + Super technicien + 70 % sur 50
     Niv. 3 : niv. 2 vaincu + Super admin + 80 % sur 100
     ========================================================= */
  function pillarStats(pid) {
    ensureStats(); var a = 0, c = 0;
    THEMES.forEach(function (t) { if (t.pillar === pid && P.stats.themes[t.id]) { a += P.stats.themes[t.id].a; c += P.stats.themes[t.id].c; } });
    return { a: a, c: c, rate: a ? Math.round(c / a * 100) : 0 };
  }
  function bossAccess(bossId, n) {
    var meta = (window.BOSSES || []).filter(function (b) { return b.id === bossId; })[0] || {}, L = window.BOSS_LEVELS[n - 1];
    var rec = (P.bosses || {})[bossId] || {}, lv = rec.levels || {};
    if (meta.ultimate) {
      /* Boss ultime : niveau N débloqué quand les 6 autres boss sont vaincus au niveau N (et le grade requis) */
      var others = (window.BOSSES || []).filter(function (b) { return !b.ultimate; }), done = others.filter(function (b) { var l = ((P.bosses || {})[b.id] || {}).levels || {}; return !!l[n]; });
      var okR = rankIndex(P.xp) >= L.rank, okP = n === 1 || !!lv[n - 1], okA = done.length === others.length;
      return { ok: okR && okP && okA, ultimate: true, okRank: okR, okPrev: okP, others: others, done: done, L: L, pct: Math.round(done.length / others.length * 100) };
    }
    var st = pillarStats(meta.pillar);
    var okRank = rankIndex(P.xp) >= L.rank, okPrev = n === 1 || !!lv[n - 1], okCount = st.a >= L.need, okRate = okCount && st.rate >= L.rate;
    return { ok: okRank && okPrev && okCount && okRate, okRank: okRank, okPrev: okPrev, okCount: okCount, okRate: okRate, st: st, L: L,
      pct: Math.min(100, Math.round((Math.min(st.a, L.need) / L.need) * 50 + (okCount ? Math.min(st.rate, L.rate) / L.rate * 50 : 0))) };
  }
  function accessList(acc) {
    var L = acc.L, pl = "";
    function li(ok, txt, tag) { return '<li class="' + (ok ? "ok" : "ko") + '"><span aria-hidden="true">' + (ok ? "✓" : "•") + "</span><span class=\"acc-txt\">" + txt + (ok ? ' <em class="acc-done">' + (tag || "Validé") + "</em>" : "") + "</span></li>"; }
    if (acc.ultimate) return '<ul class="acc-list">' + (L.n > 1 ? li(acc.okPrev, "Vaincre le niveau " + (L.n - 1) + " du Grand Blackout", "Vaincu") : "") + li(acc.okRank, "Grade " + esc(RANKS[L.rank].n), "Atteint") +
      acc.others.map(function (b) { return li(acc.done.indexOf(b) !== -1, "Vaincre " + esc(b.name) + " au niveau " + L.n, "Vaincu"); }).join("") + "</ul>";
    return '<ul class="acc-list">' + (L.n > 1 ? li(acc.okPrev, "Vaincre le niveau " + (L.n - 1), "Vaincu") : "") + li(acc.okRank, "Grade " + esc(RANKS[L.rank].n), "Atteint") +
      li(acc.okCount, "Répondre à " + L.need + " questions du pilier (" + Math.min(acc.st.a, L.need) + " / " + L.need + ")") +
      li(acc.okRate, L.rate + " % de bonnes réponses sur ce pilier" + (acc.st.a ? " (actuellement " + acc.st.rate + " %)" : "")) + "</ul>";
  }

  /* =========================================================
     CAPES : couleur du grade, chaleur (jours d'affilée), vestiaire (capes gagnées contre les boss)
     ========================================================= */
  var GRADE_CAPES = [
    { color: "#3FB86E", lining: "#12391F" }, { color: "#4F6BFF", lining: "#16215C" }, { color: "#9B6BFF", lining: "#2E1B5C" },
    { color: "#E0661B", lining: "#4A1F08" }, { color: "#F5C451", lining: "#6B4E12", trim: "#FFF1C2" }
  ];
  var BOSS_CAPES = { phisher: { name: "Cape anti-Phisher", color: "#FF6B8A", lining: "#3A1024" }, crash: { name: "Cape du Grand Crash", color: "#FF7A45", lining: "#40170A" },
    chaos: { name: "Cape de l'Ordre des versions", color: "#6E88FF", lining: "#141D3A" }, bug: { name: "Cape du Chasseur de bugs", color: "#B98CFF", lining: "#23123A" },
    hallu: { name: "Cape de la Lucidité", color: "#3FE0C5", lining: "#0D2C2A" }, devoreur: { name: "Cape de la Sobriété", color: "#7CC596", lining: "#132A1B" }, blackout: { name: "Cape du Porteur de lumière", color: "#1A1A1F", lining: "#F5C451", trim: "#F5C451" } };
  function capeList() {
    var ri = rankIndex(P.xp), out = RANKS.map(function (r, i) { var g = GRADE_CAPES[i]; return { id: "g" + i, tier: i, name: "Cape de " + r.n, color: g.color, lining: g.lining, trim: g.trim, open: ri >= i, how: "Atteindre le grade " + r.n }; });
    (window.BOSSES || []).forEach(function (b) { var c = BOSS_CAPES[b.id]; if (!c) return; var lv = ((P.bosses || {})[b.id] || {}).levels || {};
      var nl = (lv[1] ? 1 : 0) + (lv[2] ? 1 : 0) + (lv[3] ? 1 : 0);
      out.push({ id: "b-" + b.id, tier: b.ultimate ? 2 + Math.max(0, nl - 1) : Math.max(1, nl), name: c.name, color: c.color, lining: c.lining, trim: c.trim || (lv[3] ? "#F5C451" : (lv[2] ? "#C9D3E3" : null)), open: !!lv[1], how: "Vaincre " + b.name + " (niveau 1)" + (b.ultimate ? "" : " · s'embellit aux niveaux 2 et 3") }); });
    return out;
  }
  function currentCape(forceId) {
    var list = capeList(), id = forceId || P.cape, c = list.filter(function (x) { return x.id === id && x.open; })[0];
    if (!c) { var ri = rankIndex(P.xp); c = list[ri]; }
    return c;
  }
  function capeHeat() { ensureStats(); return Math.min(5, dayStreak()); }
  var HEAT_LABELS = ["Froide", "Tiède", "Chaude", "Brûlante", "Incandescente", "Flamboyante"];
  /* Capes de plus en plus travaillées selon leur rang (tier 0 à 4) : reflet, fermoir, emblème, ourlet flamboyant, filigrane doré et gemmes */
  /* Formes de cape (étape 78) : à essayer dans Maintenance, le style choisi s'applique partout */
  var CAPE_STYLES = [["classique", "1 · Évasée (actuelle)"], ["heros", "2 · Héroïque"], ["vent", "3 · Au vent"], ["col", "4 · Col haut"], ["pointes", "5 · À pointes"], ["neon", "6 · Néon anguleux"], ["drapee", "7 · Drapée ouverte"]];
  var CAPE_COLLAR = "M22 10 Q50 24 78 10 L76 18 Q50 32 24 18 Z";
  var CAPE_GEO = {
    classique: { lining: "M26 14 C16 36 8 62 2 92 Q16 86 30 94 Q40 88 50 94 Q60 88 70 94 Q84 86 98 92 C92 62 84 36 74 14 Z", body: "M27 14 C19 36 12 60 7 88 Q19 83 31 90 Q41 84 50 90 Q59 84 69 90 Q81 83 93 88 C88 60 81 36 73 14 Z",
      hi: "M18 40 C14 56 11 70 9 84 M82 40 C86 56 89 70 91 84", sh: "M34 30 C31 50 29 68 28 86 M66 30 C69 50 71 68 72 86", hem: "M9 84 Q20 79 31 86 Q41 80 50 86 Q59 80 69 86 Q80 79 91 84",
      zig: "M8 90 L14 84 L20 91 L26 85 L32 92 L38 86 L44 92 L50 86 L56 92 L62 86 L68 92 L74 85 L80 91 L86 84 L92 90", em: [50, 56] },
    heros: { lining: "M41 6 Q50 10 59 6 C68 10 79 15 83 26 C85 48 88 72 93 96 C77 91 63 98 50 93 C37 98 23 91 7 96 C12 72 15 48 17 26 C21 15 32 10 41 6 Z",
      body: "M42 8 Q50 12 58 8 C66 12 76 16 80 26 C82 48 84 70 88 91 C74 87 62 93 50 89 C38 93 26 87 12 91 C16 70 18 48 20 26 C24 16 34 12 42 8 Z",
      hi: "M24 34 C22 54 20 72 17 86 M76 34 C78 54 80 72 83 86", sh: "M36 24 C35 48 34 68 33 88 M64 24 C65 48 66 68 67 88 M50 26 L50 86", hem: "M14 86 C27 82 39 88 50 84 C61 88 73 82 86 86", em: [50, 50], collar: "M39 5 L50 15 L61 5 L59 13 L50 22 L41 13 Z", clasp: [50, 16] },
    vent: { lining: "M41 6 Q50 10 59 6 C68 9 77 14 79 24 C84 42 94 58 100 76 C92 82 88 86 87 92 C74 88 62 95 45 90 C33 88 23 95 12 93 C16 68 16 44 18 26 C22 15 32 10 41 6 Z",
      body: "M42 8 Q50 12 58 8 C66 11 74 15 76 24 C81 42 90 57 96 73 C88 78 85 82 84 87 C72 83 61 90 46 86 C34 84 24 90 16 88 C20 66 20 44 22 26 C26 16 34 12 42 8 Z",
      hi: "M27 32 C26 50 25 66 22 80 M74 30 C78 44 84 56 90 68", sh: "M40 24 C40 44 42 64 42 82 M58 22 C61 42 68 60 78 78", hem: "M19 84 C28 81 36 85 46 82 C60 86 70 79 82 83", em: [48, 48], collar: "M39 5 L50 15 L61 5 L59 13 L50 22 L41 13 Z", clasp: [50, 16] },
    col: { lining: "M39 12 Q50 16 61 12 C72 14 80 19 82 28 L87 97 Q50 90 13 97 L18 28 C20 19 28 14 39 12 Z",
      body: "M40 14 Q50 18 60 14 C70 16 78 20 80 28 L84 93 Q50 86 16 93 L20 28 C22 20 30 16 40 14 Z",
      hi: "M24 36 L21 86 M76 36 L79 86", sh: "M38 26 L36 88 M62 26 L64 88", hem: "M18 88 Q50 81 82 88", em: [50, 54],
      collar: "M27 1 Q29 13 40 16 L50 13 L60 16 Q71 13 73 1 Q74 14 70 21 Q50 30 30 21 Q26 14 27 1 Z", clasp: [50, 22] },
    pointes: { lining: "M41 6 Q50 10 59 6 C68 10 79 15 83 26 C87 46 91 68 99 91 L84 85 L75 98 L62 88 L50 99 L38 88 L25 98 L16 85 L1 91 C9 68 13 46 17 26 C21 15 32 10 41 6 Z",
      body: "M42 8 Q50 12 58 8 C66 12 76 16 80 26 C84 46 88 66 95 87 L82 81 L74 93 L62 83 L50 95 L38 83 L26 93 L18 81 L5 87 C12 66 16 46 20 26 C24 16 34 12 42 8 Z",
      hi: "M24 34 C21 50 18 64 14 78 M76 34 C79 50 82 64 86 78", sh: "M36 24 C35 44 34 62 34 80 M64 24 C65 44 66 62 66 80", hem: "M11 81 L22 77 L28 87 L38 79 L50 89 L62 79 L72 87 L78 77 L89 81", em: [50, 50], collar: "M39 5 L50 15 L61 5 L59 13 L50 22 L41 13 Z", clasp: [50, 16] },
    neon: { lining: "M41 6 L59 6 L80 18 L89 50 L98 94 L71 85 L50 96 L29 85 L2 94 L11 50 L20 18 Z", body: "M42 8 L58 8 L78 20 L86 50 L94 90 L70 82 L50 92 L30 82 L6 90 L14 50 L22 20 Z",
      hi: "M42 8 L36 50 L30 82 M58 8 L64 50 L70 82 M14 50 L36 50 M86 50 L64 50 M22 20 L36 50 M78 20 L64 50", sh: "M36 50 L50 92 L64 50", hem: "M8 86 L30 78 L50 88 L70 78 L92 86", em: [50, 56], neon: true, collar: "M38 4 L50 15 L62 4 L60 13 L50 22 L40 13 Z", clasp: [50, 16] }
  };
  CAPE_GEO.drapee = { drape: true,
    back: "M42 7 Q50 11 58 7 C68 9 76 15 80 25 C86 46 92 66 98 87 C92 94 86 88 80 91 C72 96 64 85 55 91 C46 98 39 85 31 91 C23 97 13 84 3 89 C8 66 14 46 20 25 C24 15 32 9 42 7 Z",
    left: "M43 10 C33 11 25 16 21 26 C14 46 7 66 3 89 C7 83 14 81 18 86 C22 92 28 91 33 87 C35 64 39 40 46 18 Z",
    right: "M57 10 C67 11 75 16 79 26 C86 46 92 66 98 87 C93 83 87 85 82 89 C77 93 71 91 67 87 C65 64 61 40 54 18 Z",
    folds: "M47 32 C46 52 45 70 43 88 M53 32 C54 52 56 70 58 88 M50 42 C50 60 50 76 50 90",
    hi: "M26 32 C21 50 15 68 9 84 M35 26 C33 46 30 66 27 86 M73 32 C78 50 84 68 90 83",
    edge: "M46 18 C39 40 35 64 33 87 M54 18 C61 40 65 64 67 87",
    curl: "M3 89 C6 81 15 80 19 86 C14 84 8 85 3 89 Z M98 87 C94 82 87 83 83 88 C88 85 93 85 98 87 Z M33 87 C37 84 41 86 43 89 C40 87 36 87 33 87 Z",
    hem: "M6 86 C11 82 16 83 19 87 M33 88 C40 84 46 94 55 89 C63 84 70 92 78 88 M84 86 C88 83 93 84 96 86",
    em: [50, 58], collar: "M37 4 C44 1 56 1 63 4 C65 10 62 15 58 17 L50 24 L42 17 C38 15 35 10 37 4 Z", collarIn: "M41 6 C46 4 54 4 59 6 C58 11 54 15 50 19 C46 15 42 11 41 6 Z", clasp: [50, 21] };
  function shadeHex(h, f) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return h; var n = parseInt(m[1], 16), r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f); return "#" + ((1 << 24) + (Math.min(255, r) << 16) + (Math.min(255, g) << 8) + Math.min(255, b)).toString(16).slice(1); }
  function capeStyleSaved() { try { var v = localStorage.getItem("powerup365.capestyle"); return CAPE_GEO[v] ? v : "drapee"; } catch (e) { return "drapee"; } }
  /* Capes de plus en plus travaillées selon leur rang (tier 0 à 4) : reflet, fermoir, emblème, ourlet flamboyant, filigrane doré et gemmes */
  /* Cape en feu (étape 79) : à la chaleur maximale (Flamboyante, 5 jours de suite), la cape s'embrase, animée. Le joueur peut l'éteindre dans son profil. */
  function capeFireOn() { try { return localStorage.getItem("powerup365.capefire") !== "off"; } catch (e) { return true; } }
  var FLAME = "M0 0 C-5 -3 -6 -9 -3 -15 C-2 -11 0 -11 0 -8 C1 -13 0 -19 -2 -24 C5 -19 8 -11 6 -5 C5 -2 3 0 0 0 Z";
  function capeFire(uid) {
    var o = '<defs><linearGradient id="' + uid + 'fo" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF3D1A"/><stop offset=".55" stop-color="#FF8A1A"/><stop offset="1" stop-color="#FFC247" stop-opacity=".2"/></linearGradient>' +
      '<linearGradient id="' + uid + 'fi" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FFF6D0" stop-opacity=".3"/></linearGradient>' +
      '<linearGradient id="' + uid + 'fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF6A1A" stop-opacity=".55"/><stop offset=".6" stop-color="#FF6A1A" stop-opacity="0"/></linearGradient></defs>';
    o += '<rect class="fire-glow" x="0" y="30" width="100" height="70" fill="url(#' + uid + 'fg)"/><g class="cape-fire">';
    [[8, 96, 1.1, 0], [20, 97, 1.6, .25], [33, 96, 1.25, .5], [50, 98, 1.9, .1], [67, 96, 1.3, .4], [80, 97, 1.6, .15], [92, 96, 1.1, .35], [27, 99, .9, .6], [59, 99, 1, .7], [74, 99, .85, .55]].forEach(function (f) {
      o += '<g transform="translate(' + f[0] + " " + f[1] + ") scale(" + f[2] + ')"><path class="fl" style="animation-delay:-' + f[3] + 's" d="' + FLAME + '" fill="url(#' + uid + 'fo)"/><path class="fl fl-in" style="animation-delay:-' + (f[3] + .2) + 's" d="' + FLAME + '" transform="scale(.55)" fill="url(#' + uid + 'fi)"/></g>';
    });
    [[18, 70, 0], [36, 64, .8], [52, 72, .4], [70, 62, 1.2], [84, 70, .6], [44, 58, 1.6]].forEach(function (e) { o += '<circle class="ember" cx="' + e[0] + '" cy="' + e[1] + '" r="1.3" fill="#FFD27A" style="animation-delay:-' + e[2] + 's"/>'; });
    return o + "</g>";
  }
  function capeSvg(c, heat, styleId, forceFire) {
    var st = CAPE_GEO[styleId] ? styleId : capeStyleSaved(), G = CAPE_GEO[st], fire = forceFire || (heat >= 5 && capeFireOn());
    var t = c.tier || 0, id = "cg" + st + (c.id || "x").replace(/[^a-z0-9]/gi, ""), trim = c.trim || (t >= 3 ? "#F5C451" : "#E8ECF4"), o = '<svg class="cape-svg cape-' + st + ' tier-' + t + (fire ? " on-fire" : "") + '" viewBox="0 0 100 100" aria-hidden="true">';
    o += '<defs><linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="' + (t >= 1 ? .28 : 0) + '"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>';
    var ex = G.em[0], ey = G.em[1], dx = ex - 50, dy = ey - 56;
    o += '<g class="cape-cloth">';
    if (G.drape) {
      var dk = shadeHex(c.color, .58), dk2 = shadeHex(c.color, .45);
      o += '<path d="' + G.back + '" fill="' + dk + '"/><path d="' + G.folds + '" fill="none" stroke="' + dk2 + '" stroke-width="2.4" stroke-linecap="round"/>';
      o += '<path d="' + G.left + '" fill="' + c.color + '"/><path d="' + G.right + '" fill="' + shadeHex(c.color, .9) + '"/><path d="' + G.left + '" fill="url(#' + id + 's)"/>';
      o += '<path d="' + G.hi + '" fill="none" stroke="#FFFFFF" stroke-opacity=".2" stroke-width="2" stroke-linecap="round"/><path d="' + G.edge + '" fill="none" stroke="' + dk2 + '" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>';
      o += '<path d="' + G.curl + '" fill="' + dk2 + '"/>';
    } else {
    o += '<path d="' + G.lining + '" fill="' + c.lining + '"' + (G.neon ? ' stroke="' + c.color + '" stroke-width="1.2" stroke-linejoin="round"' : "") + "/>";
    o += '<path d="' + G.body + '" fill="' + c.color + '"' + (G.neon ? ' stroke-linejoin="round"' : "") + '/><path d="' + G.body + '" fill="url(#' + id + 's)"/>';
    o += '<path d="' + G.hi + '" fill="none" stroke="#FFFFFF" stroke-opacity="' + (G.neon ? .35 : .22) + '" stroke-width="' + (G.neon ? 1.4 : 2.2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    o += '<path d="' + G.sh + '" fill="none" stroke="' + c.lining + '" stroke-opacity="' + (G.neon ? .55 : .4) + '" stroke-width="' + (G.neon ? 1.4 : 1.8) + '" stroke-linejoin="round"/>';
    }
    if (t >= 2) o += '<path d="' + G.hem + '" fill="none" stroke="' + trim + '" stroke-width="2.4" stroke-opacity=".9" stroke-linejoin="round"/>';
    if (t >= 3) o += (G.zig ? '<path d="' + G.zig + '" fill="none" stroke="' + trim + '" stroke-width="2" stroke-linejoin="round"/>' : '<path d="' + G.hem + '" transform="translate(0 4.5)" fill="none" stroke="' + trim + '" stroke-width="1.6" stroke-dasharray="3 2.6" stroke-linejoin="round"/>') +
      '<path d="M22 18 Q14 20 12 30 Q20 26 28 26 Z M78 18 Q86 20 88 30 Q80 26 72 26 Z" fill="' + trim + '" stroke="' + c.lining + '" stroke-width="1"/>' +
      '<path d="M24 40 C21 56 18 70 16 82 M76 40 C79 56 82 70 84 82" fill="none" stroke="' + trim + '" stroke-width="1" stroke-dasharray="2 3" stroke-opacity=".7"/>';
    if (t >= 2) {
      var em = t >= 4 ? '<path d="M50 42 L54 52 L65 52 L56 58 L59 69 L50 62 L41 69 L44 58 L35 52 L46 52 Z" fill="' + trim + '" stroke="' + c.lining + '" stroke-width="1.2"/>'
        : (t >= 3 ? '<path d="M53 40 L42 58 L50 58 L46 72 L58 52 L50 52 Z" fill="' + trim + '" stroke="' + c.lining + '" stroke-width="1"/>'
        : '<path d="M50 44 L58 56 L50 68 L42 56 Z" fill="none" stroke="' + trim + '" stroke-width="2.4"/>');
      o += '<g transform="translate(' + dx + " " + dy + ')"><circle cx="50" cy="56" r="' + (t >= 4 ? 17 : 14) + '" fill="' + c.lining + '" fill-opacity=".35" stroke="' + trim + '" stroke-opacity=".6" stroke-width="1.2"/>' + em + "</g>";
    }
    if (t >= 4) o += '<path d="M30 34 C24 38 26 46 32 44 M70 34 C76 38 74 46 68 44 M36 76 C30 72 24 78 30 82 M64 76 C70 72 76 78 70 82" fill="none" stroke="#F5C451" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="30" cy="44" r="2.4" fill="#FF4D5E"/><circle cx="70" cy="44" r="2.4" fill="#3FE0C5"/><circle cx="50" cy="80" r="2.6" fill="#6E88FF"/>' +
      '<g class="cape-sparkles"><path d="M20 58 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="#FFF1C2"/><path d="M82 64 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#FFF1C2"/></g>';
    if (fire) o += capeFire(id);
    o += "</g>";
    var cl = G.clasp || [50, 22];
    o += '<path d="' + (G.collar || CAPE_COLLAR) + '" fill="' + c.color + '" stroke="' + (t >= 3 ? trim : c.lining) + '" stroke-width="1.5" stroke-linejoin="round"/>';
    if (G.collarIn) o += '<path d="' + G.collarIn + '" fill="' + shadeHex(c.color, .5) + '"/>';
    if (t >= 1) o += '<circle cx="' + cl[0] + '" cy="' + cl[1] + '" r="' + (t >= 3 ? 4.4 : 3.4) + '" fill="#F5C451" stroke="#6B4E12" stroke-width="1"/>' + (t >= 3 ? '<circle cx="' + cl[0] + '" cy="' + cl[1] + '" r="1.8" fill="#FF4D5E"/>' : "");
    return o + "</svg>";
  }
  /* Cadres d'avatar : plus le grade est haut, plus le cadre est travaillé (on choisit parmi ceux débloqués) */
  function frameList() { var ri = rankIndex(P.xp); return RANKS.map(function (r, i) { return { id: "f" + i, lv: i, name: "Cadre " + r.n, color: RANK_COLORS[i], open: ri >= i, how: "Atteindre le grade " + r.n }; }); }
  function currentFrame() { var l = frameList(), f = l.filter(function (x) { return x.id === P.frame && x.open; })[0]; return f || l[rankIndex(P.xp)]; }
  function frameSvg(f) {
    var c = f.color, lv = f.lv, o = '<svg class="frame-svg" viewBox="0 0 120 120" aria-hidden="true">';
    o += '<rect x="11" y="11" width="98" height="98" rx="12" fill="none" stroke="' + c + '" stroke-width="' + (lv >= 1 ? 3 : 2.5) + '"/>';
    if (lv >= 1) o += '<rect x="6" y="6" width="108" height="108" rx="15" fill="none" stroke="' + c + '" stroke-opacity=".55" stroke-width="1.5"/>';
    if (lv >= 2) [[11, 11], [109, 11], [11, 109], [109, 109]].forEach(function (p) { o += '<path d="M' + p[0] + ' ' + (p[1] - 7) + ' L' + (p[0] + 7) + ' ' + p[1] + ' L' + p[0] + ' ' + (p[1] + 7) + ' L' + (p[0] - 7) + ' ' + p[1] + ' Z" fill="' + c + '" stroke="#0B0E13" stroke-width="1.2"/>'; });
    if (lv >= 3) o += '<path d="M60 0 L67 8 L53 8 Z M60 120 L67 112 L53 112 Z M0 60 L8 53 L8 67 Z M120 60 L112 53 L112 67 Z" fill="' + c + '"/>' +
      '<path d="M2 40 L6 60 L2 80 M118 40 L114 60 L118 80" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>';
    if (lv >= 4) o += '<path d="M42 7 L46 -4 L53 3 L60 -8 L67 3 L74 -4 L78 7 Z" fill="' + c + '" stroke="#6B4E12" stroke-width="1.2"/><circle cx="60" cy="-3" r="2.4" fill="#FFF1C2"/>' +
      '<path d="M4 30 C-6 44 -6 76 4 90 M116 30 C126 44 126 76 116 90" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>';
    return o + "</svg>";
  }
  function capeWrap(av, size, capeId, frameId) {
    if (!av) return av;
    var c = currentCape(capeId), heat = capeHeat(), f = frameId ? (frameList().filter(function (x) { return x.id === frameId; })[0] || currentFrame()) : currentFrame();
    return '<span class="caped heat-' + heat + " frame-lv-" + f.lv + (size < 48 ? " sm" : "") + '" style="--cape:' + c.color + ";--fc:" + f.color + ";--cs:" + size + 'px" title="' + esc(c.name + " · " + HEAT_LABELS[heat] + " · " + f.name) + '"><span class="caped-av">' + av + "</span>" + (size >= 48 ? frameSvg(f) : "") + '<span class="cape-pin" aria-hidden="true">' + capeSvg(c, heat) + "</span></span>";
  }

  function favSlots() {
    var earned = earnedBadges(), favs = (P.favBadges || []).filter(function (n) { return earned.indexOf(n) !== -1; }), map = {};
    computeBadges().forEach(function (fm) { fm.items.forEach(function (b) { map[b.n] = { b: b, col: b.c || fm.color }; }); });
    var h = ""; for (var k = 0; k < 3; k++) { var n = favs[k], x = n && map[n];
      var dt = x && P.badgeDates && P.badgeDates[n];
      h += x ? '<span class="fav-slot on" tabindex="0" aria-label="' + esc(n + " : " + x.b.d) + '" style="--c:' + (x.b.t ? BTIER[x.b.t] : x.col) + '">' + medalSvg(x.col, x.b.i, x.b.s, x.b.t, 38) + '<span class="ftip" aria-hidden="true"><b>' + esc(n) + "</b><small>" + esc(x.b.d) + "</small>" + (dt ? "<em>Obtenu le " + esc(frDate(dt)) + "</em>" : "") + "</span></span>" : '<span class="fav-slot" tabindex="0" aria-label="Emplacement libre"><span class="ftip" aria-hidden="true"><b>Emplacement libre</b><small>Choisis un badge vedette à l\'étape 5 de ton profil.</small></span></span>'; }
    return '<div class="fav-slots" aria-label="Badges vedettes">' + h + "</div>";
  }
  function capeToast(title, text, link) {
    var t = document.createElement("div"); t.className = "rb-toast cape-toast"; t.setAttribute("role", "status");
    t.innerHTML = '<span class="ico">' + capeSvg(currentCape(), capeHeat()) + "</span><span><b>" + esc(title) + "</b>" + esc(text) + (link ? ' · <a class="toast-link" href="#/profil" data-toast-go data-open-step="step3">Choisir ma cape →</a>' : "") + "</span>";
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 5200); sfx("cape");
  }
  /* Nouveautés : pastille dorée sur tout ce qui vient d'être débloqué (fond, cape, cadre, badge) tant qu'on ne l'a pas vu ni choisi.
     La première fois, tout ce qui est déjà débloqué est considéré comme vu (pas de pastilles pour l'existant). */
  var NEWS = [];
  function newKeys() {
    var open = [];
    bgList().forEach(function (x) { if (x.open) open.push("bg:" + x.id); });
    capeList().forEach(function (x) { if (x.open) open.push("cape:" + x.id); });
    frameList().forEach(function (x) { if (x.open) open.push("frame:" + x.id); });
    earnedBadges().forEach(function (n) { open.push("badge:" + n); });
    if (!P.newSeen) { P.newSeen = open.slice(); saveProfile(); return []; }
    return open.filter(function (k) { return P.newSeen.indexOf(k) === -1; });
  }
  function refreshNews() { try { NEWS = newKeys(); } catch (e) { NEWS = []; } }
  function isNew(k) { return NEWS.indexOf(k) !== -1; }
  function newCount(kind) { return NEWS.filter(function (k) { return k.indexOf(kind + ":") === 0; }).length; }
  var NEW_DOT = '<i class="new-dot" aria-hidden="true"></i><span class="sr-only">Nouveau</span>';
  function newAttr(k) { return isNew(k) ? ' data-new="' + esc(k) + '"' : ""; }
  function newDot(k) { return isNew(k) ? NEW_DOT : ""; }
  /* pastille d'une étape du profil (nombre de nouveautés dans cette étape) */
  function stepNewBadge(kind) { var n = newCount(kind); return n ? '<span class="nav-badge step-new" data-step-new="' + kind + '"><span class="sr-only">, </span>' + n + '<span class="sr-only"> nouveau' + (n > 1 ? "x" : "") + "</span></span>" : ""; }
  function seeNew(el) {
    var k = el.getAttribute("data-new"); if (!k) return;
    if (!P.newSeen) P.newSeen = [];
    if (P.newSeen.indexOf(k) === -1) { P.newSeen.push(k); saveProfile(); }
    el.removeAttribute("data-new");
    var d = el.querySelector(".new-dot"); if (d) { var sr = d.nextElementSibling; if (sr && sr.classList.contains("sr-only")) sr.remove(); d.remove(); }
    refreshNews();
    document.querySelectorAll("[data-step-new]").forEach(function (b) { var n = newCount(b.getAttribute("data-step-new")); if (!n) b.remove(); else b.firstChild.nextSibling.nodeValue = n; b.lastChild.textContent = " nouveau" + (n > 1 ? "x" : ""); });
    document.querySelectorAll("[data-fold-new]").forEach(function (b) { if (!newCount(b.getAttribute("data-fold-new"))) b.remove(); });
    if (!NEWS.length) document.querySelectorAll(".chip-dot, .chip-dot + .sr-only").forEach(function (x) { x.remove(); });
    if (!NEWS.length) document.querySelectorAll("[data-news-clear]").forEach(function (x) { x.remove(); });
  }
  ["click", "mouseover", "focusin"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { var el = e.target && e.target.closest && e.target.closest("[data-new]"); if (el) seeNew(el); }, true);
  });
  /* Sur téléphone, pas de survol et toucher un badge l'ajoute à la carte : une nouveauté est donc aussi « vue » quand elle reste affichée à l'écran 2 secondes */
  var seenTicks = {};
  setInterval(function () {
    if (!NEWS.length || document.hidden) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll("[data-new]").forEach(function (el) {
      var r = el.getBoundingClientRect(), k = el.getAttribute("data-new");
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh) { seenTicks[k] = (seenTicks[k] || 0) + 1; if (seenTicks[k] >= 2) seeNew(el); }
      else seenTicks[k] = 0;
    });
  }, 1000);
  /* « Tout marquer comme vu » (menu du profil) : éteint toutes les pastilles d'un coup */
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("[data-news-clear]")) return;
    P.newSeen = P.newSeen || [];
    NEWS.forEach(function (k) { if (P.newSeen.indexOf(k) === -1) P.newSeen.push(k); });
    saveProfile(); refreshNews();
    document.querySelectorAll(".new-dot, [data-step-new], .new-dot + .sr-only").forEach(function (x) { x.remove(); });
    document.querySelectorAll("[data-new]").forEach(function (x) { x.removeAttribute("data-new"); });
    document.querySelectorAll("[data-news-clear]").forEach(function (x) { x.remove(); });
  });

  /* Nouveaux fonds de carte : notification discrète (comme les badges et les capes), une seule fois ; attend qu'une autre bulle soit passée */
  function toastWhenFree(make, tries) { if (document.querySelector(".rb-toast") && (tries || 0) < 14) { setTimeout(function () { toastWhenFree(make, (tries || 0) + 1); }, 1000); return; } make(); }
  function checkBgUnlocks() {
    var l = bgList().filter(function (x) { return x.open; }), ids = l.map(function (x) { return x.id; });
    if (!P.bgsSeen) { P.bgsSeen = ids; saveProfile(); return; }
    var nw = l.filter(function (x) { return P.bgsSeen.indexOf(x.id) === -1; });
    if (!nw.length) return;
    P.bgsSeen = ids; saveProfile();
    setTimeout(function () { toastWhenFree(function () {
      var t = document.createElement("div"); t.className = "rb-toast badge-toast"; t.setAttribute("role", "status");
      t.innerHTML = '<span class="ico">★</span><span><b>Nouveau fond de carte' + (nw.length > 1 ? "s" : "") + " !</b>" + esc(nw.map(function (x) { return x.name; }).join(" · ")) + ' · <a class="toast-link" href="#/profil" data-toast-go data-open-step="step6">Voir mes fonds →</a></span>';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6500); sfx("badge");
    }); }, 900);
  }

  /* Nouveaux badges et nouvelles capes : notification discrète, une seule fois */
  function checkUnlocks() {
    var b = earnedBadges(), c = capeList().filter(function (x) { return x.open; }).map(function (x) { return x.id; });
    P.badgeDates = P.badgeDates || {}; var today = todayStr(), dch = false;
    b.forEach(function (n) { if (!P.badgeDates[n]) { P.badgeDates[n] = today; dch = true; } });
    if (dch) saveProfile();
    if (!P.badgesSeen || !P.capesSeen) { P.badgesSeen = b; P.capesSeen = c; saveProfile(); return; }
    var nb = b.filter(function (x) { return P.badgesSeen.indexOf(x) === -1; }), nc = c.filter(function (x) { return P.capesSeen.indexOf(x) === -1; });
    if (!nb.length && !nc.length) return;
    P.badgesSeen = b; P.capesSeen = c; saveProfile();
    if (nb.length) setTimeout(function () {
      var t = document.createElement("div"); t.className = "rb-toast badge-toast"; t.setAttribute("role", "status");
      t.innerHTML = '<span class="ico">★</span><span><b>Nouveau badge' + (nb.length > 1 ? "s" : "") + " !</b>" + esc(nb.join(" · ")) + ' · <a class="toast-link" href="#/profil?s=vit" data-toast-go>À voir dans ta vitrine →</a></span>';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6500); sfx("badge");
    }, 700);
    if (nc.length) { var names = capeList().filter(function (x) { return nc.indexOf(x.id) !== -1; }).map(function (x) { return x.name; }); setTimeout(function () { capeToast("Nouvelle cape au vestiaire !", names.join(" · "), true); }, nb.length ? 5600 : 900); }
  }

  /* --- Secret 1 : 7 clics rapides sur Captain Reboot (clin d'œil aux 7 appuis qui débloquent le mode développeur d'Android) (accueil) → il plante puis redémarre le site --- */
  var logoClicks = [], rebooting = false;
  function powerReboot() {
    if (rebooting) return; rebooting = true;
    var mascot = window.heroSvg ? window.heroSvg(window.heroById("volt"), 130) : "";
    var el = document.createElement("div"); el.className = "reboot"; el.setAttribute("role", "alert");
    el.innerHTML = '<div class="rb-black"></div><div class="rb-blue"><div class="face">:)</div><h2>Le QG a rencontré un problème : Captain Reboot a été trop titillé. Il va redémarrer le site.</h2>' +
      '<div class="pct"><span class="rb-n">0</span> % effectués</div><div class="small">Code d\'arrêt : <b>TROP_DE_POWER_UP</b><br>Élément défaillant : <b>ton index droit</b><br>Le savais-tu ? Ctrl + Alt + Suppr a été inventé en 1981 par David Bradley, chez IBM.</div></div>' +
      '<span class="rb-dot"></span><div class="rb-boot"><span class="mascot">' + mascot + '</span><span class="txt">Redémarrage du QG…</span><span class="bar"><i></i></span></div>';
    document.body.appendChild(el); sfx("shutdown");
    var n = el.querySelector(".rb-n"), v = 0, t = setInterval(function () { v = Math.min(100, v + Math.ceil(Math.random() * 14)); n.textContent = v; if (v >= 100) clearInterval(t); }, 400);
    var booted = false, bootT = setTimeout(function () { booted = true; sfx("boot"); }, 7300);
    function finish() { if (!el.parentNode) return; clearInterval(t); clearTimeout(bootT); if (!booted) { booted = true; sfx("boot"); } el.classList.add("out"); setTimeout(function () { el.remove(); rebooting = false; location.hash = "#/"; unlockSecret("reboot"); }, 600); }
    el.addEventListener("click", finish); setTimeout(finish, 9800);
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".mascot-panel")) return;
    var now = Date.now(); logoClicks = logoClicks.filter(function (c) { return now - c < 4000; }); logoClicks.push(now);
    var mp = e.target.closest(".mascot-panel"); mp.classList.remove("poked"); void mp.offsetWidth; mp.classList.add("poked");
    if (logoClicks.length >= 7) { logoClicks = []; powerReboot(); }
  }, true);

  /* --- Secret 2 : le code Konami → mode rétro 8-bit pendant 12 secondes --- */
  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"], kIdx = 0;
  function retroMode() {
    var root = document.documentElement; if (root.classList.contains("retro")) { unlockSecret("konami"); return; }
    root.classList.add("retro");
    var banner = document.createElement("div"); banner.className = "retro-banner"; banner.innerHTML = "★ MODE RÉTRO 8-BIT ★<small>Échap pour revenir</small>"; document.body.appendChild(banner);
    [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { if (soundOn) tone(f, i * 0.09, 0.09, "square", 0.05); });
    function stop() { if (!retroThemeOn()) root.classList.remove("retro"); banner.remove(); document.removeEventListener("keydown", esc8); }
    function esc8(e) { if (e.key === "Escape") stop(); }
    document.addEventListener("keydown", esc8); setTimeout(stop, 12000);
    unlockSecret("konami");
  }
  /* Une fois le code des anciens trouvé, le mode rétro 8-bit peut être adopté en permanence (menu Paramètres) */
  function retroThemeOn() { try { return localStorage.getItem("powerup365.retrotheme") === "on"; } catch (e) { return false; } }
  function applyRetroTheme() { if (retroThemeOn()) document.documentElement.classList.add("retro"); }
  try { applyRetroTheme(); } catch (e) { }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-retro-theme]"); if (!b) return;
    var on = !retroThemeOn(); try { localStorage.setItem("powerup365.retrotheme", on ? "on" : "off"); } catch (err) { }
    document.documentElement.classList.toggle("retro", on);
    b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); sfx("toggle");
    announce(on ? "Thème visuel 8-bit activé" : "Thème visuel 8-bit désactivé");
  });
  /* --- Secret 3 : taper « sudo » ou « ping » → le héros répond --- */
  var typed = "";
  /* Fait disparaître un message de gardien en fondu (et au toucher) */
  function dismissToast(el, ms) {
    ms = Math.max(ms, 4500 + (el.textContent || "").length * 50); var t;
    function go() { clearTimeout(t); if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { el.remove(); }, 380); }
    function arm() { clearTimeout(t); t = setTimeout(go, ms); }
    el.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-ev-x],.ev-menu")) { clearTimeout(t); return; } go(); }); el.addEventListener("mouseenter", function () { clearTimeout(t); }); el.addEventListener("mouseleave", arm); arm();
  }
  function heroReply(heroId, text, cmd) {
    P.secretsProgress = P.secretsProgress || {}; P.secretsProgress[cmd] = 1; saveProfile();
    var both = P.secretsProgress.sudo && P.secretsProgress.ping, already = P.secrets && P.secrets.terminal;
    document.querySelectorAll(".hero-toast").forEach(function (x) { x.remove(); });
    var h = window.heroById(heroId), el = document.createElement("div"); el.className = "hero-toast"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="ht-face">' + window.heroSvg(h, 48) + "</span><div><b>" + esc(h.name) + "</b><code>" + esc(text) + "</code>" +
      (!both && !already ? '<small class="ht-next">1 commande sur 2 · Un autre gardien du QG répond aussi quand on tape son nom… Trouve-le pour débloquer le secret.</small>' : "") + "</div>";
    document.body.appendChild(el); sfx("open"); dismissToast(el, both || already ? 4200 : 6500);
    if (both) setTimeout(function () { unlockSecret("terminal"); }, 900);
  }
  /* --- Secret : le pire mot de passe → alarme de Phishbuster --- */
  var alarmOn = false;
  function passwordAlarm(pw) {
    if (alarmOn) return; alarmOn = true;
    var h = window.heroById("sentinelle"), el = document.createElement("div"); el.className = "pw-alarm"; el.setAttribute("role", "alert");
    el.innerHTML = '<span class="pw-siren l"></span><span class="pw-siren r"></span><div class="pw-card"><span class="pw-kicker">⚠ Alerte sécurité</span><b class="pw-title">Mot de passe cassé !</b><code class="pw-pw">' + esc(pw) + '</code><div class="pw-time">Temps pour le deviner : <b>moins d\'une seconde</b></div>' +
      '<div class="pw-say"><span>' + (h ? window.heroSvg(h, 56) : "") + '</span><p><b>' + esc(h ? h.name : "Phishbuster") + '</b>C\'est l\'un des mots de passe les plus utilisés au monde : il est dans toutes les listes des pirates. Préfère une longue phrase de passe, unique, et active la double authentification !</p></div><small>Clique pour fermer</small></div>';
    document.body.appendChild(el);
    if (soundOn) { for (var i = 0; i < 6; i++) { tone(880, i * 0.32, 0.16, "square", 0.05); tone(660, i * 0.32 + 0.16, 0.16, "square", 0.05); } }
    function close() { if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { el.remove(); alarmOn = false; unlockSecret("password"); }, 400); }
    el.addEventListener("click", close); setTimeout(close, 7000);
  }
  /* --- Secret : trois clics sur la feuille → mode sobriété de Green Byte --- */
  var leafClicks = [];
  function ecoMode() {
    var root = document.documentElement; if (root.classList.contains("eco-mode")) return;
    root.classList.add("eco-mode");
    var b = document.createElement("div"); b.className = "eco-banner"; b.setAttribute("role", "status");
    b.innerHTML = '<span class="eco-face">' + (window.heroById("sylva") ? window.heroSvg(window.heroById("sylva"), 40) : "🌿") + '</span><div><b>Mode sobriété</b><small>Green Byte a éteint les lumières : couleurs, animations et effets coupés. Sur un écran OLED, le noir consomme presque rien ! Échap ou clic pour revenir.</small></div>';
    document.body.appendChild(b); if (soundOn) { tone(523, 0, 0.18, "sine", 0.05); tone(392, 0.18, 0.3, "sine", 0.05); }
    function off() { root.classList.remove("eco-mode"); b.remove(); document.removeEventListener("keydown", esc2); unlockSecret("sobre"); }
    function esc2(e) { if (e.key === "Escape") off(); }
    b.addEventListener("click", off); document.addEventListener("keydown", esc2); setTimeout(function () { if (b.parentNode) off(); }, 15000);
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".footer-eco")) return;
    var now = Date.now(); leafClicks = leafClicks.filter(function (c) { return now - c < 2000; }); leafClicks.push(now);
    if (leafClicks.length >= 3) { leafClicks = []; ecoMode(); }
  });
  var BAD_PW = /(123456|azerty|motdepasse|password)$/;
  function checkTyped() {
    var m = typed.match(BAD_PW); if (m) { typed = ""; passwordAlarm(m[1]); return; }
    if (/sudo$/.test(typed)) { typed = ""; heroReply("sudo", "[sudo] Permission accordée. Tu es root… pour 5 secondes. Utilise ce pouvoir avec sagesse !", "sudo"); }
    else if (/ping$/.test(typed)) { typed = ""; heroReply("echo", "PONG ! Réponse de QG : temps = 12 ms. Tout le monde est bien connecté !", "ping"); }
    else if (/rm -rf \/$/.test(typed)) { typed = ""; heroSay("sudo", "rm: impossible de supprimer « / » : permission refusée. Bien essayé ! Sans le QG, qui t'entraînerait ?", "rmrf"); }
    else if (/bsod$/.test(typed)) { typed = ""; blueScreen(); }
    else if (/arpanet$/.test(typed)) { typed = ""; openArpanet(); }
    else if (/login$/.test(typed)) { typed = ""; heroSay("echo", "LOGIN, c'est le message qui devait partir… mais pas le nom du réseau qui le portait. Cherche encore : ce réseau est l'ancêtre d'Internet.", ""); }
    else if (/whoami$/.test(typed)) { typed = ""; heroSay("sentinelle", "Tu es " + (P.pseudo || "une recrue anonyme") + ", grade « " + rankInfo(P.xp).name + " ». Identité vérifiée, accès au QG autorisé.", ""); }
    else if (/exit$/.test(typed)) { typed = ""; heroSay("volt", "exit : impossible de quitter le QG, tu es bien trop fort·e. Le bouton rouge en haut à droite, lui, marche.", ""); }
  }
  /* Réponse d'un gardien à une commande tapée au clavier ; un identifiant de secret débloque le secret correspondant */
  function heroSay(heroId, text, secretId) {
    document.querySelectorAll(".hero-toast").forEach(function (x) { x.remove(); });
    var h = window.heroById(heroId), el = document.createElement("div"); el.className = "hero-toast"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="ht-face">' + window.heroSvg(h, 48) + "</span><div><b>" + esc(h.name) + "</b><code>" + esc(text) + "</code></div>";
    document.body.appendChild(el); sfx("open"); dismissToast(el, 5200);
    if (secretId) setTimeout(function () { unlockSecret(secretId); }, 900);
  }
  /* --- Secret : le premier message d'Internet (LOGIN) : intro qui plante après « LO », puis 3 messages à décoder (js/decode.js) --- */
  function openArpanet() {
    if (!window.PUDecode) return;
    window.PUDecode.arpanet({ lite: liteOn(), sfx: sfx, onWin: function (st) { P.arpanetStars = Math.max(P.arpanetStars || 0, st || 0); saveProfile(); unlockSecret("arpanet"); } });
  }
  /* --- Secret : l'écran bleu de la mort --- */
  var blueOn = false;
  function blueScreen() {
    if (blueOn) return; blueOn = true;
    var el = document.createElement("div"); el.className = "bsod"; el.setAttribute("role", "alert");
    var codes = ["PLUS_DE_CAFE_DANS_LA_MACHINE", "ERREUR_ENTRE_LA_CHAISE_ET_LE_CLAVIER", "TROP_DE_ONGLETS_OUVERTS", "MOT_DE_PASSE_NOTE_SUR_UN_POST_IT", "REDEMARRAGE_JAMAIS_FAIT_DEPUIS_3_MOIS"];
    el.innerHTML = '<div class="bsod-in"><div class="bsod-face">:(</div><p class="bsod-t">Ton QG a rencontré un problème et doit redémarrer. On collecte quelques infos d\'erreur, puis on le redémarre pour toi.</p>' +
      '<p class="bsod-p"><span class="bsod-n">0</span> % effectués</p><div class="bsod-row"><span class="bsod-qr" aria-hidden="true"></span><p class="bsod-s">Pour plus d\'informations, cherche sur le web : BSOD<br>Si tu appelles le support, donne-lui cette info :<br>Code d\'arrêt : <b>' + codes[(Math.random() * codes.length) | 0] + '</b></p></div></div>';
    document.body.appendChild(el); sfx("shutdown");
    var n = el.querySelector(".bsod-n"), v = 0, t = setInterval(function () { v = Math.min(100, v + 4 + Math.ceil(Math.random() * 14)); n.textContent = v; if (v >= 100) { clearInterval(t); setTimeout(close, 700); } }, 260);
    function close() { if (!el.parentNode) return; clearInterval(t); el.classList.add("out"); setTimeout(function () { el.remove(); blueOn = false; unlockSecret("bsod"); }, 400); }
    el.addEventListener("click", close);
  }
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) { kIdx = 0; retroMode(); }
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "TEXTAREA" || (tag === "INPUT" && tg.id === "type-answer")) return;
    if (k.length === 1) { typed = (typed + k).slice(-12); if (tag !== "INPUT") checkTyped(); }
  });
  document.addEventListener("input", function (e) { var tg = e.target; if (tg && tg.tagName === "INPUT" && tg.id !== "type-answer") { var v = String(tg.value || "").toLowerCase(); if (/(sudo|ping|bsod|login|arpanet|whoami|exit|rm -rf \/)$/.test(v) || BAD_PW.test(v)) { typed = v.slice(-12); checkTyped(); } } });

  /* =========================================================
     BOÎTE À IDÉES : remarques, suggestions, bugs
     (site statique : le message part par la messagerie de l'utilisateur, ou via un formulaire Microsoft Forms)
     ========================================================= */
  function openFeedback(preset) {
    var cfg0 = window.POWERUP_CONFIG || {}, cfg = {}; for (var ck in cfg0) cfg[ck] = cfg0[ck];
    if (!cfg.feedbackEmail && cfg.feedbackEmailB64) { try { cfg.feedbackEmail = atob(cfg.feedbackEmailB64); } catch (er) { } } /* adresse stockée encodée : évite la collecte automatique par les robots (ne la cache pas aux humains) */
    var dlg = document.querySelector(".fb-modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "fb-modal"; dlg.setAttribute("aria-labelledby", "fb-title"); document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || (e.target.closest && e.target.closest("[data-fb-close]"))) dlg.close(); }); }
    var types = ["Suggestion", "Remarque", "Bug", "Question", "Idée de question ou de boss", "Question à corriger"], formUrl = preset && cfg.reportFormUrl ? cfg.reportFormUrl + (cfg.reportFormUrl.indexOf("?") < 0 ? "?" : "&") + encodeURIComponent(cfg.reportFormParam || "question") + "=" + encodeURIComponent(preset.id) : cfg.feedbackFormUrl;
    var formOnly = !cfg.feedbackEmail && !!formUrl && !preset, embed = formOnly && !!cfg.feedbackEmbed;
    dlg.innerHTML = '<form class="fb-inner' + (formOnly ? " fb-formonly" : "") + '" method="dialog"><button type="button" class="hm-close" data-fb-close aria-label="Fermer"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>' +
      '<span class="eyebrow">Ton avis compte</span><h2 class="h-m" id="fb-title">' + (preset ? "Signaler une question" : "Boîte à idées") + '</h2><p class="muted" style="margin:0">' + (preset ? "Une erreur, une réponse discutable, une question trop facile ou ambiguë ? Dis-nous ce qui ne va pas : chaque signalement rend Power Up plus fiable." : (formOnly ? "Une remarque, une idée, un bug, une question à ajouter ? " + (embed ? "Le formulaire est hébergé par un service externe (Tally) : il ne se charge que si tu cliques sur « Afficher le formulaire »." : "Le formulaire s\'ouvre dans un nouvel onglet.") + " Il ne demande ni nom ni adresse e-mail. N\'y écris aucune donnée personnelle." : "Une remarque, une idée, un bug, une question à ajouter ? Écris-nous : chaque message aide à améliorer Power Up.")) + '</p>' +
      '<fieldset class="fb-types"><legend class="sr-only">Type de message</legend>' + types.map(function (t, k) { return '<label class="fb-type"><input type="radio" name="fbtype" value="' + t + '"' + ((preset ? t === preset.type : k === 0) ? " checked" : "") + "><span>" + t + "</span></label>"; }).join("") + "</fieldset>" +
      '<label class="fb-label" for="fb-msg">Ton message</label><textarea id="fb-msg" rows="6" placeholder="Par exemple : ce serait génial d\'avoir un boss sur Teams…">' + (preset ? esc(preset.text) : "") + '</textarea>' +
      '<label class="fb-anon"><input type="checkbox" id="fb-anon" checked> <span>Rester anonyme : ne pas joindre mon pseudo ni mon rang</span></label>' +
      (cfg.feedbackEmail ? '<p class="muted fb-mailnote" style="margin:0;font-size:13px">Par e-mail, ton adresse reste visible par la personne qui reçoit le message. Pour un envoi sans identité' + (formUrl ? ", utilise le formulaire." : ", copie ton message.") + "</p>" : "") + (preset && formUrl ? '<p class="muted" style="margin:0;font-size:13px">Le formulaire s\'ouvre dans un nouvel onglet, chez un service externe : n\'y écris aucune donnée personnelle.</p>' : "") +
      '<p class="fb-warn" role="alert" hidden>Écris quelques mots avant d\'envoyer.</p>' +
      '<div class="fb-actions">' + (cfg.feedbackEmail ? '<button type="button" class="btn btn-primary" data-fb-send>Envoyer par e-mail</button>' : "") + (embed ? '<button type="button" class="btn btn-primary" data-fb-embed>Afficher le formulaire</button><a class="btn btn-ghost" href="' + esc(safeUrl(formUrl)) + '" target="_blank" rel="noopener">Ouvrir dans un nouvel onglet</a>' : formUrl ? '<a class="btn ' + (cfg.feedbackEmail && !preset ? "btn-ghost" : "btn-primary") + '" href="' + esc(safeUrl(formUrl)) + '" target="_blank" rel="noopener">' + (preset ? "Signaler via le formulaire" : formOnly ? "Ouvrir le formulaire" : "Répondre via le formulaire") + "</a>" : "") +
      '<button type="button" class="btn btn-ghost" data-fb-copy>Copier mon message</button></div>' +
      (cfg.feedbackEmail || formUrl ? "" : '<p class="muted" style="margin:0;font-size:13px">L\'adresse de réception n\'est pas encore configurée (fichier js/config.js). En attendant, copie ton message et envoie-le à l\'équipe.</p>') + "</form>";
    function payload() {
      var type = (dlg.querySelector('input[name="fbtype"]:checked') || {}).value || "Suggestion", msg = dlg.querySelector("#fb-msg").value.trim();
      return { type: type, msg: msg, full: "[" + type + "] " + msg + (dlg.querySelector("#fb-anon").checked ? "" : "\n\n— " + (P.pseudo || "Héros anonyme") + " · " + rankInfo(P.xp).name + " · page " + (location.hash || "#/")) };
    }
    dlg.onclick = function (e) {
      var em = e.target.closest && e.target.closest("[data-fb-embed]");
      if (em) {
        var m = String(formUrl).match(/tally\.so\/r\/([A-Za-z0-9]+)/), box = document.createElement("div"); box.className = "fb-frame";
        var fr = document.createElement("iframe"); fr.title = "Formulaire de la boîte à idées (service externe)"; fr.loading = "lazy"; fr.setAttribute("referrerpolicy", "no-referrer");
        fr.src = m ? "https://tally.so/embed/" + m[1] + "?hideTitle=1&alignLeft=1" : safeUrl(formUrl);
        box.appendChild(fr); em.closest(".fb-actions").before(box); em.remove(); return;
      }
      var send = e.target.closest && e.target.closest("[data-fb-send]"), copy = e.target.closest && e.target.closest("[data-fb-copy]"); if (!send && !copy) return;
      var d = payload(), warn = dlg.querySelector(".fb-warn"); if (!d.msg) { warn.hidden = false; dlg.querySelector("#fb-msg").focus(); return; } warn.hidden = true;
      if (send) { location.href = "mailto:" + encodeURIComponent(cfg.feedbackEmail).replace("%40", "@") + "?subject=" + encodeURIComponent("Power Up · " + d.type) + "&body=" + encodeURIComponent(d.full); announce("Ta messagerie s'ouvre avec ton message."); }
      if (copy) { var done = function () { copy.textContent = "Message copié !"; setTimeout(function () { copy.textContent = "Copier mon message"; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(d.full).then(done, function () {}); else { var ta = dlg.querySelector("#fb-msg"); ta.value = d.full; ta.select(); try { document.execCommand("copy"); done(); } catch (err) { } } }
    };
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    setTimeout(function () { var t = dlg.querySelector("#fb-msg"); if (t) t.focus(); }, 50);
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    if (e.target.closest("[data-feedback]")) openFeedback();
    else if (e.target.closest("[data-report]") && V && V.run && V.run.q) { var rq = V.run.q; openFeedback({ type: "Question à corriger", id: qidOf(rq), text: "Question : " + rq.q + "\n(Identifiant : " + qidOf(rq) + ")\n\nCe qui ne va pas : " }); }
  });

  function navBadge() {
    var n = typeof unreadCount === "function" ? unreadCount() : 0;
    return n ? '<span class="nav-dot' + (veilleUrgent() ? " urgent" : "") + '" aria-hidden="true"></span><span class="sr-only">, ' + (veilleUrgent() ? "alerte de sécurité à lire" : "nouvelles actus") + "</span>" : "";
  }
  /* Icônes en trait fin (même jeu sur téléphone et ordinateur) */
  var NAV_ICONS = {
    qg: '<path d="M9.500 11.500a2.500 2.500 0 0 1 5 0"/><path d="M2 16l4.500-4.500h11L22 16l-4 2.500H6z"/><circle cx="8" cy="15" r=".7"/><circle cx="12" cy="15" r=".7"/><circle cx="16" cy="15" r=".7"/><path d="M8 18.500V21M16 18.500V21"/>',
    labo: '<path d="M9 3h6M10 3v6.200L4.800 18a2 2 0 0 0 1.800 3h10.800a2 2 0 0 0 1.800-3L14 9.200V3"/><path d="M7.500 15h9"/>',
    idee: '<path d="M9 17.500h6M10 21h4M12 2.800a6.300 6.300 0 0 0-3.800 11.300c.6.5.8 1.100.8 1.900v.5h6V16c0-.8.3-1.400.8-1.900A6.300 6.300 0 0 0 12 2.800z"/>',
    jouer: '<path d="M7 7h10a5 5 0 0 1 4.8 6.4l-.9 3A2.6 2.6 0 0 1 16 17l-1.4-2H9.4L8 17a2.6 2.6 0 0 1-4.9-.6l-.9-3A5 5 0 0 1 7 7z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="10.5" r=".6"/><circle cx="17.5" cy="12.5" r=".6"/>',
    mission: '<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="m9 12 2.2 2.2L15.500 10"/>',
    stats: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>',
    collectif: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.500 2.700-6 6-6s6 2.500 6 6"/><circle cx="17" cy="9" r="2.500"/><path d="M16 14.200c3 .2 5 2.300 5 5.800"/>',
    detente: '<path d="M12 4.500c2.200 2.700 2.800 5.500 0 9.500-2.800-4-2.200-6.800 0-9.500z"/><path d="M12 14c-1-3.500-4-5-8-5 0 4.500 3.500 7.500 8 7zM12 14c1-3.500 4-5 8-5 0 4.500-3.500 7.500-8 7z"/><path d="M6 20h12"/>',
    veille: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4"/>',
    nouveautes: '<path d="m12 3 1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/><path d="M19 17v4M17 19h4"/>',
    plus: '<circle cx="5" cy="12" r="1.300"/><circle cx="12" cy="12" r="1.300"/><circle cx="19" cy="12" r="1.300"/>'
  };
  function ico(id) { var d = NAV_ICONS[id]; return d ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + "</svg>" : ""; }
  /* Menu du profil (PC) : avatar + nom ouvrent Mon profil, Paramètres et Quitter ; sur mobile on garde les boutons séparés */
  function PMENU(r) {
    var ic = function (d) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>"; };
    return '<div class="pmenu"><button type="button" class="profile-chip pm-chip" data-pmenu-toggle aria-expanded="false" aria-haspopup="true" aria-controls="pm-pop"><span class="avatar">' + myAvatar(34) + (NEWS.length ? '<i class="new-dot chip-dot" aria-hidden="true"></i>' : "") + "</span><span><b>" + esc(P.pseudo || "Crée ton héros") + "</b><small>" + esc(r.name) + " · " + P.xp + ' XP</small></span><svg class="ic pm-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="pm-pop" id="pm-pop" role="menu" hidden>' +
      '<a role="menuitem" href="#/profil">' + ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>') + "Mon profil" + (NEWS.length ? '<i class="new-dot chip-dot inline" aria-hidden="true"></i><span class="sr-only">Nouveau</span>' : "") + "</a>" +
      '<button type="button" role="menuitem" data-sound-toggle>' + ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100"/>') + "Paramètres</button>" + (NEWS.length ? '<button type="button" role="menuitem" data-news-clear>' + ic('<path d="M5 12.500l4.500 4.500L19 7.500"/>') + "Tout marquer comme vu</button>" : "") + "<hr>" +
      '<button type="button" role="menuitem" class="pm-out" data-quit-ask>' + ic('<path d="M12 3v8M6.300 6.300a8 8 0 1 0 11.400 0"/>') + "Quitter le QG</button></div></div>";
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-pmenu-toggle]"), w = document.querySelector(".pmenu");
    if (t) { var open = t.getAttribute("aria-expanded") !== "true"; t.setAttribute("aria-expanded", String(open)); var pp = document.getElementById("pm-pop"); if (pp) pp.hidden = !open; return; }
    if (w && !(e.target.closest && e.target.closest(".pm-pop") && !(e.target.closest("a,button")))) {
      var c = w.querySelector("[data-pmenu-toggle]"), pp2 = document.getElementById("pm-pop");
      if (c && c.getAttribute("aria-expanded") === "true") { c.setAttribute("aria-expanded", "false"); if (pp2) pp2.hidden = true; }
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key !== "Escape") return; var c = document.querySelector("[data-pmenu-toggle]"), pp = document.getElementById("pm-pop"); if (c && c.getAttribute("aria-expanded") === "true") { c.setAttribute("aria-expanded", "false"); if (pp) pp.hidden = true; c.focus(); } });
  function header(active) {
    if (active === "train" || active === "ranked") active = "jouer"; /* Entraînement et Mode classé sont regroupés sous « Jouer » */
    var r = rankInfo(P.xp); refreshNews();
    function link(href, id, label) { return '<a href="' + href + '"' + (active === id ? ' class="active" aria-current="page"' : "") + ">" + ico(id) + "<span>" + label + "</span>" + relTabDot(id) + "</a>"; }
    return '<header class="topbar"><div class="container">' +
      '<a class="logo" href="#/" data-tip="Retour au QG" aria-label="Retour au QG"' + (active === "qg" ? ' aria-current="page"' : "") + '>' + I.logo + 'POWER <span>UP</span></a>' +
      '<nav class="nav" aria-label="Navigation principale">' +
      link("#/jouer", "jouer", "Jouer") + link("#/mission", "mission", "Boss") + link("#/stats", "stats", "Révisions") + '<a href="labo/index.html" class="nav-labo">' + ico("labo") + "<span>Labo</span>" + '<em class="nav-beta" aria-hidden="true">bêta</em></a>' + link("#/collectif", "collectif", "Défis") + link("#/detente", "detente", "Détente") + link("#/veille", "veille", "Veille" + navBadge()) + (!DEV_PAGES ? "" : link("#/maintenance", "sons", "Maintenance")) +
      "</nav>" + soundButton() +
      '<button type="button" class="idea-btn" data-feedback title="Boîte à idées" aria-label="Boîte à idées">' + ico("idee") + "</button>" +
      PMENU(r) + '<a class="profile-chip m-only" href="#/profil" style="text-decoration:none;color:inherit" aria-label="Mon profil' + (NEWS.length ? " (nouveauté débloquée)" : "") + '"><span class="avatar">' + myAvatar(34) + (NEWS.length ? '<i class="new-dot chip-dot" aria-hidden="true"></i>' : "") + "</span><span><b>" + esc(P.pseudo || "Crée ton héros") + "</b><small>" + esc(r.name) + " · " + P.xp + " XP</small></span></a>" +
      '<button type="button" class="quit-btn m-only" data-quit-ask title="Quitter le QG" aria-label="Quitter le QG"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6.3 7.2a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
      "</div></header>" + tabbar(active);
  }
  /* Barre d'onglets en bas (téléphone, visible par CSS seulement) : 4 onglets + « Plus » (Défis, Détente, Veille) */
  function tabbar(active) {
    function tb(href, id, ico, label) { return '<a href="' + href + '"' + (active === id ? ' class="active" aria-current="page"' : "") + '><span class="tb-ico" aria-hidden="true">' + ico + '</span><span class="tb-lbl">' + label + "</span>" + relTabDot(id) + "</a>"; }
    function mo(href, id, ico, label, extra) { return '<a href="' + href + '"' + (active === id ? ' class="active" aria-current="page"' : "") + '><span class="tb-ico" aria-hidden="true">' + ico + "</span>" + label + (extra || "") + relTabDot(id) + "</a>"; }
    if (active === "mission") active = "jouer";  /* sur téléphone, les boss se trouvent dans Jouer */
    var moreOn = active === "collectif" || active === "detente" || active === "veille" || active === "sons";
    var n = typeof unreadCount === "function" ? unreadCount() : 0;
    return '<nav class="tabbar" aria-label="Navigation du bas">' +
      tb("#/", "qg", ico("qg"), "QG") + tb("#/jouer", "jouer", ico("jouer"), "Jouer") + tb("#/stats", "stats", ico("stats"), "Révisions") + '<a href="labo/index.html" class="tb-labo"><span class="tb-ico" aria-hidden="true">' + ico("labo") + '</span><span class="tb-lbl">Labo</span><span class="tb-beta" aria-hidden="true">bêta</span></a>' +
      '<button type="button" data-tabmore aria-haspopup="true" aria-expanded="false" class="' + (moreOn ? "active" : "") + '"><span class="tb-ico" aria-hidden="true">' + ico("plus") + '</span><span class="tb-lbl">Plus</span>' + (n ? '<span class="nav-dot tb-dot' + (veilleUrgent() ? " urgent" : "") + '" aria-hidden="true"></span><span class="sr-only">, ' + (veilleUrgent() ? "alerte de sécurité à lire" : "nouvelles actus") + "</span>" : "") + "</button></nav>" +
      '<div class="tabmore" hidden role="menu" aria-label="Plus">' +
      mo("#/collectif", "collectif", ico("collectif"), "Défis") + mo("#/detente", "detente", ico("detente"), "Détente") + mo("#/veille", "veille", ico("veille"), "Veille", n ? '<span class="nav-badge"><span class="sr-only">, </span>' + (n > 99 ? "99+" : n) + "</span>" : "") +
      (DEV_PAGES ? mo("#/maintenance", "sons", "", "Maintenance") : "") + mo("#/nouveautes", "nouveautes", ico("nouveautes"), "Nouveautés") +
      '</div><button type="button" class="to-top" data-to-top aria-label="Revenir en haut de la page">↑</button>';
  }
  /* Date de la dernière mise en ligne : remplacée à la construction du site (outils/construire.py) ; en local, « version locale » */
  var BUILD_DATE = "__BUILD_DATE__";
  function buildInfo() {
    var en = window.PU_LANG === "en", ok = BUILD_DATE.indexOf("__") !== 0, d = ok ? new Date(BUILD_DATE + "T12:00:00") : null;
    var txt = ok && d && !isNaN(d) ? (en ? "Updated: " : "Mise à jour : ") + d.toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }) : (en ? "Local version" : "Version locale");
    return '<span class="footer-build muted" style="font-size:13px">' + esc(txt) + "</span>";
  }
  function footer() {
    var found = secretsFound();
    return '<footer class="footer"><div class="container"><span>Power Up · <a href="#/apropos">À propos</a></span><div class="footer-row"><button type="button" class="footer-idea" data-feedback><span class="ft-ico ft-bulb" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M9 17.5h6M10 21h4M12 2.8a6.3 6.3 0 0 0-3.8 11.3c.6.5.8 1.1.8 1.9v.5h6V16c0-.8.3-1.4.8-1.9A6.3 6.3 0 0 0 12 2.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="ft-rays" d="M12 .2v.9M3.4 3.6l.7.6M20.6 3.6l-.7.6M.9 10h.9M22.2 10h.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>Boîte à idées</button></div>' + buildInfo() + '<a class="footer-legal" href="#/confidentialite">Confidentialité</a></div></footer>';
  }

  /* =========================================================
     VUE : banc de sons (onglet temporaire pour Rachel, à retirer à la fin)
     ========================================================= */
  var SOUND_BENCH = [
    ["Nouveaux sons", true, [["badge", "Nouveau badge", "Petit carillon quand une médaille rejoint ta vitrine."], ["cape", "Nouvelle cape", "Souffle puissant de départ en vol quand une cape arrive au vestiaire ou que tu en changes."], ["ignite", "Légende se débloque", "Les chaînes cliquettent, se brisent, puis la flamme repart."], ["fightReal", "Entrée dans un combat", "Ta cloche de ring (sons/Bell.mp3)."], ["fightReal3", "Entrée dans un combat (niveau 3)", "Double coup de cloche."], ["bossStart", "Combat · son de secours", "Joué seulement si le fichier Bell manque."], ["shutdown", "Captain Reboot plante", "Glitchs puis extinction (secret des 7 clics)."], ["boot", "Captain Reboot redémarre", "Bourdonnement, bips de diagnostic, accord de démarrage."], ["read", "Article lu", "Petit « tic » quand tu réponds « Oui, c'est lu » dans la veille."], ["vol", "Réglage du volume", "Bip quand tu lâches la tirette."]]]
  ];

  var PROFILE_BGS = [
    { id: "qg", name: "Bleu QG", how: "Fond actuel · offert dès le départ" },
    { id: "trame", name: "Trame BD", how: "Idée : offert dès le départ" },
    { id: "rayons", name: "Case de BD", how: "Idée : grade Technicien · nouvelle version (trame, traits de vitesse, ZAP!)" },
    { id: "circuit", name: "Circuit imprimé", how: "Idée : vaincre le Grand Crash" },
    { id: "hexa", name: "Ruche du QG", how: "Idée : grade Super technicien" },
    { id: "aurore", name: "Aurore boréale", how: "Idée : 7 jours de série" },
    { id: "etoiles", name: "Nuit étoilée", how: "Idée : grade Super admin" },
    { id: "matrice", name: "Pluie de code", how: "Idée : vaincre le Bug fantôme" },
    { id: "retro", name: "Grille rétro", how: "Idée : trouver le code secret" },
    { id: "brasier", name: "Brasier", how: "Idée : cape flamboyante (5 jours de suite)" },
    { id: "or", name: "Salle des trophées", how: "Idée : grade Super directeur technique" },
    { id: "hyperespace", name: "Saut dans l'hyperespace", how: "Idée : vaincre un boss au niveau 3" }
  ];
  var PRESTIGE_BGS = [
    { id: "lumiere", prestige: 1, name: "Porteur de lumière", how: "Vaincre le Grand Blackout au niveau 3 : la ville se rallume, les six gardiens tournent autour de la lumière." },
    { id: "couronne", prestige: 1, name: "Couronne du QG", how: "Atteindre le grade Super directeur technique." },
    { id: "commandement", prestige: 1, name: "Poste de commandement", how: "Atteindre le grade Super admin : radar, bouclier et consoles." },
    { id: "flamme", prestige: 1, name: "Flamme de la Légende", how: "Badge Légende absolue : une partie Légende sans aucune erreur." }
  ];
  var MUSEE_BGS = [
    { id: "cartes", y: "1890-1970", name: "Cartes perforées", how: "Les premiers programmes étaient des trous dans du carton." },
    { id: "lampes", y: "1946", name: "Lampes à vide", how: "Les premiers ordinateurs géants chauffaient des milliers de lampes." },
    { id: "tennis", y: "1958-1972", name: "Tennis sur écran", how: "Deux raquettes, une balle : parmi les tout premiers jeux vidéo." },
    { id: "terminal", y: "1970-1980", name: "Terminal vert", how: "L'écran à phosphore vert et sa ligne de commande." },
    { id: "labyrinthe", y: "1980", name: "Labyrinthe à pastilles", how: "L'âge d'or de l'arcade, version QG : le robot mange les pastilles." },
    { id: "tombent", y: "1984", name: "Blocs qui tombent", how: "Les jeux de blocs à empiler, avec nos propres formes." },
    { id: "pixels", y: "1985-1995", name: "Paysage 8 bits", how: "Les consoles de salon et leurs pixels bien carrés." },
    { id: "disquettes", y: "1971-2000", name: "Disquettes", how: "L'ancêtre de la clé USB… et de l'icône « Enregistrer »." },
    { id: "serpent", y: "1997", name: "Serpent de poche", how: "Le jeu du serpent sur les premiers téléphones portables." },
    { id: "nuage", y: "2006", name: "Le nuage", how: "Le cloud : tes fichiers et applis hébergés dans des datacenters." },
    { id: "blocs", y: "2009", name: "Monde en blocs", how: "Les jeux bac à sable où l'on construit tout, cube par cube." },
    { id: "neurones", y: "2020", name: "Réseau de neurones", how: "L'IA générative : des milliards de connexions qui apprennent." }
  ];
  /* Fonds de la carte de héros : conditions de déblocage (un fond débloqué le reste) */
  var BG_RULES = {
    qg: [function () { return true; }, "Offert dès le départ"],
    trame: [function () { return true; }, "Offert dès le départ"],
    cartes: [function () { return true; }, "Offert dès le départ"],
    rayons: [function () { return rankIndex(P.xp) >= 1; }, "Atteindre le grade Technicien"],
    hexa: [function () { return rankIndex(P.xp) >= 2; }, "Atteindre le grade Super technicien"],
    etoiles: [function () { return rankIndex(P.xp) >= 3; }, "Atteindre le grade Super admin"],
    or: [function () { return rankIndex(P.xp) >= 4; }, "Atteindre le grade Super directeur technique"],
    circuit: [function () { return bossWon("crash"); }, "Vaincre le Grand Crash"],
    matrice: [function () { return bossWon("bug"); }, "Vaincre le Bug fantôme"],
    neurones: [function () { return bossWon("hallu"); }, "Vaincre la Grande Hallucination"],
    aurore: [function () { ensureStats(); return P.stats.days.length >= 7; }, "Jouer 7 jours différents"],
    retro: [function () { return !!(P.secrets && P.secrets.konami); }, "Trouver le code des anciens (secret)"],
    terminal: [function () { return !!(P.secrets && P.secrets.terminal); }, "Trouver l'appel en ligne de commande (secret)"],
    brasier: [function () { return capeHeat() >= 5; }, "Avoir une cape flamboyante (5 jours de suite)"],
    hyperespace: [function () { return (window.BOSSES || []).some(function (b) { var r = P.bosses && P.bosses[b.id]; return r && r.levels && r.levels[3]; }); }, "Vaincre un boss au niveau 3"],
    lampes: [function () { ensureStats(); return P.stats.correct >= 25; }, "25 bonnes réponses"],
    tennis: [function () { ensureStats(); return P.stats.correct >= 50; }, "50 bonnes réponses"],
    labyrinthe: [function () { ensureStats(); return P.stats.correct >= 100; }, "100 bonnes réponses"],
    tombent: [function () { ensureStats(); return P.stats.correct >= 150; }, "150 bonnes réponses"],
    pixels: [function () { ensureStats(); return P.stats.correct >= 250; }, "250 bonnes réponses"],
    disquettes: [function () { ensureStats(); return P.stats.correct >= 400; }, "400 bonnes réponses"],
    serpent: [function () { ensureStats(); return P.stats.correct >= 600; }, "600 bonnes réponses"],
    blocs: [function () { ensureStats(); return P.stats.correct >= 800; }, "800 bonnes réponses"],
    nuage: [function () { var n = 0; try { n = Object.keys(veilleRead || {}).length; } catch (e) { } return n >= 5; }, "Lire 5 actus de la veille"],
    lumiere: [function () { var r = P.bosses && P.bosses.blackout; return !!(r && r.levels && r.levels[3]); }, "Vaincre le Grand Blackout au niveau 3"],
    couronne: [function () { return rankIndex(P.xp) >= 4; }, "Atteindre le grade Super directeur technique"],
    commandement: [function () { return rankIndex(P.xp) >= 3; }, "Atteindre le grade Super admin"],
    flamme: [function () { ensureStats(); return (P.stats.legendPerfect || 0) > 0; }, "Une partie Légende sans aucune erreur"]
  };
  function bgList() {
    P.bgOpen = P.bgOpen || [];
    return PROFILE_BGS.concat(MUSEE_BGS, PRESTIGE_BGS).map(function (g) {
      var r = BG_RULES[g.id] || [function () { return false; }, "Bientôt"], open = P.bgOpen.indexOf(g.id) !== -1 || r[0]();
      if (open && P.bgOpen.indexOf(g.id) === -1) { P.bgOpen.push(g.id); saveProfile(); }
      return { id: g.id, name: g.name, y: g.y, prestige: g.prestige, how: r[1], open: open };
    });
  }
  /* Texte de l'infobulle d'un fond : comment il se débloque, ou comment il a été débloqué */
  function bgHowTxt(g) { return g.open ? (/^Offert/.test(g.how) ? g.how : "Débloqué : " + g.how) : "À débloquer : " + g.how; }
  function currentBg() { var l = bgList(), c = l.filter(function (x) { return x.id === P.bg && x.open; })[0]; return c || l.filter(function (x) { return x.id === "qg"; })[0]; }
  /* tall = carte en hauteur (profil, carte de héros) : le décor se cale en bas en entier au lieu d'être rogné sur les côtés */
  var BG_PATTERNS = ["disquettes", "serpent"];
  function bgLayers(g, tall) { var deco = (window.BG_DECO || {})[g.id]; if (!deco) return ""; if (tall && BG_PATTERNS.indexOf(g.id) === -1) deco = deco.replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMax meet"'); return '<span class="pbg-deco' + (tall ? " tall" : "") + '">' + deco + "</span>"; }
  function bgClass(g) { return "pbg pbg-" + g.id + (g.prestige ? " pbg-prestige" : ""); }
  function maintGallery() {
    function bgCard(g) {
      var deco = (window.BG_DECO || {})[g.id];
      return '<div class="mg-bg"><div class="public-card pbg pbg-' + g.id + (g.prestige ? " pbg-prestige" : "") + '">' + (deco ? '<span class="pbg-deco">' + deco + "</span>" : "") + (g.y ? '<span class="pbg-year">' + esc(g.y) + "</span>" : "") + '<div class="public-head"><span class="public-face">' + myAvatar(56) + '</span><div><b>' + esc(P.pseudo || "Héros sans nom") + '</b><small class="muted">Carte de héros</small>' + favSlots() + '</div></div><ul class="public-list"><li><span>Grade</span><b>' + esc(RANKS[rankIndex(P.xp)].n) + '</b></li><li><span>Badges</span><b>' + earnedBadges().length + '</b></li></ul></div><b class="mg-bg-name">' + esc(g.name) + '</b><small>' + esc(g.how) + "</small></div>";
    }
    var bgs = PROFILE_BGS.map(bgCard).join(""), musee = MUSEE_BGS.map(bgCard).join(""), prestige = PRESTIGE_BGS.map(bgCard).join("");
    return '<section class="bench-grp new"><h2 class="h-s">Proposition : fonds prestige (niveaux max)</h2><p class="muted" style="margin:0 0 12px">Les fonds les plus travaillés, réservés aux exploits : bordure animée, décor vivant.</p><div class="mg-bgs">' + prestige + "</div></section>" +
      '<section class="bench-grp new"><h2 class="h-s">Proposition : fonds de la carte de héros</h2><p class="muted" style="margin:0 0 12px">Des fonds au choix pour ta carte de héros, à débloquer comme les capes et les cadres. Survole les badges pour voir la nouvelle bulle. Dis-moi lesquels tu gardes !</p><div class="mg-bgs">' + bgs + "</div></section>" +
      '<section class="bench-grp new"><h2 class="h-s">Proposition : le musée de l\'informatique</h2><p class="muted" style="margin:0 0 12px">Une collection de fonds qui raconte l\'histoire de l\'informatique et du jeu vidéo, des cartes perforées à l\'IA. Idée : on les débloque en découvrant les anecdotes des gardiens ou en lisant la veille.</p><div class="mg-bgs">' + musee + "</div></section>" +
      "";
  }
  /* =========================================================
     VUE : STATS (onglet visible seulement sur l'ordinateur du créateur ; l'adresse #/stats montre,
     partout, les données du navigateur en cours — rien ne quitte l'appareil)
     ========================================================= */
  function StatsView(dev) {
    function bar(pct, color) { return '<span style="display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + (color || "var(--green-2)") + '"></i></span>'; }
    function pct(c, a) { return a ? Math.round(c * 100 / a) : 0; }
    function tile(label, val, sub, col) { return '<div class="side-card halftone" style="flex:1 1 150px;margin:0;border-top:3px solid ' + (col || "var(--blue-3)") + '"><span class="muted" style="font-size:13px">' + esc(label) + '</span><div class="h-m" style="margin:4px 0 0;color:' + (col || "var(--blue-3)") + '">' + esc(val) + "</div>" + (sub ? '<span class="muted" style="font-size:13px">' + esc(sub) + "</span>" : "") + "</div>"; }
    var MODE_LABELS = { train: "Entraînement", ranked: "Mode classé", mission: "Boss", collectif: "Défis", boss: "Boss" };
    return {
      nav: "stats",
      actions: {
        copy: function () {
          var data = JSON.stringify({ stats: P.stats, srs: P.srs || {}, date: todayStr() });
          var done = function () { var b = document.querySelector("[data-action=copy]"); if (b) { b.textContent = "Copié !"; setTimeout(function () { b.textContent = "Copier mes stats (JSON)"; }, 2000); } };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(done, function () { });
          return false;
        }
      },
      render: function () {
        ensureStats();
        var st = P.stats, srs = P.srs || {}, cfg = window.POWERUP_CONFIG || {}, t = dayNum();
        var acc = pct(st.correct, st.answered);
        var tiles = '';  /* les tuiles de la fiche de héros (réussite, temps, jours…) sont dans Profil › Stats & récompenses */

        /* par pilier et sous-thème */
        var pillars = PILLARS.map(function (pl) {
          var a = 0, c = 0, seen = 0, tot = 0;
          pl.subs.forEach(function (id) { var x = st.themes[id]; if (x) { a += x.a; c += x.c; } });
          QUESTIONS.forEach(function (q) { if (pl.subs.indexOf(q.theme) !== -1) { tot++; if (srs[qidOf(q)]) seen++; } });
          return '<div class="prog-row prog-row3" style="display:grid;grid-template-columns:minmax(140px,1.2fr) 3fr minmax(110px,1fr);gap:12px;align-items:center;padding:6px 0"><b style="color:' + pl.color + '">' + esc(pl.label) + "</b>" + bar(pct(seen, tot), pl.color) + '<span class="muted" style="font-size:13px">' + (dev ? seen + " / " + tot + " vues" : pct(seen, tot) + " % vu") + " · " + (a ? pct(c, a) + " % réussite" : "pas encore joué") + "</span></div>";
        }).join("");
        var rows = THEMES.filter(function (th) { return st.themes[th.id] && st.themes[th.id].a >= 1; }).map(function (th) { var x = st.themes[th.id]; return { th: th, a: x.a, c: x.c, p: pct(x.c, x.a) }; });
        rows.sort(function (x, y) { return (x.p - y.p) || (y.a - x.a); });
        var lowCount = rows.filter(function (r) { return r.a >= 5 && r.p < 60; }).length;
        var themeRows = rows.length ? rows.map(function (r) {
          var low = r.a >= 5 && r.p < 60;
          return '<div class="prog-row prog-row4" style="display:grid;grid-template-columns:minmax(160px,1.4fr) 3fr minmax(90px,.8fr) auto;gap:12px;align-items:center;padding:5px 0"><span>' + esc(r.th.label) + (low ? ' <span class="tag" style="background:var(--pink)">à retravailler</span>' : "") + "</span>" + bar(r.p, r.p >= 80 ? "var(--green-2)" : r.p >= 60 ? "var(--gold)" : "var(--pink)") + '<span class="muted" style="font-size:13px">' + r.p + " % · " + r.a + " rép.</span><a class=\"btn " + (low ? "btn-primary" : "btn-ghost") + "\" style=\"font-size:13px;padding:6px 12px\" href=\"#/entrainement?theme=" + r.th.id + "\">S'entraîner</a></div>";
        }).join("") : '<p class="muted">Pas encore de réponses sur ce navigateur.</p>';
        /* questions les plus ratées */
        var hard = Object.keys(srs).filter(function (id) { return srs[id].m > 0 && qById(id); }).sort(function (x, y) { return (srs[y].m - srs[x].m) || (srs[y].m / srs[y].n - srs[x].m / srs[x].n); }).slice(0, 10);
        var hardHtml = hard.length ? '<ol style="margin:0;padding-left:22px;line-height:1.6">' + hard.map(function (id) { var q = qById(id), e = srs[id]; return "<li>" + esc(q.q.length > 120 ? q.q.slice(0, 117) + "…" : q.q) + ' <span class="muted" style="font-size:13px">(' + esc(themeLabel(q.theme)) + " · ratée " + e.m + " fois sur " + e.n + ")</span></li>"; }).join("") + "</ol>" : '<p style="margin:0;color:var(--green-2)"><b>Aucune erreur enregistrée pour l\'instant.</b> <span class="muted">Les questions que tu rates apparaîtront ici, avec un bouton pour les retravailler.</span></p>';
        /* révision espacée */
        var BOX = ["En apprentissage", "Revue dans 1 jour", "dans 3 jours", "dans 7 jours", "dans 16 jours", "Maîtrisée (35 jours)"], cnt = [0, 0, 0, 0, 0, 0], due = 0, errs = 0;
        Object.keys(srs).forEach(function (id) { var e = srs[id]; cnt[e.b]++; if (e.d <= t) due++; if (e.w === 1) errs++; });
        var mx = Math.max.apply(null, cnt.concat([1]));
        var BCOL = ["var(--pink)", "#FF8A4C", "var(--gold)", "#9BD95B", "var(--green-2)", "var(--blue-3)"];
        var boxes = BOX.map(function (l, i) { return '<div class="prog-row prog-row3" style="display:grid;grid-template-columns:minmax(150px,1fr) 3fr 40px;gap:12px;align-items:center;padding:3px 0"><span style="color:' + BCOL[i] + '">● <span style="color:var(--text)">' + l + "</span></span>" + bar(cnt[i] * 100 / mx, BCOL[i]) + '<b style="color:' + BCOL[i] + '">' + cnt[i] + "</b></div>"; }).join("") + (Object.keys(srs).length ? "" : '<p class="muted" style="margin:10px 0 0">Les cases se remplissent au fil de tes parties : une question réussie passe à la case suivante, une erreur revient au début.</p>');
        /* tableau de bord : chiffres clés, bloc réviser, anneaux par pilier */
        var seenN = Object.keys(srs).length, plural = function (n, a, b) { return n > 1 ? b : a; };
        var kpiHtml = '<div class="prog-kpis"><div class="prog-kpi" style="--c:var(--blue-2)"><i aria-hidden="true">🧠</i><div><b>' + seenN + '</b><span>' + (dev ? "question" + plural(seenN, "", "s") + " sur " + QUESTIONS.length : "question" + plural(seenN, "", "s") + " croisée" + plural(seenN, "", "s")) + '</span></div></div><div class="prog-kpi" style="--c:var(--gold)"><i aria-hidden="true">⏰</i><div><b>' + due + '</b><span>à réviser aujourd\'hui</span></div></div><div class="prog-kpi" style="--c:var(--pink)"><i aria-hidden="true">⚠️</i><div><b>' + errs + '</b><span>en erreur</span></div></div></div>';
        var modes = Object.keys(st.modes).map(function (k) { return esc(MODE_LABELS[k] || k) + " : " + st.modes[k]; }).join(" · ") || "—";
        var BOXS = ["Apprentissage", "1 jour", "3 jours", "7 jours", "16 jours", "Maîtrisée"];
        var boxMini = '<div class="ph-boxes"><small>Où en sont tes questions</small>' + BOXS.map(function (l, i) { return '<div class="bx" style="--c:' + BCOL[i] + '"><span>' + l + '</span><u><i style="width:' + Math.round(cnt[i] * 100 / mx) + '%"></i></u><b>' + cnt[i] + "</b></div>"; }).join("") + '<small class="ph-modes">Modes joués : ' + modes + "</small></div>";
        var reviewHero = '<section class="prog-hero"><div class="ph-t"><h2>' + (due ? due + " question" + plural(due, "", "s") + " à réviser aujourd'hui" : (seenN ? "Rien à réviser pour l'instant" : "Ta révision commence ici")) + '</h2><p>' + (due ? "La révision espacée remet sous tes yeux ce que tu oublies le plus vite. Compte environ " + Math.max(1, Math.round(Math.min(due, 20) * 0.6)) + " minute" + (Math.round(Math.min(due, 20) * 0.6) > 1 ? "s" : "") + "." : (seenN ? "Reviens demain : les questions réussies reviennent de plus en plus tard, les ratées dès que possible." : "Joue quelques questions : celles que tu rates reviennent ici très vite.")) + '</p><div class="btn-row"><a class="btn btn-primary" href="' + (due ? "#/entrainement?review=due" : "#/entrainement") + '">' + (due ? "Réviser maintenant" : "S'entraîner") + '</a>' + (srsList("errors").length ? '<a class="btn btn-ghost" href="#/entrainement?review=errors">Mes erreurs · ' + srsList("errors").length + '</a>' : "") + '</div></div>' + boxMini + '</section>';
        var ringsHtml = '<section class="prog-rings-card"><h2 class="h-m">Réussite par thème</h2><p class="muted pr-sub">Ta réussite sur chaque grand thème. Un thème grisé n\'a pas encore été joué.</p><div class="prog-rings">' + PILLARS.map(function (pl) {
          var a = 0, c = 0; pl.subs.forEach(function (id) { var x = st.themes[id]; if (x) { a += x.a; c += x.c; } });
          var pp = a ? pct(c, a) : 0;
          return '<a class="prog-ring' + (a ? "" : " empty") + '" href="#/entrainement" style="--c:' + pl.color + ';--p:' + pp + '"><span class="pr-dial" data-t="' + (a ? pp + " %" : "–") + '"></span><span class="pr-tx"><b>' + esc(pl.label) + '</b><small>' + (a ? c + " / " + a + " bonnes" : "pas encore joué") + '</small></span></a>';
        }).join("") + "</div></section>";
        var modes = Object.keys(st.modes).map(function (k) { return esc(MODE_LABELS[k] || k) + " : " + st.modes[k]; }).join(" · ") || "—";
        var CF_WA = "https://dash.cloudflare.com/?to=/:account/web-analytics", CF_PAGES = "https://dash.cloudflare.com/?to=/:account/pages/view/powerup365";
        var analytics = '<div class="btn-row" style="margin:0"><a class="btn btn-primary" href="' + esc(cfg.analyticsUrl ? safeUrl(cfg.analyticsUrl) : CF_WA) + '" target="_blank" rel="noopener">📊 Ouvrir les statistiques de fréquentation</a><a class="btn btn-ghost" href="' + CF_PAGES + '" target="_blank" rel="noopener">Projet Cloudflare Pages</a></div><p class="muted" style="margin:10px 0 0;font-size:14px">Ces liens s\'ouvrent sur ton compte Cloudflare (connecte-toi si besoin). Visible uniquement en local : cette section n\'existe pas sur le site publié.' + (cfg.analyticsUrl ? "" : " Pour un accès direct à ton tableau, colle son adresse dans <code>analyticsUrl</code> (fichier <code>js/config.js</code>).") + "</p>";
        if (dev === "only") return '<section class="bench-grp"><h2 class="h-s">Révisions · version locale</h2><p class="muted" style="margin:0 0 12px">Ces blocs ne s\'affichent que sur ton appareil, jamais pour les joueurs.</p>' + '<section class="side-card halftone" style="margin-bottom:22px"><h2 class="h-m">Couverture de la banque, par pilier</h2>' + pillars + "</section>" + '<section class="side-card halftone" style="margin-bottom:22px"><h2 class="h-m">Fréquentation du site public</h2>' + analytics + "</section>" + '<div class="btn-row"><button type="button" class="btn btn-ghost" data-action="copy">Copier mes stats (JSON)</button></div></section>';
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:24px"><span class="eyebrow" style="color:var(--gold)">' + (dev ? "Onglet local · pour Rachel" : "Tes révisions") + '</span><h1 class="h-l">' + "Révisions" + '</h1><p class="lead">' + (dev ? "Ce que ce navigateur a enregistré. Ces chiffres restent sur cet appareil et ne concernent que l\'adresse ouverte : le site en local et le site publié ont chacun les leurs." : "Les questions à revoir, tes erreurs et tes thèmes à retravailler. Ces chiffres restent dans ton navigateur : personne d\'autre ne les voit, et ils disparaissent si tu vides les données du navigateur ou changes d\'appareil.") + '</p></div>' +
          kpiHtml + reviewHero + ringsHtml +
          (dev ? '<section class="side-card halftone" style="margin-bottom:22px"><h2 class="h-m">Couverture de la banque, par pilier</h2>' + pillars + "</section>" : "") +
          '<div class="prog-folds"><details class="side-card halftone prog-fold" style="margin-bottom:22px"><summary><span class="pf-t"><h2 class="h-m">Réussite par sous-thème</h2><span class="muted pf-m">' + rows.length + " sous-thème" + (rows.length > 1 ? "s" : "") + " joué" + (rows.length > 1 ? "s" : "") + (lowCount ? " · <b style=\"color:var(--pink)\">" + lowCount + " à retravailler</b>" : "") + '</span></span><svg class="pf-chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><p class="muted" style="margin:12px 0 8px">Du plus faible au plus solide : les sous-thèmes à retravailler sont en haut.</p>' + themeRows + "</details>" +
          '<details class="side-card halftone prog-fold" style="margin-bottom:22px"><summary><span class="pf-t"><h2 class="h-m">Les 10 questions les plus ratées</h2><span class="muted pf-m">' + (hard.length ? hard.length + " question" + (hard.length > 1 ? "s" : "") + " à retravailler" : "Aucune erreur pour l\'instant") + '</span></span><svg class="pf-chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div style="margin-top:12px">' + hardHtml + "</div></details></div>" +
          (dev ? '<section class="side-card halftone" style="margin-bottom:22px"><h2 class="h-m">Fréquentation du site public</h2>' + analytics + "</section>" : "") +
          (dev ? '<div class="btn-row"><button type="button" class="btn btn-ghost" data-action="copy">Copier mes stats (JSON)</button></div>' : "") + '</main>';
      }
    };
  }

  /* Testeur de thèmes de fête (Maintenance) : un bouton par événement, le site entier passe en mode fête jusqu'à l'arrêt du test */
  function feteTester() {
    var cur = testEvt(), btns = EVENTS.map(function (ev) {
      return '<button type="button" class="btn btn-small ' + (cur && cur.id === ev.id ? "btn-primary" : "btn-ghost") + '" data-fete-test="' + ev.id + '">' + ev.emoji + " " + esc(ev.title) + "</button>";
    }).join("");
    var info = "";
    if (cur) {
      var h = window.heroById(cur.hero), has = cur.id !== "cybermois", bg = !!FETE_BG[cur.id];
      info = '<p class="muted" style="margin:14px 0 8px"><b>Test en cours : ' + cur.emoji + " " + esc(cur.title) + "</b> · gardien du jour : " + esc(h.name) + " · " + (has ? "déguisement" : "pas de déguisement") + " · " + (bg ? "fond de fête" : "pas de fond de fête") + " · coins décorés. Va voir le QG, les héros et ton profil : tout est en mode fête.</p>" +
        '<div class="fete-heroes">' + (window.HEROES || []).map(function (x) { return '<span class="fh" title="' + esc(x.name) + '">' + window.heroSvg(x, 84) + "</span>"; }).join("") + "</div>" +
        '<div class="test-actions" style="margin-top:12px"><a class="btn btn-primary" href="#/">Voir le QG</a><button type="button" class="btn btn-ghost" data-fete-replay>▶ Rejouer le message et la pluie</button><button type="button" class="btn btn-ghost" data-fete-test="">■ Arrêter le test</button>' + (EV_GAMES[cur.id] ? '<button type="button" class="btn btn-ghost" data-ev-play="' + cur.id + '">🎮 Essayer le mini-jeu</button><button type="button" class="btn btn-ghost" data-fete-gamereset>↺ Remettre le jeu à zéro</button>' : cur.id === "poisson" ? '<button type="button" class="btn btn-ghost" data-fete-gamereset>↺ Remettre le poisson en liberté</button>' : "") + "</div>";
    }
    return '<section class="bench-grp new"><h2 class="h-s">Thèmes de fête : tester le rendu</h2><p class="muted" style="margin:0 0 12px">Choisis une fête pour voir le site comme ce jour-là : déguisements des gardiens, coins décorés, fond, couleur d\'accent et bandeau du QG. Le test reste sur cet appareil, pour cet onglet seulement.</p><div class="test-actions">' + btns + "</div>" + info + "</section>";
  }
  function SoundsView() {
    var devStats = StatsView("only");
    return {
      nav: "sons",
      actions: devStats.actions,
      render: function () {
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:24px"><span class="eyebrow" style="color:var(--gold)">Onglet temporaire · pour Rachel</span><h1 class="h-l">Maintenance</h1><p class="lead">Ce qui reste à valider, et tes outils de test. Tout ce qui est déjà en place sur le site a été retiré de cette page. ' + (soundOn ? "" : '<b style="color:var(--gold)">Les sons sont coupés : active-les avec le haut-parleur.</b>') + "</p></div>" +
          feteTester() +
          '<section class="bench-grp new"><h2 class="h-s">Aperçu : style de la page d\'accueil</h2><p class="muted" style="margin:0 0 12px">Trois rendus à comparer : tel quel, une version équilibrée (même énergie, moins criarde), et une version pro (sobre, pour montrer le projet). Actif uniquement sur cet appareil, uniquement sur la page d\'accueil.</p><div class="test-actions">' +
            HOME_STYLES.map(function (s) { return '<button type="button" class="btn ' + (homeStyleOn() === s[0] ? "btn-primary" : "btn-ghost") + '" data-home-style="' + s[0] + '">' + esc(s[1]) + "</button>"; }).join("") +
            '<a class="btn btn-ghost" href="#/">Voir la page d\'accueil</a></div></section>' +
          '<section class="bench-grp test-mode"><h2 class="h-s">Mode test</h2><p class="muted" style="margin:0 0 12px">Débloque tout sur cet appareil (grade max, tous les boss aux 3 niveaux, badges, capes, cadres, secrets, cape flamboyante) pour faire des essais. Ton profil actuel est sauvegardé et peut être restauré.</p><div class="test-actions"><button type="button" class="btn btn-primary" data-test-unlock>Tout débloquer</button>' + (hasBackup() ? '<button type="button" class="btn btn-ghost" data-test-restore>Restaurer mon profil d\'avant</button>' : "") + (P.secrets && P.secrets.konami ? '<button type="button" class="btn btn-ghost" data-test-konami-reset>Ré-essayer la découverte du code Konami</button>' : "") + "</div></section>" +
          '<section class="bench-grp"><h2 class="h-s">Revoir les effets</h2><p class="muted" style="margin:0 0 12px">Pour rejouer à volonté l\'intro, l\'entrée en feu et les annonces, sans toucher à la règle du jour.</p><div class="test-actions"><button type="button" class="btn btn-ghost" data-intro-test="n-vaisseau">▶ Revoir l\'intro</button><button type="button" class="btn btn-ghost" data-feu-test="play">🔥 Revoir l\'entrée en feu</button><button type="button" class="btn btn-ghost" data-feu-test="reset">Réinitialiser le jour du feu</button><button type="button" class="btn btn-ghost" data-rel-test="reset">✨ Revoir les annonces (bandeaux et pastilles)</button></div></section>' +
          '<section class="bench-grp"><h2 class="h-s">Portes du QG · pistes à tester</h2><p class="muted" style="margin:0 0 12px">4 idées pour remplacer les portes d\'arrivée. Test seulement : ça ne change pas la porte réelle et rien n\'est publié.</p><div class="test-actions"><button type="button" class="btn btn-ghost" data-door-test="n-coffre">🔒 1 · Coffre-fort</button><button type="button" class="btn btn-ghost" data-door-test="n-labo">🧪 2 · Sas industriel</button><button type="button" class="btn btn-ghost" data-door-test="n-datacenter">🖥️ 3 · Datacenter</button><button type="button" class="btn btn-ghost" data-door-test="n-vaisseau">🚀 4 · Vaisseau</button></div></section>' +
          SOUND_BENCH.map(function (g) {
            return '<section class="bench-grp' + (g[1] ? " new" : "") + '"><h2 class="h-s">' + esc(g[0]) + '</h2><div class="bench-grid">' + g[2].map(function (x) {
              return '<button type="button" class="bench-card" data-bench="' + x[0] + '"><span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="txt"><b>' + esc(x[1]) + "</b>" + (x[2] ? "<small>" + esc(x[2]) + "</small>" : "") + "</span></button>";
            }).join("") + "</div></section>";
          }).join("") + maintGallery() + devStats.render().replace(/^<main[^>]*>/, "") .replace(/<\/main>$/, "") + "</main>";
      }
    };
  }
  /* ---------- Curseurs de souris (étape 78) : à essayer dans Maintenance, choix mémorisé ----------
     Chaque curseur = une flèche (partout) + une version « cliquable » (liens, boutons). Les champs de texte gardent le curseur texte. */
  function curUrl(svg, x, y, fb) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' + svg + "</svg>") + '") ' + x + " " + y + ", " + fb; }
  var CUR_ARROW = "M4 3 L4 25 L9.6 19.6 L13.6 28.6 L17.6 26.8 L13.6 18 L21.6 18 Z";
  var CUR_GLOVE = '<path d="M11 15 V5.2 a2.6 2.6 0 0 1 5.2 0 V13" fill="#F2F4F9" stroke="#0B0E13" stroke-width="1.6" stroke-linejoin="round"/><path d="M16.2 13 a2.4 2.4 0 0 1 4.8 0 v1.4 a2.4 2.4 0 0 1 4.8 0 v8.4 c0 4.4 -3 7.2 -7.4 7.2 h-3.2 c-3.6 0 -5.6 -1.8 -7.4 -4.6 l-3.2 -5 a2.3 2.3 0 0 1 3.6 -2.8 L11 20" fill="#F2F4F9" stroke="#0B0E13" stroke-width="1.6" stroke-linejoin="round"/><path d="M21 14.4 v3.4 M16.2 13 v4.6" stroke="#0B0E13" stroke-width="1.3" stroke-linecap="round"/><path d="M9.6 26.2 l4.6 4 h7.6 l3.2 -3" fill="none" stroke="#FF3D6E" stroke-width="2.6" stroke-linecap="round"/>';
  var CUR_PIXEL = "M4 2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h-6v2h2v2h2v4h-2v2h-2v-2h-2v-4h-2v2h-2v2h-2Z";
  var CURSORS = [
    { id: "systeme", name: "1 · Curseur normal", desc: "La flèche habituelle de l'ordinateur." },
    { id: "neon", name: "2 · Flèche néon", desc: "Flèche sombre au contour bleu néon ; bleue pleine sur ce qui est cliquable.",
      d: '<path d="' + CUR_ARROW + '" fill="#6E88FF" opacity=".35" transform="translate(0.6 0.6)"/><path d="' + CUR_ARROW + '" fill="#0B0E13" stroke="#8EA2FF" stroke-width="2" stroke-linejoin="round"/>', dx: 4, dy: 3,
      p: '<path d="' + CUR_ARROW + '" fill="#4C6BFF" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/><path d="M24 4 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#FFF1C2"/>', px: 4, py: 3 },
    { id: "eclair", name: "3 · Flèche éclair", desc: "Flèche blanche avec un petit éclair doré ; l'éclair grossit sur ce qui est cliquable.",
      d: '<path d="' + CUR_ARROW + '" fill="#FFFFFF" stroke="#0B0E13" stroke-width="1.8" stroke-linejoin="round"/><path d="M25 14 l-5 8 h3.4 l-2 7 6 -9 h-3.4z" fill="#F5C451" stroke="#6B4E12" stroke-width="1"/>', dx: 4, dy: 3,
      p: '<path d="M18 1 L5 18 H13 L9 31 L26 12 H17.5 Z" fill="#F5C451" stroke="#6B4E12" stroke-width="1.6" stroke-linejoin="round"/>', px: 18, py: 1 },
    { id: "gant", name: "4 · Gant de héros", desc: "Flèche blanche partout, gant de super-héros qui pointe sur ce qui est cliquable.",
      d: '<path d="' + CUR_ARROW + '" fill="#FFFFFF" stroke="#0B0E13" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 25 L9.6 19.6" stroke="#FF3D6E" stroke-width="2" stroke-linecap="round"/>', dx: 4, dy: 3,
      p: CUR_GLOVE, px: 13, py: 3 },
    { id: "pixel", name: "5 · Rétro 8-bit", desc: "Flèche en pixels façon vieux jeux vidéo ; dorée sur ce qui est cliquable.",
      d: '<path d="' + CUR_PIXEL + '" fill="#FFFFFF" stroke="#0B0E13" stroke-width="1.5" shape-rendering="crispEdges"/>', dx: 4, dy: 2,
      p: '<path d="' + CUR_PIXEL + '" fill="#F5C451" stroke="#0B0E13" stroke-width="1.5" shape-rendering="crispEdges"/>', px: 4, py: 2 },
    { id: "viseur", name: "6 · Néon + viseur en combat", desc: "La flèche néon partout, et un viseur rouge pendant les combats de boss.",
      base: "neon", boss: '<circle cx="16" cy="16" r="10" fill="none" stroke="#0B0E13" stroke-width="4"/><circle cx="16" cy="16" r="10" fill="none" stroke="#FF3D6E" stroke-width="2"/><path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="#0B0E13" stroke-width="4"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="#FF3D6E" stroke-width="2"/><circle cx="16" cy="16" r="1.8" fill="#FF3D6E"/>' }
  ];
  function curById(id) { for (var i = 0; i < CURSORS.length; i++) if (CURSORS[i].id === id) return CURSORS[i]; return CURSORS[0]; }
  /* Étape 81 : curseur 6 (flèche néon + viseur en combat) validé pour tout le monde ; interrupteur « Curseur rétro 8-bit » dans le menu du haut-parleur */
  function retroCursorOn() { try { return localStorage.getItem("powerup365.cursor8bit") === "on"; } catch (e) { return false; } }
  function cursorSaved() { return retroCursorOn() ? "pixel" : "viseur"; }
  var CLICKABLE = "a[href], button:not(:disabled), [data-action], [role=button], [role=switch], label, summary, select, .choice, .answer, .cape-pick, .frame-pick";
  function cursorCss(c, scope) {
    var b = c.base ? curById(c.base) : c; if (!b.d) return "";
    var css = scope + ", " + scope + " * { cursor: " + curUrl(b.d, b.dx, b.dy, "auto") + " !important; }\n" +
      scope.split(",").map(function (x) { return CLICKABLE.split(", ").map(function (q) { return x + " " + q + ", " + x + " " + q + " *"; }).join(", "); }).join(", ") + " { cursor: " + curUrl(b.p, b.px, b.py, "pointer") + " !important; }\n" +
      scope + " input:not([type=range]):not([type=checkbox]):not([type=radio]), " + scope + " textarea, " + scope + " [contenteditable] { cursor: text !important; }\n";
    if (c.boss) { var bs = scope + " main:has(.boss-hud)";
      css += bs + ", " + bs + " * { cursor: " + curUrl(c.boss, 16, 16, "crosshair") + " !important; }\n" +
        bs + " input:not([type=range]):not([type=checkbox]):not([type=radio]), " + bs + " textarea, " + bs + " [contenteditable] { cursor: text !important; }\n"; }
    return css;
  }
  function applyCursor() {
    var el = document.getElementById("pu-cursor"); if (!el) { el = document.createElement("style"); el.id = "pu-cursor"; document.head.appendChild(el); }
    var css = cursorCss(curById(cursorSaved()), "html"); /* aperçus de Maintenance : chaque carte montre son curseur au survol */
    el.textContent = css;
  }
  try { applyCursor(); } catch (e) { }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-retro-cursor]"); if (!b) return; var on = !retroCursorOn(); try { localStorage.setItem("powerup365.cursor8bit", on ? "on" : "off"); } catch (err) { } applyCursor(); b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); sfx("toggle"); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-fire-toggle]"); if (!b) return; var on = !capeFireOn(); try { localStorage.setItem("powerup365.capefire", on ? "on" : "off"); } catch (err) { } sfx(on ? "cape" : "toggle"); render(); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-cape-style]"); if (!b) return; try { localStorage.setItem("powerup365.capestyle", b.getAttribute("data-cape-style")); } catch (err) { } sfx("cape"); render(); });
  var PW_SFX_LIST = [["zap", "1 · Étincelle électrique"], ["charge", "2 · Charge de pouvoir"], ["arc", "3 · Arc électrique"], ["shine", "4 · Scintillement"], ["aura", "5 · Aura de combattant"], ["aurab", "6 · Aura qui explose"], ["aurah", "7 · Aura tant qu'on survole"], ["fichier", "8 · Aura (ton son, choisi)"]], PW_FN = { zap: "pwZap", charge: "pwCharge", arc: "pwArc", shine: "pwShine", aura: "pwAura", aurab: "pwAuraBurst", aurah: "pwAura", fichier: "" };
  /* 7 · l'aura dure tant que la souris reste sur le mot (3 secondes maximum), puis s'éteint en douceur */
  var auraStop = null;
  function auraHoldStart() { if (auraStop) return; auraStop = auraFx({ dur: 3, f0: 55, f1: 110, rumble: 0.075, roar: 0.07, flut: 14, crackles: 14 }); setTimeout(function () { auraStop = null; }, 3000); }
  function auraHoldStop() { if (auraStop) { auraStop(); auraStop = null; } }
  document.addEventListener("mouseout", function (e) { var w = e.target.closest && e.target.closest(".power-word"); if (!w || (e.relatedTarget && w.contains(e.relatedTarget))) return; if (pwSfxSaved() === "aurah") auraHoldStop(); if (pwSfxSaved() === "fichier") auraFileStop(); });
  document.addEventListener("focusout", function (e) { if (e.target.classList && e.target.classList.contains("power-word")) { if (pwSfxSaved() === "aurah") auraHoldStop(); if (pwSfxSaved() === "fichier") auraFileStop(); } });
  /* Étape 81 : le son d'aura fourni par Rachel (sons/aura-survol.mp3, libre de droits) devient le son par défaut pour tout le monde */
  function pwSfxSaved() { try { var v = localStorage.getItem("powerup365.pwsfx2"); return PW_FN[v] !== undefined ? v : "fichier"; } catch (e) { return "fichier"; } }
  var auraAudio = null, auraFade = null;
  function auraFileStart(restart) {
    if (!soundOn) return;
    try {
      if (!auraAudio) { auraAudio = new Audio("sons/aura-survol.mp3"); auraAudio.preload = "auto"; }
      if (auraFade) { clearInterval(auraFade); auraFade = null; }
      if (!auraAudio.paused && !restart) { auraAudio.volume = Math.min(1, volume * 1.3); return; }
      auraAudio.currentTime = 0; auraAudio.volume = Math.min(1, volume * 1.3); auraAudio.play().catch(function () { });
    } catch (e) { }
  }
  function auraFileStop() {
    if (!auraAudio || auraAudio.paused || auraFade) return;
    auraFade = setInterval(function () { var v = auraAudio.volume - 0.08; if (v <= 0.02) { auraAudio.pause(); clearInterval(auraFade); auraFade = null; } else auraAudio.volume = v; }, 25);
  }
  var pwLast = 0;
  function pwPlay(force) { var cur = pwSfxSaved(); if (cur === "fichier") { auraFileStart(force); return; } if (cur === "aurah") { if (force) { auraHoldStop(); auraStop = auraFx({ dur: 2.2, f0: 55, f1: 110, rumble: 0.075, roar: 0.07, flut: 14, crackles: 10 }); setTimeout(function () { auraStop = null; }, 2200); } else if (soundOn) auraHoldStart(); return; } var now = Date.now(); if (!force && now - pwLast < 1200) return; pwLast = now; sfx(PW_FN[cur]); }
  document.addEventListener("mouseover", function (e) { var w = e.target.closest && e.target.closest(".power-word"); if (!w || (e.relatedTarget && w.contains(e.relatedTarget))) return; pwPlay(); });
  document.addEventListener("focusin", function (e) { if (e.target.classList && e.target.classList.contains("power-word")) pwPlay(); });
  document.addEventListener("click", function (e) { var pk = e.target.closest && e.target.closest("[data-pw-pick]"); if (!pk) return; try { localStorage.setItem("powerup365.pwsfx2", pk.getAttribute("data-pw-pick")); } catch (err) { } if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } pwPlay(true); if (V && V.nav === "sons") render(); });
  function voiceChoiceSaved() { try { return localStorage.getItem("powerup365.voice") || "moyen"; } catch (e) { return "moyen"; } }
  function voiceTestPlay(base) { if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } try { var a = new Audio("sons/" + base + "-" + voiceChoiceSaved() + ".mp3"); a.volume = Math.min(1, volume * 1.6); a.play().catch(function () { }); } catch (err) { } }
  document.addEventListener("click", function (e) {
    var pk = e.target.closest && e.target.closest("[data-voice-pick]"); if (pk) { try { localStorage.setItem("powerup365.voice", pk.getAttribute("data-voice-pick")); } catch (err) { } voiceTestPlay("bienvenue"); if (V && V.nav === "sons") render(); return; }
    var pl = e.target.closest && e.target.closest("[data-voice-play]"); if (pl) voiceTestPlay(pl.getAttribute("data-voice-play"));
  });
  var INTRO_FX_LIST = [["portes", "1 · Plein écran, jointure droite"], ["eclair", "2 · Plein écran, jointure emboîtée"], ["sas", "3 · Sas blindé plein écran"], ["sascadre", "4 · Sas blindé avec cadre"], ["iris", "Ouverture en cercle"], ["hyperespace", "Saut dans l'hyperespace"]];
  function introFxSaved() { try { return localStorage.getItem("powerup365.introfx") || "eclair"; } catch (e) { return "eclair"; } }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-intro-test]"); if (!b) return; var fx = b.getAttribute("data-intro-test"); try { localStorage.setItem("powerup365.introfx", fx); } catch (err) { } if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } window.PU_intro(fx); if (V && V.nav === "sons") render(); });
  /* glisser-déposer des badges affichés */
  var featDrag = null;
  document.addEventListener("dragstart", function (e) { var t = e.target.closest && e.target.closest(".feat-slot.on"); if (!t) return; featDrag = +t.getAttribute("data-feat"); t.classList.add("dragging"); try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(featDrag)); } catch (err) { } });
  document.addEventListener("dragend", function (e) { var t = e.target.closest && e.target.closest(".feat-slot"); if (t) t.classList.remove("dragging"); document.querySelectorAll(".feat-slot.over").forEach(function (x) { x.classList.remove("over"); }); featDrag = null; });
  document.addEventListener("dragover", function (e) { var t = e.target.closest && e.target.closest(".feat-slot.on"); if (!t || featDrag === null) return; e.preventDefault(); document.querySelectorAll(".feat-slot.over").forEach(function (x) { if (x !== t) x.classList.remove("over"); }); t.classList.add("over"); });
  document.addEventListener("drop", function (e) { var t = e.target.closest && e.target.closest(".feat-slot.on"); if (!t || featDrag === null) return; e.preventDefault(); var to = +t.getAttribute("data-feat"), f = P.favBadges || []; if (to !== featDrag && f[featDrag] && f[to]) { var m = f.splice(featDrag, 1)[0]; f.splice(to, 0, m); saveProfile(); sfx("toggle"); } featDrag = null; render(); });
  /* Effet de remise à zéro en deux temps : l'écran se désagrège en pixels qui tombent, puis le QG se recompose (pixels qui reviennent se ranger, balayage lumineux). Simple message + son si les animations sont réduites. */
  function wipeDone() {
    sfx("wipe");
    function toast() {
      var t = document.createElement("div"); t.className = "rb-toast wipe-toast"; t.setAttribute("role", "status");
      t.innerHTML = '<span class="ico">✓</span><span><b>Progression effacée</b>Nouveau départ, recrue : le QG t\'attend !</span>';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4600);
    }
    if (liteOn() || !window.requestAnimationFrame) { toast(); return; }
    var W = window.innerWidth, H = window.innerHeight, bs = Math.max(14, Math.round(W / 36));
    var cols = Math.ceil(W / bs), rows = Math.ceil(H / bs), ACC = ["#F5C451", "#7C93FF", "#4CC37A", "#FFFFFF"];
    var base = theme === "light" ? "#E4EAFF" : "#0B0E13", base2 = theme === "light" ? "#D6DFFF" : "#141A26";
    var cv = document.createElement("canvas"); cv.className = "wipe-fx"; cv.setAttribute("aria-hidden", "true"); cv.width = W; cv.height = H;
    document.body.appendChild(cv); var cx = cv.getContext("2d"); if (!cx) { cv.remove(); toast(); return; }
    var cells = [], r, c, TB = 1.55, END = 3.4;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var acc = Math.random() < 0.13;
      cells.push({ x: c * bs, y: r * bs, d: c / cols * 0.55 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 60, vy: 20 + Math.random() * 120,
        col: acc ? ACC[(Math.random() * 3) | 0] : (Math.random() < 0.5 ? base : base2),
        rb: Math.random() < 0.2, sx: Math.random() * W, sy: H + Math.random() * H * 0.6, rd: Math.random() * 0.35, rc: ACC[(Math.random() * 4) | 0] });
    }
    sfxLater(TB, "rebuild"); setTimeout(toast, TB * 1000 + 300);
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now; var t = (now - t0) / 1000;
      cx.clearRect(0, 0, W, H);
      for (var k = 0; k < cells.length; k++) {
        var q = cells[k], a = t - q.d;
        if (a < 0.45 + q.d * 0) {
          if (t < 1.7) { cx.globalAlpha = Math.min(1, t / 0.12) * (a < 0 ? 1 : 1); cx.fillStyle = q.col; cx.fillRect(q.x, q.y, bs + 1, bs + 1); }
        }
        if (a >= 0.45 && a < 1.5) {
          var f = a - 0.45, y = q.y + q.vy * f + 700 * f * f, al = Math.max(0, 1 - f / 1.0);
          if (al > 0) { cx.globalAlpha = al; cx.fillStyle = q.col; var sz = bs * (1 - f * 0.4); cx.fillRect(q.x + q.vx * f, y, sz, sz); }
        }
        if (q.rb && t > TB + q.rd) {
          var u = Math.min(1, (t - TB - q.rd) / 0.75), e = 1 - Math.pow(1 - u, 3), px = q.sx + (q.x - q.sx) * e, py = q.sy + (q.y - q.sy) * e;
          var fade = t > TB + 1.0 ? Math.max(0, 1 - (t - TB - 1.0) / 0.7) : 1;
          if (fade > 0) { cx.globalAlpha = fade * (u < 1 ? 0.95 : 0.55 + 0.45 * Math.sin(t * 18 + k)); cx.fillStyle = q.rc; cx.fillRect(px, py, bs - 2, bs - 2); }
        }
      }
      var sw = (t - TB - 0.2) / 0.85;
      if (sw > 0 && sw < 1) {
        var yy = H * (1 - sw), g = cx.createLinearGradient(0, yy - 90, 0, yy + 6);
        g.addColorStop(0, "rgba(245,196,81,0)"); g.addColorStop(1, "rgba(245,196,81,0.55)");
        cx.globalAlpha = 1; cx.fillStyle = g; cx.fillRect(0, yy - 90, W, 96); cx.fillStyle = "#FFF3C4"; cx.fillRect(0, yy, W, 3);
      }
      cx.globalAlpha = 1;
      if (t < END) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
  }
  function sfxLater(sec, name) { setTimeout(function () { sfx(name); }, sec * 1000); }
  function toastMsg(txt) { var t = document.createElement("div"); t.className = "rb-toast"; t.setAttribute("role", "status"); t.innerHTML = '<span class="ico">!</span><span>' + esc(txt) + "</span>"; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  var BACKUP_KEY = "powerup365.profile.backup";
  function hasBackup() { try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; } }
  function unlockAll() {
    try { if (!localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, JSON.stringify(P)); } catch (e) { }
    ensureStats(); var st = P.stats, d = new Date(), days = [];
    for (var i = 0; i < 35; i++) { days.push(todayStr(d)); d.setDate(d.getDate() - 1); }
    st.days = days.concat(st.days.filter(function (x) { return days.indexOf(x) === -1; }));
    P.xp = Math.max(P.xp, 6000); P.bestStreak = Math.max(P.bestStreak || 0, 25); P.missionWon = true;
    st.correct = Math.max(st.correct, 1200); st.answered = Math.max(st.answered, 1400); st.rankedWins = Math.max(st.rankedWins || 0, 20);
    st.legendRuns = Math.max(st.legendRuns || 0, 3); st.legendPerfect = Math.max(st.legendPerfect || 0, 1);
    st.flawlessBoss = 1; st.night = true; st.early = true; st.graceFull = true;
    THEMES.forEach(function (t) { var x = st.themes[t.id] || { a: 0, c: 0 }; if (x.a < 60) { x.a = 60; x.c = 54; } st.themes[t.id] = x; });
    P.bosses = P.bosses || {};
    (window.BOSSES || []).forEach(function (b) { var r = P.bosses[b.id] || {}; r.levels = { 1: true, 2: true, 3: true }; r.won = true; r.wins = Math.max(r.wins || 0, 3); r.best = 3; P.bosses[b.id] = r; });
    P.secrets = P.secrets || {}; SECRETS.forEach(function (x) { P.secrets[x.id] = true; });
    for (var k = 0; k < 25; k++) veilleRead["test-" + k] = 1; saveRead();
    P.legendSeen = true; delete P.badgesSeen; delete P.capesSeen;
    var now = todayStr(new Date()); P.badgeDates = P.badgeDates || {}; earnedBadges().forEach(function (n) { if (!P.badgeDates[n]) P.badgeDates[n] = now; });
    saveProfile(); location.reload();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-test-unlock]")) { unlockAll(); return; }
    if (e.target.closest && e.target.closest("[data-test-restore]")) { try { var bk = localStorage.getItem(BACKUP_KEY); if (bk) { localStorage.setItem(STORE_KEY, bk); localStorage.removeItem(BACKUP_KEY); for (var k = 0; k < 25; k++) delete veilleRead["test-" + k]; saveRead(); location.reload(); } } catch (err) { } return; }
    if (e.target.closest && e.target.closest("[data-test-konami-reset]")) {
      if (P.secrets) delete P.secrets.konami;
      try { localStorage.removeItem("powerup365.cursor8bit"); } catch (err) { }
      try { localStorage.removeItem("powerup365.retrotheme"); } catch (err) { }
      saveProfile(); location.reload(); return;
    }
    var rk = e.target.closest && e.target.closest("[data-bench-rank]");
    if (rk) { if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } rankCeremony(true, +rk.getAttribute("data-bench-rank")); return; }
    var dm = e.target.closest && e.target.closest("[data-bench-demo]");
    if (dm) {
      if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); }
      var card = document.querySelector(".demo-legend"); if (!card) return;
      card.classList.remove("ignite"); var old = card.querySelector(".lv-unlocked"); if (old) old.remove();
      var ch = card.querySelector(".lv-chains"); if (ch) ch.remove(); card.insertAdjacentHTML("beforeend", chainsHtml(false));
      card.classList.add("locked-lv"); void card.offsetWidth;
      setTimeout(function () { var c2 = card.querySelector(".lv-chains"); if (c2) c2.classList.add("breaking"); sfx("ignite"); }, 700);
      setTimeout(function () { card.classList.remove("locked-lv"); card.classList.add("ignite"); var tag = document.createElement("span"); tag.className = "lv-unlocked"; tag.textContent = "Débloqué !"; card.appendChild(tag); }, 1150);
      return;
    }
    var b = e.target.closest && e.target.closest("[data-bench]"); if (!b) return;
    if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } V._focusKey = null; render(); b = document.querySelector('[data-bench="' + b.getAttribute("data-bench") + '"]') || b; }
    try { SFX[b.getAttribute("data-bench")](); } catch (err) { }
    b.classList.remove("playing"); void b.offsetWidth; b.classList.add("playing");
  });

  /* =========================================================
     VUE : Collectif (bientôt)
     ========================================================= */
  /* ---------- Défis entre collègues : même tirage de questions pour tous, grâce à un lien à partager ----------
     Aucun serveur : le lien contient la graine du tirage, le pilier, la longueur et le score à battre. */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function defiPick(seed, pillar, n) {
    var pool = QUESTIONS.filter(function (q) { return matchScope(q, pillar, "all") && q.level !== "legende" && !q.trial; })
      .sort(function (x, y) { var a = qidOf(x), b = qidOf(y); return a < b ? -1 : a > b ? 1 : 0; });
    var rnd = mulberry(parseInt(seed, 36) || 1), idx = pool.map(function (_, i) { return i; }), out = [];
    while (out.length < n && idx.length) out.push(pool[idx.splice(Math.floor(rnd() * idx.length), 1)[0]]);
    return out;
  }
  var DF_SECS = 15; /* secondes par question dans un défi entre collègues */
  function fmtT(s) { s = Math.max(0, Math.round(s)); return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + ("0" + (s % 60)).slice(-2); }
  function dfFace(id, size, color) {
    var a = id && avatarInfo(id) ? id : (window.DEFAULT_AVATAR || "patch");
    return '<span class="df-face" style="--c:' + color + '">' + (window.avatarSvg ? window.avatarSvg(a, size) : "") + "</span>";
  }
  function defiLink(c) {
    var base = location.href.split("#")[0];
    return base + "#/collectif?d=" + encodeURIComponent(c.seed) + "&p=" + encodeURIComponent(c.pillar) + "&n=" + c.n + (c.score != null ? "&s=" + c.score : "") + (c.time != null ? "&t=" + c.time : "") + (c.from ? "&f=" + encodeURIComponent(c.from) : "") + (c.av ? "&a=" + encodeURIComponent(c.av) : "");
  }
  /* Défi reçu, mémorisé sur cet appareil : on le retrouve en revenant dans « Défis ». « started » = lancé puis quitté = abandon. */
  var DF_KEY = "powerup365.defi.attente.v1";
  function dfLoad() {
    try { var o = JSON.parse(window.localStorage.getItem(DF_KEY)); if (o && /^[a-z0-9]{1,12}$/i.test(o.seed || "") && Date.now() - (o.at || 0) < 14 * 864e5) return o; } catch (e) { }
    return null;
  }
  function dfStore(o) { try { if (o) window.localStorage.setItem(DF_KEY, JSON.stringify(o)); else window.localStorage.removeItem(DF_KEY); } catch (e) { } }
  function CollectifView(params) {
    params = params || {};
    var okP = function (p) { return p === "all" || !!pillarById(p) ? p : "all"; };
    var ch = null;
    if (params.d && /^[a-z0-9]{1,12}$/i.test(params.d)) {
      ch = { seed: params.d, pillar: okP(params.p || "all"), n: [5, 10, 15].indexOf(+params.n) >= 0 ? +params.n : 10,
        score: params.s !== undefined && params.s !== "" ? Math.max(0, parseInt(params.s, 10) || 0) : null,
        time: params.t !== undefined && params.t !== "" ? Math.min(9999, Math.max(0, parseInt(params.t, 10) || 0)) : null,
        from: String(params.f || "").replace(/[<>"&'`]/g, "").slice(0, 20),
        av: /^[a-z0-9_-]{1,24}$/i.test(params.a || "") ? params.a : "" };
      var sv = dfLoad();
      if (sv && sv.seed === ch.seed && sv.pillar === ch.pillar) { ch.abandoned = !!sv.started; }
      else dfStore({ seed: ch.seed, pillar: ch.pillar, n: ch.n, score: ch.score, time: ch.time, from: ch.from, av: ch.av, started: false, at: Date.now() });
    } else {
      var sv2 = dfLoad();
      if (sv2) ch = { seed: sv2.seed, pillar: okP(sv2.pillar || "all"), n: [5, 10, 15].indexOf(+sv2.n) >= 0 ? +sv2.n : 10,
        score: sv2.score != null ? Math.max(0, parseInt(sv2.score, 10) || 0) : null, time: sv2.time != null ? Math.min(9999, Math.max(0, parseInt(sv2.time, 10) || 0)) : null,
        from: String(sv2.from || "").replace(/[<>"&'`]/g, "").slice(0, 20), av: /^[a-z0-9_-]{1,24}$/i.test(sv2.av || "") ? sv2.av : "", abandoned: !!sv2.started };
    }
    var view;
    function begin(c) {
      var list = defiPick(c.seed, c.pillar, c.n); if (list.length < 2) return;
      V.cur = c; V.list = list; V.i = 0; V.score = 0; V.tot = 0; V.qStart = Date.now(); V.endShown = false;
      V.run = newRun(list[0]); V.phase = "play"; V.copied = false; V._scroll = true; V.quit = null;
      if (V.ch && c === V.ch) dfStore({ seed: c.seed, pillar: c.pillar, n: c.n, score: c.score, time: c.time, from: c.from, av: c.av, started: true, at: Date.now() });
    }
    /* « 3, 2, 1, GO ! » puis départ : pour un défi reçu comme pour son propre défi */
    function countThen(c) {
      var self = V; V.phase = "count"; V.cd = 3; V._scroll = true; V.sheet = null;
      var seq = function () {
        setTimeout(function () {
          if (V !== self || self.phase !== "count") return;
          if (self.cd > 0) { self.cd--; render(); seq(); } else { begin(c); render(); }
        }, self.cd === 0 ? 700 : 800);
      };
      seq();
    }
    view = {
      nav: "collectif", phase: "home", cfgP: "all", cfgN: 10, ch: ch, cur: null, list: [], i: 0, score: 0, tot: 0, qStart: 0, cd: 3, run: null, copied: false, endShown: false,
      onAnswer: function (good) { if (good) this.score++; this.tot += Math.min(DF_SECS, (Date.now() - this.qStart) / 1000); },
      actions: {
        dfpillar: function (d) { V.cfgP = d.id; V._focusKey = V.sheet ? "dfsh-p" : "dfp-" + d.id; V.sheet = null; },
        dflen: function (d) { V.cfgN = +d.id; V._focusKey = V.sheet ? "dfsh-n" : "dfn-" + d.id; V.sheet = null; },
        dfsheet: function (d) { V.sheet = d.id || null; V._focusKey = d.id ? "dfsheet-x" : (V._shFrom || "dfsh-p"); V._shFrom = d.id ? "dfsh-" + (d.id === "len" ? "n" : "p") : V._shFrom; },
        dfnew: function () {
          var c = { seed: Math.random().toString(36).slice(2, 8), pillar: V.cfgP, n: V.cfgN, score: null, time: null, from: "", av: "" };
          if (defiPick(c.seed, c.pillar, c.n).length < 2) return;
          countThen(c);
        },
        dfaccept: function () { if (!V.ch) return; countThen(V.ch); },
        dfnext: function () {
          if (V.i >= V.list.length - 1) { V.phase = "end"; V._scroll = true; sfx("end"); if (V.ch && V.cur === V.ch) dfStore(null); return; }
          V.i++; V.run = newRun(V.list[V.i]); V.qStart = Date.now(); V._scroll = true; V._focusKey = "q";
        },
        dftimeout: function () {
          var r = V.run; if (!r || r.validated) return false;
          r.validated = true; r.good = false; r.timeout = true; V.tot += DF_SECS;
          recordAnswer(r.q.theme, false, V.nav); srsRecord(r.q, false); saveProfile(); sfx("bad"); V._focusKey = "next";
        },
        dfhome: function () { V.phase = "home"; V.ch = null; V._scroll = true; V.quit = null; },
        dfdecline: function () { dfStore(null); V.ch = null; V._scroll = true; },
        dfquit: function () { if (V.phase === "play") V.quit = { until: Date.now() + 5000, href: null }; V._focusKey = "dfstay"; },
        dfstay: function () { V.quit = null; V._focusKey = "q"; },
        dfleave: function () {
          var href = V.quit && V.quit.href; V.quit = null;
          if (V.ch && V.cur === V.ch) V.ch.abandoned = true;
          V.phase = "home"; V._scroll = true;
          if (href) { location.hash = href; return false; }
        },
        dftab: function (d) { V.tab = d.id === "eq" ? "eq" : "duel"; V._focusKey = "dftab-" + V.tab; },
        dfcopy: function () {
          var link = defiLink({ seed: V.cur.seed, pillar: V.cur.pillar, n: V.cur.n, score: V.score, time: Math.round(V.tot), from: P.pseudo || "", av: validAvatarId(P.avatar) });
          var done = function () { V.copied = true; render(); setTimeout(function () { V.copied = false; render(); }, 2500); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { var i = document.getElementById("df-link"); if (i) { i.select(); } });
          else { var i = document.getElementById("df-link"); if (i) { i.select(); try { document.execCommand("copy"); done(); } catch (e) { } } return false; }
          return false;
        }
      },
      render: function () {
        if (this.phase === "count") return this.renderCount();
        if (this.phase === "play") return this.renderPlay();
        if (this.phase === "end") return this.renderEnd();
        return this.renderHome();
      },
      label: function (c) { var p = pillarById(c.pillar); return c.n + " questions · " + (p ? p.label : "tous les piliers"); },
      renderCount: function () {
        var go = this.cd === 0;
        return '<main class="container page"><div class="df-count" role="status" aria-live="assertive"><span class="df-cnt pop' + (go ? " go" : "") + '">' + (go ? "GO !" : this.cd) + '</span><p class="df-lab">Prépare-toi</p></div></main>';
      },
      renderHome: function () {
        var self = this, c = this.ch, recv = "";
        if (c) {
          var name = c.from || "Un collègue", ratio = c.score != null ? c.score / c.n : null;
          var taunt = ratio == null ? "À toi de jouer : réponds vite et bien." : ratio >= 0.9 ? name + " a mis la barre très haut… Tu as de quoi suivre ?" : ratio >= 0.7 ? name + " s'en sort bien. À toi de faire mieux." : "Un petit score à battre. Facile ? À toi de le prouver.";
          var pl = pillarById(c.pillar);
          recv = '<section class="df-duel df-anim" aria-labelledby="df-recv"><span class="df-kick"><i></i>Défi reçu</span><h2 class="sr-only" id="df-recv">' + esc(name) + ' te lance un défi</h2>' +
            '<div class="df-vs"><div class="df-side l">' + dfFace(c.av, 80, "var(--pink)") + "<b>" + esc(name) + '</b><small>te lance un défi</small></div><div class="df-mid" aria-hidden="true">VS</div><div class="df-side r">' + dfFace(validAvatarId(P.avatar), 80, "var(--blue-2)") + "<b>" + esc(P.pseudo || "Toi") + "</b><small>prêt·e ?</small></div></div>" +
            (c.score != null ? '<div class="df-sc"><div class="df-score" role="img" aria-label="Score à battre : ' + c.score + " sur " + c.n + '"><strong>' + c.score + "</strong><span>/ " + c.n + '</span></div><div class="df-lab">Score à battre' + (c.time != null ? " · en " + fmtT(c.time) : "") + "</div></div>" : "") +
            '<div class="df-rest"><p class="df-taunt">' + esc(taunt) + '</p><div class="df-stakes"><span class="df-chip"><i style="background:var(--pink)"></i>' + esc(pl ? pl.label : "Tous les piliers") + '</span><span class="df-chip"><i style="background:var(--green)"></i>' + c.n + ' questions</span><span class="df-chip"><i style="background:var(--gold)"></i>' + DF_SECS + ' s par question</span><span class="df-chip"><i style="background:var(--blue-2)"></i>Sans XP</span></div>' +
            '<button type="button" class="btn btn-primary df-go" data-action="dfaccept" data-key="dfaccept">' + I.bolt() + 'Relever le défi</button><small class="df-note">Les mêmes questions pour vous deux, dans le même ordre.</small><small class="df-warn">⚠ Une fois lancé, quitter le défi est considéré comme un abandon.</small>' +
            (c.abandoned ? '<small class="df-aband">Tu as déjà quitté ce défi une fois : il compte comme abandonné, mais tu peux le relancer.</small>' : "") +
            '<button type="button" class="df-decline" data-action="dfdecline">Refuser ce défi</button></div></section>';
        }
        var PI = { all: ["🎯", "Un mélange de tout"], m365: ["📧", "Le cœur du métier"], cyber: ["🛡️", "Phishing, identités, SOC"], it: ["🖥️", "Réseau, systèmes, support"], dev: ["💻", "Scripts, web, Git"], ia: ["🤖", "Copilot et IA"], vert: ["🌱", "Sobriété, éco-gestes"] };
        var pills = [{ id: "all", label: "Tous les piliers", color: "#8EA2FF" }].concat(PILLARS).map(function (pl) {
          var pi = PI[pl.id] || ["🎯", ""];
          return '<button type="button" class="df-pill' + (pl.id === self.cfgP ? " on" : "") + '" style="--c:' + pl.color + '" data-action="dfpillar" data-id="' + pl.id + '" data-key="dfp-' + pl.id + '" aria-pressed="' + (pl.id === self.cfgP) + '"><span class="df-pi" aria-hidden="true">' + pi[0] + "</span><b>" + esc(pl.label) + "</b><small>" + esc(pi[1]) + "</small></button>";
        }).join("");
        var LN = { 5: ["Éclair", "environ 1 min"], 10: ["Classique", "environ 2 min"], 15: ["Marathon", "environ 3 min"] };
        var lens = [5, 10, 15].map(function (n) { return '<button type="button" class="df-len' + (n === self.cfgN ? " on" : "") + '" data-action="dflen" data-id="' + n + '" data-key="dfn-' + n + '" aria-pressed="' + (n === self.cfgN) + '"><strong>' + n + "</strong><b>questions</b><small>" + LN[n][0] + " · " + LN[n][1] + "</small></button>"; }).join("");
        var curP = self.cfgP === "all" ? "Tous les piliers" : (pillarById(self.cfgP) || { label: "Tous les piliers" }).label;
        /* téléphone : deux tuiles qui ouvrent une fenêtre de choix (le PC garde les grandes tuiles) */
        var curPl = self.cfgP === "all" ? { id: "all", color: "#8EA2FF" } : (pillarById(self.cfgP) || { id: "all", color: "#8EA2FF" });
        var curPi = (PI[curPl.id] || PI.all)[0];
        var mobPick = '<div class="df-mob"><button type="button" class="df-pick" style="--c:' + curPl.color + '" data-action="dfsheet" data-id="pillar" data-key="dfsh-p" aria-haspopup="dialog"><span class="dp-i" aria-hidden="true">' + curPi + '</span><span class="dp-t"><small>1 · Terrain de jeu</small><b>' + esc(curP) + '</b></span><span class="dp-c" aria-hidden="true">⌄</span></button>' +
          '<button type="button" class="df-pick" style="--c:var(--green)" data-action="dfsheet" data-id="len" data-key="dfsh-n" aria-haspopup="dialog"><span class="dp-i" aria-hidden="true">⏱️</span><span class="dp-t"><small>2 · Longueur</small><b>' + self.cfgN + " questions · " + LN[self.cfgN][0] + '</b></span><span class="dp-c" aria-hidden="true">⌄</span></button></div>';
        var sheet = "";
        if (self.sheet) {
          var isLen = self.sheet === "len";
          var mp = [{ id: "all", label: "Tous les piliers", color: "#8EA2FF" }].concat(PILLARS).map(function (pl) { var pi = PI[pl.id] || ["🎯", ""]; return '<button type="button" class="df-mopt' + (pl.id === self.cfgP ? " on" : "") + '" style="--c:' + pl.color + '" data-action="dfpillar" data-id="' + pl.id + '" aria-pressed="' + (pl.id === self.cfgP) + '"><span class="dp-i" aria-hidden="true">' + pi[0] + '</span><span class="dp-t"><b>' + esc(pl.label) + "</b><small>" + esc(pi[1]) + "</small></span></button>"; }).join("");
          var ml = [5, 10, 15].map(function (n) { return '<button type="button" class="df-mopt' + (n === self.cfgN ? " on" : "") + '" style="--c:var(--green)" data-action="dflen" data-id="' + n + '" aria-pressed="' + (n === self.cfgN) + '"><span class="dp-i dp-n" aria-hidden="true">' + n + '</span><span class="dp-t"><b>' + n + " questions · " + LN[n][0] + "</b><small>" + LN[n][1] + "</small></span></button>"; }).join("");
          sheet = '<div class="df-sheet" role="dialog" aria-modal="true" aria-label="' + (isLen ? "Choisir la longueur" : "Choisir le terrain de jeu") + '"><button type="button" class="df-sh-bg" data-action="dfsheet" data-id="" tabindex="-1" aria-label="Fermer"></button><div class="df-sh-box"><div class="df-sh-head"><h2>' + (isLen ? "Choisis la longueur" : "Choisis le terrain de jeu") + '</h2><button type="button" class="df-sh-x" data-action="dfsheet" data-id="" data-key="dfsheet-x" aria-label="Fermer">✕</button></div><div class="df-sh-list">' + (isLen ? ml : mp) + "</div></div></div>";
        }
        var onEq = self.tab === "eq";
        var head = '<header class="df-head"><span class="eyebrow" style="color:var(--gold)">Mesure-toi aux autres</span><h1 class="h-l">Défis</h1></header>' +
          '<div class="df-tabs" role="tablist" aria-label="Type de défi"><button type="button" role="tab" class="df-tab' + (onEq ? "" : " on") + '" aria-selected="' + !onEq + '" data-action="dftab" data-id="duel" data-key="dftab-duel"><span aria-hidden="true">⚔️</span>Duel</button>' +
          '<button type="button" role="tab" class="df-tab' + (onEq ? " on" : "") + '" aria-selected="' + onEq + '" data-action="dftab" data-id="eq" data-key="dftab-eq"><span aria-hidden="true">👥</span>Équipe<em>bientôt</em></button></div>';
        if (onEq) {
          var hv = window.heroById && window.heroById("volt"), hs = hv && window.heroSvg ? window.heroSvg(hv, 120) : "";
          return '<main class="container page">' + head + '<section class="df-soon" aria-labelledby="df-soon-t"><span class="df-soon-hero" aria-hidden="true">' + hs + '</span><span class="df-soon-pill">Bientôt disponible</span><h2 class="df-soon-h" id="df-soon-t">Le mode Équipe arrive</h2><p class="df-soon-p">Captain Reboot prépare l\'arène. Les défis à plusieurs ne sont pas encore ouverts.</p>' +
            '<div class="df-feat"><div><i aria-hidden="true">👥</i><span><b>Défier à plusieurs</b>Un même défi pour toute ton équipe.</span></div><div><i aria-hidden="true">🏆</i><span><b>Un classement d\'équipe</b>Comparer les scores, sans pression.</span></div><div><i aria-hidden="true">🔗</i><span><b>Toujours par lien</b>Aucun compte, rien ne quitte ton navigateur.</span></div></div>' +
            '<button type="button" class="btn btn-ghost df-soon-idea" data-feedback>💡 Proposer une idée</button></section></main>';
        }
        return '<main class="container page">' + head + recv +
          sheet + '<section class="df-setup" aria-labelledby="df-new"><h2 class="df-h" id="df-new">Défie un collègue</h2><p class="df-sub">Joue ta partie (' + DF_SECS + ' secondes par question), puis envoie le lien : ton collègue répond aux mêmes questions et voit ton score et ton temps à battre.</p>' +
          '<div class="df-pc"><h3 class="df-step"><b>1</b>Choisis le terrain de jeu</h3><div class="df-pills">' + pills + '</div><h3 class="df-step"><b>2</b>Choisis la longueur</h3><div class="df-lens">' + lens + '</div></div>' + mobPick +
          '<div class="df-bar"><div class="df-sum"><small>Ton duel</small><span>' + esc(curP) + " · " + self.cfgN + " questions · " + DF_SECS + ' s par question</span></div><button type="button" class="btn btn-primary" data-action="dfnew" data-key="dfnew">' + I.bolt() + 'Lancer mon défi</button></div><small class="df-warn df-warn-setup">⚠ Une fois lancé, quitter le défi est considéré comme un abandon.</small></section></main>';
      },
      renderPlay: function () {
        var r = this.run, q = r.q, v = r.validated, side;
        var pct = Math.round(((this.i + (v ? 1 : 0)) / this.list.length) * 100);
        var left = Math.max(0, DF_SECS - (Date.now() - this.qStart) / 1000);
        if (!v) side = '<div class="side-card halftone"><h3 class="h-s">Défi entre collègues</h3><p class="muted" style="margin:0">' + esc(this.label(this.cur)) + (this.cur.score != null ? " · à battre : " + this.cur.score + " / " + this.cur.n : "") + ". " + DF_SECS + " secondes par question. Pas d'XP en jeu.</p></div>";
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.timeout ? "TROP LENT !" : r.good ? "BAM !" : "OUPS !") + '</span><b>' + (r.timeout ? "Temps écoulé : question ratée." : r.good ? "Bonne réponse !" : "Pas tout à fait. Regarde la correction.") + "</b></div>" + heroExplain(q.theme, q.e, q.maj, r) + '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="dfnext" data-key="next">' + (this.i >= this.list.length - 1 ? "Voir mon score" : "Question suivante") + "</button></div>";
        var timer = v ? "" : '<div class="df-timebar" aria-hidden="true"><b class="df-tn' + (left <= 5 ? " hot" : "") + '" id="df-tn">' + Math.ceil(left) + '</b><span class="df-tbar"><u id="df-tb" style="width:' + (left / DF_SECS * 100) + '%"></u></span></div>';
        return '<main class="container page"><div class="q-meta"><span class="tag">Défi</span><span class="tag tag-outline">' + esc(FORMAT[q.format].label) + '</span><span class="muted" style="font-size:14px;flex-grow:1">Question ' + (this.i + 1) + " / " + this.list.length + '</span><div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div><button type="button" class="df-quit" data-action="dfquit" aria-label="Quitter le défi" title="Quitter le défi"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div>' + timer +
          '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderRun(r) + "</div><div>" + side + "</div></div>" + this.quitBox() + "</main>";
      },
      quitBox: function () {
        if (!this.quit) return "";
        var left = Math.max(0, Math.ceil((this.quit.until - Date.now()) / 1000));
        return '<div class="df-qo" role="alertdialog" aria-modal="true" aria-labelledby="df-qt"><div class="df-qbox"><h2 id="df-qt">Quitter le défi ?</h2>' +
          '<p>Si tu quittes maintenant, <b>c\'est considéré comme un abandon</b>' + (this.ch && this.cur === this.ch ? ". Le défi restera dans Défis, marqué comme abandonné." : ".") + '</p>' +
          '<p class="df-pz" id="df-pz">' + (left > 0 ? "⏸ Chrono en pause : " + left + " s" : "▶ Le chrono a repris") + '</p>' +
          '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="dfstay" data-key="dfstay">Continuer le défi</button><button type="button" class="btn btn-ghost" data-action="dfleave">Abandonner</button></div></div></div>';
      },
      renderEnd: function () {
        var c = this.cur, n = this.list.length, sc = this.score, tot = Math.round(this.tot), hasC = c.score != null, name = c.from || "ton collègue";
        var win = hasC && (sc > c.score || (sc === c.score && c.time != null && tot < c.time));
        var tie = hasC && sc === c.score && (c.time == null || tot === c.time);
        var big = !hasC ? "DÉFI TERMINÉ\u00a0!" : win ? "VICTOIRE\u00a0!" : tie ? "ÉGALITÉ\u00a0!" : "REVANCHE\u00a0!", diff = "";
        if (hasC) {
          if (win && sc > c.score) diff = "+" + (sc - c.score) + " point" + (sc - c.score > 1 ? "s" : "") + " d'avance sur " + name + ".";
          else if (win) diff = "Même score, mais tu as été plus rapide de " + fmtT(c.time - tot) + ".";
          else if (tie) diff = "Même score, même temps : incroyable.";
          else if (sc < c.score) diff = "Il te manque " + (c.score - sc) + " point" + (c.score - sc > 1 ? "s" : "") + ". La revanche est possible !";
          else diff = "Même score, mais " + name + " a été plus rapide de " + fmtT(tot - c.time) + ".";
        }
        var an = !this.endShown; this.endShown = true;
        var conf = "";
        if (an && win && !reduceMotion) { var cols = ["#F5C451", "#FF6B8A", "#6E88FF", "#4CC37A", "#fff"]; for (var k = 0; k < 46; k++) conf += '<b style="left:' + Math.round(Math.random() * 100) + "%;background:" + cols[k % 5] + ";animation-duration:" + (1.8 + Math.random() * 1.6).toFixed(2) + "s;animation-delay:" + (Math.random() * 0.6).toFixed(2) + 's"></b>'; }
        var link = defiLink({ seed: c.seed, pillar: c.pillar, n: c.n, score: sc, time: tot, from: P.pseudo || "", av: validAvatarId(P.avatar) });
        var mine = '<div class="df-res"><span class="df-n">' + sc + "<small> / " + n + "</small></span><span class=\"df-t\">en " + fmtT(tot) + "</span></div>";
        var vs = hasC ? '<div class="df-vsbar"><div class="df-who">' + dfFace(validAvatarId(P.avatar), 56, "var(--blue-2)") + mine + '</div><div class="df-mid sm" aria-hidden="true">VS</div><div class="df-who">' + dfFace(c.av, 56, "var(--pink)") + '<div class="df-res"><span class="df-n">' + c.score + "<small> / " + n + '</small></span><span class="df-t">' + (c.time != null ? "en " + fmtT(c.time) : "") + "</span></div></div></div>" : '<div class="df-vsbar one"><div class="df-who">' + dfFace(validAvatarId(P.avatar), 56, "var(--blue-2)") + mine + "</div></div>";
        return '<main class="container page"><div class="end-card halftone df-end ' + (hasC ? (win ? "win" : tie ? "tie" : "lose") : "solo") + (an ? " df-anim" : "") + '">' + (conf ? '<div class="df-conf" aria-hidden="true">' + conf + "</div>" : "") +
          '<h1 class="df-big">' + big + "</h1>" + vs + (diff ? '<p class="df-diff">' + esc(diff) + "</p>" : "") +
          '<p>' + (hasC ? "Envoie ton lien de revanche : il contient ton score et ton temps à battre." : "Envoie ce lien à un collègue : il jouera les mêmes questions, avec ton score et ton temps à battre.") + '</p>' +
          '<div class="btn-row" style="justify-content:center"><input id="df-link" class="df-link" type="text" readonly value="' + esc(link) + '" aria-label="Lien du défi" style="min-width:min(100%,360px);padding:10px 12px;border-radius:10px;border:2px solid var(--line,#444);background:transparent;color:inherit"><button type="button" class="btn btn-primary" data-action="dfcopy" data-key="dfcopy">' + (this.copied ? "Lien copié !" : hasC ? "Envoyer ma revanche" : "Copier le lien") + '</button></div>' +
          '<p class="muted" style="font-size:13px">' + (P.pseudo ? "Ton pseudo (" + esc(P.pseudo) + "), " : "") + "ton avatar, ton score et ton temps figurent dans le lien. Aucune autre donnée n'est partagée.</p>" +
          '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-ghost" data-action="dfhome">Retour aux défis</button></div></div></main>';
      }
    };
    var tmr = setInterval(function () {
      if (V !== view) { clearInterval(tmr); document.removeEventListener("click", navGuard, true); return; }
      var now = Date.now(), dt = now - (view._lt || now); view._lt = now;
      if (view.phase !== "play" || !view.run || view.run.validated) return;
      if (view.quit) {
        var pl = view.quit.until - now;
        if (pl > 0) view.qStart += dt;
        var pz = document.getElementById("df-pz"); if (pz) pz.textContent = pl > 0 ? "⏸ Chrono en pause : " + Math.ceil(pl / 1000) + " s" : "▶ Le chrono a repris";
        if (pl > 0) return;
      }
      var left = DF_SECS - (Date.now() - view.qStart) / 1000;
      if (left <= 0) { view.actions.dftimeout(); render(); return; }
      var n = document.getElementById("df-tn"), b = document.getElementById("df-tb");
      if (n) { n.textContent = Math.ceil(left); n.classList.toggle("hot", left <= 5); }
      if (b) b.style.width = (left / DF_SECS * 100) + "%";
    }, 200);
    /* En pleine partie, un clic sur un lien du site ouvre la fenêtre « abandon » au lieu de partir tout de suite. */
    function navGuard(e) {
      if (V !== view) { document.removeEventListener("click", navGuard, true); return; }
      if (view.phase !== "play") return;
      var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      var h = a.getAttribute("href") || ""; if (h.indexOf("#/") !== 0 || a.closest(".df-qo")) return;
      e.preventDefault(); e.stopPropagation();
      view.quit = { until: Date.now() + 5000, href: h }; view._focusKey = "dfstay"; render();
    }
    document.addEventListener("click", navGuard, true);
    return view;
  }

  /* =========================================================
     VUE : QG (accueil)
     ========================================================= */
  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  }
  /* Petit insigne doré (chevron de grade) devant le bouton d'objectif du bandeau d'accueil */
  var RANK_PIP = '<span class="rank-pip" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 15l7-6 7 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 19.5l5-4.2 5 4.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/></svg></span>';
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  /* Phrases dynamiques du QG : elles s'adaptent à la progression du joueur */
  function qgMood() {
    var r = rankInfo(P.xp), name = P.pseudo || "recrue", unread = unreadCount();
    var toNext = r.next ? RANKS[r.index + 1].min - P.xp : 0;
    var main, extras = [], cta, cta2;
    /* Parcours : on commence par M365 (cœur de métier), puis le mode classé.
       Les boss (dont le Phisher) se trouvent dans l'onglet Missions, pas en page d'accueil. */
    var st = P.stats || {}, answered = st.answered || 0;
    if (P.xp === 0 && answered === 0) {
      main = pick(["Bienvenue au QG, " + name + " ! On commence par le cœur du métier : Microsoft 365.", "Prêt·e à enfiler la cape, " + name + " ? Premier power-up : Microsoft 365, sans pression."]);
      cta = { href: "#/entrainement?pillar=m365", label: "Commencer par M365" };
      cta2 = { href: "#/entrainement", label: "Choisir un autre pilier" };
    } else if (P.xp === 0) {
      main = pick(["Bel échauffement, " + name + " ! Prêt·e à gagner tes premiers XP en mode classé ?", "L'entraînement paie, " + name + ". Passe en mode classé, niveau Recrue : tu ne peux rien perdre !"]);
      cta = { href: "#/classe", label: "Gagner mes premiers XP" };
      cta2 = { href: "#/entrainement", label: "Continuer l'entraînement" };
    } else {
      main = r.next ? pick(["Encore " + toNext + " XP et tu passes " + r.next + ". Je crois en toi, " + name + " !", r.name + " " + name + ", au rapport ! " + toNext + " XP avant " + r.next + ".", "Chaque bonne réponse te rapproche de " + r.next + ", " + name + " !"]) : "Super directeur technique ! Le QG n'a plus de secrets pour toi, " + name + ".";
      cta = { href: "#/classe", label: r.next ? "Viser " + r.next : "Rester au sommet" };
      cta2 = { href: "#/entrainement", label: "Réviser à l'entraînement" };
    }
    if (P.missionWon) extras.push("Le Phisher se souvient de toi… et il a peur.");
    if (P.shield) extras.push("Ton bouclier est chargé : c'est le moment de tenter plus dur !");
    if (P.streak >= 3) extras.push("Série de " + P.streak + " en cours, ne lâche rien !");
    if (unread) extras.push(unread + " actu" + (unread > 1 ? "s t'attendent" : " t'attend") + " dans la veille. Un bon héros reste informé !");
    if (P.bestStreak >= 7) extras.push("Ton record de série : " + P.bestStreak + ". Respect !");
    var hint = nextSecretHint(); if (hint) { extras.push("Psst… " + hint); extras.push("Psst… " + hint); }
    var bubble = ((P.xp > 0 || answered > 0) && extras.length && Math.random() < 0.4) ? pick(extras) : main;
    var status = r.name + " · " + P.xp + " XP" + (r.next ? " · encore " + toNext + " XP avant " + r.next : " · rang maximum");
    if (P.streak >= 2) status += " · série de " + P.streak;
    function nb(t) { return String(t).replace(/ ([!?:;»])/g, "\u00a0$1"); } /* pas de « ! » orphelin en début de ligne */
    return { bubble: nb(bubble), cta: cta, cta2: cta2, greet: nb(greeting() + ", " + name + " !"), status: status, unread: unread,
      burst: P.xp === 0 ? "POWER UP !" : pick(["POWER UP !", "EN AVANT !", "LET'S GO !"]) };
  }

  /* ---------- Insigne de grade : autant de chevrons que de rangs franchis (doré au rang max) ---------- */
  var RANK_COLORS = ["#4CC37A", "#6E88FF", "#B98CFF", "#E0661B", "#F5C451"];
  function rankBadge(i, size, gold) {
    var n = i + 1, max = gold || i === RANKS.length - 1, col = max ? "#F5C451" : (RANK_COLORS[i] || "#8EA2FF"), h = "";
    for (var k = 0; k < n; k++) { var y = 30 - k * 5.2; h += '<path d="M9 ' + (y + 4) + ' L20 ' + (y - 3) + ' L31 ' + (y + 4) + '" fill="none" stroke="' + col + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="' + (1 - (n - 1 - k) * 0.12) + '"/>'; }
    return '<svg class="rank-badge" viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="' + (col + "24") + '" stroke="' + col + '" stroke-opacity=".55" stroke-width="1.5"/>' + h + "</svg>";
  }

  /* ---------- Les paliers : fenêtre ouverte en cliquant sur son grade ---------- */
  function openRankLadder() {
    var dlg = document.querySelector(".rank-modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "rank-modal"; dlg.setAttribute("aria-labelledby", "rl-title"); document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || (e.target.closest && e.target.closest("[data-rank-close]"))) dlg.close(); }); }
    var cur = rankIndex(P.xp);
    var rows = RANKS.map(function (k, i) {
      var state = i < cur ? "done" : (i === cur ? "current" : "locked");
      var next = RANKS[i + 1], pct = i === cur ? (next ? Math.round((P.xp - k.min) / (next.min - k.min) * 100) : 100) : (i < cur ? 100 : 0);
      var note = i === cur ? (next ? "Tu es ici · encore " + (next.min - P.xp) + " XP avant " + next.n : "Tu es au sommet !") : (i < cur ? "Palier franchi" : "Encore " + (k.min - P.xp) + " XP");
      if (i === RANKS.length - 1) note += " · débloque l'avatar Captain Reboot";
      return '<li class="rl-row ' + state + '">' + rankBadge(i, 44) + '<div class="rl-txt"><div class="rl-top"><b>' + esc(k.n) + '</b><span>' + k.min + " XP</span></div>" +
        '<div class="bar"><div style="width:' + pct + '%"></div></div><small>' + esc(note) + "</small></div></li>";
    }).reverse().join("");
    var gains = LEVEL_ORDER.map(function (id) { var L = LEVELS[id]; return "<li><b>" + L.name + "</b> +" + L.gain + " / " + (L.loss ? "−" + L.loss : "0") + " XP</li>"; }).join("");
    dlg.innerHTML = '<div class="rl-inner"><button type="button" class="hm-close" data-rank-close aria-label="Fermer"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>' +
      '<span class="eyebrow">Progression</span><h2 class="h-m" id="rl-title">Les paliers du QG</h2><p class="muted" style="margin:0">Tu as <b style="color:var(--text)">' + P.xp + " XP</b>. Gagne de l'XP en mode classé pour monter en grade.</p>" +
      '<ol class="rl-list">' + rows + "</ol>" +
      '<div class="rl-gains"><span class="eyebrow" style="font-size:11px">XP par réponse (bonne / erreur)</span><ul>' + gains + "</ul></div>" +
      '<div class="rl-actions"><a class="btn btn-primary" href="#/classe" data-rank-close>Aller au mode classé</a>' + "" + '</div></div>';
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
  }

  /* ---------- Cérémonie de promotion / rétrogradation (plein écran, 3 s, clic pour fermer) ---------- */
  function rankCeremony(up, idx) {
    sfx(up ? (idx === RANKS.length - 1 ? "maxRank" : "promo") : "demote");
    var old = document.querySelector(".ceremony"); if (old) old.remove();
    var el = document.createElement("div");
    el.className = "ceremony " + (up ? "up" : "down") + (idx === RANKS.length - 1 && up ? " max" : "");
    el.style.setProperty("--rc", RANK_COLORS[idx] || "#F5C451");
    el.setAttribute("role", "alert");
    var conf = "";
    if (up && !reduceMotion) for (var i = 0; i < 44; i++) {
      var c = ["#F5C451", "#FFFFFF", "#8EA2FF", "#FFE08A", "#6E88FF"][i % 5];
      conf += '<i style="--x:' + (Math.random() * 100).toFixed(1) + "vw;--r:" + Math.round(Math.random() * 720 - 360) + "deg;--d:" + (1.6 + Math.random() * 1.4).toFixed(2) + "s;--dl:" + (Math.random() * .5).toFixed(2) + "s;background:" + c + '"></i>';
    }
    var line = up ? (idx === RANKS.length - 1 ? "Tu as atteint le sommet du QG. Respect, héros !" : (idx === 2 ? "Nouveau grade débloqué… et le niveau Légende s'ouvre à toi ! Nouvelle cape, aussi." : "Nouveau grade débloqué, et une nouvelle cape pour aller avec !"))
                  : "Ça arrive aux meilleurs. Reprends des forces et remonte !";
    el.innerHTML = '<div class="cer-bg"></div>' + (up ? '<div class="cer-rays"></div>' : '<div class="cer-glitch"></div>') + '<div class="cer-confetti">' + conf + "</div>" +
      '<div class="cer-card"><div class="cer-badge">' + rankBadge(idx, 120) + '</div><span class="cer-kicker">' + (up ? "Promotion !" : "Rétrogradation") + '</span><h2 class="cer-rank">' + esc(RANKS[idx].n) + '</h2><p>' + esc(line) + "</p>" +
      (up && idx === RANKS.length - 1 && window.heroById ? '<div class="cer-unlock"><span class="cu-avatar">' + window.heroSvg(window.heroById("volt"), 84) + '<span class="cu-lock"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path class="cu-shackle" d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span><span class="cu-flash"></span></span><span class="cu-text"><small>Avatar débloqué</small><b>Captain Reboot</b></span></div>' : "") +
      (up && portalNeeds() ? '<p class="cer-portal">Ton héros progresse : <a href="#/profil?s=portail" data-cer-close>mets-le à l\'abri dans le Portail</a>.</p>' : "") + '<div class="cer-actions"><button type="button" class="btn btn-ghost" data-cer-ladder>Voir les paliers</button><button type="button" class="btn ' + (up ? "btn-primary" : "btn-ghost") + '" data-cer-close>Continuer</button></div></div>';
    document.body.appendChild(el);
    var closeBtn = el.querySelector("[data-cer-close]"); if (closeBtn) closeBtn.focus({ preventScroll: true });
    function close() { if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.remove(); var nx = document.querySelector('[data-key="next"]'); if (nx) nx.focus({ preventScroll: true }); }, reduceMotion ? 0 : 280); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-cer-ladder]")) { close(); setTimeout(openRankLadder, 300); return; }
      if (e.target.closest("[data-cer-close]") || !e.target.closest(".cer-card")) close();
    });
    setTimeout(close, up ? (idx === RANKS.length - 1 ? 7000 : portalNeeds() ? 8000 : 5200) : 4200);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-rank-ladder]")) openRankLadder(); });

  /* ---------- Bandeau des héros (QG) : défilement auto, flèches discrètes, fiche au clic ---------- */
  function heroTrainHref(h) { return h.mascot ? "#/entrainement?pillar=m365" : "#/entrainement?theme=" + h.themes[0]; }
  function heroCarousel() {
    var list = window.ALL_CHARACTERS || window.HEROES;
    if (!list) return "";
    var pilHeroes = PILLARS.map(function (pl) { return pl.hero; });
    var cards = list.map(function (h, i) {
      var isG = pilHeroes.indexOf(h.id) >= 0;
      return '<button type="button" class="hs-card ' + (isG ? "hs-guard" : "hs-ally") + '" style="--hc:' + h.glow + '" data-hero-open="' + h.id + '" aria-label="Voir la fiche de ' + esc(h.name) + '">' +
        '<span class="hc-portrait">' + window.heroSvg(h, isG ? 96 : 72) + (birthdayHero() === h.id ? '<span class="hc-cake" title="C\'est son anniversaire !">🎂</span>' : "") + "</span>" +
        '<span class="hc-text"><span class="hc-world">' + esc(h.world) + '</span><b class="hc-name">' + esc(h.name) + "</b>" +
        '<span class="hc-title">' + esc(h.title) + "</span>" + (pilHeroes.indexOf(h.id) >= 0 ? '<span class="hc-lead">' + (h.gender === "f" ? "Gardienne" : "Gardien") + " du pilier</span>" : "") +
        (h.story ? '<span class="hc-born">Né' + (h.gender === "f" ? "e" : "") + " en " + esc(h.story.born.replace(/^.*?(\d{4})$/, "$1")) + " · voir sa fiche</span>" : "") + "</span></button>";
    }).join("");
    return '<section class="hero-strip" aria-roledescription="carrousel" aria-label="Les gardiens du QG">' +
      '<div class="hs-head"><span class="eyebrow">Les gardiens du QG</span><div class="hs-arrows">' +
      '<button type="button" class="hs-arrow" data-hero-nav="-1" aria-label="Gardien précédent"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button type="button" class="hs-arrow" data-hero-nav="1" aria-label="Gardien suivant"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div></div><div class="hs-track" tabindex="0">' + cards + "</div></section>";
  }
  function heroStep(dir) {
    var track = document.querySelector(".hs-track"); if (!track) return;
    var card = track.querySelector(".hs-card"); if (!card) return;
    var step = card.getBoundingClientRect().width + 14;
    var max = track.scrollWidth - track.clientWidth - 2;
    var target = track.scrollLeft + dir * step;
    if (dir > 0 && track.scrollLeft >= max) target = 0;
    else if (dir < 0 && track.scrollLeft <= 2) target = max + 2;
    track.scrollTo({ left: target, behavior: reduceMotion ? "auto" : "smooth" });
  }
  var heroPausedUntil = 0;
  setInterval(function () {
    if (reduceMotion || document.hidden || Date.now() < heroPausedUntil) return;
    var strip = document.querySelector(".hero-strip");
    if (!strip || strip.matches(":hover") || strip.contains(document.activeElement) || document.querySelector(".hero-modal[open]")) return;
    heroStep(1);
  }, 4500);
  ["pointerdown", "wheel", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target.closest && e.target.closest(".hs-track")) heroPausedUntil = Date.now() + 9000; }, { passive: true });
  });
  /* glisser les gardiens à la souris (sur PC) : on attrape la rangée et on la fait défiler ; un simple clic ouvre toujours la fiche */
  (function () {
    var track = null, x0 = 0, s0 = 0, moved = false, down = false;
    document.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      var t = e.target.closest && e.target.closest(".hs-track"); if (!t) return;
      track = t; down = true; moved = false; x0 = e.clientX; s0 = t.scrollLeft;
    });
    document.addEventListener("pointermove", function (e) {
      if (!down || !track) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("dragging"); }
      if (moved) { track.scrollTo({ left: s0 - dx, behavior: "instant" }); e.preventDefault(); heroPausedUntil = Date.now() + 9000; }
    });
    function end() { if (!down) return; down = false; if (track) { var t = track; t.classList.remove("dragging"); if (moved) { var c = t.querySelector(".hs-card"), w = c ? c.getBoundingClientRect().width + 14 : 0; if (w) t.scrollTo({ left: Math.round(t.scrollLeft / w) * w, behavior: "smooth" }); } } track = null; }
    document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
    document.addEventListener("click", function (e) { if (moved && e.target.closest && e.target.closest(".hs-track")) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    document.addEventListener("dragstart", function (e) { if (e.target.closest && e.target.closest(".hs-track")) e.preventDefault(); });
  })();
  function openHero(id) {
    var h = window.heroById(id); if (!h) return;
    var st = h.story || {};
    var dlg = document.querySelector(".hero-modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "hero-modal"; document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || (e.target.closest && e.target.closest("[data-hero-close]"))) dlg.close(); });
      dlg.addEventListener("close", function () { if (dlg._opener && document.body.contains(dlg._opener)) dlg._opener.focus(); }); }
    var themes = h.themes.map(themeLabel).join(" · ");
    dlg.style.setProperty("--hc", h.glow);
    dlg.setAttribute("aria-labelledby", "hm-name");
    dlg.innerHTML = '<div class="hm-inner"><button type="button" class="hm-close" data-hero-close aria-label="Fermer la fiche"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>' +
      '<div class="hm-top"><span class="hm-portrait">' + window.heroSvg(h, 150) + '</span><div class="stack" style="gap:6px"><span class="hc-world">' + esc(h.world) + '</span><h2 class="h-m" id="hm-name">' + esc(h.name) + '</h2><span class="muted">' + esc(h.title) + "</span></div></div>" +
      (st.born ? '<dl class="hm-facts"><div><dt>Naissance</dt><dd>' + esc(st.born) + "</dd></div><div><dt>Origine</dt><dd>" + esc(st.origin) + "</dd></div><div><dt>Créateur</dt><dd>" + esc(st.creator) + "</dd></div></dl>" : "") +
      (st.story ? '<p class="hm-story">' + esc(st.story) + "</p>" : "") +
      (st.fact ? '<p class="hm-fact"><b>Le savais-tu ?</b> ' + esc(factOfDay(st, h.id)) + "</p>" : "") +
      '<p class="hm-power"><b>Super-pouvoir :</b> ' + esc(h.power) + "</p>" +
      '<blockquote class="hm-quote">« ' + esc(h.line) + " »</blockquote>" +
      (birthdayHero() === h.id ? '<div class="hm-bday"><b>🎂 C\'est l\'anniversaire de ' + esc(h.name) + " aujourd'hui !</b>" + (P.secrets && P.secrets.birthday ? "<span>Merci pour tes vœux !</span>" : '<button type="button" class="btn btn-primary" data-hero-bday>Lui souhaiter un joyeux anniversaire</button>') + "</div>" : "") +
      '<div class="hm-foot"><span class="muted" style="font-size:13px">Veille sur : ' + esc(themes) + '</span><a class="btn btn-primary" href="' + heroTrainHref(h) + '" data-hero-close>S\'entraîner avec ' + esc(h.name) + "</a></div></div>";
    var list = window.ALL_CHARACTERS || window.HEROES, idx = 0;
    list.forEach(function (x, i) { if (x.id === h.id) idx = i; });
    var prev = list[(idx - 1 + list.length) % list.length], next = list[(idx + 1) % list.length];
    dlg.querySelector(".hm-inner").insertAdjacentHTML("beforeend",
      '<div class="hm-nav"><button type="button" class="hm-step" data-hero-goto="' + prev.id + '" aria-label="Fiche précédente : ' + esc(prev.name) + '"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + esc(prev.name) + '</span></button>' +
      '<span class="hm-count">' + (idx + 1) + " / " + list.length + "</span>" +
      '<button type="button" class="hm-step" data-hero-goto="' + next.id + '" aria-label="Fiche suivante : ' + esc(next.name) + '"><span>' + esc(next.name) + '</span><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>');
    dlg._heroId = h.id;
    if (!dlg.open) { sfx("open"); dlg._opener = document.activeElement; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    else { dlg.scrollTop = 0; var inner = dlg.querySelector(".hm-inner"); if (inner && !reduceMotion) { inner.classList.remove("hm-slide-l", "hm-slide-r"); void inner.offsetWidth; inner.classList.add(dlg._dir < 0 ? "hm-slide-r" : "hm-slide-l"); } var steps = dlg.querySelectorAll(".hm-step"); if (steps.length) steps[dlg._dir < 0 ? 0 : 1].focus({ preventScroll: true }); }
    syncStrip(h.id);
  }
  /* Le bandeau suit la fiche ouverte : à la fermeture, il montre le dernier héros consulté */
  function syncStrip(id) {
    var track = document.querySelector(".hs-track"), card = track && track.querySelector('[data-hero-open="' + id + '"]');
    if (card) { heroPausedUntil = Date.now() + 9000; track.scrollTo({ left: card.offsetLeft - track.offsetLeft - 2, behavior: "auto" }); }
  }
  function heroGo(dir) {
    var dlg = document.querySelector(".hero-modal[open]"); if (!dlg) return;
    var list = window.ALL_CHARACTERS || window.HEROES, idx = 0;
    list.forEach(function (x, i) { if (x.id === dlg._heroId) idx = i; });
    dlg._dir = dir; openHero(list[(idx + dir + list.length) % list.length].id);
  }
  document.addEventListener("keydown", function (e) {
    if (!document.querySelector(".hero-modal[open]")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); heroGo(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); heroGo(-1); }
  });
  (function () { /* glisser au doigt sur la fiche pour passer au héros suivant ou précédent */
    var x0 = null, y0 = null;
    document.addEventListener("touchstart", function (e) { if (e.target.closest && e.target.closest(".hero-modal[open]")) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) heroGo(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var nav = e.target.closest("[data-hero-nav]");
    if (nav) { heroPausedUntil = Date.now() + 9000; heroStep(+nav.getAttribute("data-hero-nav")); return; }
    if (e.target.closest("[data-hero-bday]")) { var bh = window.heroById(birthdayHero()); var box = e.target.closest(".hm-bday"); if (box) box.innerHTML = "<b>🎂 " + esc(bh.name) + " : « Merci ! C'est le plus beau cadeau d'anniversaire du QG ! »</b>"; if (soundOn) [523, 523, 587, 523, 698, 659].forEach(function (f, i) { tone(f, i * 0.22, 0.2, "triangle", 0.08); }); unlockSecret("birthday"); return; }
    var go = e.target.closest("[data-hero-goto]");
    if (go) { var cur = document.querySelector(".hero-modal[open]"), L = window.ALL_CHARACTERS || window.HEROES, ci = 0, ti = 0;
      L.forEach(function (x, i) { if (cur && x.id === cur._heroId) ci = i; if (x.id === go.getAttribute("data-hero-goto")) ti = i; });
      if (cur) cur._dir = (ti === (ci + 1) % L.length) ? 1 : -1; openHero(go.getAttribute("data-hero-goto")); return; }
    var op = e.target.closest("[data-hero-open]");
    if (op) openHero(op.getAttribute("data-hero-open"));
  });
  function QGView() {
    var mood = qgMood();
    return {
      nav: "qg",
      render: function () {
        var r = rankInfo(P.xp);

        function world(num, href, icon, title, apps, text, boss, extra, heroId, color) {
          if (heroId && window.heroById) icon = '<span class="world-hero" title="' + esc(window.heroById(heroId).name) + '">' + window.heroSvg(window.heroById(heroId), 52) + "</span>";
          return '<button type="button" class="world' + (extra || "") + '" data-world="' + href + '" aria-haspopup="dialog"' + (color ? ' style="--wc:' + color + '"' : "") + '><div style="display:flex;justify-content:space-between;align-items:center"><span class="num">' + num + "</span>" + icon + "</div><h3>" + title + '</h3><span class="apps">' + apps + "</span><p>" + text + '</p><span class="boss">Boss : ' + boss + '</span><span class="world-more">Découvrir le contenu →</span></button>';
        }

        return '<main class="container">' + eventBanner() + relBanner() +
          '<section class="hero"><div class="stack">' +
          '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="tag">QG · Saison 1</span><span class="muted" style="font-size:14px">Seul·e, on va vite. Ensemble, on va loin.</span></div>' +
          '<h1 class="h-xl">Active tes<br><span class="neon power-word" style="color:var(--blue-2)" tabindex="0">super-pouvoirs</span><br>Microsoft 365 <span class="and-co">&amp; co.</span></h1>' +
          '<p class="lead">Microsoft 365, cyber, IT, dev, IA et numérique responsable : entraîne-toi, grimpe les grades et affronte les boss, un power-up à la fois.</p>' +
          "</div>" +
          '<div class="comic-wrap" aria-hidden="false"><div class="comic-panel halftone mascot-panel">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 330) : I.robot) + '</div><div class="speech" aria-live="polite">' + esc(mood.bubble) + "</div></div>" +
          "</section>" +


          (P.pseudo ? (function () { var ri = rankIndex(P.xp), cur = RANKS[ri], nx = RANKS[ri + 1], pct = nx ? Math.round((P.xp - cur.min) / (nx.min - cur.min) * 100) : 100;
            return '<section class="welcome slim"><span class="welcome-face">' + myAvatar(52) + '</span><div class="welcome-main"><h2 class="welcome-greet">' + esc(mood.greet) + '</h2><div class="welcome-prog"><span class="wp-bar" style="--rc:' + RANK_COLORS[ri] + '"><i style="width:' + pct + '%"></i></span><span class="muted">' + esc(mood.status) + ' · <button type="button" class="link-btn" data-rank-ladder>Voir les paliers</button></span></div></div>' + '<a class="btn btn-primary btn-small btn-next-grade" style="--ng:' + RANK_COLORS[Math.min(ri + 1, RANKS.length - 1)] + '" href="' + mood.cta.href + '">' + RANK_PIP + esc(mood.cta.label) + "</a></section>"; })() : '<section class="welcome panel"><span class="welcome-face">' + myAvatar(72) + '</span><div class="stack" style="gap:6px;flex-grow:1"><h2 class="h-s">Bienvenue au QG, recrue !</h2><p class="muted" style="margin:0">Choisis ton pseudo et ton avatar pour commencer l\'aventure.</p></div><div class="welcome-actions"><a class="btn btn-primary" href="#/profil">Créer mon héros</a>' + '<a class="btn btn-ghost" href="' + mood.cta.href + '">' + esc(mood.cta.label) + "</a></div></section>") +
          '<section class="section" aria-labelledby="modes-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Comment jouer</span><h2 class="h-l" id="modes-title">Quatre façons de progresser</h2></div></div>' +
          '<div class="modes-tiles">' +
          '<a class="mt" style="--c:#4CC37A" href="#/entrainement"><i aria-hidden="true">🎯</i><b>Entraînement</b><small>Sans XP, avec explications</small></a>' +
          '<a class="mt" style="--c:#D9A35B" href="#/classe"><i aria-hidden="true">🏆</i><b>Classé</b><small>XP, grades, difficultés</small></a>' +
          '<a class="mt" style="--c:#FF6B8A" href="#/mission"><i aria-hidden="true">⚔️</i><b>Boss</b><small>Un boss par domaine</small></a>' +
          '<a class="mt" style="--c:#3FE0C5" href="#/collectif"><i aria-hidden="true">⚡</i><b>Défie un collègue</b><small>Même quiz, ' + DF_SECS + ' s par question</small></a></div>' +
          '<div class="modes">' +
          '<div class="mode-card mode-fold" style="--mc:#4CC37A"><span class="tag" style="background:var(--green-2)">Entraînement</span><blockquote class="mode-quote">« Même les plus grands héros ont eu besoin d\'une salle d\'entraînement. »<cite>Hotfix</cite></blockquote><p>Par pilier, par thème ou par niveau, à ton rythme. Aucune XP en jeu : trompe-toi, lis les explications, recommence.</p><span class="muted" style="font-size:14px">Plus de ' + (Math.floor((QUESTIONS.length - 1) / 100) * 100) + " questions · 6 formats</span>" + '<button type="button" class="mode-more" aria-expanded="false" aria-controls="mode-p-train"><span class="mm-open">En savoir plus</span><span class="mm-close">Réduire</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mode-panel" id="mode-p-train" hidden><ul><li>Choisis un pilier, un thème ou un niveau.</li><li>Aucune XP en jeu : trompe-toi sans risque.</li><li>Chaque réponse est expliquée, pour comprendre et recommencer.</li></ul><a class="mode-go" href="#/entrainement">Aller à l\'entraînement →</a></div></div>' +
          '<div class="mode-card mode-fold" style="--mc:#D9A35B"><span class="tag">Classé</span><blockquote class="mode-quote">« Avec de grands droits admin viennent de grandes responsabilités. »<cite>Sudo</cite></blockquote><p>Tous sujets confondus. Choisis ta difficulté : plus c\'est dur, plus tu grimpes vite… et plus une erreur coûte cher.</p><span class="muted" style="font-size:14px">4 difficultés · bouclier · rétrogradation</span><button type="button" class="mode-more" aria-expanded="false" aria-controls="mode-p-rank"><span class="mm-open">En savoir plus</span><span class="mm-close">Réduire</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mode-panel" id="mode-p-rank" hidden><ul><li>Débutant : aucune perte d\'XP, bouclier permanent.</li><li>Confirmé : bouclier après 5 bonnes réponses d\'affilée, grade protégé.</li><li>Expert : bouclier après 7 d\'affilée, rétrogradation possible.</li><li>Légende : aucun bouclier, débloquée au grade Super technicien.</li></ul><a class="mode-go" href="#/classe">Aller au mode classé →</a></div></div>' +
          '<div class="mode-card mode-fold" style="--mc:#FF6B8A"><span class="tag" style="background:var(--pink)">Boss</span><blockquote class="mode-quote">« Gardiens, rassemblement ! Le QG a besoin de toi. »<cite>Captain Reboot</cite></blockquote><p>Un boss par domaine, en mise en situation réelle : tickets, journaux, commandes à taper. Maîtrise son domaine pour l\'affronter.</p><span class="muted" style="font-size:14px">Boss vaincus : ' + bossesWon() + " / " + (window.BOSSES || []).length + "</span>" + '<button type="button" class="mode-more" aria-expanded="false" aria-controls="mode-p-boss"><span class="mm-open">En savoir plus</span><span class="mm-close">Réduire</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mode-panel" id="mode-p-boss" hidden><ul><li>3 niveaux par boss, de plus en plus durs.</li><li>Accès : ton grade et ta maîtrise du pilier.</li><li>Erreurs permises : 2, puis 1, puis aucune.</li><li>Le boss ultime s\'ouvre quand les autres sont vaincus.</li></ul><a class="mode-go" href="#/mission">Aller aux boss →</a></div></div>' +
          '<div class="mode-card mode-fold" style="--mc:#3FE0C5"><span class="tag" style="background:#3FE0C5;color:#0B0E13">Défi</span><h3 class="h-s">Défie un collègue</h3><p>Mêmes questions, ' + DF_SECS + ' secondes chacune. Envoie un simple lien : ton collègue voit ton score et ton temps à battre. Sans XP, juste l\'honneur.</p><span class="muted" style="font-size:14px">Un simple lien · aucun compte</span><button type="button" class="mode-more" aria-expanded="false" aria-controls="mode-p-duel"><span class="mm-open">En savoir plus</span><span class="mm-close">Réduire</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="mode-panel" id="mode-p-duel" hidden><ul><li>Choisis un pilier et une longueur : 5, 10 ou 15 questions.</li><li>Tu as ' + DF_SECS + ' secondes par question.</li><li>À score égal, le plus rapide gagne.</li><li>Ton lien contient ton pseudo, ton avatar, ton score et ton temps. Rien d\'autre.</li></ul><a class="mode-go" href="#/collectif">Lancer un défi →</a></div></div>' +
          "</div></section>" +

          heroCarousel() +
          '<section class="section" id="mondes" aria-labelledby="worlds-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Leurs domaines</span><h2 class="h-l" id="worlds-title">Chacun veille sur son domaine</h2></div><p class="muted" style="max-width:420px;margin:0">Chaque pilier a son gardien et son boss. Touche un gardien pour découvrir son contenu et des ressources.</p></div>' +
          '<div class="worlds">' +
          PILLARS.map(function (pl, i) {
            var n = QUESTIONS.filter(function (q) { return pl.subs.indexOf(q.theme) !== -1; }).length;
            var apps = pl.subs.map(function (id) { return themeLabel(id); }).join(" · ");
            var href = pl.id;
            return world("0" + (i + 1), href, "", pl.label, "Gardien" + (window.heroById(pl.hero).gender === "f" ? "ne" : "") + " : " + esc(window.heroById(pl.hero).name), pl.desc, pl.boss, pl.bonus ? " green osb" : "", pl.hero, pl.color);
          }).join("") +
          "</div></section>" +
          "</main>";
      }
    };
  }

  /* =========================================================
     VUE : ENTRAÎNEMENT (sans XP)
     ========================================================= */
  function TrainView(params) {
    var view = {
      nav: "train",
      phase: "choose", theme: params.theme || "all", pillar: params.pillar || (params.theme && pillarOfTheme(params.theme) ? pillarOfTheme(params.theme).id : "all"), level: "all",
      step: params.theme ? "level" : (params.pillar ? ((pillarById(params.pillar) || { subs: [] }).subs.length > 1 ? "theme" : "level") : "pillar"),
      list: [], i: 0, score: 0, answered: 0, run: null, mode: params.mode === "level" ? "level" : "pillar",
      pool: function () {
        var self = this;
        if (self.level === "legende" && !legendUnlocked()) return QUESTIONS.filter(function (q) { return q.level === "legende" && q.trial; });
        return QUESTIONS.filter(function (q) { return matchScope(q, self.pillar, self.theme) && (self.level === "all" || q.level === self.level) && legendOpen(q); });
      },
      countFor: function (theme, pillar) {
        var self = this;
        return QUESTIONS.filter(function (q) { return matchScope(q, pillar, theme) && (self.level === "all" || q.level === self.level) && legendOpen(q); }).length;
      },
      onAnswer: function (good) { this.answered++; if (good) { this.score++; this.streak = (this.streak || 0) + 1; } else { this.streak = 0; this.wrong = (this.wrong || 0) + 1; } },
      endHero: function () {
        if (this.theme !== "all") return window.heroForTheme(this.theme);
        var pl = pillarById(this.pillar);
        return window.heroById(pl ? pl.hero : "volt");
      },
      actions: {
        /* Parcours pas à pas : pilier → sous-thème → niveau, avec un fil d'Ariane cliquable */
        mode: function (d) { V.reviewKind = null; V.mode = d.id; V.pillar = "all"; V.theme = "all"; V.level = "all"; V.step = "pillar"; V._focusKey = "mode-" + d.id; },
        pillar: function (d) { V.reviewKind = null; V.pillar = d.id; V.theme = "all"; V.level = "all"; var pl = pillarById(d.id); V.step = pl && pl.subs.length > 1 ? "theme" : "level"; V._scroll = true; V._focusKey = "stephead"; },
        theme: function (d) { V.reviewKind = null; V.theme = d.id; V.level = "all"; V.step = "level"; V._scroll = true; V._focusKey = "stephead"; },
        level: function (d) { V.reviewKind = null; V.level = d.id; V.dlg = true; V._focusKey = "dlg-go"; sfx("toggle"); },
        dlgclose: function () { V.dlg = false; V._focusKey = "l-" + V.level; },
        dlggo: function () { V.dlg = false; V.actions.start(); },
        goto: function (d) { V.reviewKind = null; V.phase = "choose"; V.step = d.id; V._scroll = true; V._focusKey = "stephead"; },
        review: function (d) {
          var pool = srsList(d.id); if (!pool.length) return;
          V.reviewKind = d.id; V.pillar = "all"; V.theme = "all"; V.level = "all"; V.step = "pillar";
          V.list = shuffle(pool).slice(0, 20); V.i = 0; V.score = 0; V.answered = 0; V.streak = 0; V.wrong = 0; V.run = newRun(V.list[0]); V.phase = "play"; V._scroll = true;
        },
        start: function () {
          if (V.reviewKind) { V.actions.review({ id: V.reviewKind }); return; }
          var pool = V.pool(); if (!pool.length) return;
          V.list = shuffle(pool); V.i = 0; V.score = 0; V.answered = 0; V.streak = 0; V.wrong = 0; V.run = newRun(V.list[0]); V.phase = "play"; V._scroll = true;
        },
        next: function () {
          if (V.i >= V.list.length - 1) { V.phase = "end"; V._scroll = true; sfx("end"); return; }
          V.i++; V.run = newRun(V.list[V.i]); V._scroll = true; V._focusKey = "q";
        },
        finish: function () { V.phase = "end"; V._scroll = true; sfx("end"); },
        choose: function () { V.reviewKind = null; V.phase = "choose"; V.step = "pillar"; V.pillar = "all"; V.theme = "all"; V.level = "all"; V._scroll = true; }
      },
      render: function () {
        if (this.phase === "choose") return this.renderChoose();
        if (this.phase === "play") return this.renderPlay();
        return this.renderEnd();
      },
      levelDialog: function () {
        if (!this.dlg) return "";
        var all = this.level === "all", L = all ? null : LEVELS[this.level], ult = this.level === "legende", locked = ult && !legendUnlocked();
        var color = all ? "#8EA2FF" : L.color;
        var desc = all ? "Toutes les difficultés mélangées, pour t'échauffer ou réviser large." : (locked ? "Version d'essai de la Légende : quelques questions de tous les piliers confondus pour te tester. Le niveau complet se débloque au grade Super technicien." : L.desc);
        var n = this.pool().length;
        return '<div class="lvl-dlg-wrap"><div class="lvl-dlg-bg" data-action="dlgclose"></div>' +
          '<div class="lvl-dlg' + (ult ? " ult" : "") + '" role="alertdialog" aria-modal="true" aria-labelledby="lvl-dlg-t" style="--c:' + color + '">' +
          '<span class="level-tag">' + (all ? "TOUS NIVEAUX" : L.tag) + "</span>" +
          '<h2 class="h-m" id="lvl-dlg-t">' + (all ? "Commencer l'entraînement ?" : (locked ? "Essayer la Légende ?" : "S'entraîner en " + L.name + " ?")) + "</h2>" +
          '<p class="lvl-dlg-rule">' + desc + "</p>" +
          '<p class="lvl-dlg-rule" style="color:var(--green-2)">Sans XP : tu ne peux rien perdre.' + (SHOW_COUNTS ? " " + n + " question" + (n > 1 ? "s" : "") + "." : "") + "</p>" +
          (all ? "" : '<small class="level-quote" style="--qc:' + ((window.heroById && window.heroById(L.by) || {}).neon || "var(--text-2)") + '">' + esc(L.focus) + "</small>") +
          '<div class="lvl-dlg-actions"><button type="button" class="btn ' + (ult ? "btn-ultimate btn-fire" : "btn-primary btn-lv-" + this.level) + '" style="min-height:52px;font-size:17px" data-action="dlggo" data-key="dlg-go"' + (n ? "" : " disabled") + ">" + (ult ? I.flame : I.bolt()) + (ult ? "Je relève le défi" : "C'est parti !") + '</button>' +
          '<button type="button" class="btn btn-ghost" data-action="dlgclose" data-key="dlg-close">Changer de niveau</button></div></div></div>';
      },
      crumbs: function (current) {
        /* Fil d'Ariane : chaque étape déjà franchie est cliquable pour revenir la modifier */
        if (this.reviewKind) return '<nav class="crumbs" aria-label="Révision"><ol><li><button type="button" class="crumb" data-action="choose" data-key="cr-0">Entraînement</button></li><li><span class="crumb current" aria-current="step">' + (this.reviewKind === "errors" ? "Mes erreurs" : "Révision du jour") + "</span></li></ol></nav>";
        var curP = pillarById(this.pillar), parts = [];
        parts.push({ label: "Entraînement", go: "pillar" });
        if (current !== "pillar") parts.push({ label: curP ? curP.label : "Tous les piliers", go: curP && curP.subs.length > 1 ? "theme" : "pillar", color: curP ? curP.color : "" });
        if ((current === "level" || current === "play") && curP && curP.subs.length > 1) parts.push({ label: this.theme === "all" ? "Tout le pilier" : themeLabel(this.theme), go: "theme" });
        if (current === "play") parts.push({ label: this.level === "all" ? "Tous niveaux" : LEVELS[this.level].name, go: "level" });
        var last = { pillar: "Choix du pilier", theme: "Choix du sous-thème", level: "Choix du niveau", play: "Questions" }[current];
        var sep = '<svg class="crumb-sep" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        return '<nav class="crumbs" aria-label="Étapes de l\'entraînement"><ol>' + parts.map(function (c, k) {
          return '<li><button type="button" class="crumb" data-action="goto" data-id="' + c.go + '" data-key="cr-' + k + '"' + (c.color ? ' style="--cc:' + c.color + '"' : "") + ">" + (k === 0 ? '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></svg>' : (c.color ? '<i class="crumb-dot"></i>' : "")) + esc(c.label) + "</button>" + sep + "</li>";
        }).join("") + '<li><span class="crumb current" aria-current="step">' + esc(last) + "</span></li></ol></nav>";
      },
      reviewCard: function () {
        var due = srsList("due").length, err = srsList("errors").length, seen = Object.keys(P.srs || {}).length;
        var p = seen ? (due ? "Des questions déjà croisées sont prêtes à revenir au bon moment : une série de 20 maximum." : "Rien à réviser pour l'instant. Reviens demain : les questions réussies reviennent de plus en plus tard, les ratées dès que possible.") : "Joue quelques questions : celles que tu rates reviennent ici très vite, celles que tu réussis reviennent de plus en plus tard.";
        return '<section class="review-card" aria-labelledby="rv-h"><div class="rv-txt"><span class="rv-ico" aria-hidden="true">🔁</span><div><h3 class="h-s" id="rv-h">Révision espacée</h3><p class="muted" style="margin:0">' + esc(p) + '</p></div></div><div class="btn-row"><button type="button" class="btn btn-primary" data-action="review" data-id="due" data-key="rv-due"' + (due ? "" : " disabled") + '>Révision du jour · ' + due + '</button><button type="button" class="btn btn-ghost" data-action="review" data-id="errors" data-key="rv-err"' + (err ? "" : " disabled") + '>Mes erreurs · ' + err + '</button></div></section>';
      },
      renderChoose: function () {
        var self = this, step = this.step, curP = pillarById(this.pillar);
        if (step === "theme" && !(curP && curP.subs.length > 1)) step = this.step = "level";
        var total = curP && curP.subs.length > 1 ? 3 : (this.pillar === "all" || curP ? 2 : 3);
        var num = step === "pillar" ? 1 : (step === "theme" ? 2 : total);
        var head, body, foot = "";
        var modeSwitch = step === "pillar" ? '<div class="mode-switch" role="group" aria-label="Façon de choisir"><button type="button" class="ms-btn' + (this.mode === "pillar" ? " on" : "") + '" data-action="mode" data-id="pillar" data-key="mode-pillar" aria-pressed="' + (this.mode === "pillar") + '">Par pilier</button><button type="button" class="ms-btn' + (this.mode === "level" ? " on" : "") + '" data-action="mode" data-id="level" data-key="mode-level" aria-pressed="' + (this.mode === "level") + '">Par niveau</button></div>' : "";
        if (step === "pillar" && this.mode === "level") { step = "level"; num = 1; total = 1; }
        if (step === "pillar") {
          head = "Choisis un pilier";
          body = '<div class="choices pillars">' + [{ id: "all", label: "Tous les piliers", color: "#8EA2FF" }].concat(PILLARS).map(function (pl) {
            var sel = pl.id === self.pillar, PIC = { all: "🎯", m365: "📧", cyber: "🛡️", it: "🖥️", dev: "💻", ia: "🤖", vert: "🌱" };
            return '<button type="button" class="choice pillar-choice' + (sel ? " selected" : "") + '" style="--c:' + pl.color + '" data-action="pillar" data-id="' + pl.id + '" data-key="p-' + pl.id + '"><span class="pc-ico" aria-hidden="true">' + (PIC[pl.id] || "🎯") + '</span><span class="pc-txt"><span class="name">' + esc(pl.label) + "" + "</span>" + (SHOW_COUNTS ? "<small>" + QUESTIONS.filter(function (q) { return matchScope(q, pl.id, "all"); }).length + " questions</small>" : "") + "</span></button>";
          }).join("") + "</div>";
        } else if (step === "theme") {
          head = "Choisis un sous-thème";
          body = '<div class="choices themes">' + [{ id: "all", label: "Tout le pilier" }].concat(curP.subs.map(function (id) { return { id: id, label: themeLabel(id) }; })).map(function (t) {
            var sel = t.id === self.theme, n = QUESTIONS.filter(function (q) { return matchScope(q, curP.id, t.id); }).length;
            return '<button type="button" class="choice' + (sel ? " selected" : "") + '" style="--c:' + curP.color + '" data-action="theme" data-id="' + t.id + '" data-key="t-' + t.id + '"' + (n ? "" : " disabled") + '><span class="name">' + esc(t.label) + "</span>" + (SHOW_COUNTS ? "<small>" + n + " question" + (n > 1 ? "s" : "") + "</small>" : "") + "</button>";
          }).join("") + "</div>";
        } else {
          head = "Choisis un niveau";
          body = '<div class="choices themes">' + [{ id: "all", name: "Tous niveaux", color: "#8EA2FF" }].concat(LEVEL_ORDER.map(function (id) { return { id: id, name: LEVELS[id].name, color: LEVELS[id].color }; })).map(function (l) {
            var sel = l.id === self.level, trialOnly = l.id === "legende" && !legendUnlocked(), n = trialOnly ? QUESTIONS.filter(function (q) { return q.level === "legende" && q.trial; }).length : QUESTIONS.filter(function (q) { return matchScope(q, self.pillar, self.theme) && (l.id === "all" || q.level === l.id) && legendOpen(q); }).length;
            return '<button type="button" class="choice' + (trialOnly ? " trial" : "") + (sel ? " selected" : "") + '" style="--c:' + l.color + '" data-action="level" data-id="' + l.id + '" data-key="l-' + l.id + '" aria-pressed="' + sel + '"' + (n ? "" : " disabled") + '><span class="name">' + esc(l.name) + (trialOnly ? ' <em class="trial-tag">essai</em>' : "") + "</span>" + (SHOW_COUNTS || trialOnly ? "<small>" + (trialOnly ? (n ? (SHOW_COUNTS ? n + " question" + (n > 1 ? "s" : "") : "Questions") + " d'essai, tous piliers confondus · tout le niveau au grade Super technicien" : "Débloqué au grade Super technicien") : n + " question" + (n > 1 ? "s" : "")) + "</small>" : "") + "</button>";
          }).join("") + "</div>";
          var n = this.pool().length;
          var ultT = this.level === "legende";
          foot = "";
        }
        return '<main class="container page train-wizard">' +
          (this.step === "pillar" ? '<div class="stack" style="gap:10px;margin-bottom:22px"><span class="eyebrow" style="color:var(--green-2)">Salle d\'entraînement · sans XP</span><h1 class="h-l">Entraîne-toi sans pression</h1><p class="lead">Trompe-toi autant que tu veux, lis les explications, et quand tu te sens prêt·e, passe au mode classé.</p></div>' : "") +
          (this.step === "pillar" ? "" : this.crumbs(step)) +
          (step === "pillar" && this.mode === "pillar" ? this.reviewCard() : "") + modeSwitch + '<section class="wiz-step" aria-labelledby="wiz-h"><div class="wiz-head"><span class="wiz-num">' + (this.mode === "level" && this.step === "pillar" ? "Tous les piliers" : "Étape " + num + (step === "pillar" ? "" : " sur " + total)) + '</span><h2 class="h-m" id="wiz-h" tabindex="-1" data-key="stephead">' + head + "</h2></div>" + body +
          (foot ? '<div class="wiz-foot">' + foot + "</div>" : "") + "</section>" + (step === "level" ? this.levelDialog() : "") + "</main>";
      },
      renderPlay: function () {
        var r = this.run, q = r.q, v = r.validated;
        var pct = Math.round(((this.i + (v ? 1 : 0)) / this.list.length) * 100);
        var side;
        if (!v) {
          var tg = window.heroForTheme ? window.heroForTheme(q.theme) : null, tips = ["Lis bien la question : un seul mot sépare souvent la bonne réponse de la presque bonne.", FORMAT_TIP[q.format] || FORMAT_TIP.single, "Tu peux te tromper : l'explication qui suit est faite pour ça.", this.reviewKind ? "Une question réussie revient plus tard, une question ratée revient vite : c'est comme ça qu'on retient." : "Prends ton temps : aucun chrono, aucune XP en jeu."];
          side = '<div class="tr-side"><div class="tr-stats"><div class="tr-st" style="--c:var(--gold)"><b>' + (this.streak || 0) + '</b><span>série</span></div><div class="tr-st" style="--c:var(--pink)"><b>' + (this.wrong || 0) + '</b><span>ratée' + ((this.wrong || 0) > 1 ? "s" : "") + '</span></div></div>' +
            '<aside class="tr-hero"' + (tg ? ' style="--hc:' + tg.glow + '"' : "") + '>' + (tg ? '<div class="tr-who"><span class="tr-face">' + window.heroSvg(tg, 52) + '</span><div><small>' + esc(tg.world) + '</small><b>' + esc(tg.name) + '</b></div></div>' : "") + '<p>« ' + esc(tips[this.i % tips.length]) + ' »</p><span class="tr-pill">Rien à perdre · sans XP</span></aside></div>';
        }
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "OUPS !") + '</span><b>' + (r.good ? "Bonne réponse !" : "Pas tout à fait. Regarde la correction.") + "</b></div>" + heroExplain(q.theme, q.e, q.maj, r) + '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= this.list.length - 1 ? "Voir le bilan" : "Question suivante") + "</button></div>";
        return '<main class="container page">' + this.crumbs("play") +
          '<div class="q-meta"><span class="tag">' + esc(themeLabel(q.theme)) + '</span><span class="tag tag-outline">' + esc(FORMAT[q.format].label) + '</span><span class="muted" style="font-size:14px;flex-grow:1">Question ' + (this.i + 1) + (SHOW_COUNTS ? " / " + this.list.length : "") + '</span><div class="bar green" style="width:200px"><div style="width:' + pct + '%"></div></div><b style="color:var(--green-2);font-size:14px">' + this.score + ' juste(s)</b><button type="button" class="btn btn-ghost btn-small" data-action="finish">Terminer</button></div>' +
          '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      },
      renderEndReview: function () {
        var self = this, seen = this.list.slice(0, Math.max(this.answered, 0)), S = P.srs || {}, today = dayNum();
        var bad = seen.filter(function (q) { var e = S[qidOf(q)]; return e && e.w === 1; }), good = seen.length - bad.length;
        var okE = seen.map(function (q) { return S[qidOf(q)]; }).filter(function (e) { return e && e.w !== 1; });
        var soon = okE.length ? Math.min.apply(null, okE.map(function (e) { return e.d - today; })) : null;
        var follow = soon === null ? "" : (soon <= 1 ? "demain" : "dans " + soon + " jours");
        var all = Object.keys(S), mastered = all.filter(function (k) { return S[k] && S[k].b >= 5 && S[k].w !== 1; }).length;
        var more = srsList(this.reviewKind).length, errs = srsList("errors").length, isErr = this.reviewKind === "errors";
        var head = !seen.length ? "Révision terminée" : bad.length === 0 ? "Tout est retenu" : good >= bad.length ? "Bonne révision" : "Révision utile";
        var txt = !seen.length ? "Tu peux reprendre quand tu veux." : bad.length === 0 ? "Chaque question revue est retenue : elles reviendront de plus en plus tard." : "Les questions ratées reviennent dès ta prochaine révision, jusqu'à ce qu'elles soient acquises. Relis leur explication si tu veux gagner du temps.";
        var tile = function (n, l, c) { return '<div class="tr-st" style="--c:' + c + '"><b>' + n + '</b><span>' + l + '</span></div>'; };
        var list = bad.length ? '<div class="rev-bad"><h3 class="h-s">À retravailler</h3><ul>' + bad.slice(0, 6).map(function (q) { var t = String(q.q || ""); return "<li><span class=\"muted\">" + esc(themeLabel(q.theme)) + "</span> " + esc(t.length > 110 ? t.slice(0, 107) + "…" : t) + "</li>"; }).join("") + (bad.length > 6 ? "<li class=\"muted\">… et " + (bad.length - 6) + " autre" + (bad.length - 6 > 1 ? "s" : "") + "</li>" : "") + "</ul></div>" : "";
        return '<main class="container page"><div class="end-card halftone rev-end" style="box-shadow:14px 14px 0 var(--indigo, #6B7BFF)"><span class="burst big" style="background:#8F9BFF;color:#0B1030">' + head.toUpperCase() + ' !</span><h1 class="h-l">' + seen.length + " question" + (seen.length > 1 ? "s" : "") + " revue" + (seen.length > 1 ? "s" : "") + "</h1><p>" + txt + "</p>" +
          '<div class="tr-stats rev-tiles">' + tile(good, "retenue" + (good > 1 ? "s" : ""), "var(--green)") + tile(bad.length, "à retravailler", "var(--pink)") + tile(mastered, "maîtrisée" + (mastered > 1 ? "s" : "") + " au total", "var(--gold)") + "</div>" +
          (follow ? '<p class="muted rev-next">Prochain rappel des questions réussies : ' + follow + ".</p>" : "") + list +
          '<div class="btn-row" style="justify-content:center">' + (more ? '<button type="button" class="btn btn-primary" data-action="review" data-id="' + this.reviewKind + '">Continuer · ' + more + " à revoir</button>" : "") +
          (!isErr && errs ? '<button type="button" class="btn ' + (more ? "btn-ghost" : "btn-primary") + '" data-action="review" data-id="errors">Revoir mes erreurs · ' + errs + "</button>" : "") +
          '<a class="btn btn-ghost" href="#/stats">Voir ma progression</a><button type="button" class="btn btn-ghost" data-action="choose">Retour à l\'entraînement</button></div></div></main>';
      },
      renderEnd: function () {
        if (this.reviewKind) return this.renderEndReview();
        var ratio = this.answered ? this.score / this.answered : 0;
        var txt = "Continue à t'entraîner : relis les explications des questions ratées, puis retente.";
        if (ratio >= 0.8) txt = "Excellent niveau sur ce thème. Tu peux te lancer en mode classé, en Confirmé voire en Expert.";
        else if (ratio >= 0.5) txt = "Bonne base ! Encore un ou deux tours d'entraînement et le mode classé est à toi.";
        return '<main class="container page"><div class="end-card halftone" style="box-shadow:14px 14px 0 var(--green)"><span class="burst big" style="background:var(--green-2)">BIEN JOUÉ !</span><h1 class="h-l">' + this.score + " / " + this.answered + " bonnes réponses</h1><p>" + txt + "</p>" + heroSayHtml(window.heroForTheme ? this.endHero() : null, ratio >= 0.5 ? (this.endHero().win) : (this.endHero().lose)) + '<div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="#/classe">Je me sens prêt·e : mode classé</a><button type="button" class="btn btn-ghost" data-action="start">Recommencer</button><button type="button" class="btn btn-ghost" data-action="choose">Changer de thème</button></div></div></main>';
      }
    };
    if (params.review === "due" || params.review === "errors") { /* lancé depuis la page Révisions : on démarre directement la série */
      var pool0 = srsList(params.review);
      if (pool0.length) { view.reviewKind = params.review; view.list = shuffle(pool0).slice(0, 20); view.i = 0; view.score = 0; view.answered = 0; view.streak = 0; view.wrong = 0; view.run = newRun(view.list[0]); view.phase = "play"; }
    }
    return view;
  }

  /* =========================================================
     VUE : MODE CLASSÉ (challenge individuel)
     ========================================================= */
  function RankedView() {
    return {
      nav: "ranked",
      phase: "choose", level: "hero",
      list: [], i: 0, run: null,
      delta: 0, usedShield: false, gotShield: false, floorSaved: false, rankMsg: "", rankUp: false, sessionStartXp: P.xp, sessionGood: 0,
      onAnswer: function (good) {
        var L = LEVELS[this.level];
        var delta = 0; this.usedShield = false; this.gotShield = false; this.floorSaved = false;
        if (good) {
          delta = L.gain + (capeHeat() >= 5 ? Math.ceil(L.gain * 0.1) : 0); P.streak++; this.sessionGood++;
          if (L.shield && !P.shield && P.streak >= (L.shieldStreak || STREAK_FOR_SHIELD)) { P.shield = true; this.gotShield = true; setTimeout(function () { sfx("shield"); }, 380); P.bestStreak = Math.max(P.bestStreak, P.streak); P.streak = 0; }
        } else {
          if (L.loss === 0) delta = 0;
          else if (L.shield && P.shield) { P.shield = false; this.usedShield = true; }
          else delta = -L.loss;
          P.streak = 0;
        }
        P.bestStreak = Math.max(P.bestStreak, P.streak);
        var before = rankIndex(P.xp);
        var next = Math.max(0, P.xp + delta);
        if (L.floor && rankIndex(next) < before) { next = RANKS[before].min; this.floorSaved = true; }
        this.delta = next - P.xp;
        P.xp = next;
        var after = rankIndex(P.xp);
        this.rankMsg = ""; this.rankUp = false;
        if (after > before) { this.rankMsg = "Promotion ! Tu passes " + RANKS[after].n + (after === RANKS.length - 1 ? ". Captain Reboot est débloqué comme avatar !" : ""); this.rankUp = true; ensureStats(); P.stats.promotions++; }
        if (after < before) { this.rankMsg = "Rétrogradation… tu redescends " + RANKS[after].n; }
        if (after !== before) { var up = after > before; setTimeout(function () { rankCeremony(up, after); }, 450); }
        saveProfile();
      },
      actions: {
        level: function (d) { if (d.id === "legende" && !legendUnlocked()) { V.shakeLegend = true; sfx("bad"); clearTimeout(V._shT); V._shT = setTimeout(function () { if (V.shakeLegend) { V.shakeLegend = false; render(); } }, 2600); V._focusKey = "lv-legende"; [0, 30].forEach(function (d) { setTimeout(function () { var el = document.querySelector('.choice.level[data-id="legende"]'); if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); } }, d); }); return; } V.shakeLegend = false; V.level = d.id; V.dlg = true; V._focusKey = "dlg-go"; sfx("toggle"); },
        dlgclose: function () { V.dlg = false; V._focusKey = "lv-" + V.level; },
        dlggo: function () { V.dlg = false; V.phase = "confirmed"; V.actions.start(); },
        start: function () {
          if (V.level === "legende" && !legendUnlocked()) return;
          if (V.level === "legende" && V.phase === "choose") { V.phase = "confirm"; V._scroll = true; V._focusKey = "accept"; return; }
          var pool = QUESTIONS.filter(function (q) { return q.level === V.level; });
          V.list = shuffle(pool).slice(0, RANKED_SESSION); V.i = 0; V.sessionGood = 0; V.sessionStartXp = P.xp;
          V.run = newRun(V.list[0], V.level === "legende"); V.phase = "play"; V.rankMsg = ""; V._scroll = true;
        },
        accept: function () { V.phase = "confirmed"; V.actions.start(); },
        next: function () {
          if (V.i >= V.list.length - 1) { V.phase = "end"; V._scroll = true; sfx("end"); ensureStats(); markRunEnd(); if (V.sessionGood * 2 >= V.list.length) P.stats.rankedWins = (P.stats.rankedWins || 0) + 1; if (V.level === "legende") { P.stats.legendRuns++; if (V.sessionGood === V.list.length) P.stats.legendPerfect++; } saveProfile(); return; }
          V.i++; V.run = newRun(V.list[V.i], V.level === "legende"); V.rankMsg = ""; V._scroll = true; V._focusKey = "q";
        },
        choose: function () { V.phase = "choose"; V._scroll = true; },
        reset: function () {
          if (!V.confirmReset) { V.confirmReset = true; return; }
          var keep = { pseudo: P.pseudo, avatar: P.avatar, pub: P.pub }; P = defaultProfile(); P.pseudo = keep.pseudo; P.avatar = keep.avatar; P.pub = keep.pub; ensureStats(); saveProfile(); V.confirmReset = false;
        }
      },
      render: function () {
        if (this.phase === "choose") return this.renderChoose();
        if (this.phase === "confirm") return this.renderConfirm();
        if (this.phase === "play") return this.renderPlay();
        return this.renderEnd();
      },
      hc: function () { return this.level === "legende"; },
      rankCard: function () {
        var r = rankInfo(P.xp), hc = this.hc();
        var shieldTxt = hc ? "Pas de bouclier en Légende" : (P.shield ? "Bouclier actif" : "Pas de bouclier");
        return '<div class="panel" style="padding:20px 24px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h2 class="h-s"><button type="button" class="rank-link" data-rank-ladder aria-label="Voir tous les paliers (rang actuel : ' + esc(r.name) + ')">' + rankBadge(rankIndex(P.xp), 26) + esc(r.name) + '<svg class="rank-link-caret" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></h2><span class="muted" style="font-size:14px">' + P.xp + " XP · " + esc(r.label) + '</span></div><div class="bar"><div style="width:' + r.pct + '%"></div></div><div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>Série : ' + Math.min(P.streak, (LEVELS[this.level].shieldStreak || STREAK_FOR_SHIELD)) + ' / ' + (LEVELS[this.level].shieldStreak || STREAK_FOR_SHIELD) + '</span><span style="' + (hc ? "color:#FF8AA3;font-weight:700" : (P.shield ? "color:#B7C4FF;font-weight:700" : "")) + '">' + shieldTxt + "</span></div></div>";
      },
      renderChoose: function () {
        var self = this;
        function perk(ok, label) { return '<li class="perk ' + (ok ? "yes" : "no") + '"><span aria-hidden="true">' + (ok ? "✓" : "✕") + "</span>" + label + '<span class="sr-only">' + (ok ? " : atout" : " : attention") + "</span></li>"; }
        var cards = LEVEL_ORDER.map(function (id) {
          var L = LEVELS[id], sel = id === self.level, ult = id === "legende", lock = ult && !legendUnlocked(), ignite = ult && !lock && !P.legendSeen;
          if (ignite) { P.legendSeen = true; saveProfile(); setTimeout(function () { sfx("ignite"); }, 250); }
          var n = QUESTIONS.filter(function (q) { return q.level === id; }).length;
          return '<button type="button" class="choice level' + (ult ? " ultimate" : "") + (lock ? " locked-lv" : "") + (lock && self.shakeLegend ? " shake" : "") + (ignite ? " ignite" : "") + (sel ? " selected" : "") + '" style="--c:' + L.color + '" data-action="level" data-id="' + id + '" data-key="lv-' + id + '" aria-pressed="' + sel + '"' + "" + '>' + (lock ? chainsHtml(false) : "") + (ignite ? chainsHtml(true) : "") + (lock ? '<span class="lv-locked-msg"' + (self.shakeLegend ? ' role="status"' : "") + '>🔒 ' + (self.shakeLegend ? "Verrouillé pour le moment · grade Super technicien requis" : "Débloqué au grade Super technicien") + "</span>" : "") + (ignite ? '<span class="lv-unlocked">Débloqué !</span>' : "") +
            '<span style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:inline-flex;align-items:center;gap:8px"><span class="level-tag">' + L.tag + "</span>" + (lock ? '<span class="lv-padlock" title="Verrouillé"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span>' : "") + "</span>" + (ult ? '<span class="ultimate-tag">' + I.flame + "Sans filet</span>" : "") + "</span>" +
            '<span class="name">' + L.name + "</span><p>" + L.desc + '</p><div class="stakes"><div class="stake win"><small>Bonne réponse</small><b>+' + L.gain + ' XP</b></div><div class="stake lose"><small>Erreur</small><b>' + (L.loss ? "−" + L.loss : "0") + " XP</b></div></div>" +
            '<span class="lv-rules-toggle' + (self.rulesOpen ? " open" : "") + '" data-rules-toggle role="button" aria-expanded="' + !!self.rulesOpen + '">Règles du niveau <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            '<ul class="perks"' + (self.rulesOpen ? "" : " hidden") + '>' + perk(L.loss === 0, L.loss === 0 ? "Aucune perte d'XP" : "Chaque erreur coûte " + L.loss + " XP") + perk(L.loss === 0 || L.shield, L.loss === 0 ? "Bouclier permanent : l'erreur ne coûte rien" : (L.shield ? "Bouclier après " + (L.shieldStreak || STREAK_FOR_SHIELD) + " bonnes réponses d'affilée : il encaisse ta prochaine erreur" : "Aucun bouclier")) + perk(L.floor, L.floor ? "Grade protégé : pas de rétrogradation" : "Rétrogradation possible si ton XP repasse sous le seuil de ton grade") + "</ul>" +
            '<small class="level-quote" style="--qc:' + ((window.heroById && window.heroById(L.by) || {}).neon || "var(--text-2)") + '">' + esc(L.focus) + '</small>' + (SHOW_COUNTS ? '<small class="level-count">' + n + " questions</small>" : "") + "</button>";
        }).join("");
        var ult = this.hc();
        return '<main class="container page">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px;align-items:end;margin-bottom:28px"><div class="stack" style="gap:10px"><span class="eyebrow">Mode classé · challenge individuel</span><h1 class="h-l">Choisis ta difficulté</h1><p class="lead">Plus c\'est dur, plus tu grimpes vite. Mais plus tu montes, moins tu as de filet de sécurité.</p><p class="all-topics"><span aria-hidden="true">⚡</span> Tous sujets confondus : M365, cyber, IT, dev, IA et numérique responsable, mélangés à chaque partie.</p></div>' + this.rankCard() + "</div>" +
          '<div class="choices levels" style="margin-bottom:24px">' + cards + "</div>" +
          (legendUnlocked() ? "" : '<p class="lv-note"><a href="#/entrainement?mode=level">En attendant, teste-toi sur 3 questions d\'essai à l\'entraînement →</a> Elles piquent.</p>') +
          this.levelDialog() +
          "</main>";
      },
      levelDialog: function () {
        if (!this.dlg) return "";
        var L = LEVELS[this.level], ult = this.level === "legende", sh = L.shieldStreak || STREAK_FOR_SHIELD;
        var rule = L.loss === 0 ? "Bouclier permanent : l'erreur ne coûte rien." : (L.shield ? "Bouclier après " + sh + " bonnes réponses d'affilée : il encaisse ta prochaine erreur." : "Aucun bouclier : chaque erreur coûte " + L.loss + " XP." + (L.floor ? "" : " Rétrogradation immédiate sous le seuil de ton grade."));
        return '<div class="lvl-dlg-wrap"><div class="lvl-dlg-bg" data-action="dlgclose"></div>' +
          '<div class="lvl-dlg' + (ult ? " ult" : "") + '" role="alertdialog" aria-modal="true" aria-labelledby="lvl-dlg-t" style="--c:' + L.color + '">' +
          '<span class="level-tag">' + L.tag + "</span>" +
          '<h2 class="h-m" id="lvl-dlg-t">' + (ult ? "Prêt à jouer sans filet ?" : "Jouer en " + L.name + " ?") + "</h2>" +
          '<div class="stakes"><div class="stake win"><small>Bonne réponse</small><b>+' + L.gain + ' XP</b></div><div class="stake lose"><small>Erreur</small><b>' + (L.loss ? "−" + L.loss : "0") + " XP</b></div></div>" +
          '<p class="lvl-dlg-rule">' + rule + "</p>" +
          '<small class="level-quote" style="--qc:' + ((window.heroById && window.heroById(L.by) || {}).neon || "var(--text-2)") + '">' + esc(L.focus) + "</small>" +
          '<div class="lvl-dlg-actions"><button type="button" class="btn ' + (ult ? "btn-ultimate btn-fire" : "btn-primary btn-lv-" + this.level) + '" style="min-height:52px;font-size:17px" data-action="dlggo" data-key="dlg-go">' + (ult ? I.flame : I.bolt()) + (ult ? "Je relève le défi" : "C'est parti !") + '</button>' +
          '<button type="button" class="btn btn-ghost" data-action="dlgclose" data-key="dlg-close">Changer de niveau</button></div></div></div>';
      },
      renderConfirm: function () {
        var L = LEVELS.legende;
        return '<main class="container page hardcore"><div class="ultimate-gate">' +
          '<span class="ultimate-tag big">' + I.flame + "Mode ultime</span>" +
          '<h1 class="h-xl">Légende<br><span style="color:var(--pink)">sans filet</span></h1>' +
          '<ul class="gate-rules">' +
          "<li><b>Aucun bouclier.</b> Ta série ne te sauvera pas, et ton bouclier reste au vestiaire.</li>" +
          "<li><b>Chaque erreur coûte " + L.loss + " XP.</b> Pas de rattrapage.</li>" +
          "<li><b>Rétrogradation immédiate</b> si tu passes sous le seuil de ton rang.</li>" +
          "<li><b>+" + L.gain + " XP par bonne réponse.</b> La gloire est au bout.</li></ul>" +
          '<p class="muted" style="margin:0">Questions niveau expert : sécurité, réseau et administration avancée.</p>' +
          '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-ultimate btn-fire" style="min-height:60px;padding:0 32px;font-size:18px" data-action="accept" data-key="accept">' + I.flame + 'J\'accepte le défi</button><button type="button" class="btn btn-ghost" data-action="choose">Je préfère rester prudent·e</button></div>' +
          "</div></main>";
      },
      renderPlay: function () {
        var L = LEVELS[this.level], hc = this.hc(), r = this.run, q = r.q, v = r.validated, ri = rankInfo(P.xp);
        var need = L.shieldStreak || STREAK_FOR_SHIELD;
        var pips = "";
        for (var k = 0; k < need; k++) pips += '<span class="pip' + (!hc && P.shield ? " full" : (k < Math.min(P.streak, need) ? " on" : "")) + '"></span>';
        var side;
        if (!v) {
          var shieldOn = L.shield && P.shield;
          var risk = L.loss === 0 ? "0 XP" : (shieldOn ? "0 XP" : "−" + L.loss + " XP");
          var hint;
          if (L.loss === 0) hint = "En Débutant, tu ne perds rien : prends le temps d'apprendre.";
          else if (hc) hint = "Mode Légende : aucun bouclier, aucune seconde chance. Concentre-toi.";
          else if (shieldOn) hint = "Ton bouclier est actif : si tu te trompes, il encaisse à ta place.";
          else hint = "Encore " + (need - Math.min(P.streak, need)) + " bonne(s) réponse(s) d'affilée pour gagner un bouclier.";
          if (L.floor && L.loss) hint += " Ton grade est protégé dans ce mode.";
          side = '<div class="side-card halftone' + (hc ? " hc-card" : "") + '"><h3 class="h-s">Enjeu de la question</h3><div class="stakes"><div class="stake win"><small>Si juste</small><b>+' + L.gain + ' XP</b></div><div class="stake lose"><small>Si erreur</small><b>' + risk + '</b></div></div><p class="muted" style="margin:0;font-size:14px">' + hint + "</p></div>";
        } else {
          var dl, dc;
          if (this.delta > 0) { dl = "+" + this.delta + " XP"; dc = "#6FD99A"; }
          else if (this.usedShield) { dl = "Bouclier utilisé · 0 XP"; dc = "#B7C4FF"; }
          else if (this.delta === 0 && L.loss === 0) { dl = "0 XP · aucune perte en Débutant"; dc = "#9FB8A8"; }
          else if (this.delta === 0) { dl = "0 XP · grade protégé"; dc = "#B7C4FF"; }
          else { dl = "−" + Math.abs(this.delta) + " XP"; dc = "#FF8AA3"; }
          side = '<div class="feedback' + (r.good ? " good" : (this.usedShield ? " shielded" : "")) + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? (hc ? "LÉGENDAIRE !" : "BAM !") : (hc ? "K.O. !" : "AÏE !")) + '</span><span class="delta" style="color:' + dc + '">' + dl + "</span></div>" +
            (this.gotShield ? '<div class="notice shield">Série de ' + need + " ! Bouclier activé pour ta prochaine erreur.</div>" : "") +
            (this.floorSaved ? '<div class="notice shield">Rang protégé : tu restes ' + esc(RANKS[rankIndex(P.xp)].n) + ".</div>" : "") +
            (this.rankMsg ? '<div class="notice ' + (this.rankUp ? "up" : "down") + '">' + esc(this.rankMsg) + ' <button type="button" class="link-btn" data-rank-ladder>Voir les paliers</button></div>' : "") +
            heroExplain(q.theme, q.e, q.maj, r) + '<button type="button" class="btn ' + (hc ? "btn-ultimate" : "btn-primary") + '" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= this.list.length - 1 ? "Voir le bilan" : "Question suivante") + "</button></div>";
        }
        var guard = hc
          ? '<div class="panel hc-panel"><span class="ultimate-tag">' + I.flame + 'Sans filet</span><span class="muted" style="font-size:13px">Pas de bouclier</span></div>'
          : '<div class="panel"><div class="stack" style="gap:6px"><span class="eyebrow" style="font-size:11px;color:var(--muted)">Série</span><div class="pips">' + pips + '</div></div><div class="shield-box' + (P.shield ? " active" : "") + '" title="' + (P.shield ? "Bouclier actif" : "Pas de bouclier") + '"><span class="sr-only">' + (P.shield ? "Bouclier actif" : "Pas de bouclier") + "</span>" + I.shield(P.shield) + "</div></div>";
        return '<main class="container page' + (hc ? " hardcore" : "") + '"><div class="status-bar">' +
          '<div class="panel"><span class="level-tag" style="--c:' + L.color + '">' + L.tag + '</span><b style="font-family:var(--display);font-weight:400;font-size:22px;text-transform:uppercase">' + L.name + "</b></div>" +
          '<div class="panel grow"><div class="row"><button type="button" class="rank-link small" data-rank-ladder aria-label="Voir tous les paliers">' + rankBadge(rankIndex(P.xp), 20) + '<b>' + esc(ri.name) + " · " + P.xp + ' XP</b></button><span class="muted">' + esc(ri.label) + '</span></div><div class="bar"><div style="width:' + ri.pct + '%"></div></div></div>' +
          guard + "</div>" +
          '<div class="q-meta"><span class="tag">' + esc(themeLabel(q.theme)) + '</span><span class="tag tag-outline">' + esc(FORMAT[q.format].label) + '</span><span class="muted" style="font-size:14px">Question ' + (this.i + 1) + " / " + this.list.length + "</span></div>" +
          '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      },
      renderEnd: function () {
        var hc = this.hc(), d = P.xp - this.sessionStartXp, before = rankIndex(this.sessionStartXp), now = rankIndex(P.xp);
        var perfect = this.sessionGood === this.list.length;
        var title = "Partie terminée", burst = "GG !", bg = "var(--amber)", txt = "Chaque partie te rapproche du rang suivant. Retente ta chance ou monte d'un cran en difficulté pour grimper plus vite.";
        if (now > before) { title = "Promotion : " + RANKS[now].n + " !"; burst = "LEVEL UP !"; txt = "Nouveau rang débloqué. La difficulté au-dessus rapporte encore plus d'XP."; }
        else if (now < before) { title = "Retour au rang " + RANKS[now].n; burst = "OUCH !"; bg = "var(--pink)"; txt = "Ça arrive aux meilleurs. Redescends d'un niveau de difficulté le temps de reprendre confiance, puis remonte."; }
        if (hc && perfect) { title = "Légende absolue !"; burst = "PARFAIT !"; bg = "var(--pink)"; txt = "Un sans-faute en mode sans filet. Respect total : tu fais partie des légendes du QG."; }
        else if (hc && now >= before) txt = "Tu as survécu au mode Légende. Peu de héros peuvent en dire autant.";
        return '<main class="container page' + (hc ? " hardcore" : "") + '"><div class="end-card halftone' + (hc ? " hc-end" : "") + '"><span class="burst big" style="background:' + bg + '">' + burst + '</span><h1 class="h-l">' + esc(title) + '</h1><div class="stats">' +
          '<div class="stat"><small>Bonnes réponses</small><b>' + this.sessionGood + " / " + this.list.length + "</b></div>" +
          '<div class="stat"><small>XP de la partie</small><b style="color:' + (d > 0 ? "#6FD99A" : d < 0 ? "#FF8AA3" : "var(--text)") + '">' + signed(d) + " XP</b></div>" +
          '<div class="stat"><small>Rang actuel</small><b style="font-size:22px;color:var(--blue-3)">' + esc(RANKS[now].n) + "</b></div>" +
          '<div class="stat"><small>Meilleure série</small><b style="color:var(--amber)">' + P.bestStreak + "</b></div></div>" +
          "<p>" + txt + "</p>" + (window.heroById ? heroSayHtml(window.heroById("volt"), now < before ? window.heroById("volt").lose : window.heroById("volt").win) : "") + '<div class="btn-row" style="justify-content:center"><button type="button" class="btn ' + (hc ? "btn-ultimate" : "btn-primary") + '" data-action="start">Rejouer en ' + LEVELS[this.level].name + '</button><button type="button" class="btn btn-ghost" data-action="choose">Changer de difficulté</button><a class="btn btn-ghost" href="#/">Retour au QG</a></div></div></main>';
      }
    };
  }

  /* =========================================================
     VUE : MISSION BOSS — LE PHISHER
     ========================================================= */
  function MissionView() {
    return {
      nav: "mission",
      i: 0, correct: 0, lives: 3, done: false, run: newRun(MISSION[0], true),
      onAnswer: function (good) { if (good) this.correct++; else this.lives--; },
      actions: {
        next: function () {
          if (V.i >= MISSION.length - 1 || V.lives <= 0) {
            V.done = true; V._scroll = true;
            if (V.correct >= 4 && V.lives > 0) { if (!P.missionWon) { P.xp += V.correct * 50; V.firstWin = true; } P.missionWon = true; saveProfile(); }
            bossFx(V.correct >= 4 && V.lives > 0, "phisher", "le Phisher");
            return;
          }
          V.i++; V.run = newRun(MISSION[V.i], true); V._scroll = true; V._focusKey = "q";
        },
        restart: function () { V.firstWin = false; V.i = 0; V.correct = 0; V.lives = 3; V.done = false; V.run = newRun(MISSION[0], true); V._scroll = true; }
      },
      render: function () {
        if (rankIndex(P.xp) < 1) return '<main class="container page"><a class="back-link" href="#/mission">← Carte des boss</a><div class="boss-intro" style="--bc:#FF6B8A"><span class="boss-intro-art">' + window.bossArt("phisher") + '</span><h1 class="h-l">Le Phisher</h1><p class="lead">Les boss se débloquent au rang <b>Technicien</b> (500 XP). Gagne de l\'XP en mode classé, puis reviens l\'affronter.</p><a class="btn btn-primary" href="#/classe">' + I.bolt() + "Aller au mode classé</a></div></main>";
        var hp = Math.max(0, 100 - this.correct * 20), win = this.correct >= 4 && this.lives > 0;
        var lives = "";
        for (var k = 0; k < 3; k++) lives += I.shield(k < this.lives);
        var top = '<a class="back-link" href="#/mission">← Carte des boss</a><div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px"><span class="eyebrow">Monde 04 · Bouclier</span><div style="display:flex;align-items:center;gap:16px"><div class="lives" aria-label="' + this.lives + ' boucliers restants">' + lives + '</div><span class="tag tag-outline" style="color:var(--amber);border-color:var(--line-2)">+' + this.correct * 50 + " XP</span></div></div>" +
          '<div class="boss-row"><div class="boss-face halftone">' + I.boss + '</div><div style="flex-grow:1" class="stack"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1 class="h-s">Boss : le Phisher</h1><span class="muted" style="font-size:14px">' + (this.done ? "Mission terminée" : "Question " + (this.i + 1) + " / " + MISSION.length) + '</span></div><div class="bar boss" role="progressbar" aria-label="Vie du boss" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + hp + '"><div style="width:' + hp + '%"></div></div></div></div>';
        if (this.done) {
          return '<main class="container page">' + top + '<div class="end-card halftone"><span class="burst big" style="background:' + (win ? "var(--amber)" : "var(--pink)") + '">' + (win ? "VICTOIRE !" : "OUCH !") + '</span><h1 class="h-l">' + (win ? "Boss vaincu !" : (this.lives <= 0 ? "Plus de boucliers…" : "Le Phisher s'échappe !")) + "</h1><p>" +
            (win ? "Le Phisher bat en retraite. Tu sais repérer un faux expéditeur, un lien piégé et une MFA suspecte : le QG est mieux protégé grâce à toi." : "Pas grave, c'est comme ça qu'on apprend. Relis les explications et retente la mission : chaque tentative te rapproche du badge Bouclier.") +
            '</p><div class="stats"><div class="stat"><small>Bonnes réponses</small><b>' + this.correct + " / " + MISSION.length + '</b></div><div class="stat"><small>' + (this.firstWin ? "XP ajoutés à ton profil" : "XP de mission") + '</small><b style="color:var(--amber)">+' + this.correct * 50 + "</b></div>" + (win ? '<div class="stat" style="border-color:var(--blue)"><small>Badge débloqué</small><b style="font-size:22px;color:var(--blue-3)">Bouclier niv. 1</b></div>' : "") + "</div>" +
            (window.heroById ? heroSayHtml(window.heroById("sentinelle"), win ? window.heroById("sentinelle").win : window.heroById("sentinelle").lose) : "") + '<p class="muted" style="font-size:14px">Réflexe à retenir : un doute sur un mail ? Bouton « Signaler » d\'Outlook et on prévient le support. Victime d\'une arnaque en ligne ? 17Cyber, le service d\'assistance de cybermalveillance.gouv.fr.</p>' +
            '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="restart">Rejouer la mission</button><a class="btn btn-ghost" href="#/entrainement?theme=phishing">M\'entraîner sur le phishing</a><a class="btn btn-ghost" href="#/">Retour au QG</a></div></div></main>';
        }
        var r = this.run, v = r.validated, side;
        if (!v) side = (window.heroById ? heroSayHtml(window.heroById("sentinelle"), "Le Phisher attaque ! Lis bien chaque détail avant de répondre.", "big") : "") + '<div class="side-card halftone"><h3 class="h-s">Mission scénarisée</h3><p class="muted" style="margin:0">Bonne réponse : le Phisher perd de la vie. Erreur : tu perds un bouclier. Il en faut au moins 4 sur 5 pour le vaincre. Ta première victoire ajoute l\'XP gagnée à ton profil.</p></div>';
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "AÏE !") + "</span><b>" + (r.good ? "Le Phisher encaisse le coup ! +50 XP" : "Raté, tu perds un bouclier.") + "</b></div>" + heroExplain("phishing", r.q.e, r.q.maj, r) + '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= MISSION.length - 1 || this.lives <= 0 ? "Voir le résultat" : "Question suivante") + "</button></div>";
        return '<main class="container page">' + top + '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      }
    };
  }


  /* =========================================================
     VUE : VEILLE TECHNOLOGIQUE
     Les actus viennent de js/veille-data.js, généré par
     veille/mettre-a-jour-veille.ps1
     ========================================================= */
  var VEILLE_CATS = {
    /* couleurs reprises des piliers et de leurs héros (cyber = rouge-rose en 3 nuances) */
    alerte:   { label: "Alertes de sécurité", color: "#FF4D5E" },
    cyber:    { label: "Veille cyber", color: "#FF6B8A" },
    arnaques: { label: "Arnaques & prévention", color: "#FF9DB3" },
    it:       { label: "Veille informatique", color: "#B6F35A" },
    m365:     { label: "Microsoft 365", color: "#6E88FF" },
    ia:       { label: "Intelligence artificielle", color: "#3FE0C5" },
    lois:     { label: "Lois & réglementation", color: "#C9D3E3" },
    dev:      { label: "Développement", color: "#B98CFF" },
    vert:     { label: "Numérique responsable", color: "#7CC596" }
  };
  var VEILLE_READ_KEY = "powerup365.veille.read";
  var veilleRead = (function () { try { return JSON.parse(window.localStorage.getItem(VEILLE_READ_KEY) || "{}") || {}; } catch (e) { return {}; } })();
  function saveRead() { try { window.localStorage.setItem(VEILLE_READ_KEY, JSON.stringify(veilleRead)); } catch (e) { } }
  var VEILLE_PROG_KEY = "powerup365.veille.progress";
  var veilleProg = (function () { try { return JSON.parse(window.localStorage.getItem(VEILLE_PROG_KEY) || "{}") || {}; } catch (e) { return {}; } })();
  function saveProg() { try { window.localStorage.setItem(VEILLE_PROG_KEY, JSON.stringify(veilleProg)); } catch (e) { } }
  var VEILLE_FAV_KEY = "powerup365.veille.fav";
  var veilleFav = (function () { try { return JSON.parse(window.localStorage.getItem(VEILLE_FAV_KEY) || "{}") || {}; } catch (e) { return {}; } })();
  function saveFav() { try { window.localStorage.setItem(VEILLE_FAV_KEY, JSON.stringify(veilleFav)); } catch (e) { } }
  function isFav(url) { return !!(url && veilleFav[url]); }
  function favList() { return Object.keys(veilleFav).map(function (k) { return veilleFav[k]; }).filter(function (f) { return f && f.url; }).sort(function (a, b) { return (b.saved || 0) - (a.saved || 0); }); }
  /* le favori garde une copie de l'actu (titre, source, date, résumé) : elle reste lisible même quand elle quitte le flux quotidien */
  function toggleFav(url) {
    if (!url) return false;
    if (veilleFav[url]) { delete veilleFav[url]; saveFav(); return false; }
    var it = veilleData().items.filter(function (x) { return x.url === url; })[0]; if (!it) return false;
    veilleFav[url] = { url: it.url, title: it.title, source: it.source, date: it.date, category: it.category, summary: it.summary, lang: it.lang, saved: Date.now() };
    saveFav(); return true;
  }
  function isUnread(it) { return !veilleRead[it.url] && !veilleProg[it.url]; }
  function isInProgress(it) { return !veilleRead[it.url] && !!veilleProg[it.url]; }
  function markRead(url) { if (!url) return false; var ch = !veilleRead[url] || veilleProg[url]; veilleRead[url] = 1; if (veilleProg[url]) { delete veilleProg[url]; saveProg(); } saveRead(); return !!ch; }
  function markProgress(url) { if (!url || veilleRead[url]) return false; veilleProg[url] = 1; saveProg(); return true; }
  function askFinished(url, title) {
    var d = document.createElement("dialog"); d.className = "fb-modal read-modal"; d.setAttribute("aria-labelledby", "rm-title");
    d.innerHTML = '<div class="fb-inner"><span class="eyebrow" style="color:var(--gold)">Veille · ta lecture</span><h2 class="h-m" id="rm-title">Tu as fini de lire ?</h2><p class="muted" style="margin:0">« ' + esc(title || "cet article") + ' »</p>' +
      '<div class="rm-actions"><button type="button" class="btn btn-primary" data-rm="done">✓ Oui, c\'est lu</button><button type="button" class="btn btn-ghost" data-rm="later"><span class="prog-ico" aria-hidden="true"></span>Pas encore, je le garde en cours</button></div><small class="muted">Un article « En cours » reste marqué pour que tu puisses y revenir plus tard.</small></div>';
    document.body.appendChild(d);
    var chosen = false;
    function pick(done) { chosen = true; if (done) { markRead(url); sfx("read"); } else markProgress(url); d.close(); }
    d.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-rm]"); if (b) pick(b.getAttribute("data-rm") === "done"); else if (e.target === d) d.close(); });
    d.addEventListener("close", function () { if (!chosen) markProgress(url); d.remove(); sfx("toggle"); render(); });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  /* Pastille rouge : une vraie alerte du CERT-FR (flux « Alertes », pas les « Avis » quotidiens) non lue publiée il y a moins de 3 jours (exception ponctuelle : les avis du 23 octobre 2026, nouveaux à la mise en ligne). Sinon la pastille reste dorée tant qu'il reste du non lu. */
  function veilleUrgent() { var now = Date.now(); return veilleData().items.some(function (it) { var t = Date.parse(it.date || ""); if (it.category !== "alerte" || !isUnread(it) || isNaN(t)) return false; return (/Alertes/.test(it.source || "") && now - t < 3 * 864e5) || (t >= Date.UTC(2026, 9, 23) && t < Date.UTC(2026, 9, 24)); }); }
  function unreadCount(cat) { return veilleData().items.filter(function (it) { return isUnread(it) && (!cat || cat === "all" || it.category === cat); }).length; }
  function veilleData() { var d = window.VEILLE || { updated: null, items: [] }; return { updated: d.updated, items: (d.items || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }) }; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }
  function frDate(iso, withTime) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    var o = { day: "numeric", month: "long", year: "numeric" };
    if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return d.toLocaleDateString("fr-FR", o);
  }
  function favKey(url) { var h = 0, t = String(url || ""); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  /* « À la une » : l'actu la plus urgente = alerte de sécurité non lue la plus récente, sinon la plus récente non lue, sinon la plus récente */
  var FEAT_ICON = { alerte: "🚨", cyber: "🔐", arnaques: "🎣", it: "🖥️", m365: "📧", ia: "🤖", lois: "⚖️", dev: "💻", vert: "🌱" };
  function pickFeat(list) {
    var f = list.filter(function (it) { return it.category === "alerte" && isUnread(it); })[0] || list.filter(isUnread)[0] || list[0];
    return f || null;
  }
  function veilleFeat(it) {
    var c = VEILLE_CATS[it.category] || { label: it.category || "Actu", color: "#8EA2FF" }, u = esc(safeUrl(it.url)), un = isUnread(it);
    return '<article class="news-feat' + (it.category === "alerte" ? " is-alert" : "") + '" style="--c:' + c.color + '"><div class="nf-body"><div class="nf-meta"><span class="nf-pill">' + (it.category === "alerte" ? "🚨 À la une · " : "À la une · ") + esc(c.label) + '</span>' + (un ? '<span class="dot-live" aria-hidden="true"></span><span class="sr-only">Non lu</span>' : "") + '<span class="muted">' + esc(it.source || "") + (it.date ? " · " + esc(frDate(it.date)) : "") + '</span></div>' +
      '<h2 class="nf-title"><a href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">' + esc(it.title) + '</a></h2>' + (it.summary ? '<p class="nf-sum">' + esc(it.summary) + '</p>' : "") +
      '<a class="btn btn-primary" href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">Lire l\'actu ↗<span class="sr-only"> : ' + esc(it.title) + ' (nouvel onglet)</span></a></div><div class="nf-vis" aria-hidden="true">' + (FEAT_ICON[it.category] || "📰") + '</div></article>';
  }
  function veilleCard(it) {
    var c = VEILLE_CATS[it.category] || { label: it.category || "Actu", color: "#8EA2FF" };
    var unread = isUnread(it), prog = isInProgress(it), fav = isFav(it.url), u = esc(safeUrl(it.url));
    return '<article class="news' + (it.category === "alerte" ? " news-alert" : "") + (unread ? " unread" : (prog ? " in-progress" : " read")) + '" style="--c:' + c.color + '">' +
      '<div class="news-meta"><span class="level-tag">' + esc(c.label) + "</span>" + (unread ? '<span class="dot-live news-newdot" title="Non lu" aria-hidden="true"></span><span class="sr-only">Non lu</span>' : (prog ? '<span class="badge-prog"><span class="prog-ico" aria-hidden="true"></span>En cours</span>' : '<span class="badge-read">Lu</span>')) + (it.lang === "en" ? '<span class="badge-lang" title="Article en anglais">EN</span>' : "") + '<span class="muted">' + esc(it.source) + " · " + esc(frDate(it.date)) + "</span>" +
      '<button type="button" class="news-fav' + (fav ? " on" : "") + '" data-action="fav" data-id="' + esc(it.url) + '" data-key="fav-' + favKey(it.url) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Retirer des favoris" : "Ajouter aux favoris") + ' : ' + esc(it.title) + '"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" stroke-linejoin="round"/></svg></button></div>' +
      '<h3 class="news-title"><a href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">' + esc(it.title) + "</a></h3>" +
      (it.summary ? "<p>" + esc(it.summary) + "</p>" : "") +
      '<a class="news-link" href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">Lire la source<span class="sr-only"> : ' + esc(it.title) + " (nouvel onglet)</span> ↗</a>" + (prog ? '<button type="button" class="btn btn-ghost btn-small news-finish" data-finish-url="' + esc(it.url) + '">✓ J\'ai fini</button>' : "") + "</article>";
  }

  function VeilleView(params) {
    return {
      nav: "veille",
      cat: params.cat || "all",
      actions: {
        cat: function (d) { V.cat = d.id; V.showAll = false; V._scrollNews = true; },
        more: function () { V.showAll = !V.showAll; V._focusKey = "news-more"; },
        fav: function (d) { var on = toggleFav(d.id); sfx("toggle"); V._focusKey = d.key; if (!on && V.cat === "fav") { V._focusKey = null; } },
        readAll: function () { veilleData().items.forEach(function (it) { if (V.cat === "all" || it.category === V.cat) { veilleRead[it.url] = 1; delete veilleProg[it.url]; } }); saveRead(); saveProg(); }
      },
      render: function () {
        var data = veilleData(), self = this;
        var counts = { all: data.items.length };
        data.items.forEach(function (it) { counts[it.category] = (counts[it.category] || 0) + 1; });
        var favs = favList(); counts.fav = favs.length;
        var chips = [{ id: "all", label: "Toutes", color: "#8EA2FF" }, { id: "fav", label: "Mes favoris", color: "#F5C542" }].concat(Object.keys(VEILLE_CATS).filter(function (k) { return counts[k]; }).map(function (k) { return { id: k, label: VEILLE_CATS[k].label, color: VEILLE_CATS[k].color }; })).map(function (c) {
          var sel = c.id === self.cat;
          var nu = unreadCount(c.id);
          return '<button type="button" class="choice chip-news' + (sel ? " selected" : "") + (nu ? " has-new" : "") + '" style="--c:' + c.color + '" data-action="cat" data-id="' + c.id + '" data-key="vc-' + c.id + '" aria-pressed="' + sel + '">' + (nu ? '<span class="dot-live chip-dot" aria-hidden="true"></span>' : "") + '<span class="name">' + esc(c.label) + "</span></button>";
        }).join("");
        var list = self.cat === "fav" ? favs : data.items.filter(function (it) { return self.cat === "all" || it.category === self.cat; });
        var feat = self.cat === "fav" ? null : pickFeat(list), rest = feat ? list.filter(function (it) { return it !== feat; }) : list;
        var LIMIT = 6, shown = this.showAll ? rest : rest.slice(0, LIMIT);
        var cards = shown.map(function (it) { return veilleCard(it); }).join("");
        var moreBtn = rest.length > LIMIT ? '<div class="news-more"><button type="button" class="btn btn-ghost" data-action="more" data-key="news-more" aria-expanded="' + !!this.showAll + '">' + (this.showAll ? "Réduire la liste ↑" : "Voir toutes les actus ↓") + "</button></div>" : "";
        var nuCat = unreadCount(this.cat), catNow = this.cat, npCat = veilleData().items.filter(function (it) { return isInProgress(it) && (catNow === "all" || it.category === catNow); }).length;
        var isFavView = catNow === "fav";
        var toolbar = isFavView ? '<div class="news-toolbar"><span class="muted"><b class="tb-cat" style="color:#F5C542">Mes favoris</b> · ' + favs.length + " favori" + (favs.length > 1 ? "s" : "") + '</span><span class="muted" style="font-size:13px">Ils restent ici même quand l\'actu quitte la veille.</span></div>' : '<div class="news-toolbar"><span class="muted">' + (catNow !== "all" && VEILLE_CATS[catNow] ? '<b class="tb-cat" style="color:' + VEILLE_CATS[catNow].color + '">' + esc(VEILLE_CATS[catNow].label) + "</b> · " : "") + (nuCat ? '<span class="dot-live" aria-hidden="true"></span> Les dernières actus' : "Tout est lu, bravo !") + (npCat ? ' · <span class="prog-ico" aria-hidden="true"></span> ' + npCat + " en cours" : "") + "</span>" + (nuCat ? '<button type="button" class="btn btn-ghost btn-small" data-action="readAll">Tout marquer comme lu</button>' : "") + "</div>";
        var help = '<details class="upd-help"><summary class="btn btn-ghost btn-small"><span aria-hidden="true">↻</span> Mettre à jour</summary><div class="upd-pop stack" style="gap:10px">' +
          "<p>Dans le dossier du site, ouvre le dossier <code>veille</code> et double-clique sur <code>mettre-a-jour-veille.bat</code>. Le script récupère les dernières actualités des sources officielles, puis il suffit de rafraîchir cette page (F5).</p>" +
          "<p>Pour une mise à jour automatique chaque matin, lance une fois <code>activer-mise-a-jour-quotidienne.bat</code>.</p>" +
          '<p class="muted">Sources : CERT-FR, Cybermalveillance.gouv.fr, Microsoft Security Blog, Blog Microsoft 365. Les résumés viennent des sources elles-mêmes ; lis toujours l\'article original avant d\'agir.</p></div></details>';
        return '<main class="container page">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px;align-items:end;margin-bottom:28px"><div class="stack" style="gap:10px"><div class="veille-eyerow"><span class="eyebrow" style="color:#FF8AA3">Veille technologique</span><span class="upd-mini">' + (data.updated ? esc(frDate(data.updated, true).replace(" " + new Date().getFullYear(), "").replace(" à ", " · ")) : "jamais") + '</span></div><h1 class="h-l">Ce qui bouge dans nos métiers</h1><p class="lead">Cyber, informatique, Microsoft 365, IA, lois et numérique responsable : les actus du moment, depuis des sources fiables.</p></div>' +
          '<div class="veille-upd"><span class="upd-when"><span class="muted">Mise à jour :</span> <b>' + (data.updated ? esc(frDate(data.updated, true)) : "jamais") + '</b></span>' + "" + "</div></div>" +
          '<div class="choices veille-chips" style="margin-bottom:28px">' + chips + "</div>" +
          (feat ? veilleFeat(feat) : "") + (cards ? toolbar + '<div class="news-grid">' + cards + "</div>" + moreBtn : (isFavView ? '<div class="panel"><p style="margin:0">Aucun favori pour l\'instant. Touche l\'étoile d\'une actu pour la retrouver ici.</p></div>' : '<div class="panel"><p style="margin:0">Aucune actualité pour le moment. Utilise le bouton « Mettre à jour » en haut.</p></div>')) +
          "</main>";
      }
    };
  }


  /* =========================================================
     VUE : PROFIL (pseudo + avatar)
     ========================================================= */
  function cleanPseudo(v) {
    var t = String(v || "");
    try { t = t.replace(/[^\p{L}\p{N} _.\-']/gu, ""); } catch (e) { t = t.replace(/[<>"&]/g, ""); }
    return t.replace(/\s+/g, " ").trim().slice(0, 20);
  }
  function ProfileView() {
    return {
      nav: "profil",
      avatar: validAvatarId(P.avatar), draft: P.pseudo, saved: false, tab: "hero",
      profHead: function () { if (V.tab !== "hero") return '<div class="stack" style="gap:10px;margin-bottom:22px"><span class="eyebrow">Mon profil</span><h1 class="h-l">' + (V.tab === "stats" ? "Ta progression" : V.tab === "portail" ? "Le portail" : "Ton calendrier") + "</h1>" + (V.tab === "stats" ? '<p class="lead">Ta fiche de héros et tes récompenses. Pour savoir quoi retravailler, va dans l\'onglet <a href="#/stats">Révisions</a>.</p>' : "") + "</div>"; return '<div class="stack" style="gap:10px;margin-bottom:22px"><span class="eyebrow">Mon profil</span><h1 class="h-l">Crée ton héros</h1><p class="lead">Choisis un pseudo et un avatar parmi les gardiens du QG : ils te représentent partout sur le site.</p></div>'; },
      tabsHtml: function () {
        var IC = function (d) { return '<svg class="ic ptab-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
        var T = [["hero", "Mon héros", IC('<path d="M12 3.2l6.5 2.4v5.2c0 4.1-2.7 7-6.5 8.6-3.8-1.6-6.5-4.5-6.5-8.6V5.6z"/><circle cx="12" cy="10.2" r="2.1"/><path d="M8.6 15.2c.9-1.4 2-2.1 3.4-2.1s2.5.7 3.4 2.1"/>')], ["stats", "Stats & récompenses", IC('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3 3 0 0 0 7 10.5M17 6h3v1.5a3 3 0 0 1-3 3M12 14v3.5M8.5 20h7M10 17.5h4"/>')], ["cal", "Jours spéciaux & secrets", IC('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="M12 12.6l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>')], ["portail", "Portail", IC('<ellipse cx="12" cy="12" rx="5.2" ry="8.2"/><ellipse cx="12" cy="12" rx="2.1" ry="4.2"/><path d="M3 12h2.6M18.4 12H21"/>')]];
        return '<div class="ptabs" role="tablist" aria-label="Sections du profil">' + T.map(function (t) { var on = V.tab === t[0]; return '<button type="button" role="tab" class="ptab' + (on ? " on" : "") + '" aria-selected="' + on + '" data-action="ptab" data-id="' + t[0] + '" data-key="ptab-' + t[0] + '"><span aria-hidden="true">' + t[2] + "</span> " + t[1] + (t[0] === "hero" && NEWS.length ? '<i class="new-dot chip-dot inline" aria-hidden="true"></i><span class="sr-only"> nouveau</span>' : "") + (t[0] === "portail" && portalNeeds() ? '<i class="new-dot chip-dot inline" aria-hidden="true"></i><span class="sr-only"> à sauvegarder</span>' : "") + "</button>"; }).join("") + "</div>";
      },
      keepDraft: function () { var el = document.getElementById("pseudo"); if (el) V.draft = el.value; },
      actions: {
        ptab: function (d) { V.keepDraft(); V.tab = d.id; V._focusKey = "ptab-" + d.id; },
        avatar: function (d) { V.keepDraft(); if (!avatarUnlocked(avatarInfo(d.id))) return; V.avatar = d.id; V.saved = false; },
        save: function () {
          V.keepDraft();
          var ps = cleanPseudo(V.draft);
          P.pseudo = ps; P.avatar = V.avatar; saveProfile();
          V.draft = ps; V.saved = true; V._focusKey = "save";
          Object.keys(openPG).forEach(function (k) { if (/^step\d+$/.test(k) || k === "fav-more" || k === "bg-more" || k === "badges-locked") openPG[k] = false; });  /* referme les menus déroulants */
        },
        visall: function (d) { V.keepDraft(); ensureStats(); V.statList().map(function (t) { return t.id; }).forEach(function (id) { P.pub[id] = d.id === "all" ? true : d.id === "none" ? false : !!PUBLIC_DEFAULT[id]; }); saveProfile(); V._focusKey = "visall-" + d.id; },
        vis: function (d) { V.keepDraft(); ensureStats(); P.pub[d.id] = !P.pub[d.id]; saveProfile(); V._focusKey = "vis-" + d.id; },
        frame: function (d) { V.keepDraft(); var f = frameList().filter(function (x) { return x.id === d.id && x.open; })[0]; if (!f) return; P.frame = d.id === "f" + rankIndex(P.xp) ? null : d.id; saveProfile(); sfx("toggle"); V._focusKey = "frame-" + d.id; },
        bgFav: function (d) { V.keepDraft(); var f = P.bgFav = P.bgFav || [], i = f.indexOf(d.id); if (i === -1) f.push(d.id); else f.splice(i, 1); saveProfile(); V._focusKey = "bgf-" + d.id; },
        bg: function (d) { V.keepDraft(); var g = bgList().filter(function (x) { return x.id === d.id && x.open; })[0]; if (!g) return; P.bg = d.id; saveProfile(); V._focusKey = "bg-" + d.id; },
        fav: function (d) { V.keepDraft(); P.favBadges = (P.favBadges || []).filter(function (n) { return earnedBadges().indexOf(n) !== -1; }); var i = P.favBadges.indexOf(d.id); if (i !== -1) P.favBadges.splice(i, 1); else { if (P.favBadges.length >= 3) { var row = document.querySelector("[data-feat-row]"); if (row) { row.classList.remove("full"); void row.offsetWidth; row.classList.add("full"); } sfx("bad"); toastMsg("3 emplacements maximum : clique un badge déjà affiché pour le retirer d'abord."); return false; } P.favBadges.push(d.id); } saveProfile(); sfx("toggle"); V._focusKey = "fav-" + d.id; },
        featMove: function (d) { V.keepDraft(); var f = P.favBadges || [], a = +d.id, b = a + (+d.dir); if (b < 0 || b >= f.length) return; var t = f[a]; f[a] = f[b]; f[b] = t; saveProfile(); sfx("toggle"); V._focusKey = "fm-" + b + (+d.dir < 0 ? "-l" : "-r"); },
        badgesLocked: function () { V.keepDraft(); openPG["badges-locked"] = !openPG["badges-locked"]; openPG["fav-more"] = true; V._focusKey = "bl-toggle"; },
        cape: function (d) { V.keepDraft(); var c = capeList().filter(function (x) { return x.id === d.id && x.open; })[0]; if (!c) return; P.cape = d.id === "g" + rankIndex(P.xp) ? null : d.id; saveProfile(); sfx("cape"); V._focusKey = "cape-" + d.id; },
        reset: function () {
          V.keepDraft();
          var w = document.getElementById("reset-word");
          if (!w || !/^(effacer|erase)$/i.test(String(w.value).trim())) return;
          var keep = { pseudo: P.pseudo, avatar: P.avatar, pub: P.pub }; P = defaultProfile(); P.pseudo = keep.pseudo; P.avatar = keep.avatar; P.pub = keep.pub; ensureStats(); saveProfile(); V.confirmReset = false; V.dangerOpen = false; setTimeout(wipeDone, 60);
        }
      },
      render: function () {
        var self = this, r = rankInfo(P.xp);
        if (V.tab !== "hero") return '<main class="container page">' + V.profHead() + V.tabsHtml() + (V.tab === "stats" ? this.renderStats() + renderVitrine() : V.tab === "portail" ? xfrCardHtml() : renderCalendar() + renderSecrets()) + "</main>";
        var grid = (window.AVATARS || []).map(function (a) {
          var sel = a.id === self.avatar, open = avatarUnlocked(a);
          if (!open) return '<button type="button" class="avatar-pick locked" disabled aria-disabled="true" title="' + esc(a.name + " : " + (a.gate ? a.gateTxt : "débloqué au rang Super directeur technique")) + '">' + a.svg(76) + '<span>' + esc(a.name) + '</span><em class="lock-badge">' + (a.gate ? "Détente" : "Rang max") + '</em><b class="unlock-ribbon"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg>' + esc(a.gate ? a.gateTxt : "Atteins le rang Super directeur technique") + '</b></button>';
          return '<button type="button" class="avatar-pick' + (sel ? " selected" : "") + (a.locked ? " unlocked" : "") + '" data-action="avatar" data-id="' + a.id + '" data-key="av-' + a.id + '" aria-pressed="' + sel + '" title="' + esc(a.name + (a.locked ? " · Débloqué : " + (a.gate ? "score au tri du courrier" : "rang Super directeur technique") : "")) + '">' + a.svg(76) + '<span>' + esc(a.name) + "</span></button>";
        }).join("");
        var preview = capeWrap(window.avatarSvg ? window.avatarSvg(this.avatar, 140) : "", 140);
        var heat = capeHeat(), cur = currentCape();
        var capes = capeList().map(function (c) {
          var sel = c.id === cur.id;
          return '<button type="button" class="cape-pick' + (c.open ? "" : " locked") + (sel ? " selected" : "") + '"' + newAttr("cape:" + c.id) + (c.open ? ' data-action="cape" data-id="' + c.id + '"' : ' disabled aria-disabled="true"') + ' data-key="cape-' + c.id + '" aria-pressed="' + sel + '" title="' + esc(c.open ? c.name + " · Débloqué : " + c.how : c.how) + '" style="--cape:' + c.color + '">' + capeSvg(c, 0) + "<span>" + esc(c.name) + "</span>" + (c.open ? "" : "<small>" + esc(c.how) + "</small>") + newDot("cape:" + c.id) + "</button>";
        }).join("");
        var curF = currentFrame(), framesHtml = frameList().map(function (f) {
          var sel = f.id === curF.id;
          return '<button type="button" class="frame-pick' + (f.open ? "" : " locked") + (sel ? " selected" : "") + '"' + newAttr("frame:" + f.id) + (f.open ? ' data-action="frame" data-id="' + f.id + '"' : ' disabled aria-disabled="true"') + ' data-key="frame-' + f.id + '" aria-pressed="' + sel + '" title="' + esc(f.open ? f.name + " · Débloqué : " + f.how : f.name + " · À débloquer : " + f.how) + '" style="--fc:' + f.color + '">' + capeWrap(window.avatarSvg ? window.avatarSvg(self.avatar, 56) : "", 56, null, f.id) + "<span>" + esc(f.name) + "</span>" + (f.open ? "" : "<small>" + esc(f.how) + "</small>") + newDot("frame:" + f.id) + "</button>";
        }).join("");
        var earned = earnedBadges(), favs = (P.favBadges || []).filter(function (n) { return earned.indexOf(n) !== -1; }), allB = [], byName = {};
        computeBadges().forEach(function (fm) { fm.items.forEach(function (b) { var x = { b: b, col: b.c || fm.color }; byName[b.n] = x; allB.push(x); }); });
        var bTip = function (x) { return '<span class="ftip" aria-hidden="true"><b>' + esc(x.b.n) + "</b><small>" + esc(x.b.d) + "</small>" + (x.b.on && P.badgeDates && P.badgeDates[x.b.n] ? "<em>Obtenu le " + esc(frDate(P.badgeDates[x.b.n])) + "</em>" : (x.b.on ? "" : "<em>Pas encore obtenu</em>")) + "</span>"; };
        var bCol = function (x) { return x.b.t ? BTIER[x.b.t] : x.col; };
        /* ligne des badges affichés : glisser-déposer (ou flèches) pour choisir l'ordre */
        var slots = ""; for (var fk = 0; fk < 3; fk++) { var fx2 = byName[favs[fk]];
          slots += fx2 ? '<div class="feat-slot on" draggable="true" data-feat="' + fk + '" tabindex="0" style="--c:' + bCol(fx2) + '" aria-label="' + esc(fx2.b.n) + ', position ' + (fk + 1) + '">' + medalSvg(fx2.col, fx2.b.i, fx2.b.s, fx2.b.t, 48) + "<span>" + esc(fx2.b.n) + "</span>" + bTip(fx2) +
            '<span class="feat-move">' + (fk > 0 ? '<button type="button" data-action="featMove" data-id="' + fk + '" data-dir="-1" data-key="fm-' + fk + '-l" aria-label="Déplacer à gauche">‹</button>' : "") + (fk < favs.length - 1 ? '<button type="button" data-action="featMove" data-id="' + fk + '" data-dir="1" data-key="fm-' + fk + '-r" aria-label="Déplacer à droite">›</button>' : "") + "</span></div>"
            : '<div class="feat-slot empty" data-feat="' + fk + '"><span class="feat-plus">+</span><span>Emplacement libre</span></div>'; }
        var showLocked = !!openPG["badges-locked"];
        var favPick = function (x) { var pos = favs.indexOf(x.b.n), on = pos !== -1, got = x.b.on;
          if (!got) return '<div class="fav-pick not-yet" tabindex="0" style="--c:' + bCol(x) + '">' + medalSvg(x.col, x.b.i, x.b.s, x.b.t, 44) + "<span>" + esc(x.b.n) + "</span>" + bTip(x) + "</div>";
          return '<button type="button" class="fav-pick' + (on ? " selected" : "") + '"' + newAttr("badge:" + x.b.n) + ' data-action="fav" data-id="' + esc(x.b.n) + '" data-key="fav-' + esc(x.b.n) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Retirer de ma carte : " : "Afficher sur ma carte : ") + esc(x.b.n) + '" style="--c:' + bCol(x) + '">' + medalSvg(x.col, x.b.i, x.b.s, x.b.t, 44) + "<span>" + esc(x.b.n) + "</span>" + (on ? '<em class="fav-pos">' + (pos + 1) + "</em>" : "") + newDot("badge:" + x.b.n) + bTip(x) + "</button>"; };
        var list = allB.filter(function (x) { return x.b.on || showLocked; });
        list.sort(function (a, b) { var na = isNew("badge:" + a.b.n), nb = isNew("badge:" + b.b.n); return na === nb ? 0 : (na ? -1 : 1); });  /* les nouveaux badges d'abord */
        var earnedHtml = '<div class="feat-row" data-feat-row role="list" aria-label="Badges affichés sur ta carte">' + slots + '</div>' +
          '<details class="vit-more fav-more" data-pg="fav-more"' + (openPG["fav-more"] ? " open" : "") + '><summary>Voir tous tes badges obtenus (' + earned.length + ')' + (newCount("badge") ? ' <i class="new-dot inline" data-fold-new="badge" aria-hidden="true"></i>' : "") + ' <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary>' +
          '<label class="locked-toggle"><input type="checkbox" data-action="badgesLocked" data-key="bl-toggle"' + (showLocked ? " checked" : "") + '> Afficher aussi les badges pas encore obtenus</label><div class="fav-grid">' + list.map(favPick).join("") + "</div></details>";
        function step(n, title, current, body, kind, thumb) { return '<details class="custom-step" data-pg="step' + n + '"' + (openPG["step" + n] ? " open" : "") + '><summary><span class="step-th" aria-hidden="true">' + (thumb || "") + '</span><span class="eyebrow"><span class="sn" hidden>' + n + " · </span>" + title + '</span><span class="step-cur">' + esc(current) + '</span>' + (kind ? stepNewBadge(kind) : "") + '<span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="step-body"><div class="sheet-head"><b>' + title + '</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div>' + body + '<button type="button" class="btn btn-primary sheet-ok" data-sheet-close>Valider</button></div></details>'; }
        var heatBar = ""; for (var hk = 1; hk <= 5; hk++) heatBar += '<i class="' + (hk <= heat ? "on" : "") + '"></i>';
        return '<main class="container page">' + V.profHead() + V.tabsHtml() + instCardHtml() +
          '<div class="profile-layout">' +
          '<aside class="panel profile-card ' + bgClass(currentBg()) + '">' + bgLayers(currentBg(), true) + '<div class="profile-face">' + preview + '</div><h2 class="h-s">' + esc(cleanPseudo(this.draft) || "Héros sans nom") + '</h2><button type="button" class="rank-link small" data-rank-ladder aria-label="Voir tous les paliers">' + rankBadge(rankIndex(P.xp), 22) + esc(r.name) + " · " + P.xp + ' XP<svg class="rank-link-caret" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="bar" style="width:100%"><div style="width:' + r.pct + '%"></div></div><small class="muted">' + esc(r.label) + '</small>' +
          '<div class="stats" style="margin-top:8px"><div class="stat"><small>Meilleure série</small><b style="color:var(--amber)">' + P.bestStreak + '</b></div><div class="stat cape-stat"><small>Chaleur de la cape</small><b class="heat-' + heat + '">' + HEAT_LABELS[heat] + '</b><span class="heat-bar" aria-hidden="true">' + heatBar + "</span></div></div>" +
          '<p class="cape-note">' + (heat >= 5 ? "🔥 Cape flamboyante : +10 % d'XP sur tes bonnes réponses en mode classé. Reviens demain pour la garder !" : "Reviens jouer " + (5 - heat) + " jour" + (5 - heat > 1 ? "s" : "") + " de suite de plus pour une cape flamboyante (+10 % d'XP en classé).") + "</p></aside>" +
          '<form class="panel profile-form" data-form="profile" novalidate>' +
          '<label for="pseudo" class="eyebrow">Ton pseudo</label>' +
          '<input id="pseudo" name="pseudo" type="text" maxlength="20" autocomplete="nickname" placeholder="Ex. CyberNova" value="' + esc(this.draft) + '">' +
          '<small class="muted pseudo-help">20 caractères maximum. Un pseudo plutôt que ton nom complet : c\'est aussi une bonne pratique de sécurité !</small>' +
          '<div class="steps-grid">' + step(2, "Ton avatar", (avatarInfo(this.avatar) || {}).name || "", '<div class="avatar-grid" role="group" aria-label="Choix de l\'avatar">' + grid + "</div>", null, window.avatarSvg ? window.avatarSvg(this.avatar, 64) : "") +
          step(3, "Ta cape", cur.name + " · " + HEAT_LABELS[heat], '<p class="muted step-help">Le vestiaire : une cape par grade atteint et par boss vaincu. Ton choix est enregistré tout de suite.</p><div class="cape-grid" role="group" aria-label="Vestiaire des capes">' + capes + "</div>" +
            (heat >= 5 ? '<div class="fire-row"><span><b>🔥 Cape en feu</b><small>Ta cape flamboyante s\'embrase, animée, partout sur le site.</small></span><button type="button" class="snd-switch' + (capeFireOn() ? " on" : "") + '" data-fire-toggle role="switch" aria-checked="' + capeFireOn() + '"><span class="knob"></span><span class="sr-only">Activer la cape en feu</span></button></div>'
              : '<div class="fire-row locked"><span><b>🔒 Cape en feu</b><small>Se débloque avec une cape flamboyante : joue 5 jours de suite.</small></span></div>'), "cape", '<span class="cape-th" style="--cape:' + cur.color + '">' + capeSvg(cur, 0) + "</span>") +
          step(4, "Ton cadre", curF.name, '<p class="muted step-help">Plus ton grade est haut, plus ton cadre est travaillé. Choisis parmi ceux que tu as débloqués.</p><div class="frame-grid" role="group" aria-label="Choix du cadre">' + framesHtml + "</div>", "frame", capeWrap(window.avatarSvg ? window.avatarSvg(this.avatar, 56) : "", 56, null, curF.id)) +
          step(5, "Tes badges", favs.length ? favs.length + " affiché" + (favs.length > 1 ? "s" : "") + (P.pub.badges ? " sur ta carte" : " (masqués)") : "aucun affiché", '<p class="muted step-help">Clique un badge pour l\'ajouter à ta carte de héros (3 emplacements), clique-le à nouveau pour le retirer. Glisse les badges affichés pour changer leur ordre.</p>' + (earned.length ? earnedHtml : '<p class="muted" style="margin:0">Tu n\'as pas encore de badge : joue pour en gagner !</p>'), "badge", favs.slice(0, 3).map(function (nm) { var x = byName[nm]; return x ? medalSvg(x.col, x.b.i, x.b.s, x.b.t, 32) : ""; }).join("") || '<span class="step-none">Aucun</span>') +
          step(6, "Le fond de ta carte", currentBg().name, (function () {
            var all = bgList(), cur = currentBg(), fav = P.bgFav || [];
            all.sort(function (x, y) { if (isNew("bg:" + x.id) !== isNew("bg:" + y.id)) return isNew("bg:" + x.id) ? -1 : 1; var fx = fav.indexOf(x.id), fy = fav.indexOf(y.id); if ((fx !== -1) !== (fy !== -1)) return fx !== -1 ? -1 : 1; if (fx !== -1) return fx - fy; if ((x.id === cur.id) !== (y.id === cur.id)) return x.id === cur.id ? -1 : 1; if (!!x.prestige !== !!y.prestige) return x.prestige ? 1 : -1; if (x.open !== y.open) return x.open ? -1 : 1; return 0; });
            var tile = function (g) { var sel = g.id === cur.id, isFav = fav.indexOf(g.id) !== -1;
              return '<div class="bg-pick' + (g.open ? "" : " locked") + (sel ? " selected" : "") + (g.prestige ? " is-prestige" : "") + '"' + newAttr("bg:" + g.id) + '><button type="button" class="bg-main"' + (g.open ? ' data-action="bg" data-id="' + g.id + '"' : ' disabled aria-disabled="true"') + ' data-key="bg-' + g.id + '" aria-pressed="' + sel + '"><span class="bg-thumb ' + bgClass(g) + '">' + (g.open ? bgLayers(g) : '<span class="bg-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span>') + "</span><span>" + esc(g.name) + "</span>" + (g.open ? '<span class="sr-only">' + esc(bgHowTxt(g)) + "</span>" : "<small>" + esc(g.how) + "</small>") + "</button>" +
                '<span class="bg-tip" aria-hidden="true"><b>' + esc(g.name) + "</b><small>" + esc(bgHowTxt(g)) + "</small></span>" +
                '<button type="button" class="bg-fav' + (isFav ? " on" : "") + '" data-action="bgFav" data-id="' + g.id + '" data-key="bgf-' + g.id + '" aria-pressed="' + isFav + '" aria-label="' + (isFav ? "Retirer des favoris : " : "Ajouter aux favoris : ") + esc(g.name) + '" title="' + (isFav ? "Retirer des favoris" : "Mettre en favori") + '">' + (isFav ? "★" : "☆") + "</button>" + newDot("bg:" + g.id) + "</div>"; };
            var top = all.slice(0, 5), rest = all.slice(5);
            return '<p class="muted step-help">Clique un fond : ta carte à gauche change tout de suite. L\'étoile ☆ met un fond en favori, il remonte en tête de liste.</p>' +
              '<p class="bg-how" role="status"><b>' + esc(cur.name) + '</b><span class="bg-how-txt">' + (/^Offert/.test(cur.how) ? "" : '<span>Débloqué :</span> ') + '<span>' + esc(cur.how) + '</span></span></p><div class="bg-grid" role="group" aria-label="Fonds de la carte de héros">' + top.map(tile).join("") + "</div>" +
              (rest.length ? '<details class="vit-more fav-more" data-pg="bg-more"' + (openPG["bg-more"] ? " open" : "") + '><summary>Voir les ' + rest.length + ' autres fonds' + (rest.some(function (g) { return isNew("bg:" + g.id); }) ? ' <i class="new-dot inline" data-fold-new="bg" aria-hidden="true"></i>' : "") + ' <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="bg-grid">' + rest.map(tile).join("") + "</div></details>" : "");
          })(), "bg", '<span class="bg-thumb ' + bgClass(currentBg()) + '">' + bgLayers(currentBg()) + "</span>") + '</div>' +
          '<div class="save-row"><div class="btn-row" style="align-items:center;margin-top:18px"><button type="submit" class="btn btn-primary" data-key="save">Enregistrer mon héros</button>' + (this.saved ? '<span class="saved-ok" role="status">✓ Enregistré !</span>' : "") + '</div>' +
          '<details class="danger-zone" data-danger' + (this.dangerOpen ? " open" : "") + '><summary>Zone sensible</summary><div class="danger-body"><p class="danger-warn" role="alert"><b>Attention :</b> cette action efface définitivement ta progression sur cet appareil (points d\'expérience, rang, boss vaincus, badges, fonds et capes débloqués). Ton pseudo et ton avatar sont conservés. Impossible de revenir en arrière.</p><label class="danger-label" for="reset-word">Tape EFFACER pour confirmer</label><input type="text" id="reset-word" class="danger-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" inputmode="text"><button type="button" class="btn btn-danger btn-small" data-action="reset" data-reset-btn disabled>Remettre ma progression à zéro</button></div></details></div>' +
          "</form></div></main>";
      },
      statList: function () {
        ensureStats();
        var st = P.stats, r = rankInfo(P.xp);
        var acc = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
        var fav = null, favN = 0;
        Object.keys(st.themes).forEach(function (k) { if (st.themes[k].a > favN) { favN = st.themes[k].a; fav = k; } });
        var badges = earnedBadges();
        return [
          { id: "rank", label: "Grade", value: r.name, sub: P.xp + " XP · " + st.promotions + " promotion" + (st.promotions > 1 ? "s" : "") },
          { id: "time", label: "Temps de jeu", value: fmtTime(st.time), sub: "depuis le " + frDate(st.firstSeen) },
          { id: "answered", label: "Questions répondues", value: String(st.answered), sub: (st.modes.ranked || 0) + " en classé · " + (st.modes.train || 0) + " à l'entraînement" },
          { id: "accuracy", label: "Taux de réussite", value: st.answered ? acc + " %" : "—", sub: st.correct + " bonne" + (st.correct > 1 ? "s" : "") + " réponse" + (st.correct > 1 ? "s" : "") },
          { id: "bestStreak", label: "Meilleure série", value: String(P.bestStreak), sub: "série actuelle : " + P.streak },
          { id: "days", label: "Jours de jeu", value: String(st.days.length), sub: "série de jours : " + dayStreak() },
          { id: "favTheme", label: "Thème préféré", value: fav ? themeLabel(fav) : "—", sub: fav ? favN + " question" + (favN > 1 ? "s" : "") : "Joue pour le découvrir" },
          { id: "badges", label: "Badges", value: String(badges.length), sub: badges.length ? badges.join(" · ") : "Aucun pour l'instant", badges: badges }
        ];
      },
      renderStats: function () {
        var list = this.statList(), st = P.stats;
        var eyeOn = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
        var eyeOff = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7c1.7 0 3.2-.5 4.5-1.2"/></svg>';
        var tiles = list.map(function (t) {
          var pub = !!P.pub[t.id];
          return '<div class="stat-tile' + (pub ? "" : " is-private") + '"><div class="stat-top"><span class="stat-label">' + esc(t.label) + '</span><button type="button" class="vis-toggle' + (pub ? " on" : "") + '" data-action="vis" data-id="' + t.id + '" data-key="vis-' + t.id + '" aria-pressed="' + pub + '" aria-label="' + esc(t.label) + ' : ' + (pub ? "public, cliquer pour masquer" : "masqué, cliquer pour rendre public") + '">' + (pub ? eyeOn + '<span class="vt-t">Public</span>' : eyeOff + '<span class="vt-t">Masqué</span>') + '</button></div><b class="stat-value">' + esc(t.value) + '</b>' + (t.id === "badges" && t.badges.length > 3 ? '<small class="muted">' + esc(t.badges.slice(0, 3).join(" · ")) + '</small><details class="vit-more tile-more" data-pg="tile-badges"' + (openPG["tile-badges"] ? " open" : "") + '><summary>Voir les ' + (t.badges.length - 3) + ' autres <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><small class="muted">' + esc(t.badges.slice(3).join(" · ")) + "</small></details>" : '<small class="muted">' + esc(t.sub) + "</small>") + "</div>";
        }).join("");
        // thèmes
        var rows = THEMES.map(function (th) { var d = st.themes[th.id] || { a: 0, c: 0 }; return { id: th.id, label: th.label, pillar: th.pillar, a: d.a, c: d.c, p: d.a ? Math.round(d.c / d.a * 100) : 0 }; });
        var eligible = rows.filter(function (x) { return x.a >= 5; });
        var best = eligible.slice().sort(function (a, b) { return b.p - a.p; })[0], worst = eligible.slice().sort(function (a, b) { return a.p - b.p; })[0];
        function row(x, cls) {
          var tag = "";
          if (best && x.id === best.id && eligible.length > 1) tag = '<span class="theme-tag good">Point fort</span>';
          else if (worst && x.id === worst.id && eligible.length > 1) tag = '<a class="theme-tag work" href="#/entrainement?theme=' + x.id + '">À travailler →</a>';
          return '<div class="theme-row' + (cls || "") + '"><span class="theme-name">' + esc(x.label) + tag + '</span><div class="bar' + (x.a ? "" : " empty") + '"><div style="width:' + x.p + '%"></div></div><span class="theme-num">' + (x.a ? x.p + " % · " + x.c + "/" + x.a : "pas encore joué") + "</span></div>";
        }
        var themeRows = PILLARS.map(function (pl) {
          var subs = rows.filter(function (x) { return x.pillar === pl.id; });
          var a = 0, c = 0; subs.forEach(function (x) { a += x.a; c += x.c; });
          var head = row({ id: "p-" + pl.id, label: pl.label, a: a, c: c, p: a ? Math.round(c / a * 100) : 0 }, " pillar-row");
          if (subs.length < 2) return '<div class="pillar-group pg-solo" style="--c:' + pl.color + '">' + head + '<span class="pg-arrow pg-spacer" aria-hidden="true"></span></div>';
          return '<details class="pillar-group pg-fold" data-pg="' + pl.id + '"' + (openPG[pl.id] ? " open" : "") + ' style="--c:' + pl.color + '"><summary>' + head + '<span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sr-only">Afficher les sous-thèmes</span></summary><div class="pg-subs">' + subs.map(function (x) { return row(x, " sub-row"); }).join("") + "</div></details>";
        }).join("");
        var themeTiles = PILLARS.map(function (pl) {
          var subs = rows.filter(function (x) { return x.pillar === pl.id; }), a = 0, c = 0; subs.forEach(function (x) { a += x.a; c += x.c; });
          var pp = a ? Math.round(c / a * 100) : 0, tag = "";
          if (best && eligible.length > 1) { if (subs.some(function (x) { return x.id === best.id; })) tag = '<span class="vt-tag good">Point fort</span>'; else if (worst && subs.some(function (x) { return x.id === worst.id; })) tag = '<span class="vt-tag work">À travailler</span>'; }
          return '<details class="vt-sheet" data-pg="vtt-' + pl.id + '"' + (openPG["vtt-" + pl.id] ? " open" : "") + '><summary class="vt-tile" style="--c:' + pl.color + '"><span class="vt-ring" style="--p:' + pp + '" data-t="' + (a ? pp + "%" : "–") + '"></span><span class="vt-k">Pilier</span><span class="vt-v">' + esc(pl.label) + '</span><span class="vt-s">' + (a ? c + " / " + a + " bonnes" : "pas encore joué") + "</span>" + tag + '</summary><div class="vt-body"><div class="vt-head"><b>' + esc(pl.label) + '</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div><div class="theme-rows">' + subs.map(function (x) { return row(x, " sub-row"); }).join("") + "</div></div></details>";
        }).join("");
        // carte publique
        var pubTiles = list.filter(function (t) { return P.pub[t.id]; });
        var myBg = currentBg(), card = '<div class="public-card ' + bgClass(myBg) + '">' + bgLayers(myBg, true) + '<div class="public-head"><span class="public-face">' + myAvatar(64) + '</span><div><b>' + esc(P.pseudo || "Héros sans nom") + '</b><small class="muted">Carte de héros</small>' + (P.pub.badges ? favSlots() : "") + "</div></div>" +
          (pubTiles.length ? '<ul class="public-list">' + pubTiles.map(function (t) { return "<li><span>" + esc(t.label) + "</span><b>" + esc(t.id === "badges" ? (t.badges.length ? t.badges.length + " badge" + (t.badges.length > 1 ? "s" : "") : "Aucun") : t.value) + "</b></li>"; }).join("") + "</ul>" : '<p class="muted" style="margin:0">Tout est masqué : seuls ton pseudo et ton avatar seront visibles.</p>') + "</div>";
        return '<section class="section" aria-labelledby="stats-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Mes caractéristiques</span><h2 class="h-l" id="stats-title">Fiche de héros</h2></div></div>' +
          '<details class="vis-bulk prog-fold" data-pg="vis-bulk"' + (openPG["vis-bulk"] ? " open" : "") + '><summary><span class="pf-t"><b>Visibilité</b><span class="muted pf-m">' + list.filter(function (t) { return P.pub[t.id]; }).length + " stat" + (list.filter(function (t) { return P.pub[t.id]; }).length > 1 ? "s" : "") + " visible" + (list.filter(function (t) { return P.pub[t.id]; }).length > 1 ? "s" : "") + " sur " + list.length + '</span></span><svg class="pf-chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="vis-bulk-btns"><button type="button" class="btn btn-ghost" data-action="visall" data-id="all" data-key="visall-all">Tout afficher</button><button type="button" class="btn btn-ghost" data-action="visall" data-id="none" data-key="visall-none">Tout masquer</button><button type="button" class="btn btn-ghost" data-action="visall" data-id="def" data-key="visall-def">Valeurs par défaut</button></div></details>' +
          '<div class="stats-layout"><div class="stat-grid">' + tiles + '</div><aside class="panel vt-desk"><h3 class="h-s" style="margin-bottom:14px">Ce que les autres verront</h3>' + card + "</aside></div>" +
          '<details class="vt-sheet vt-mobile vt-pub" data-pg="vt-pub"' + (openPG["vt-pub"] ? " open" : "") + '><summary class="vis-line"><span><b>Voir ma carte publique</b><small>Ce que les autres verront</small></span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="vt-body"><div class="vt-head"><b>Ma carte publique</b><button type="button" class="sheet-close" data-sheet-close aria-label="Fermer">×</button></div>' + card + "</div></details>" +
          '<div class="panel" style="margin-top:20px"><h3 class="h-s" style="margin-bottom:16px">Mes thèmes</h3><div class="theme-rows vt-desk">' + themeRows + '</div><div class="vt-mobile vt-grid">' + themeTiles + "</div></div></section>";
      }
    };
  }

  /* =========================================================
     ROUTEUR + RENDU
     ========================================================= */
  var V = null;
  var app = document.getElementById("app");

  function parseHash() {
    var h = (location.hash || "#/").slice(1);
    var parts = h.split("?"), path = parts[0] || "/", params = {};
    if (parts[1]) parts[1].split("&").forEach(function (kv) { var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    return { path: path, params: params };
  }

  /* =========================================================
     MISSIONS BOSS : carte des boss et combat en mise en situation
     ========================================================= */
  function bossWon(id) { return id === "phisher" ? !!P.missionWon : !!(P.bosses && P.bosses[id] && P.bosses[id].won); }
  function bossesWon() { return (window.BOSSES || []).filter(function (b) { return bossWon(b.id); }).length; }
  /* ---------- Animation de fin de combat : le boss vole en éclats (victoire) ou triomphe (défaite) ---------- */
  function bossFx(win, id, name, mail) {
    var old = document.querySelector(".bossfx"); if (old) old.remove();
    var el = document.createElement("div"); el.className = "bossfx " + (win ? "win" : "lose"); el.setAttribute("role", "alert");
    var art = window.bossArt ? window.bossArt(id, null, (V && V.level) || 1) : "", nm = name.charAt(0).toUpperCase() + name.slice(1);
    var inner;
    if (win) {
      var shards = [["0 0,55% 0,42% 46%,0 34%", -160, -120, -40], ["55% 0,100% 0,100% 38%,60% 50%,42% 46%", 170, -130, 35], ["0 34%,42% 46%,30% 100%,0 100%", -180, 120, -25], ["42% 46%,60% 50%,70% 100%,30% 100%", 10, 190, 20], ["60% 50%,100% 38%,100% 100%,70% 100%", 190, 110, 45]];
      inner = '<div class="bfx-stage">' + (mail ? '<span class="bfx-mail"><svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="#F5C451"/><path d="M3 6l9 7 9-7" fill="none" stroke="#1E1405" stroke-width="2"/></svg></span>' : "") +
        '<span class="bfx-whole">' + art + "</span>" + shards.map(function (sh) { return '<span class="bfx-shard" style="clip-path:polygon(' + sh[0] + ");--dx:" + sh[1] + "px;--dy:" + sh[2] + "px;--rot:" + sh[3] + 'deg">' + art + "</span>"; }).join("") +
        '<span class="bfx-flash"></span></div><div class="bfx-text"><span class="bfx-kicker">Boss vaincu !</span><b>' + esc(nm) + " est hors service</b></div>";
    } else {
      var sh = ""; for (var k = 0; k < 3; k++) sh += '<span class="bfx-shield" style="--k:' + k + '">' + I.shield(true, 40) + "</span>";
      inner = '<div class="bfx-stage"><span class="bfx-boss">' + art + '</span><div class="bfx-shields">' + sh + '</div></div><div class="bfx-text"><span class="bfx-kicker">K.O. !</span><b>' + esc(nm) + " l'emporte… pour cette fois</b></div>";
    }
    el.innerHTML = '<div class="bfx-bg"></div>' + inner;
    document.body.appendChild(el);
    if (mail) sfx("mail");
    sfx(win ? "bossWin" : "bossLose");
    function close() { if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.remove(); }, 300); }
    el.addEventListener("click", close);
    document.addEventListener("keydown", function onK(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onK); } });
    setTimeout(close, reduceMotion ? 1500 : 3300);
  }
  function BossMapView() {
    return {
      nav: "mission",
      render: function () {
        var ult = (window.BOSSES || []).filter(function (b) { return b.ultimate; })[0];
        var cards = (window.BOSSES || []).filter(function (b) { return !b.ultimate; }).map(function (b) {
          var pl = pillarById(b.pillar), hero = pl && window.heroById ? window.heroById(pl.hero) : null, won = bossWon(b.id), live = b.status === "live";
          var rec = (P.bosses || {})[b.id] || {}, lvWon = rec.levels ? Object.keys(rec.levels).length : 0, nextLv = Math.min(3, lvWon + 1), acc = bossAccess(b.id, nextLv);
          var chip = lvWon >= 3 ? '<span class="bm-chip won">3 niveaux vaincus</span>' : (acc.ok ? '<span class="bm-chip live">Niveau ' + nextLv + " disponible</span>" : '<span class="bm-chip soon">Niveau ' + nextLv + " · " + (!acc.okRank ? "grade " + esc(RANKS[acc.L.rank].n) + " requis" : (!acc.okPrev ? "vaincre d\'abord le niveau " + (nextLv - 1) : "prêt à " + acc.pct + " %")) + '</span>' + (!acc.okRank || !acc.okPrev ? '<span class="muted" style="font-size:12.5px">Maîtrise du pilier : ' + acc.pct + " %</span>" : "") + '<span class="acc-bar mini" aria-hidden="true"><i style="width:' + acc.pct + '%"></i></span>');
          var inner = '<span class="bm-art">' + window.bossArt(b.id, b.color, nextLv) + "</span>" +
            '<div class="bm-txt"><span class="bm-world" style="color:' + (pl ? pl.color : "var(--blue-3)") + '">' + esc(pl ? pl.label : "") + "</span><h2 class=\"h-s\">" + esc(b.name.charAt(0).toUpperCase() + b.name.slice(1)) + "</h2><p>" + esc(b.teaser) + '</p><div class="bm-foot">' + chip + (hero ? '<span class="bm-hero">' + window.heroSvg(hero, 26) + "Avec " + esc(hero.name) + "</span>" : "") + "</div></div>";
          return live ? '<a class="bm-card' + (won ? " won" : "") + '" href="' + b.href + '" style="--bc:' + b.color + '">' + inner + "</a>" : '<div class="bm-card soon" style="--bc:' + b.color + '" aria-disabled="true">' + inner + "</div>";
        }).join("");
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:28px"><span class="eyebrow" style="color:var(--pink)">Boss · un par domaine</span><h1 class="h-l">Six gardiens, six boss, un ultime</h1><p class="lead">Des mises en situation réelles : un incident arrive, à toi de prendre les bonnes décisions. Chaque erreur laisse le boss contre-attaquer et te coûte un bouclier.</p><p class="muted" style="margin:0">Pour affronter un boss, il faut le bon grade <b style="color:var(--text)">et</b> maîtriser son domaine. À chaque niveau vaincu, le boss revient plus fort… et il le montre.</p><p class="muted" style="margin:0">' + bossesWon() + " / " + (window.BOSSES || []).length + " boss vaincus (boss ultime compris)</p></div>" +
          '<div class="bm-grid">' + cards + "</div>" + (ult ? (function (b) {
            var rec = (P.bosses || {})[b.id] || {}, lvWon = rec.levels ? Object.keys(rec.levels).length : 0, nextLv = Math.min(3, lvWon + 1), acc = bossAccess(b.id, nextLv);
            var chip = lvWon >= 3 ? '<span class="bm-chip won">3 niveaux vaincus</span>' : (acc.ok ? '<span class="bm-chip live">Niveau ' + nextLv + " disponible</span>" : '<span class="bm-chip soon">Niveau ' + nextLv + " · " + acc.done.length + " / " + acc.others.length + " boss vaincus" + (!acc.okRank ? " · grade " + esc(RANKS[acc.L.rank].n) + " requis" : "") + '</span><span class="acc-bar mini" aria-hidden="true"><i style="width:' + acc.pct + '%"></i></span>');
            return '<div class="bm-ultimate-wrap"><span class="bm-ult-label">⚡ Boss ultime ⚡</span><a class="bm-card bm-ultimate' + (lvWon ? " won" : "") + '" href="' + b.href + '" style="--bc:' + b.color + '"><span class="bm-art">' + window.bossArt(b.id, b.color, nextLv) + '</span><div class="bm-txt"><span class="bm-world" style="color:var(--gold)">Tous les domaines · tous les gardiens</span><h2 class="h-s">' + esc(b.name.charAt(0).toUpperCase() + b.name.slice(1)) + "</h2><p>" + esc(b.teaser) + '</p><div class="bm-foot">' + chip + '<span class="bm-heroes">' + ["volt", "sentinelle", "uptime", "sudo", "prompta", "sylva"].map(function (h) { return window.heroSvg(window.heroById(h), 24); }).join("") + "</span></div></div></a></div>";
          })(ult) : "") + "</main>";
      }
    };
  }
  function renderBossScene(sc) {
    if (!sc) return "";
    if (sc.type === "terminal") return '<div class="scene scene-term"><span class="scene-kicker">' + esc(sc.kicker) + "</span><pre>" + esc(sc.body) + "</pre></div>";
    if (sc.type === "ticket") return '<div class="scene scene-ticket"><span class="scene-kicker">' + esc(sc.kicker) + '</span><div class="scene-meta"><b>' + esc(sc.from) + "</b><span>" + esc(sc.time || "") + '</span></div><p>' + esc(sc.body) + "</p></div>";
    if (sc.type === "alert") return '<div class="scene scene-alert"><span class="scene-kicker">' + esc(sc.kicker) + "</span><p>" + esc(sc.body) + "</p></div>";
    return '<div class="scene scene-log"><span class="scene-kicker">' + esc(sc.kicker) + "</span></div>";
  }
  /* Boss ultime : une seule erreur permise aux niveaux 1 et 2, aucune au niveau 3 */
  function bossShieldsFor(id, L) { var b = (window.BOSSES || []).filter(function (x) { return x.id === id; })[0]; return b && b.ultimate ? (L.n < 3 ? 1 : 0) : L.shields; }
  /* Boucliers affichés = erreurs encore permises : on perd à l'erreur suivante quand il n'en reste plus (0 = sans filet) */
  /* Sons de combat choisis par Rachel : sons/Bell.mp3 (cloche) puis sons/Fight.mp3 (« Fight ! »).
     Minutage calé sur l'annonce à l'écran : cloche à 0 s (son audible à 0,14 s, « ROUND » apparaît), « Fight » lancé à 0,95 s (voix audible à 1,2 s, « FIGHT ! » apparaît). */
  var FIGHT_SND = { bell: null, fight: null, ok: { bell: false, fight: false } };
  ["bell"].forEach(function (k) { try { var a = new Audio(); a.preload = "auto"; a.addEventListener("canplaythrough", function () { FIGHT_SND.ok[k] = true; }, { once: true }); a.addEventListener("error", function () { FIGHT_SND.ok[k] = false; }, { once: true }); a.src = "sons/" + (k === "bell" ? "Bell" : "Fight") + ".mp3"; FIGHT_SND[k] = a; } catch (e) { } });
  function playClip(k) { var a = FIGHT_SND[k]; if (!a) return; try { var c = a.cloneNode(); c.volume = Math.min(1, volume * 0.55); /* cloche baissée (trop forte face aux autres sons) */ c.play().catch(function () { }); } catch (e) { } }
  function playFight(lv) {
    if (!soundOn) return;
    /* seulement la cloche (le « Fight » et l'annonce à l'écran ont été retirés à la demande de Rachel) */
    if (!FIGHT_SND.ok.bell) { sfx("bossStart", lv); return; }
    playClip("bell"); if (lv >= 3) setTimeout(function () { playClip("bell"); }, 380);
  }
  function fightFx(lv) {
    var el = document.createElement("div"); el.className = "fight-fx"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<span class="ff-ring"></span><span class="ff-ring r2"></span><b class="ff-round"><small>Ding ! Ding !</small>' + (lv >= 3 ? "Final round" : "Round " + lv) + '</b><b class="ff-fight">Fight !</b>';
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2600);
  }
  function BossView(id) {
    function bossShields(L) { return bossShieldsFor(id, L); }
    var M = window.BOSS_MISSIONS[id], hero = window.heroById(M.hero), meta = (window.BOSSES || []).filter(function (b) { return b.id === id; })[0] || {};
    var view = {
      nav: "mission", i: 0, hp: 100, shields: 3, done: false, won: false, run: null, started: false, level: 0, steps: M.steps,
      bonusText: "", checks: M.bonus ? M.bonus.checklist.map(function () { return false; }) : [], showModel: false, xpGain: 0,
      onAnswer: function (good) {
        var st = this.steps[this.i], hit = Math.round(92 / Math.max(1, this.steps.length - 1));
        if (good) { this.hp = st.final ? (M.bonus ? 8 : 0) : Math.max(8, this.hp - hit); this.lastHit = st.final ? (M.bonus ? "il vacille !" : "coup final") : "−" + hit + " PV"; }
        else { this.shields--; }
      },
      actions: {
        /* Choix du niveau (débloqué par le rang) puis lancement */
        /* Touche sur un niveau : sur téléphone, ouvre la fenêtre du niveau (conditions + bouton) ; sur PC, lance le combat s'il est ouvert */
        bossTap: function (d) {
          var n = +d.lv || 1, mob = window.matchMedia && window.matchMedia("(max-width: 760px), (max-height: 480px) and (orientation: landscape)").matches;
          if (mob) { V.sheetLv = n; V._focusKey = "bsheet"; return; }
          if (bossAccess(id, n).ok || V.levelWon(n)) V.actions.bossStart(d);
        },
        bossSheetClose: function () { V.sheetLv = null; },
        bossStart: function (d) {
          var L = window.BOSS_LEVELS[(+d.lv || 1) - 1]; if (!L || !bossAccess(id, L.n).ok) return;
          V.level = L.n; V.cfg = L; var EXT = (window.BOSS_ALTS || {})[id] || {};
          V.steps = M.steps.map(function (st, ix) { return { st: st, ix: ix }; }).filter(function (o) { return (o.st.lv || 1) <= L.n; }).map(function (o) { var st = o.st, a = (st.alt && st.alt[L.n]) || (EXT[o.ix] && EXT[o.ix][L.n]); return a ? Object.assign({}, st, { q: a, scene: a.scene || st.scene }) : st; }); V.shields = bossShields(L); V.maxShields = V.shields;
          V.i = 0; V.hp = 100; V.run = newRun(V.steps[0].q, true); V.started = true; V._scroll = true; V._focusKey = "q"; playFight(L.n);
        },
        next: function () {
          if (V.shields < 0) { V.finish(false); bossFx(false, id, M.name); return; }
          if (V.i >= V.steps.length - 1) { if (M.bonus) { if (V.hp > 8) V.hp = 8; V.grace = true; V._scroll = true; V._focusKey = "bonus"; } else { V.finish(true); bossFx(true, id, M.name); } return; }
          V.i++; V.run = newRun(V.steps[V.i].q, true); V._scroll = true; V._focusKey = "q";
        },
        restart: function () { var lv = V.level; V = BossView(id); V.actions.bossStart({ lv: lv }); },
        levels: function () { V = BossView(id); V._scroll = true; },
        bonusCheck: function (d) { V.bonusText = (document.getElementById("bonus-text") || {}).value || V.bonusText; V.checks[+d.i] = !V.checks[+d.i]; V._focusKey = "bc" + d.i; },
        bonusModel: function () { V.showModel = !V.showModel; V._focusKey = "bmodel"; },
        /* Coup de grâce : le message rédigé devient le dernier coup porté au boss (bonus d'XP selon les points clés cochés) */
        graceSend: function () {
          V.bonusText = (document.getElementById("bonus-text") || {}).value || V.bonusText;
          if (V.bonusText.trim().length < 40) { V.graceWarn = true; V._focusKey = "bonus"; return; }
          var txt = normAnswer(V.bonusText); V.found = M.bonus.checklist.map(function (c) { return c.keys.some(function (k) { return txt.indexOf(k) !== -1; }); });
          V.sent = true; V.bonusXp = V.found.filter(Boolean).length * 5; V.hp = 0; V.grace = false; V.finish(true); bossFx(true, id, M.name, true);
        },
        /* Passer le coup de grâce est pénalisant : 20 % de l'XP de victoire en moins */
        graceSkip: function () { V.grace = false; V.hp = 0; V.skipped = true; V.bonusXp = -V.skipCost(); V.finish(true); bossFx(true, id, M.name); }
      },
      levelWon: function (n) { var rec = (P.bosses || {})[id] || {}; return !!(rec.levels && rec.levels[n]); },
      /* Fenêtre d'un niveau (téléphone) : conditions cochées, puis « Combattre » ou « S'entraîner » */
      bossSheet: function () {
        var n = this.sheetLv; if (!n) return "";
        var L = window.BOSS_LEVELS[n - 1], acc = bossAccess(id, n), won = this.levelWon(n), open = acc.ok || won, sh = bossShieldsFor(id, L);
        var nb = M.steps.filter(function (st) { return (st.lv || 1) <= n; }).length;
        var facts = nb + " étapes · " + (sh === 0 ? "aucune erreur permise" : (sh === 1 ? "1 seule erreur permise" : sh + " erreurs permises")) + " · +" + (won ? L.replay + " XP (rejouer)" : L.xp + " XP");
        var go = open ? '<button type="button" class="btn btn-primary bs-go" data-action="bossStart" data-lv="' + n + '">' + I.bolt() + (won ? "Rejouer" : "Combattre") + "</button>"
          : '<a class="btn btn-primary bs-go" href="' + (meta.ultimate ? "#/mission" : "#/entrainement?pillar=" + meta.pillar) + '">' + (meta.ultimate ? "Voir les autres boss" : "S'entraîner sur ce pilier") + '</a><p class="muted bs-hint">Le combat se débloque quand tout est coché.</p>';
        return '<div class="bs-scrim" data-action="bossSheetClose"></div><div class="boss-sheet" role="dialog" aria-modal="true" aria-labelledby="bs-t" style="--bc:' + M.color + '"><div class="bs-top"><h2 id="bs-t">' + L.label + '</h2><button type="button" class="bs-x" data-action="bossSheetClose" data-key="bsheet" aria-label="Fermer">✕</button></div><p class="bs-facts">' + facts + "</p>" + accessList(acc) + go + "</div>";
      },
      skipCost: function () { return Math.round((this.levelWon(this.level) ? this.cfg.replay : this.cfg.xp) * 0.2); },
      finish: function (won) {
        this.done = true; this.won = won; this._scroll = true;
        if (won) {
          P.bosses = P.bosses || {}; var rec = P.bosses[id] || {}, before = rankIndex(P.xp);
          rec.levels = rec.levels || {}; var first = !rec.levels[this.level];
          this.baseXp = first ? this.cfg.xp : this.cfg.replay; this.xpGain = this.baseXp + (this.bonusXp || 0); this.firstWin = first;
          ensureStats(); markRunEnd(); if (this.shields >= (this.maxShields == null ? 3 : this.maxShields)) P.stats.flawlessBoss = (P.stats.flawlessBoss || 0) + 1; if (this.found && this.found.length && this.found.every(Boolean)) P.stats.graceFull = 1;
          if (id === "phisher") P.missionWon = true;
          rec.levels[this.level] = true; rec.won = true; rec.wins = (rec.wins || 0) + 1; rec.best = Math.max(rec.best || 0, this.shields); P.bosses[id] = rec;
          P.xp += this.xpGain; saveProfile();
          var after = rankIndex(P.xp); if (after > before) setTimeout(function () { rankCeremony(true, after); }, 3600);
        }
      },
      top: function () {
        var lives = ""; if (this.maxShields === 0) lives = '<span class="no-net">' + I.flame + "Sans filet</span>"; else for (var k = 0; k < (this.maxShields == null ? 3 : this.maxShields); k++) lives += I.shield(k < this.shields, 24);
        var phase = this.steps[this.i].phase2 || this.steps.slice(0, this.i).some(function (st) { return st.phase2; }) ? 2 : 1;
        return '<div class="boss-hud" style="--bc:' + M.color + '"><span class="boss-hud-art' + (this.run && this.run.validated && !this.done ? (this.run.good ? " hit" : " strike") : "") + '">' + window.bossArt(id, M.color, this.level) + '</span><div class="boss-hud-main"><div class="boss-hud-row"><h1 class="h-s">' + esc(meta.name ? meta.name.charAt(0).toUpperCase() + meta.name.slice(1) : M.name) + '</h1><span class="boss-phase">Phase ' + phase + ' / 2</span></div>' +
          '<div class="boss-hp" role="progressbar" aria-label="Points de vie du boss" aria-valuenow="' + this.hp + '" aria-valuemin="0" aria-valuemax="100"><div style="width:' + this.hp + '%"></div><span>' + this.hp + " PV</span></div>" +
          '<div class="boss-hud-row"><span class="muted" style="font-size:13px">Niveau ' + this.level + " · étape " + (this.i + 1) + " / " + this.steps.length + '</span><div class="lives" aria-label="' + this.shields + ' bouclier(s) restant(s)">' + lives + "</div></div></div></div>";
      },
      render: function () {
        var self = this;
        if (!this.started) {
          return '<main class="container page boss-page"><a class="back-link" href="#/mission">← Carte des boss</a><div class="boss-intro" style="--bc:' + M.color + '"><span class="boss-intro-art">' + window.bossArt(id) + '</span><span class="eyebrow" style="color:' + M.color + '">' + (meta.ultimate ? "Boss ultime · tous les domaines" : "Boss · " + esc((pillarById(meta.pillar) || {}).label || "")) + '</span><h1 class="h-l">' + esc(meta.name.charAt(0).toUpperCase() + meta.name.slice(1)) + '</h1><p class="lead">' + esc(M.intro) + "</p>" +
            heroSayHtml(hero, "Je suis avec toi. Garde ton calme : on diagnostique avant d'agir. Chaque mauvaise décision te coûte un bouclier… et quand il n'en reste plus, c'est la chute.") +
            '<div class="boss-levels">' + window.BOSS_LEVELS.map(function (L) {
              var acc = bossAccess(id, L.n), open = acc.ok || self.levelWon(L.n), won = self.levelWon(L.n), n = M.steps.filter(function (st) { return (st.lv || 1) <= L.n; }).length;
              return '<button type="button" class="boss-level' + (open ? "" : " locked") + (won ? " won" : "") + '" data-action="bossTap" data-lv="' + L.n + '"' + ' aria-haspopup="dialog"' + (L.n === 1 ? ' data-key="q"' : "") + (self.sheetLv === L.n ? ' aria-expanded="true"' : "") + '>' +
                '<span class="bl-top"><b>' + L.label + "</b>" + (won ? '<span class="bm-chip won">Vaincu</span>' : (open ? '<span class="bm-chip go">Combattre</span>' : '<span class="bm-chip soon">Verrouillé</span>')) + "</span>" +
                '<span class="bl-art">' + window.bossArt(id, M.color, L.n) + '</span><span class="bl-lives">' + (function () { if (bossShields(L) === 0) return '<span class="no-net">' + I.flame + "Sans filet</span>"; var h = ""; for (var k = 0; k < bossShields(L); k++) h += I.shield(true, 18); return h; })() + "</span>" +
                '<span class="bl-info">' + n + " étapes · " + (bossShields(L) === 0 ? "aucune erreur permise" : (bossShields(L) === 1 ? "1 seule erreur permise" : bossShields(L) + " erreurs permises")) + " · " + (won ? "+" + L.replay + " XP (rejouer)" : "+" + L.xp + " XP") + "</span>" +
                (open ? "" : '<span class="bl-lock">Pour l\'affronter :</span>' + accessList(acc) + '<span class="acc-bar"><i style="width:' + acc.pct + '%"></i></span>') + "</button>";
            }).join("") + "</div>" + self.bossSheet() +
            (meta.ultimate ? '<p class="muted" style="margin:0">Chaque niveau du Grand Blackout se débloque quand tu as vaincu <b style="color:var(--text)">les six autres boss</b> au même niveau.</p></div></main>' : '<p class="muted" style="margin:0">Chaque niveau demande un grade <b style="color:var(--text)">et</b> la maîtrise du pilier : entraîne-toi et joue en classé sur ce domaine pour débloquer le combat. <a href="#/entrainement?pillar=' + meta.pillar + '">S\'entraîner sur ce pilier →</a></p></div></main>');
        }
        if (this.grace) {
          return '<main class="container page boss-page">' + this.top() + '<div class="phase2-banner grace" role="status"><b>Il vacille !</b> Un dernier coup et ' + esc(M.name) + ' tombe. À toi de porter le coup de grâce.</div>' +
            '<section class="boss-bonus"><span class="eyebrow" style="color:var(--gold)">Coup de grâce · rédaction</span><h2 class="h-s">' + esc(M.bonus.q.replace(/^Coup de grâce \(bonus\) : /, "")) + '</h2><label class="sr-only" for="bonus-text">Ton message</label><textarea id="bonus-text" rows="8" data-key="bonus" placeholder="Bonjour à tous, …">' + esc(this.bonusText) + "</textarea>" +
            (this.graceWarn ? '<p class="grace-warn" role="alert">Ton message est un peu court : développe-le avant de l\'envoyer.</p>' : "") +
            '<p class="muted" style="margin:0;font-size:14px">Ton message sera analysé à l\'envoi : chaque point clé d\'un bon message de clôture trouvé rapporte <b style="color:var(--gold)">+5 XP</b> (jusqu\'à +' + (M.bonus.checklist.length * 5) + " XP).</p>" +
            '<div class="grace-actions"><button type="button" class="btn btn-primary grace-send" data-action="graceSend">' + I.bolt() + 'Envoyer le coup de grâce</button><button type="button" class="btn btn-ghost" data-action="graceSkip">Achever sans message · −' + self.skipCost() + " XP</button></div></section></main>";
        }
        if (this.done) {
          var bonus = "";
          if (this.won && this.sent) {
            bonus = '<section class="boss-bonus"><span class="eyebrow" style="color:var(--gold)">Ton coup de grâce · analyse</span><ul class="grace-analysis">' + M.bonus.checklist.map(function (c, k) { var ok = self.found && self.found[k]; return '<li class="' + (ok ? "ok" : "ko") + '"><span aria-hidden="true">' + (ok ? "✓" : "✗") + "</span>" + esc(c.label) + '<span class="sr-only">' + (ok ? " : présent" : " : manquant") + "</span><b>" + (ok ? "+5 XP" : "manquant") + "</b></li>"; }).join("") + '</ul><div class="grace-compare"><div><small>Ton message</small><pre class="bonus-model mine">' + esc(this.bonusText) + '</pre></div>' +
              (this.showModel ? '<div><small>Message modèle</small><pre class="bonus-model">' + esc(M.bonus.model) + "</pre></div>" : "") + "</div>" +
              '<button type="button" class="btn btn-ghost" data-action="bonusModel" data-key="bmodel" style="align-self:flex-start">' + (this.showModel ? "Masquer" : "Comparer avec") + " le message modèle</button></section>";
          }
          return '<main class="container page boss-page">' + this.top() + '<div class="end-card halftone"><span class="burst big" style="background:' + (this.won ? "var(--amber)" : "var(--pink)") + '">' + (this.won ? "VICTOIRE !" : "K.O. !") + '</span><h1 class="h-l">' + (this.won ? "Boss vaincu !" : "Mission échouée") + "</h1>" +
            heroSayHtml(hero, this.won ? M.win : M.lose) +
            (this.won ? '<div class="stats"><div class="stat"><small>Boucliers restants</small><b>' + (this.maxShields === 0 ? "Sans filet" : Math.max(0, this.shields) + " / " + this.maxShields) + '</b></div><div class="stat"><small>' + (this.firstWin ? "Première victoire" : "Victoire rejouée") + '</small><b style="color:#6FD99A">+' + this.baseXp + " XP</b></div>" + (this.sent ? '<div class="stat"><small>Coup de grâce</small><b style="color:var(--gold)">+' + (this.bonusXp || 0) + " XP</b></div>" : "") + (this.skipped ? '<div class="stat"><small>Coup de grâce ignoré</small><b style="color:#FF8AA3">' + signed(this.bonusXp) + " XP</b></div>" : "") + "</div>" : "") +
            '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="restart">Rejouer le niveau ' + this.level + '</button><button type="button" class="btn btn-ghost" data-action="levels">Changer de niveau</button><a class="btn btn-ghost" href="#/mission">Carte des boss</a><a class="btn btn-ghost" href="#/entrainement?pillar=' + meta.pillar + '">M\'entraîner</a></div></div>' + bonus + "</main>";
        }
        var st = this.steps[this.i], r = this.run, v = r.validated, side;
        var phaseBanner = st.phase2 && this.i > 0 ? '<div class="phase2-banner" role="status"><b>Phase 2 !</b> ' + esc(M.phase2) + "</div>" : "";
        if (!v) side = heroSayHtml(hero, st.phase2 ? "Attention, il riposte ! Reste méthodique." : "Lis bien la situation avant de décider.", "big");
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "AÏE !") + "</span><b>" + (r.good ? "Le boss encaisse : " + esc(this.lastHit) : esc(st.counter) + " −1 bouclier") + "</b></div>" +
          '<div class="hero-say explain"><span class="hero-say-face">' + window.heroSvg(hero, 48) + "</span><div><b>" + esc(hero.name) + " t'explique</b><p>" + majLead(st.q.maj, r) + esc(st.q.e) + "</p>" + majNote(st.q.maj, r) + "</div></div>" +
          '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.shields < 0 ? "Voir le bilan" : (this.i >= this.steps.length - 1 ? "Terminer le boss" : "Étape suivante")) + "</button></div>";
        return '<main class="container page boss-page">' + this.top() + phaseBanner + '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderBossScene(st.scene) + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      }
    };
    return view;
  }
  /* Zone sensible du profil : le bouton rouge ne s'active qu'une fois le mot tapé ; on ne refait pas l'affichage pour ne pas perdre la saisie */
  document.addEventListener("input", function (e) {
    var t = e.target; if (!t || t.id !== "reset-word") return;
    var b = document.querySelector("[data-reset-btn]"); if (b) b.disabled = !/^(effacer|erase)$/i.test(String(t.value).trim());
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "reset-word") e.preventDefault(); });
  document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.matches && d.matches("[data-danger]") && V) V.dangerOpen = d.open; }, true);
  document.addEventListener("input", function (e) { if (e.target && e.target.id === "bonus-text" && V && "bonusText" in V) V.bonusText = e.target.value; });

  /* ---------- Aperçu : une question d'essai qui déclenche l'effet de promotion (sans toucher à l'XP réelle) ---------- */
  function DemoView() {
    function play(name) { if (soundOn) return; try { SFX[name](); } catch (e) { } } /* en aperçu, on joue le son même si les sons sont coupés */
    function ceremony(up, idx) { if (!soundOn) play(up ? (idx === RANKS.length - 1 ? "maxRank" : "promo") : "demote"); rankCeremony(up, idx); }
    var cur = rankIndex(P.xp), nextIdx = Math.min(cur + 1, RANKS.length - 1), downIdx = Math.max(cur - 1, 0);
    return {
      nav: "ranked", picked: null,
      actions: {
        demoPick: function (d) {
          if (V.picked !== null) return;
          V.picked = +d.id; var good = V.picked === 1;
          if (soundOn) sfx(good ? "good" : "bad"); else play(good ? "good" : "bad");
          setTimeout(function () { ceremony(good, good ? nextIdx : downIdx); }, 450);
        },
        demoAgain: function () { V.picked = null; },
        demoPromo: function () { ceremony(true, nextIdx); },
        demoMax: function () { ceremony(true, RANKS.length - 1); },
        demoDown: function () { ceremony(false, downIdx); }
      },
      render: function () {
        var self = this, opts = ["Le Mode classé", "L'Entraînement", "La Veille"];
        var answers = opts.map(function (o, i) {
          var cls = self.picked === null ? "" : (i === 1 ? " correct" : (i === self.picked ? " wrong" : ""));
          return '<button type="button" class="demo-opt' + cls + '" data-action="demoPick" data-id="' + i + '"' + (self.picked !== null ? " disabled" : "") + '><span class="demo-letter">' + "ABC"[i] + "</span>" + esc(o) + "</button>";
        }).join("");
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:24px"><span class="eyebrow">Aperçu · aucune XP en jeu</span><h1 class="h-l">Question d\'essai</h1><p class="lead">Réponds juste pour voir l\'effet de promotion vers <b style="color:var(--gold)">' + esc(RANKS[nextIdx].n) + '</b> (et une erreur pour voir la rétrogradation). Ta vraie progression ne bouge pas.</p></div>' +
          '<section class="panel demo-q"><span class="tag">Question bonus</span><h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Quel onglet permet de s\'entraîner sans rien perdre ?</h2><div class="demo-opts">' + answers + "</div>" +
          (this.picked !== null ? '<p class="muted" style="margin:0">' + (this.picked === 1 ? "Bonne réponse ! L'Entraînement se joue sans XP : parfait pour apprendre." : "Raté : c'est l'Entraînement, qui se joue sans XP.") + '</p><button type="button" class="btn btn-ghost" data-action="demoAgain" style="align-self:flex-start">Rejouer la question</button>' : "") + "</section>" +
          '<div class="demo-more"><span class="eyebrow" style="font-size:12px">Revoir directement</span><div class="btn-row"><button type="button" class="btn btn-ghost" data-action="demoPromo">Promotion</button><button type="button" class="btn btn-ghost" data-action="demoMax">Rang maximum</button><button type="button" class="btn btn-ghost" data-action="demoDown">Rétrogradation</button></div>' +
          '<p class="muted" style="margin:0;font-size:14px">Les sons se jouent dans cet aperçu même s\'ils sont coupés. Sur téléphone, vérifie que le mode silencieux est désactivé.</p></div></main>';
      }
    };
  }

  /* Page « Confidentialité » : décrit ce que le site stocke réellement (rien hors de l'appareil) */
  /* =========================================================
     VUE : À PROPOS (présentation du projet pour les visiteurs, recruteurs, formateurs)
     ========================================================= */
  /* Page « Jouer » : regroupe l'entraînement libre et le mode classé (les adresses #/entrainement et #/classe restent valables) */
  function JouerView() {
    return {
      nav: "jouer",
      render: function () {
        var ri = rankIndex(P.xp), cur = RANKS[ri], nq = Math.floor((QUESTIONS.length - 1) / 100) * 100;
        return '<main class="container page"><span class="eyebrow">Jouer</span><h1 class="h-l">Comment veux-tu jouer ?</h1><p class="lead">Deux façons de réviser les mêmes questions : tranquille pour apprendre, ou sous pression pour grimper les grades. <span class="jouer-bossnote"> Les boss ont leur propre onglet.</span></p>' +
          '<div class="modes jouer-modes">' +
          '<a class="mode-card" href="#/entrainement" style="--mc:#4CC37A"><span class="jouer-ti" aria-hidden="true">📘</span><span class="tag" style="background:var(--green-2)">Entraînement</span><b class="jouer-tt">S\'entraîner</b><blockquote class="mode-quote">« Même les plus grands héros ont eu besoin d\'une salle d\'entraînement. »<cite>Hotfix</cite></blockquote><p>Par pilier, par thème ou par niveau, à ton rythme. Aucune XP en jeu : trompe-toi, lis les explications, recommence.</p><span class="muted" style="font-size:14px">Plus de ' + nq + ' questions · 6 formats</span><span class="btn btn-primary jouer-go" aria-hidden="true">S\'entraîner</span></a>' +
          '<a class="mode-card" href="#/classe" style="--mc:#D9A35B"><span class="jouer-ti" aria-hidden="true">🏆</span><span class="tag">Classé</span><b class="jouer-tt">Partie classée</b><blockquote class="mode-quote">« Avec de grands droits admin viennent de grandes responsabilités. »<cite>Sudo</cite></blockquote><p>Tous sujets confondus. Choisis ta difficulté : plus c\'est dur, plus tu grimpes vite… et plus une erreur coûte cher.</p><span class="muted" style="font-size:14px">Ton grade : ' + esc(cur.n) + " · " + P.xp + ' XP · 4 difficultés</span><span class="btn btn-primary jouer-go" aria-hidden="true">Lancer une partie classée</span></a>' +
          '<a class="mode-card jouer-boss" href="#/mission" style="--mc:#FFC83D"><span class="jouer-ti" aria-hidden="true">🛡️</span><span class="tag" style="background:#FFC83D;color:#1B1405">Boss</span><b class="jouer-tt">Affronte un boss</b><p>Un boss par domaine, et un boss ultime pour finir. Vaincs-les pour gagner badges et capes.</p>' + bossBar() + '<span class="btn btn-primary jouer-go" aria-hidden="true">Voir les boss</span></a>' +
          "</div></main>";
      }
    };
  }
  /* progression des boss (tuile « Boss » de Jouer sur téléphone) */
  function bossBar() {
    var bs = (window.BOSSES || []).filter(function (b) { return b.status === "live"; }), won = bs.filter(function (b) { return Object.keys(((P.bosses || {})[b.id] || {}).levels || {}).length > 0; }).length;
    if (!bs.length) return "";
    return '<div class="jouer-bar"><div class="jb-top"><span>Boss vaincus</span><b>' + won + " / " + bs.length + '</b></div><div class="jb-track"><i style="width:' + Math.round(100 * won / bs.length) + '%"></i></div></div>';
  }
  /* =========================================================
     ESPACE DÉTENTE : mini-jeux liés au site (js/detente.js), sans XP : scores, badge et un personnage à débloquer
     ========================================================= */
  function detenteData() { P.detente = P.detente || {}; P.detente.mail = P.detente.mail || { best: 0, plays: 0 }; return P.detente.mail; }
  var GAMES2 = {
    pwd: { fn: "pwd", ico: "🔑", t: "Le mot de passe en béton", d: "Cinq coffres à verrouiller. Le temps de cassage est estimé en direct, et la dernière manche exige une vraie phrase de passe.", max: "/ 1 500" },
    fw: { fn: "firewall", ico: "🛡️", t: "Pare-feu", d: "Lis les règles, dans l'ordre, et décide : autoriser ou bloquer. Quatre vagues, des règles de plus en plus piégeuses.", max: "" },
    mem: { fn: "memory", ico: "🃏", t: "Memory des héros", d: "Dix paires portrait / domaine, et seulement 22 coups. Il faut connaître le QG sur le bout des doigts.", max: "" },
    colle: { fn: "colle", ico: "📋", t: "Colle ou ne colle pas", d: "Quinze textes à soumettre à une IA : tu colles, tu masques d'abord ou tu ne colles pas. Ça démarre doucement, puis les pièges se cachent dans les détails.", max: "", nogoal: true }
  };
  function game2Data(id) { P.detente = P.detente || {}; P.detente[id] = P.detente[id] || { best: 0, plays: 0 }; return P.detente[id]; }
  function comboToast(was) {
    if (was || !comboGot()) return;
    var t = document.createElement("div"); t.className = "rb-toast badge-toast"; t.setAttribute("role", "status");
    t.innerHTML = '<span class="ico">★</span><span><b>Nouveau personnage : Combo !</b>Tu as atteint l\'objectif dans les 4 jeux. <a class="toast-link" href="#/profil" data-toast-go data-open-step="step1">Choisir Combo →</a></span>';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 9000); sfx("badge");
  }
  function goalLine(k) {
    var b = detenteBest(k), g = DETENTE_GOALS[k], ok = b >= g, pc = Math.min(100, Math.round(b / g * 100));
    return '<div class="dtp-gauge' + (ok ? " ok" : "") + '"><div class="dtp-gl"><span>' + (ok ? "✓ Objectif Combo atteint" : "Objectif Combo") + "</span><b>" + Math.min(b, g) + " / " + g + '</b></div><div class="dtp-gb" role="img" aria-label="Progression vers l\'objectif : ' + pc + ' %"><i style="width:' + pc + '%"></i></div></div>';
  }
  function playGame(id) {
    var G = GAMES2[id]; if (!G || !window.PUDetente || !window.PUDetente[G.fn]) return;
    window.PUDetente[G.fn]({
      lite: liteOn(), sfx: sfx, best: game2Data(id).best, target: DETENTE_GOALS[id],
      onEnd: function (r) { var was = comboGot(), d = game2Data(id); d.plays = (d.plays || 0) + 1; if (r.score > d.best) d.best = r.score; saveProfile(); comboToast(was); },
      onClose: function () { if (location.hash.indexOf("#/detente") === 0) render(); }
    });
  }
  function playMail() {
    if (!window.PUDetente) return;
    window.PUDetente.mail({
      lite: liteOn(), sfx: sfx, best: detenteData().best, target: DETENTE_GOALS.mail,
      onEnd: function (r) {
        var was = comboGot(), d = detenteData(); d.plays = (d.plays || 0) + 1; d.okTotal = (d.okTotal || 0) + r.ok; if (r.score > d.best) d.best = r.score; saveProfile(); comboToast(was);
      },
      onClose: function () { if (location.hash.indexOf("#/detente") === 0) render(); }
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-detente-play]"); if (!b) return;
    var g = b.getAttribute("data-detente-play"); if (g === "mail") playMail(); else if (g === "arpanet") openArpanet(); else playGame(g);
  });
  function DetenteView() {
    return {
      nav: "detente",
      render: function () {
        var d = detenteData(), got = comboGot(), nb = got ? 4 : comboCount(), pct = Math.round(Object.keys(DETENTE_GOALS).reduce(function (a, k) { return a + Math.min(1, detenteBest(k) / DETENTE_GOALS[k]); }, 0) / 4 * 100), arp = !!(P.secrets && P.secrets.arpanet);
        var cMail = '<div class="dtp-card"><span class="dtp-ico" aria-hidden="true">📬</span><h3>Le tri du courrier</h3><p>Phishing ou vrai mail ? Repère les pièges avant que le temps ne file. Combo, vies, et une explication à chaque erreur.</p><span class="dtp-meta">' + (d.best ? "Meilleur score : " + d.best + " · " + (d.plays || 0) + " partie" + ((d.plays || 0) > 1 ? "s" : "") : "Pas encore joué") + '</span>' + goalLine("mail") + '<button type="button" class="btn btn-primary" data-detente-play="mail">Jouer</button></div>';
        var cArp = arp ? '<div class="dtp-card"><span class="dtp-ico" aria-hidden="true">🔐</span><h3>Le décodeur</h3><p>Casse trois chiffres de César par déduction, comme les décrypteurs d\'autrefois. Un secret du QG à rejouer.</p><span class="dtp-meta">Meilleur : ' + (P.arpanetStars || 0) + " / 9 ★</span>" + '<button type="button" class="btn btn-primary" data-detente-play="arpanet">Rejouer</button></div>'
          : '<div class="dtp-card soon"><span class="dtp-ico" aria-hidden="true">❓</span><h3>Un jeu caché</h3><p>Un jeu se cache quelque part dans le QG. Cherche dans les secrets de ton profil : il apparaîtra ici quand tu l\'auras trouvé.</p></div>';
        var soon = Object.keys(GAMES2).map(function (k) { var G = GAMES2[k], x = game2Data(k); return '<div class="dtp-card"><span class="dtp-ico" aria-hidden="true">' + G.ico + '</span><h3>' + G.t + '</h3><p>' + G.d + '</p><span class="dtp-meta">' + (x.best ? "Meilleur score : " + x.best + " · " + x.plays + " partie" + (x.plays > 1 ? "s" : "") : "Pas encore joué") + '</span>' + (G.nogoal ? "" : goalLine(k)) + '<button type="button" class="btn btn-primary" data-detente-play="' + k + '">Jouer</button></div>'; }).join("");
        var cIdea = '<div class="dtp-card soon dtp-idea"><span class="dtp-ico" aria-hidden="true">💡</span><h3>D\'autres jeux arrivent</h3><p>De nouveaux jeux seront ajoutés plus tard. Une idée de jeu en lien avec M365, la cyber ou l\'IT ? Glisse-la dans la boîte à idées.</p><button type="button" class="btn btn-ghost" data-feedback>Proposer une idée</button></div>';
        var face = window.avatarSvg ? window.avatarSvg("combo", 110) : "";
        var reward = '<section class="dtp-reward" aria-labelledby="dtp-rw"><span class="dtp-face' + (got ? "" : " locked") + '">' + face + '</span><div><h3 id="dtp-rw">Combo, la reine du high score</h3><p>' + (got ? "Débloquée ! Tu peux la choisir comme avatar dans ton profil." : "Atteins l'objectif dans les 4 jeux qui ont une jauge « Objectif Combo » pour débloquer ce personnage bonus. La barre avance avec tes points : un jeu est validé quand sa jauge est pleine. Le jeu caché et « Colle ou ne colle pas » ne comptent pas.") + '</p><div class="dtp-prog" role="img" aria-label="Progression : ' + nb + ' jeux sur 4"><i style="width:' + pct + '%"></i></div>' + (got ? '<p style="margin-top:10px"><a class="btn btn-ghost" href="#/profil">Choisir Combo</a></p>' : '<p class="dtp-meta" style="margin-top:6px">' + nb + " / 4 jeux validés</p>") + "</div></section>";
        return '<main class="container page"><span class="eyebrow" style="color:var(--gold)">Espace détente</span><h1 class="h-l">Souffle un peu</h1><p class="lead">Des petits jeux en lien avec le site, sans XP ni classement : juste ton score, des badges et un personnage bonus à débloquer.</p><div class="dtp-grid">' + cMail + soon + cArp + cIdea + "</div>" + reward + "</main>";
      }
    };
  }
  function AboutView() {
    return {
      nav: "",
      render: function () {
        var en = window.PU_LANG === "en";
        var qApprox = Math.floor((QUESTIONS.length - 1) / 100) * 100;
        function h(t) { return '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">' + t + "</h2>"; }
        function ul(a) { return '<ul style="padding-left:20px;line-height:1.7">' + a.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }
        if (en) return '<main class="container page"><span class="eyebrow">About</span><h1 class="h-l">About Power Up</h1>' +
          '<p class="lead">Power Up is a free, playful training site for Microsoft 365, cybersecurity, IT, development, AI and responsible digital use. It is a personal project born from an idea: giving teams a game-based way to revise. Designed as part of my retraining as an IT systems and networks technician (TSSR).</p>' +
          '<p>The site is <b>still in development</b>: it is not perfect, and it keeps evolving with ideas and feedback. A suggestion, a remark, a mistake you spotted? Please do not hesitate to tell me, using the idea box.</p><p><button type="button" class="btn btn-primary" data-feedback>💡 Open the idea box</button></p>' +
          '<p class="footer-eco" style="margin:14px 0 0"><span class="ft-ico ft-leaf" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M20 3.5C9.5 3.5 4 8.5 4 15c0 1.9.6 3.6 1.5 5 6.9-.4 14.5-4.4 14.5-16.5z" fill="#4CC37A" fill-opacity=".25" stroke="#4CC37A" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.5 20c2.4-4.4 6-7.8 10-10" fill="none" stroke="#4CC37A" stroke-width="1.8" stroke-linecap="round"/></svg></span> Eco-designed: light, no video, no trackers.</p>' + h("Why this project") + '<p>Learning IT is easier when it feels like a game. Power Up turns revision into quests, ranks, heroes and bosses, while every answer comes with a short explanation so you actually learn something.</p>' +
          h("What you can do") + ul(["<b>Train</b> by theme and level, with no pressure.", "<b>Ranked mode</b>: four difficulty levels, where the harder it is, the more XP you earn and the more a mistake costs.", "<b>Boss missions</b> built on real situations such as phishing.", "<b>Spaced revision</b> and a “my mistakes” mode to review what you missed, plus a personal <a href=\"#/stats\">Review page</a>.", "<b>Team challenges</b>: the same questions for everyone, to compare scores with colleagues.", "<b>Tech watch</b> with security alerts and news.", "<b>French and English</b> versions, and an <b>offline mode</b>."]) +
          h("How it is built") + ul(["Plain HTML, CSS and JavaScript: no framework, no server, no database.", "Progress is stored only in your browser: no account, no cookies, no trackers.", "Automatic build and deployment (GitHub Actions to Cloudflare Pages), with checks before each release.", "Strict security headers (Content Security Policy), self-hosted fonts and sounds, a light page weight.", "Over " + qApprox + " questions, written and reviewed with care; tell me if you spot a mistake with the “Report” button."]) +
          h("Skills at work") + '<p>Web fundamentals, secure configuration of a static site, CI/CD, eco-design choices, plus content writing for Microsoft 365, networks, systems and security.</p>' +
          '<div class="btn-row"><a class="btn btn-ghost" href="#/nouveautes">What\'s new</a><a class="btn btn-primary" href="#/">Back to home</a></div></main>';
        return '<main class="container page"><span class="eyebrow">À propos</span><h1 class="h-l">À propos de Power Up</h1>' +
          '<p class="lead">Power Up est un site d\'entraînement gratuit et ludique sur Microsoft 365, la cybersécurité, l\'informatique, le développement, l\'IA et le numérique responsable. C\'est un projet personnel, né d\'une idée : offrir aux équipes un outil de révision par le jeu. Conçu dans le cadre de ma reconversion TSSR.</p>' +
          '<p>Le site est <b>toujours en développement</b> : il n\'est pas parfait, et il évolue au fil des idées et des retours. Une suggestion, une remarque, une erreur repérée ? N\'hésite surtout pas à me le dire, avec la boîte à idées.</p><p><button type="button" class="btn btn-primary" data-feedback>💡 Ouvrir la boîte à idées</button></p>' +
          '<p class="footer-eco" style="margin:14px 0 0"><span class="ft-ico ft-leaf" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M20 3.5C9.5 3.5 4 8.5 4 15c0 1.9.6 3.6 1.5 5 6.9-.4 14.5-4.4 14.5-16.5z" fill="#4CC37A" fill-opacity=".25" stroke="#4CC37A" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.5 20c2.4-4.4 6-7.8 10-10" fill="none" stroke="#4CC37A" stroke-width="1.8" stroke-linecap="round"/></svg></span> Éco-conçu : léger, sans vidéo, sans pisteur.</p>' + h("Pourquoi ce projet") + '<p>On apprend l\'informatique plus facilement quand c\'est un jeu. Power Up transforme la révision en quêtes, rangs, héros et boss, et chaque réponse est accompagnée d\'une courte explication pour vraiment apprendre.</p>' +
          h("Ce que tu peux faire") + ul(["<b>T\'entraîner</b> par thème et par niveau, sans pression.", "<b>Mode classé</b> : quatre niveaux de difficulté. Plus c\'est dur, plus tu gagnes d\'XP… et plus une erreur coûte cher.", "<b>Missions boss</b> inspirées de situations réelles, comme le phishing.", "<b>Révision espacée</b> et mode « mes erreurs » pour revoir ce que tu as raté, avec un onglet <a href=\"#/stats\">Révisions</a> personnel.", "<b>Défis entre collègues</b> : les mêmes questions pour tout le monde, pour comparer vos scores.", "<b>Veille technologique</b> : alertes de sécurité et actualités.", "Versions <b>française et anglaise</b>, et <b>mode hors ligne</b>."]) +
          h("Comment il est construit") + ul(["HTML, CSS et JavaScript simples : ni framework, ni serveur, ni base de données.", "La progression reste dans ton navigateur : pas de compte, pas de cookies, pas de pisteurs.", "Construction et déploiement automatiques (GitHub Actions vers Cloudflare Pages), avec des contrôles avant chaque mise en ligne.", "En-têtes de sécurité stricts (Content Security Policy), polices et sons hébergés avec le site, page légère.", "Plus de " + qApprox + " questions, rédigées et relues avec soin ; si tu repères une erreur, le bouton « Signaler » est là pour ça."]) +
          h("Compétences mises en œuvre") + '<p>Bases du web, configuration sécurisée d\'un site statique, CI/CD, choix d\'éco-conception, et rédaction de contenus sur Microsoft 365, les réseaux, les systèmes et la sécurité.</p>' +
          '<div class="btn-row"><a class="btn btn-ghost" href="#/nouveautes">Voir les nouveautés</a><a class="btn btn-primary" href="#/">Retour à l\'accueil</a></div></main>';
      }
    };
  }
  function PrivacyView() {
    return {
      nav: "",
      render: function () {
        if (window.PU_LANG === "en") return '<main class="container page"><span class="eyebrow">Transparency</span><h1 class="h-l">Privacy</h1>' +
          '<p class="lead">Power Up is an educational project built as part of a TSSR (IT systems and networks technician) training course. The site asks for no account and no email address, and sends no game data to any server.</p>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">What is saved, and where</h2>' +
          '<p>Your progress (experience points, rank, defeated bosses, nickname and hero, news you have read) and your settings (sound, volume, theme, light animations mode, styles) are saved <b>only in your browser</b>, using local storage (localStorage). They stay on your device: nobody else can read them, and they never go through any server of the site.</p>' +
          '<p>To erase your data, you have two options:</p>' +
          '<ul style="padding-left:20px;line-height:1.7"><li>the <b>\u201cReset my progress\u201d</b> button in the \u201cSensitive zone\u201d of your profile (you must type ERASE to unlock it). It erases your progress (experience points, rank, defeated bosses, badges, capes, secrets, statistics) but keeps your nickname, your avatar and your visibility settings. Your news reading and your settings (sound, theme\u2026) are kept too;</li><li>clearing the site data in your browser settings: this erases <b>everything</b>, including your nickname, your settings and your news reading.</li></ul>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">What the site does not use</h2>' +
          '<ul style="padding-left:20px;line-height:1.7"><li>no cookies, no trackers, no visitor statistics;</li><li>no advertising and no embedded social networks;</li><li>no external resources: scripts, fonts and sounds are hosted with the site, and a security policy (CSP) prevents it from contacting other servers.</li></ul>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Idea box</h2>' +
          '<p>It opens your own email app with a prepared message, or copies the text to your clipboard. The site sends nothing by itself: it is up to you whether to send it or not.</p>' + ((window.POWERUP_CONFIG || {}).feedbackFormUrl ? '<p>A <b>form</b> is also offered: it is hosted by an external form service (Tally), not by Power Up, and it loads only when you click "Show the form" (or it opens in a new tab). It asks for no name and no email address. Please do not write any personal data in it: messages are used only to improve the site.</p>' : "") +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Hosting and external links</h2>' +
          '<p>The site is hosted by Cloudflare. Like any host, it may keep technical connection logs (IP address, date, page requested) to keep the service running and secure. I do not use these logs. Some pages link to external sites (Microsoft Learn, CNIL, OWASP\u2026): once you are there, their own policy applies.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/">Back to home</a></div></main>';
        return '<main class="container page"><span class="eyebrow">Transparence</span><h1 class="h-l">Confidentialité</h1>' +
          '<p class="lead">Power Up est un projet pédagogique réalisé dans le cadre d\'une formation TSSR. Le site ne demande ni compte ni adresse e-mail, et n\'envoie aucune donnée de jeu à un serveur.</p>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Ce qui est enregistré, et où</h2>' +
          '<p>Ta progression (points d\'expérience, rang, boss vaincus, pseudo et héros, lectures de la veille) et tes réglages (son, volume, thème, mode léger, styles) sont enregistrés <b>uniquement dans ton navigateur</b>, grâce au stockage local (localStorage). Ils restent sur ton appareil : personne d\'autre ne peut les lire, et ils ne passent par aucun serveur du site.</p>' +
          '<p>Pour fonctionner <b>sans connexion</b>, le site peut aussi garder une copie de ses propres fichiers (pages, questions, images, sons) dans le cache de ton navigateur. Cette copie ne contient aucune donnée personnelle et se supprime avec les données du site dans les réglages du navigateur.</p>' +
          '<p>Pour effacer tes données, tu as deux possibilités :</p>' +
          '<ul style="padding-left:20px;line-height:1.7"><li>le bouton <b>« Remettre ma progression à zéro »</b>, dans la « Zone sensible » de ton profil (il faut taper EFFACER pour le débloquer). Il efface ta progression (points d\'expérience, rang, boss vaincus, badges, capes, secrets, statistiques) mais garde ton pseudo, ton avatar et tes réglages de visibilité. Tes lectures de la veille et tes réglages (son, thème…) restent aussi ;</li><li>vider les données du site dans les réglages de ton navigateur : cela efface <b>tout</b>, y compris ton pseudo, tes réglages et tes lectures de la veille.</li></ul>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Ce que le site n\'utilise pas</h2>' +
          '<ul style="padding-left:20px;line-height:1.7"><li>aucun cookie, aucun pisteur, aucune statistique de fréquentation ;</li><li>aucune publicité et aucun réseau social intégré ;</li><li>aucune ressource externe : les scripts, les polices et les sons sont hébergés avec le site, et une politique de sécurité (CSP) empêche de contacter d\'autres serveurs.</li></ul>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Boîte à idées</h2>' +
          '<p>Elle ouvre ta propre messagerie avec un message préparé, ou copie le texte dans ton presse-papiers. Le site n\'envoie rien lui-même : c\'est toi qui décides d\'envoyer ou non.</p>' + ((window.POWERUP_CONFIG || {}).feedbackFormUrl ? '<p>Un <b>formulaire</b> est aussi proposé : il est hébergé par un service externe de formulaires (Tally), pas par Power Up, et ne se charge que si tu cliques sur « Afficher le formulaire » (ou il s\'ouvre dans un nouvel onglet). Il ne demande ni nom ni adresse e-mail. N\'y écris aucune donnée personnelle : les messages servent uniquement à améliorer le site.</p>' : "") +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Hébergement et liens externes</h2>' +
          '<p>Le site est hébergé par Cloudflare. Comme tout hébergeur, il peut conserver des journaux techniques de connexion (adresse IP, date, page demandée) pour assurer le fonctionnement et la sécurité du service. Je n\'exploite pas ces journaux. Certaines pages renvoient vers des sites externes (Microsoft Learn, CNIL, OWASP…) : une fois dessus, c\'est leur propre politique qui s\'applique.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/">Retour à l\'accueil</a></div></main>';
      }
    };
  }

  /* Page « adresse introuvable » : Uptime cherche partout (secret) */
  function NotFoundView() {
    return {
      nav: "",
      render: function () {
        var h = window.heroById("uptime");
        setTimeout(function () { unlockSecret("e404"); }, 1200);
        return '<main class="container page nf-page"><span class="eyebrow">Erreur 404</span><h1 class="h-l">Gardien introuvable</h1>' +
          '<div class="nf-hero">' + (h ? window.heroSvg(h, 150) : "") + '</div>' +
          '<p class="lead">Uptime a fouillé tous les serveurs du QG : cette page n\'existe pas. Elle a peut-être été déplacée, ou elle n\'a jamais existé. Les meilleurs admins ont tous un jour tapé une mauvaise adresse.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/">Retour au QG</a></div></main>';
      }
    };
  }

  function route() {
    var r = parseHash();
    try { RELEASES.forEach(function (x) { if (r.path === "/" + x.tab) relMark("tab", x.id); }); } catch (e) { }
    if (r.path === "/entrainement") V = TrainView(r.params);
    else if (r.path === "/jouer") V = JouerView();
    else if (r.path === "/classe") V = RankedView();
    else if (r.path === "/mission") V = BossMapView();
    else if (r.path === "/veille") V = VeilleView(r.params);
    else if (r.path === "/profil") { V = ProfileView(); V._scrollTo = r.params.s; V.tab = { stats: "stats", vit: "stats", cal: "cal", secrets: "cal", portail: "portail" }[r.params.s] || "hero"; }
    else if (r.path === "/collectif") V = CollectifView(r.params);
    else if (r.path === "/detente") V = DetenteView();
    else if (r.path === "/stats") V = StatsView(false);
    else if (r.path === "/confidentialite") V = PrivacyView();
    else if (r.path === "/apropos") V = AboutView();
    else if (r.path === "/nouveautes") V = ReleasesView();
    else if ((r.path === "/sons" || r.path === "/maintenance") && DEV_PAGES) V = SoundsView();
    else if (r.path === "/demo" && DEV_PAGES) V = DemoView();
    else if (r.path.indexOf("/mission/") === 0 && window.BOSS_MISSIONS && window.BOSS_MISSIONS[r.path.slice(9)]) V = BossView(r.path.slice(9));
    else if (r.path !== "/" && r.path !== "") V = NotFoundView();
    else V = QGView();
    V._scroll = true;
    render();
  }

  /* Flèche jaune du menu sur téléphone : masquée quand il n'y a plus rien à faire défiler */
  function navMore() { var n = document.querySelector(".nav"); if (!n) return; n.classList.toggle("no-more", n.scrollWidth - n.clientWidth - n.scrollLeft < 6); }
  document.addEventListener("scroll", function (e) { if (e.target && e.target.classList && e.target.classList.contains("nav")) navMore(); }, true);
  window.addEventListener("resize", navMore);
  function render() {
    var active = document.activeElement, key = V._focusKey || (active && active.getAttribute && active.getAttribute("data-key"));
    V._focusKey = null;
    app.innerHTML = header(V.nav === "train" && V.reviewKind ? "stats" : V.nav) + V.render() + footer();
    if (V.run && V.run.validated && V.run.q && qById(qidOf(V.run.q))) { var fbk = app.querySelector(".feedback"); if (fbk && !fbk.querySelector("[data-report]")) fbk.insertAdjacentHTML("beforeend", '<button type="button" class="btn btn-ghost" style="align-self:flex-start;font-size:13px" data-report>⚑ Signaler cette question</button>'); }
    if (V._scroll) { window.scrollTo(0, 0); V._scroll = false; }
    var navA = app.querySelector(".nav a.active"); if (navA && navA.parentNode && navA.parentNode.scrollWidth > navA.parentNode.clientWidth) { var nv = navA.parentNode; nv.scrollLeft += (navA.getBoundingClientRect().left - nv.getBoundingClientRect().left) - (nv.clientWidth - navA.offsetWidth) / 2; }
    if (V._scrollTo) { var tgt = document.getElementById(V._scrollTo + "-title"); V._scrollTo = null; if (tgt) setTimeout(function () { tgt.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); var sec = tgt.closest("section"); if (sec) { sec.classList.add("flash-section"); setTimeout(function () { sec.classList.remove("flash-section"); }, 1800); } }, 60); }
    navMore();
    try { placeEggs(); } catch (e) { }
    try { placeQgDeco(); } catch (e) { }
    try { placeNyPill(); } catch (e) { }
    try { placeInstallBanner(); } catch (e) { }
    try { afterRenderInstall(); } catch (e) { }
    try { afterRenderTransfer(); } catch (e) { }
    try { aprilFish(); } catch (e) { }
    if (Date.now() < logoFxUntil) powerOnLogo();
    try { checkUnlocks(); } catch (e) { }
    try { checkBgUnlocks(); } catch (e) { }
    if (V._scrollNews) { V._scrollNews = false; var nt = document.querySelector(".news-toolbar"); if (nt && window.innerWidth <= 820) setTimeout(function () { var tb = document.querySelector(".topbar"), top = nt.getBoundingClientRect().top + window.pageYOffset - (tb ? tb.offsetHeight : 0) - 12; window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" }); }, 60); }
    if (capeWelcomeGap) { var g = capeWelcomeGap; capeWelcomeGap = 0; setTimeout(function () { capeToast("Ta cape est restée au chaud !", g + " jours sans toi… Bon retour au QG, héros. Joue quelques jours d'affilée pour la réchauffer."); }, 1200); }
    if (key) {
      var el = app.querySelector('[data-key="' + key + '"]');
      if (el && !el.disabled) el.focus({ preventScroll: key !== "next" });
    }
  }

  /* Mode classé : « Règles du niveau » se déplie sans sélectionner la carte (les 4 cartes s'ouvrent ensemble pour rester alignées) */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-rules-toggle]"); if (!t || !V) return;
    e.stopPropagation(); e.preventDefault(); V.rulesOpen = !V.rulesOpen; sfx("toggle"); render();
  }, true);
  /* Liens des notifications (badge, cape) : mènent directement à la bonne zone du profil */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-toast-go]"); if (!a) return;
    var st = a.getAttribute("data-open-step"); if (st) openPG[st] = true;
    var toast = a.closest(".rb-toast"); if (toast) toast.remove();
    if (location.hash === a.getAttribute("href")) { e.preventDefault(); route(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && V && V.dlg) { V.dlg = false; V._focusKey = "lv-" + V.level; render(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "type-answer") { e.preventDefault(); var b = document.querySelector('[data-action="validate"]'); if (b) b.click(); }
  });

  /* ---------- glisser-déposer (souris et tactile) pour les questions d'ordre ---------- */
  var drag = null;
  app.addEventListener("pointerdown", function (e) {
    var row = e.target.closest(".order-row.draggable");
    if (!row || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    var list = row.parentNode;
    var gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    drag = { row: row, list: list, startY: e.clientY, gap: gap, id: e.pointerId };
    try { row.setPointerCapture(e.pointerId); } catch (err) { }
    row.classList.add("dragging");
  });
  app.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var row = drag.row, dy = e.clientY - drag.startY;
    var next = row.nextElementSibling, prev = row.previousElementSibling;
    if (next && dy > (next.offsetHeight + drag.gap) / 2) {
      drag.list.insertBefore(next, row);
      drag.startY += next.offsetHeight + drag.gap; dy = e.clientY - drag.startY;
    } else if (prev && dy < -(prev.offsetHeight + drag.gap) / 2) {
      drag.list.insertBefore(row, prev);
      drag.startY -= prev.offsetHeight + drag.gap; dy = e.clientY - drag.startY;
    }
    row.style.transform = "translateY(" + dy + "px)";
    Array.prototype.forEach.call(drag.list.children, function (li, k) { var p = li.querySelector(".pos"); if (p) p.textContent = k + 1; });
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    V.run.ord = Array.prototype.map.call(drag.list.children, function (li) { return +li.getAttribute("data-item"); });
    drag = null;
    render();
  }
  app.addEventListener("pointerup", endDrag);
  app.addEventListener("pointercancel", endDrag);
  app.addEventListener("keydown", function (e) {
    var row = e.target.closest && e.target.closest(".order-row.draggable");
    if (!row || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    move(+row.getAttribute("data-pos"), e.key === "ArrowUp" ? -1 : 1);
    render();
  });

  app.addEventListener("input", function (e) { if (V.saved && e.target && e.target.id === "pseudo") { V.saved = false; var ok = app.querySelector(".saved-ok"); if (ok) ok.remove(); } });
  app.addEventListener("submit", function (e) {
    e.preventDefault();
    if (V.actions && V.actions.save) { V.actions.save(); render(); }
  });
  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    var name = el.getAttribute("data-action");
    var fn = (V.actions && V.actions[name]) || RUN_ACTIONS[name];
    if (!fn) return;
    if (name !== "save" && V.saved) V.saved = false;  /* « Enregistré ! » disparaît dès qu'on modifie quelque chose */
    if (fn(el.dataset) === false) return;
    render();
  });


  /* ---------- effets visuels : logo qui s'allume, étoile sur les onglets ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var logoFxUntil = 0;
  function powerOnLogo() {
    if (reduceMotion) return;
    var logo = app.querySelector(".logo");
    if (!logo) return;
    logo.classList.remove("power-on"); void logo.offsetWidth; logo.classList.add("power-on");
  }
  /* Une animation différente par rubrique :
     QG = éclair, Missions = explosion BD, Entraînement = cible,
     Mode classé = étoile, Veille = radar, Profil = chevrons de rang */
  function fxSparks(n, colors, dmin, dmax) {
    var h = "";
    for (var i = 0; i < n; i++) {
      var a = i * (360 / n) + Math.random() * (360 / n / 2), d = dmin + Math.random() * (dmax - dmin), sz = 3 + Math.random() * 4;
      h += '<span class="fx-spark" style="--a:' + a + "deg;--d:" + d + "px;--c:" + colors[i % colors.length] + ";--s:" + sz + 'px"></span>';
    }
    return h;
  }
  var FX = {
    star: function () {
      return '<span class="fx-flash"></span><span class="fx-ring"></span><svg class="fx-star" viewBox="0 0 24 24"><path d="M12 1l2.8 7.2L22 11l-7.2 2.8L12 21l-2.8-7.2L2 11l7.2-2.8z"/></svg>' + fxSparks(12, ["#8EA2FF", "#FFFFFF", "#D9A35B", "#6E88FF"], 24, 42);
    },
    bolt: function () {
      var arcs = "";
      for (var i = 0; i < 8; i++) arcs += '<span class="fx-arc" style="--a:' + (i * 45 + 20) + 'deg"></span>';
      return '<span class="fx-flash" style="--fc:rgba(110,136,255,.7)"></span>' + arcs + '<svg class="fx-bolt" viewBox="0 0 20 20"><path d="M11 1 4 11h5l-1.5 8L15 9h-5z"/></svg>';
    },
    bam: function () {
      return '<svg class="fx-bam" viewBox="-60 -60 120 120"><polygon points="0,-56 12,-24 44,-40 26,-10 58,2 24,14 38,46 8,26 -4,58 -14,26 -46,42 -28,10 -58,-4 -26,-16 -40,-46 -10,-26" /><text x="0" y="9" text-anchor="middle">BAM!</text></svg>' + fxSparks(8, ["#D9A35B", "#FFFFFF", "#FF6B8A"], 28, 44);
    },
    target: function () {
      return '<span class="fx-tring r1"></span><span class="fx-tring r2"></span><span class="fx-tring r3"></span><span class="fx-tdot"></span>' +
        '<svg class="fx-dart" viewBox="0 0 40 40"><path d="M4 4 L30 30" stroke="#E8ECF4" stroke-width="3" stroke-linecap="round"/><path d="M30 30 l-9 -2 l7 -7 z" fill="#7CC596"/><path d="M4 4 l6 1 l-5 5 z M8 2 l4 1 l-3 3 z" fill="#D9A35B"/></svg>' +
        fxSparks(8, ["#7CC596", "#FFFFFF"], 26, 44);
    },
    /* Onglet Collectif : deux mains qui se rejoignent et se serrent */
    team: function () {
      var O = 'stroke="#0B0E13" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
      return '<span class="fx-flash" style="--fc:rgba(245,196,81,.5)"></span><svg class="fx-shake" viewBox="0 0 96 54">' +
        '<g class="sk-l"><rect x="2" y="14" width="15" height="26" rx="4" fill="#E8ECF4" ' + O + '/><path d="M17 17 H46 Q52 17 54 22 L54 34 Q52 38 46 38 H17 Z" fill="#F5C451" ' + O + '/></g>' +
        '<g class="sk-r"><rect x="79" y="14" width="15" height="26" rx="4" fill="#E8ECF4" ' + O + '/><path d="M79 17 H52 Q44 17 41 23 L41 33 Q44 38 52 38 H79 Z" fill="#6E88FF" ' + O + '/>' +
        '<path d="M44 20.5 h10 M44 25 h10 M44 29.5 h10 M44 34 h10" stroke="#0B0E13" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>' +
        '<g class="sk-t"><path d="M30 16 Q36 10 46 13 L52 18 Q46 20 40 19 Q34 21 30 20 Z" fill="#F5C451" ' + O + '/></g></svg>' + fxSparks(8, ["#F5C451", "#6E88FF", "#FFFFFF"], 26, 44);
    },
    slash: function () {
      return '<span class="fx-flash" style="--fc:rgba(255,77,94,.45)"></span><span class="fx-slash s1"></span><span class="fx-slash s2"></span><span class="fx-slash s3"></span>' + fxSparks(8, ["#FF4D5E", "#FFFFFF", "#FFB0BC"], 24, 46);
    },
    radar: function () {
      return '<span class="fx-wave w1"></span><span class="fx-wave w2"></span><span class="fx-wave w3"></span><span class="fx-sweep"></span>' +
        '<span class="fx-blip" style="--x:-26px;--y:-14px;--dl:.15s"></span><span class="fx-blip" style="--x:22px;--y:-24px;--dl:.3s"></span><span class="fx-blip" style="--x:14px;--y:24px;--dl:.45s"></span>';
    },
    rank: function () {
      return '<span class="fx-flash" style="--fc:rgba(217,163,91,.6)"></span><span class="fx-chev c1"></span><span class="fx-chev c2"></span><span class="fx-chev c3"></span>' + fxSparks(8, ["#D9A35B", "#FFFFFF"], 30, 50);
    },
    /* Onglet Jouer : un bouton « lecture » qui s'enclenche, avec des ondes */
    dice: function () {
      return '<span class="fx-flash" style="--fc:rgba(245,196,81,.45)"></span><span class="fx-wave w1"></span><span class="fx-wave w2"></span><svg class="fx-dice" viewBox="-24 -24 48 48"><path d="M-9 -15 L16 0 L-9 15 Z" fill="#F5C451" stroke="#0B0E13" stroke-width="3.2" stroke-linejoin="round"/><path d="M-5 -8 L6 -1" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity=".55"/></svg>' + fxSparks(8, ["#F5C451", "#FFFFFF", "#6E88FF"], 28, 48);
    },
    /* Onglet Détente : une manette qui bondit, boutons qui s'allument */
    pad: function () {
      return '<span class="fx-flash" style="--fc:rgba(110,136,255,.45)"></span><svg class="fx-pad" viewBox="0 0 64 40"><path d="M14 5 H50 Q60 5 62 18 L63 30 Q63 38 55 37 Q50 36 46 30 H18 Q14 36 9 37 Q1 38 1 30 L2 18 Q4 5 14 5 Z" fill="#6E88FF" stroke="#0B0E13" stroke-width="2.6" stroke-linejoin="round"/><path d="M10 12 Q12 9 16 9 H34" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".45"/><path d="M13 15 v11 M7.5 20.5 h11" stroke="#0B0E13" stroke-width="3.4" stroke-linecap="round"/><circle class="fx-pb b1" cx="46" cy="14.5" r="3.4" fill="#F5C451"/><circle class="fx-pb b2" cx="53" cy="20.5" r="3.4" fill="#FF6B8A"/><circle class="fx-pb b3" cx="46" cy="26.5" r="3.4" fill="#4CE08A"/><circle class="fx-pb b4" cx="39" cy="20.5" r="3.4" fill="#52D6FF"/></svg>' + fxSparks(8, ["#F5C451", "#52D6FF", "#FF6B8A", "#FFFFFF"], 28, 48);
    },
    /* Onglet Mes stats : un petit histogramme dont les barres montent, avec la ligne de base */
    bars: function () {
      var bar = function (x, y, h, c, n) { return '<rect class="fx-pbar" style="--d:' + (n * .1) + 's" x="' + x + '" y="' + y + '" width="12" height="' + h + '" rx="2" fill="' + c + '" stroke="#0B0E13" stroke-width="2.4" stroke-linejoin="round"/>'; };
      return '<span class="fx-flash" style="--fc:rgba(76,224,138,.4)"></span><svg class="fx-prog" viewBox="0 0 64 48">' + bar(5, 32, 12, "#6E88FF", 0) + bar(21, 24, 20, "#52D6FF", 1) + bar(37, 16, 28, "#F5C451", 2) +
        '<path class="fx-parrow" d="M4 24 L20 13 L30 18 L50 5" fill="none" stroke="#0B0E13" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><path class="fx-parrow" d="M4 24 L20 13 L30 18 L50 5" fill="none" stroke="#4CE08A" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="fx-phead" d="M62 1 L46 3.5 L56 15 Z" fill="#4CE08A" stroke="#0B0E13" stroke-width="2.4" stroke-linejoin="round"/></svg>' + fxSparks(5, ["#F5C451", "#FFFFFF"], 26, 44);
    }
  };
  function spawnFx(kind, x, y) {
    if (reduceMotion || !FX[kind]) return;
    var root = document.createElement("div");
    root.className = "fx-burst fxk-" + kind; /* préfixe fxk- : évite que le conteneur hérite des styles de l'effet (taille, animation) */ root.setAttribute("aria-hidden", "true");
    root.style.left = x + "px"; root.style.top = y + "px";
    root.innerHTML = FX[kind]();
    document.body.appendChild(root);
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 1100);
  }
  function fxKindFor(el) {
    if (el.classList.contains("profile-chip")) return "rank";
    var h = el.getAttribute("href") || "";
    if (h.indexOf("#/classe") === 0) return "star";
    if (h.indexOf("#/entrainement") === 0) return "target";
    if (h.indexOf("#/mission") === 0) return "slash";
    if (h.indexOf("#/collectif") === 0) return "team";
    if (h.indexOf("#/veille") === 0) return "radar";
    if (h.indexOf("#/stats") === 0) return "bars";
    if (h.indexOf("#/detente") === 0) return "pad";
    if (h.indexOf("#/jouer") === 0) return "dice";
    return "bolt";
  }
  document.addEventListener("click", function (e) {
    var rl = e.target.closest && e.target.closest("[data-read-url]");
    if (rl) { var ru = rl.getAttribute("data-read-url"); if (!veilleRead[ru]) { var art = rl.closest(".news"), tt = art && art.querySelector(".news-title"); setTimeout(function () { askFinished(ru, tt ? tt.textContent : ""); }, 150); } return; }
    var fin = e.target.closest && e.target.closest("[data-finish-url]");
    if (fin) { markRead(fin.getAttribute("data-finish-url")); sfx("good"); render(); return; }
    var logo = e.target.closest && e.target.closest(".logo");
    if (logo) { logoFxUntil = Date.now() + 1200; powerOnLogo(); return; }
    var tab = e.target.closest && e.target.closest(".nav a, .profile-chip");
    if (tab) {
      var x = e.clientX, y = e.clientY;
      if (!e.detail || (!x && !y)) { var r = tab.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      sfx("tab");
      if ((tab.getAttribute("href") || "") === location.hash) e.preventDefault(); /* déjà sur la page : on ne remonte pas en haut */
    }
  }, true);

  window.addEventListener("hashchange", route);
  route();
  /* Mode hors ligne : sur le site publié (https) uniquement, jamais en local */
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { }); });
  try { applyFete(); } catch (e) { }
  try { checkEvents(); } catch (e) { }
  /* Clin d'œil : au chargement, le logo se brouille puis se décode (les curieux comprendront… voir le secret ARPANET) */
  try { if (window.PUDecode && !liteOn()) setTimeout(function () { var lg = document.querySelector(".logo"); if (lg) window.PUDecode.scramble(lg, { duration: 1000 }); }, 600); } catch (e) { }

  /* =========================================================
     INTRO : Captain Reboot accueille à l'ouverture du site (une fois par session), effet d'ouverture au clic
     ========================================================= */
  var INTRO_KEY = "powerup365.intro", INTRO_FX_KEY = "powerup365.introfx", INTRO_FX = ["portes", "eclair", "sas", "sascadre", "iris", "hyperespace", "n-coffre", "n-labo", "n-datacenter", "n-vaisseau"], DOOR_FX = ["portes", "eclair", "sas", "sascadre", "n-coffre", "n-labo", "n-datacenter", "n-vaisseau"];
  function introFx() { return "n-vaisseau"; } /* porte validée par Rachel (Vaisseau) */
  /* bourdonnement d'attente (façon film : quelque chose charge) */
  var hum = null;
  function humStart() {
    if (!soundOn || hum) return; var ac = audio(); if (!ac) return;
    try {
      var g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain(), o1 = ac.createOscillator(), o2 = ac.createOscillator(), o3 = ac.createOscillator(), g3 = ac.createGain();
      f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 6;
      o1.type = "sawtooth"; o1.frequency.value = 55; o2.type = "sawtooth"; o2.frequency.value = 55.6; o3.type = "sine"; o3.frequency.value = 1760; g3.gain.value = 0.004 * volume;
      lfo.frequency.value = 0.35; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency);
      o1.connect(f); o2.connect(f); f.connect(g); o3.connect(g3); g3.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.05 * volume * 1.4, ac.currentTime + 1.5);
      [o1, o2, o3, lfo].forEach(function (o) { o.start(); });
      hum = { g: g, nodes: [o1, o2, o3, lfo], ac: ac };
    } catch (e) { hum = null; }
  }
  function humStop() {
    if (!hum) return; var h = hum; hum = null;
    try { h.g.gain.cancelScheduledValues(h.ac.currentTime); h.g.gain.setValueAtTime(h.g.gain.value, h.ac.currentTime); h.g.gain.exponentialRampToValueAtTime(0.0001, h.ac.currentTime + 0.4); setTimeout(function () { h.nodes.forEach(function (o) { try { o.stop(); } catch (e) { } }); }, 500); } catch (e) { }
  }
  /* voix féminine de vaisseau (voix de synthèse du navigateur, en français) */
  /* Voix d'accueil : enregistrement « Bienvenue au QG » fourni par Rachel, retravaillé pour sonner comme sa voix de référence (robotique, hauteur fixe ~190 Hz).
     3 versions (sons/bienvenue-fort|leger|brut.mp3), au choix dans Maintenance ; voix de synthèse en secours. */
  var VOICE_KEY = "powerup365.voice";
  function voiceChoice() { try { return localStorage.getItem(VOICE_KEY) || "moyen"; } catch (e) { return "moyen"; } }
  function voiceClip(base, txt, v) {
    if (!soundOn) return;
    try { var a = new Audio("sons/" + base + "-" + (v || voiceChoice()) + ".mp3"); a.volume = Math.min(1, volume * 1.6); var fb = false; a.addEventListener("error", function () { if (!fb) { fb = true; shipVoice(txt); } }); a.play().catch(function () { if (!fb) { fb = true; shipVoice(txt); } }); } catch (e) { shipVoice(txt); }
  }
  function welcomeVoice(v) { voiceClip("bienvenue", "Bienvenue au QG.", v); }
  function byeVoice(v) { voiceClip("abientot", "À bientôt !", v); }
  function shipVoice(txt) {
    if (!soundOn) return;
    try {
      var sp = window.speechSynthesis; if (!sp) return;
      var speak = function () {
        var vs = (sp.getVoices() || []).filter(function (v) { return /^fr/i.test(v.lang); });
        /* d'après le script de Rachel : priorité aux voix Google (féminine sur Chrome), puis Hortense, Amélie, Denise… */
        var prefs = [/google/i, /hortense/i, /am[ée]lie/i, /denise/i, /julie/i, /eloise/i, /audrey|aur[ée]lie|marie|virginie|c[ée]line/i];
        var pick = null; for (var i = 0; i < prefs.length && !pick; i++) pick = vs.filter(function (v) { return prefs[i].test(v.name); })[0] || null;
        pick = pick || vs[0] || null;
        sp.cancel(); var u = new SpeechSynthesisUtterance(txt); if (pick) { u.voice = pick; u.lang = pick.lang; } else u.lang = "fr-FR";
        u.pitch = 1.15; u.rate = 0.95; u.volume = Math.min(1, volume * 1.8); sp.speak(u);
      };
      /* les voix arrivent en différé sur Chrome et Edge : on attend qu'elles soient chargées */
      if ((sp.getVoices() || []).length) speak(); else { var done = false; sp.addEventListener("voiceschanged", function h() { if (done) return; done = true; sp.removeEventListener("voiceschanged", h); speak(); }); setTimeout(function () { if (!done) { done = true; speak(); } }, 700); }
    } catch (e) { }
  }
  /* sons des portes du vaisseau */
  SFX.fwBurst = function () { var ac = audio(); if (!ac) return; tone(220, 0, 0.18, "sine", 0.1, 70); noiseBurst(0.04, 0.35, 0.16, "bandpass", 1100); for (var i = 0; i < 9; i++) noiseBurst(0.18 + Math.random() * 0.5, 0.02, 0.05 + Math.random() * 0.05, "highpass", 2400 + Math.random() * 2000); };
  SFX.doorUnlock = function () { var ac = audio(); if (!ac) return; [0, 0.16].forEach(function (d) { tone(90, d, 0.12, "square", 0.06); noiseBurst(d, 0.07, 0.14, "bandpass", 700); tone(1400, d + 0.02, 0.05, "square", 0.02); }); };
  SFX.doorSlide = function () { var ac = audio(); if (!ac) return; noiseBurst(0, 0.5, 0.2, "highpass", 2200); capeNoise(0.05, 1.1, "bandpass", 180, 600, 200, 0.8, 0.3, 0, 0);
    var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(48, t + 1.1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035 * volume * 1.4, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.25);
    tone(55, 1.05, 0.25, "square", 0.05); noiseBurst(1.05, 0.12, 0.12, "lowpass", 500); };
  /* Porte blindée du QG (création originale inspirée des sas de vaisseau) */
  function leafSvg(side) {
    var R = side === "r", ink = "#1B1E26";
    var mir = function (inner) { return R ? '<g transform="translate(200 0) scale(-1 1)">' + inner + "</g>" : inner; };
    var shapes =
      '<rect width="200" height="600" fill="url(#bhPlate' + side + ')"/>' +
      '<path d="M16 22 H176 V236 L160 252 V578 H16 Z" fill="none" stroke="' + ink + '" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M30 300 H140 L150 310 V560 H30 Z" fill="none" stroke="' + ink + '" stroke-width="3" opacity=".55"/>' +
      '<rect x="180" y="0" width="20" height="600" fill="#2B303B"/><rect x="186" y="0" width="3" height="600" fill="#11141A"/>' +
      '<path d="M112 128 L150 166 L112 204 V184 L130 166 L112 148 Z" fill="' + ink + '"/>' +
      '<path d="M60 360 L98 398 L60 436 V416 L78 398 L60 380 Z" fill="' + ink + '" opacity=".9"/>' +
      '<g clip-path="url(#bhClip' + side + ')"><rect x="104" y="440" width="46" height="100" fill="#F5C451"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { return '<path d="M' + (90 + k * 16) + ' 560 L' + (130 + k * 16) + ' 420" stroke="' + ink + '" stroke-width="8"/>'; }).join("") + "</g>" +
      [60, 150, 240, 330, 420, 510].map(function (y) { return '<circle cx="194" cy="' + y + '" r="3" fill="#FF8A2B"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" begin="' + (y / 600).toFixed(2) + 's" repeatCount="indefinite"/></circle>'; }).join("") +
      '<rect x="16" y="22" width="160" height="556" fill="url(#bhGrime' + side + ')"/>';
    var texts = R
      ? '<text x="150" y="60" font-family="Impact, Anton, sans-serif" font-size="30" fill="' + ink + '" text-anchor="end">365</text><path d="M156 44 l10 8 -10 8z" fill="' + ink + '"/>' +
        '<text transform="translate(52 110) rotate(90)" font-family="Impact, Anton, sans-serif" font-size="22" letter-spacing="3" fill="' + ink + '">SECTEUR QG</text>' +
        '<text x="44" y="566" font-family="Impact, Anton, sans-serif" font-size="30" fill="' + ink + '">365</text><path d="M30 550 l10 8 -10 8z" fill="' + ink + '"/>'
      : '<text x="42" y="60" font-family="Impact, Anton, sans-serif" font-size="30" fill="' + ink + '">365</text><path d="M104 44 l10 8 -10 8z" fill="' + ink + '"/>' +
        '<text transform="translate(150 70) rotate(90)" font-family="Impact, Anton, sans-serif" font-size="22" letter-spacing="3" fill="' + ink + '">ACCÈS RÉSERVÉ</text>' +
        '<text transform="translate(52 560) rotate(-90)" font-family="Impact, Anton, sans-serif" font-size="30" letter-spacing="2" fill="' + ink + '">POWER UP</text>';
    return '<svg class="bh-leaf-svg" viewBox="0 0 200 600" preserveAspectRatio="none" aria-hidden="true"><defs>' +
      '<linearGradient id="bhPlate' + side + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4E6EA"/><stop offset=".55" stop-color="#CDD1D8"/><stop offset="1" stop-color="#AEB3BC"/></linearGradient>' +
      '<radialGradient id="bhGrime' + side + '" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#3A2E22" stop-opacity=".35"/><stop offset=".6" stop-color="#3A2E22" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="bhClip' + side + '"><rect x="104" y="440" width="46" height="100"/></clipPath></defs>' + mir(shapes) + texts + "</svg>";
  }
  /* Portes de vaisseau plein écran, jointure en éclair (« cassée ») */
  /* Porte blindée du QG + une cassure en éclair au milieu de la jointure */
  var SEAM_L = [[92.6, 0], [92.6, 42], [85.2, 53], [100, 49.5], [90.7, 61], [90.7, 100]];
  var SEAM_R = SEAM_L.map(function (p) { return [p[0] - 85.2, p[1]]; });
  function seamSvg(pts) { var line = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
    return '<svg class="bh-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + line + '" fill="none" stroke="#11141A" stroke-width="7" vector-effect="non-scaling-stroke"/><polyline class="neon" points="' + line + '" fill="none" stroke="#FF8A2B" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'; }
  /* ---------- Portes à tester (Maintenance seulement) : 4 pistes pour remplacer les portes du QG ---------- */
  function newDoorsHtml(fx) {
    var kind = fx.slice(2), L = "", R = "", mid = "", i;
    var rv = function (n, css) { var h = ""; for (i = 0; i < n; i++) h += '<i class="nd-rv" style="top:' + (5 + i * (90 / (n - 1))).toFixed(1) + "%;" + css + '"></i>'; return h; };
    var svgP = function (inner) { return '<svg class="nd-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + inner + "</svg>"; };
    var clipL = "", clipR = "";
    if (kind === "coffre") {
      var pins = ""; [14, 32, 50, 68, 86].forEach(function (y) { pins += '<span class="nd-pin" style="top:' + y + '%"></span>'; });
      var base = '<span class="nd-brush"></span>' + svgP('<rect x="5" y="5" width="90" height="90" rx="2" class="nd-ln"/><rect x="11" y="11" width="78" height="78" rx="2" class="nd-ln2"/><line x1="5" y1="50" x2="95" y2="50" class="nd-ln2"/>') + '<span class="nd-bolts">' + rv(10, "") + "</span>" + pins + '<span class="nd-hinge" style="top:15%"></span><span class="nd-hinge" style="top:76%"></span><span class="nd-grime"></span>';
      L = base + '<span class="nd-engr l">QG · 365</span>'; R = base + '<span class="nd-engr r">COFFRE · B12</span>';
      var spokes = ""; for (i = 0; i < 6; i++) spokes += '<rect x="96" y="20" width="8" height="46" rx="3" transform="rotate(' + i * 60 + ' 100 100)" fill="url(#ndg)" stroke="#05070A" stroke-width="2"/><circle cx="100" cy="14" r="12" transform="rotate(' + i * 60 + ' 100 100)" fill="url(#ndb)" stroke="#05070A" stroke-width="2"/>';
      var tick = ""; for (i = 0; i < 48; i++) tick += '<line x1="100" y1="3" x2="100" y2="' + (i % 4 ? 7 : 11) + '" transform="rotate(' + i * 7.5 + ' 100 100)" stroke="#8A6A32" stroke-width="1.4"/>';
      mid = '<div class="nd-wheel"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="ndg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E96A3"/><stop offset=".5" stop-color="#454C58"/><stop offset="1" stop-color="#1F242C"/></linearGradient><radialGradient id="ndb" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#E2B866"/><stop offset=".55" stop-color="#9A7230"/><stop offset="1" stop-color="#3C2C12"/></radialGradient><radialGradient id="ndp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#232830"/><stop offset="1" stop-color="#0A0C10"/></radialGradient></defs>' +
        '<circle cx="100" cy="100" r="98" fill="url(#ndp)" stroke="#060709" stroke-width="3"/>' + tick + '<circle cx="100" cy="100" r="84" fill="none" stroke="url(#ndb)" stroke-width="8"/><circle cx="100" cy="100" r="76" fill="#0C0F13" stroke="#2A3039" stroke-width="2"/><g class="nd-spin">' + spokes + '</g><circle cx="100" cy="100" r="27" fill="url(#ndb)" stroke="#05070A" stroke-width="3"/><circle cx="100" cy="100" r="17" fill="#0C0F13" stroke="#5A4520" stroke-width="2"/></svg><span class="nd-led"></span></div>';
    } else if (kind === "labo") {
      var vents = ""; for (i = 0; i < 6; i++) vents += "<i></i>";
      var lamps = '<span class="nd-lamps"><i class="r"></i><i class="a"></i><i class="g"></i></span>';
      var leaf = '<span class="nd-ribs"></span>' + svgP('<rect x="6" y="6" width="80" height="88" rx="1.5" class="nd-ln"/><line x1="6" y1="33" x2="86" y2="33" class="nd-ln2"/><line x1="6" y1="67" x2="86" y2="67" class="nd-ln2"/>') + '<span class="nd-hz"></span><span class="nd-slit"></span><span class="nd-bolts">' + rv(8, "") + '</span><span class="nd-win"></span><span class="nd-vents">' + vents + "</span>" + lamps + '<span class="nd-grime"></span>';
      L = leaf + '<span class="nd-num">07</span>'; R = leaf + '<span class="nd-num">A</span>';
      mid = '<span class="nd-tag a">SAS 07 · ACCÈS CONTRÔLÉ</span><span class="nd-tag b">PRESSION NOMINALE</span>';
    } else if (kind === "datacenter") {
      var rack = ""; for (i = 0; i < 9; i++) rack += '<i style="--d:' + (i * 0.37).toFixed(2) + 's"></i>';
      var leaf2 = '<span class="nd-glass"></span><span class="nd-rack">' + rack + '</span><span class="nd-frame"></span><span class="nd-corner a"></span><span class="nd-corner b"></span><span class="nd-bar"></span><span class="nd-grime"></span>';
      L = leaf2; R = leaf2;
      mid = '<div class="nd-reader" aria-hidden="true"><svg class="nd-fp" viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7v3M12 7a3 3 0 0 0-3 3v6M12 7a3 3 0 0 1 3 3v4a6 6 0 0 1-2 4.5M18 10v2a10 10 0 0 1-2 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="nd-rtxt w">LECTEUR BADGE · EN ATTENTE</span><span class="nd-rtxt ok">ACCÈS ACCORDÉ</span><span class="nd-rscan"></span></div><span class="nd-tag a nd-dc">SALLE SERVEURS · NIVEAU −1</span>';
    } else {
      var lines = function (s) { var m = function (x) { return s === "l" ? x : 100 - x; }, P = function (pts) { return pts.map(function (p) { return m(p[0]) + "," + p[1]; }).join(" "); }, N = function (x1, y1, x2, y2, c) { return '<line x1="' + m(x1) + '" y1="' + y1 + '" x2="' + m(x2) + '" y2="' + y2 + '" class="' + c + '"/>'; };
        return svgP('<defs><linearGradient id="nv' + s + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A4560"/><stop offset=".45" stop-color="#1A2134"/><stop offset="1" stop-color="#0A0D16"/></linearGradient><linearGradient id="ni' + s + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070D"/><stop offset="1" stop-color="#0F1424"/></linearGradient></defs>' +
          '<polygon points="' + P([[5, 7], [76, 7], [93, 23], [93, 77], [76, 93], [5, 93]]) + '" fill="url(#nv' + s + ')" class="nd-pl"/>' +
          '<polyline points="' + P([[5, 93], [5, 7], [76, 7], [93, 23]]) + '" class="nd-bev"/><polyline points="' + P([[93, 77], [76, 93], [5, 93]]) + '" class="nd-sh"/>' +
          '<polygon points="' + P([[11, 15], [70, 15], [83, 28], [83, 72], [70, 85], [11, 85]]) + '" fill="url(#ni' + s + ')" class="nd-pl2"/>' +
          '<polygon points="' + P([[16, 21], [66, 21], [76, 31], [76, 69], [66, 79], [16, 79]]) + '" class="nd-pl3"/>' +
          N(11, 50, 83, 50, "nd-pl") + N(11, 46.5, 83, 46.5, "nd-pipe") + N(11, 53.5, 83, 53.5, "nd-pipe") +
          '<polyline points="' + P([[93, 30], [98, 36], [98, 64], [93, 70]]) + '" class="nd-pl"/>' + N(20, 11, 58, 11, "nd-hl") + N(20, 89, 58, 89, "nd-hl") + N(8, 30, 8, 70, "nd-hl")); };
      var lights = ""; for (i = 0; i < 11; i++) lights += '<i style="top:' + (9 + i * 8.2).toFixed(1) + '%;--d:' + (i * 0.12).toFixed(2) + 's"></i>';
      var vv = ""; for (i = 0; i < 5; i++) vv += "<i></i>";
      var latches = [16, 50, 84].map(function (y) { return '<span class="nd-latch" style="top:' + y + '%"><i></i></span>'; }).join("");
      var scr = '<span class="nd-scr"><b></b><b></b><b></b><b></b></span>';
      var warn = '<svg class="nd-warn" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L22 21 H2 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      var tail = '<span class="nd-lights">' + lights + '</span><span class="nd-vv">' + vv + "</span>" + latches + '<span class="nd-hz2"></span><span class="nd-bolts">' + rv(9, "") + '</span><span class="nd-wear"></span><span class="nd-sweep"></span><span class="nd-grime"></span>';
      L = lines("l") + tail + scr + warn + '<span class="nd-code l">PRESS 2.4 BAR<br>VERROU 05/05<br>SYS NOMINAL</span>'; R = lines("r") + tail + scr + warn + '<span class="nd-code r">LOT QG·365-B12<br>COQUE 7 / 7<br>BOUCLIER OK</span>';
      mid = '<div class="intro-hud" aria-hidden="true">' + introEvDeco() + '</div><span class="nd-glow"></span><div class="nd-lintel t"><b>SAS PRINCIPAL · SECTEUR 07</b><em>▼▼▼</em><b>AUTORISATION NIVEAU 3</b></div><div class="nd-lintel b"><b>QG·365</b><em>▲▲▲</em><b>PRESSION ÉQUILIBRÉE</b></div>';
      clipL = ' style="clip-path:polygon(0 0,93% 0,100% 11%,100% 89%,93% 100%,0 100%)"'; clipR = ' style="clip-path:polygon(100% 0,7% 0,0 11%,0 89%,7% 100%,100% 100%)"';
    }
    return '<div class="intro-door l"' + clipL + ">" + L + '</div><div class="intro-door r"' + clipR + ">" + R + "</div>" + mid + '<span class="intro-steam t"></span><span class="intro-steam b"></span>';
  }
  function doorsHtml(fx) {
    if (fx.indexOf("n-") === 0) return newDoorsHtml(fx);
    var lights = ""; for (var k = 0; k < 7; k++) lights += "<i></i>";
    var clipL = "polygon(0% 0%," + SEAM_L.map(function (p) { return p[0] + "% " + p[1] + "%"; }).join(",") + ",0% 100%)";
    var clipR = "polygon(100% 0%," + SEAM_R.map(function (p) { return p[0] + "% " + p[1] + "%"; }).join(",") + ",100% 100%)";
    var bulkhead = '<div class="bulkhead" aria-hidden="true"><div class="bh-frame">' +
      '<div class="bh-head"><span class="bh-dot"></span><div class="bh-plate">ACCÈS QG <b>▸</b></div><span class="bh-dot"></span><div class="bh-lights">' + lights + "</div></div>" +
      '<div class="bh-side l"><span class="bh-vent"></span><span class="bh-orb"></span><span class="bh-orb"></span><span class="bh-box"></span><span class="bh-hz"></span></div>' +
      '<div class="bh-side r"><span class="bh-vent"></span><span class="bh-scan"><svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 8v6M20 26v6M8 20h6M26 20h6" stroke="currentColor" stroke-width="2"/></svg></span><span class="bh-hz"></span><span class="bh-orb"></span></div>' +
      '<div class="bh-opening"><div class="bh-dark"></div>' +
      '<div class="bh-leaf l bolt" style="clip-path:' + clipL + '">' + leafSvg("l") + seamSvg(SEAM_L) + '</div>' +
      '<div class="bh-leaf r bolt" style="clip-path:' + clipR + '">' + leafSvg("r") + seamSvg(SEAM_R) + "</div></div>" +
      '<div class="bh-sill"></div></div></div>';
    /* portes plein écran (étape 56) : jointure droite ou une cassure en éclair */
    /* jointure « emboîtée » : la porte de gauche avance une languette à bout plat dans celle de droite (forme de la référence de Rachel) */
    var Z = fx === "eclair" ? [[50, 0], [50, 33], [56, 40], [56, 60], [50, 67], [50, 100]] : [[50, 0], [50, 100]];
    var ptsL = "0% 0%," + Z.map(function (p) { return p[0] + "% " + p[1] + "%"; }).join(",") + ",0% 100%";
    var ptsR = "100% 0%," + Z.map(function (p) { return p[0] + "% " + p[1] + "%"; }).join(",") + ",100% 100%";
    var line = Z.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
    var zseam = function (side) { var dx = side === "l" ? "-0.7" : "0.7";
      return '<svg class="id-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + line + '" fill="none" stroke="#02040A" stroke-width="14" vector-effect="non-scaling-stroke"/>' +
        '<polyline class="edge" points="' + line + '" fill="none" stroke="#2C4BD8" stroke-width="6" vector-effect="non-scaling-stroke" transform="translate(' + dx + ' 0)"/>' +
        '<polyline class="neon" points="' + line + '" fill="none" stroke="#7FD8FF" stroke-width="2" vector-effect="non-scaling-stroke" transform="translate(' + dx + ' 0)"/>' +
        '<polyline class="runner" points="' + line + '" pathLength="100" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 94" vector-effect="non-scaling-stroke" transform="translate(' + dx + ' 0)"/></svg>'; };
    /* décor futuriste de chaque battant (coordonnées plein écran, traits nets à toutes les tailles) */
    var deco = function (side) {
      var m = side === "l" ? function (x) { return x; } : function (x) { return 100 - x; };
      var P = function (pts) { return pts.map(function (p) { return m(p[0]) + "," + p[1]; }).join(" "); };
      var panel = P([[8, 14], [30, 14], [34, 20], [34, 80], [30, 86], [8, 86], [5, 80], [5, 20]]);
      var inner = P([[11, 22], [28, 22], [30, 25], [30, 75], [28, 78], [11, 78], [9, 75], [9, 25]]);
      var circ = [[[34, 30], [40, 30], [44, 26], [47, 26]], [[34, 50], [44, 50]], [[34, 70], [40, 70], [44, 74], [47, 74]], [[20, 86], [20, 92], [38, 92]], [[20, 14], [20, 8], [38, 8]]];
      var h = '<polygon points="' + panel + '" class="dk-panel"/><polygon points="' + inner + '" class="dk-inner"/>';
      circ.forEach(function (c, i) { h += '<polyline points="' + P(c) + '" class="dk-circ" style="--d:' + (i * 0.4).toFixed(1) + 's"/>'; });
      [30, 50, 70].forEach(function (y) { h += '<circle cx="' + m(side === "l" ? 47 : 47) + '" cy="' + (y === 50 ? 50 : y === 30 ? 26 : 74) + '" r=".45" class="dk-node"/>'; });
      for (var k = 0; k < 6; k++) h += '<line x1="' + m(12) + '" y1="' + (32 + k * 6) + '" x2="' + m(12 + (k % 3 === 0 ? 14 : k % 3 === 1 ? 10 : 6)) + '" y2="' + (32 + k * 6) + '" class="dk-bar" style="--d:' + (k * 0.25).toFixed(2) + 's"/>';
      h += '<line x1="' + m(40) + '" y1="4" x2="' + m(40) + '" y2="96" class="dk-rail"/>';
      /* rivets aux coins du panneau : lecture "plaque blindée usinée" plutôt que décor plat */
      [[8, 14], [30, 14], [34, 20], [34, 80], [30, 86], [8, 86], [5, 80], [5, 20]].forEach(function (p) { h += '<circle cx="' + m(p[0]) + '" cy="' + p[1] + '" r=".55" class="dk-rivet"/>'; });
      /* réglette de diagnostic façon égaliseur, en bas du battant : lecture système en direct */
      var eq = [3.6, 2.1, 4.4, 1.6, 3.1, 2.6, 4, 1.9, 3.3, 2.4];
      eq.forEach(function (bh, b) { h += '<rect x="' + m(9.5 + b * 2.05) + '" y="' + (94 - bh).toFixed(1) + '" width="1.1" height="' + bh + '" class="dk-eq" style="--d:' + (b * 0.11).toFixed(2) + 's"/>'; });
      /* chevrons d'avertissement pointés vers la jointure, en haut et en bas */
      h += '<polygon points="' + P([[45.4, 3], [50, 7.4], [54.6, 3]]) + '" class="dk-chevron"/>';
      h += '<polygon points="' + P([[45.4, 97], [50, 92.6], [54.6, 97]]) + '" class="dk-chevron"/>';
      /* petite étiquette de série façon plaque gravée */
      h += '<text x="' + m(9) + '" y="17" font-family="ui-monospace,Consolas,monospace" font-size="1.9" letter-spacing=".15" class="dk-serial"' + (side === "r" ? ' text-anchor="end"' : "") + '>QG·365-' + (side === "l" ? "A07" : "B12") + "</text>";
      return '<svg class="id-deco" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + h + "</svg>";
    };
    var lock = '<svg class="intro-lock" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" fill="none" stroke="#2A3A78" stroke-width="10"/><circle cx="100" cy="100" r="92" fill="none" stroke="#6E88FF" stroke-width="3" stroke-dasharray="36 12" class="il-seg"/><circle cx="100" cy="100" r="74" fill="none" stroke="#F5C451" stroke-width="2" stroke-dasharray="4 8" class="il-dots"/>' +
      '<circle cx="100" cy="100" r="60" fill="none" stroke="rgba(127,216,255,.4)" stroke-width="1" stroke-dasharray="1 5" class="il-fine"/>' +
      '<g class="il-bolts" fill="#9FB2FF">' + [0, 60, 120, 180, 240, 300].map(function (a) { return '<rect x="96" y="2" width="8" height="18" rx="2" transform="rotate(' + a + ' 100 100)"/>'; }).join("") + "</g></svg>";
    /* cadre HUD : coins de visée + bandeau de statut, lecture "console d'accès" au-dessus des portes */
    var corner = function (cls) { return '<svg class="hud-corner ' + cls + '" viewBox="0 0 40 40" aria-hidden="true"><path d="M2 16V8a6 6 0 0 1 6-6h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="6.5" cy="6.5" r="1.5" fill="currentColor"/></svg>'; };
    var hud = '<div class="intro-hud" aria-hidden="true">' + corner("tl") + corner("tr") + corner("bl") + corner("br") +
      '<div class="intro-status top"><span class="is-dot"></span><span class="is-txt">QG·365 <b class="is-state"></b></span></div>' +
      '<div class="intro-status bottom"><span class="is-txt">SAS PRINCIPAL · SECT. 07</span></div>' + introEvDeco() + '</div>';
    return '<div class="intro-door l zig" style="clip-path:polygon(' + ptsL + ')"><span class="id-panel"></span>' + deco("l") + zseam("l") + '<span class="id-scan"></span></div><div class="intro-door r zig" style="clip-path:polygon(' + ptsR + ')"><span class="id-panel"></span>' + deco("r") + zseam("r") + '<span class="id-scan"></span></div>' +
      bulkhead + '<span class="intro-steam t"></span><span class="intro-steam b"></span>' + lock + hud;
  }
  /* 14 juillet : à l'ouverture du sas, des feux d'artifice partent de la jointure */
  function seamFireworks(pal) {
    if (liteOn() && !DEV_PAGES) return;
    var box = document.createElement("div"); box.className = "fw-seam"; box.setAttribute("aria-hidden", "true");
    var cols = pal || ["#3D6BFF", "#FFFFFF", "#FF3B4A", "#8FB0FF", "#FFD66B"], shots = [[0, 50, 38], [.3, 47, 58], [.55, 53, 30], [.9, 50, 64], [1.2, 45, 40], [1.45, 55, 52], [1.8, 50, 26]], h = "";
    shots.forEach(function (s, bi) {
      var c1 = cols[bi % 3], c2 = cols[(bi + 3) % 5], n = 26;
      h += '<i class="fw-em" style="left:' + s[1] + "%;top:" + s[2] + "%;--d:" + s[0] + 's">' + (bi % 2 ? "🎇" : "🎆") + "</i>";
      for (var i = 0; i < n; i++) {
        var ang = (i * 360 / n + bi * 11) * Math.PI / 180, r = 150 + (i % 3) * 45 + bi * 8, col = i % 2 ? c1 : c2;
        h += '<i class="fw-sp" style="left:' + s[1] + "%;top:" + s[2] + "%;--dx:" + Math.round(Math.cos(ang) * r) + "px;--dy:" + Math.round(Math.sin(ang) * r + 26) + "px;--d:" + s[0] + "s;background:" + col + ";color:" + col + '"></i>';
      }
      setTimeout(function () { sfx("fwBurst"); }, s[0] * 1000 + 120);
    });
    box.innerHTML = h; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 4600);
  }
  /* Saint-Valentin : à l'ouverture du sas, des petits cœurs jaillissent de la jointure */
  function seamHearts() {
    if (liteOn() && !DEV_PAGES) return;
    var box = document.createElement("div"); box.className = "fw-seam"; box.setAttribute("aria-hidden", "true");
    var hs = ["💖", "💗", "💕", "💘", "❤️", "💞"], h = "", i;
    for (var i = 0; i < 34; i++) {
      var side = Math.random() < .5 ? -1 : 1, dx = side * (30 + Math.random() * 300), dy = -(120 + Math.random() * 420);
      h += '<i class="sh" style="left:' + (49.6 + Math.random() * .8) + "%;top:" + (40 + Math.random() * 30) + "%;font-size:" + (14 + Math.random() * 26).toFixed(0) + "px;--dx:" + dx.toFixed(0) + "px;--dy:" + dy.toFixed(0) + "px;--rot:" + Math.round(-40 + Math.random() * 80) + "deg;--d:" + (Math.random() * .9).toFixed(2) + 's">' + hs[i % hs.length] + "</i>";
    }
    box.innerHTML = h; document.body.appendChild(box);
    [0, 160, 340, 560].forEach(function (d, k) { setTimeout(function () { tone(620 + k * 140, 0, .09, "sine", .07, 900 + k * 140); }, d); });
    setTimeout(function () { box.remove(); }, 3600);
  }
  /* Halloween : une nuée de chauves-souris traverse l'écran (ouverture du sas, citrouille) */
  function batSvg() {
    return '<svg viewBox="0 0 80 44" aria-hidden="true"><defs><linearGradient id="btw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A55"/><stop offset="1" stop-color="#150E24"/></linearGradient></defs>' +
      '<g class="bt-wl"><path d="M38 22 C28 6 12 4 0 11 C6 15 8 19 8 26 C12 22 16 24 18 31 C22 27 28 29 32 34 C34 29 36 27 38 28 Z" fill="url(#btw)" stroke="#6A4DA8" stroke-width="1" stroke-linejoin="round"/><path d="M36 24 C28 16 18 12 8 14 M36 26 C28 22 20 22 15 26" stroke="#6A4DA8" stroke-opacity=".6" stroke-width=".8" fill="none"/></g>' +
      '<g class="bt-wr"><path d="M42 22 C52 6 68 4 80 11 C74 15 72 19 72 26 C68 22 64 24 62 31 C58 27 52 29 48 34 C46 29 44 27 42 28 Z" fill="url(#btw)" stroke="#6A4DA8" stroke-width="1" stroke-linejoin="round"/><path d="M44 24 C52 16 62 12 72 14 M44 26 C52 22 60 22 65 26" stroke="#6A4DA8" stroke-opacity=".6" stroke-width=".8" fill="none"/></g>' +
      '<ellipse cx="40" cy="26" rx="5.5" ry="9" fill="#1A1228" stroke="#6A4DA8" stroke-width="1"/><circle cx="40" cy="15" r="5.5" fill="#1A1228" stroke="#6A4DA8" stroke-width="1"/><path d="M35.5 12 L34 5 L39 10 Z M44.5 12 L46 5 L41 10 Z" fill="#1A1228" stroke="#6A4DA8" stroke-width="1" stroke-linejoin="round"/><circle cx="38" cy="15" r="1.3" fill="#FFB02E"/><circle cx="42" cy="15" r="1.3" fill="#FFB02E"/><path d="M38.6 18.6 L39.4 20.4 L40 18.9 L40.6 20.4 L41.4 18.6" stroke="#fff" stroke-width=".7" fill="none"/></svg>';
  }
  function batFlock(n) {
    if (liteOn() && !DEV_PAGES) return;
    var box = document.createElement("div"); box.className = "bat-box"; box.setAttribute("aria-hidden", "true");
    var h = "";
    for (var i = 0; i < n; i++) {
      var ltr = Math.random() < .5, sz = 38 + Math.random() * 56, y0 = 8 + Math.random() * 62, y1 = y0 + (Math.random() * 30 - 15), dur = 3.4 + Math.random() * 2.6, dl = Math.random() * 1.2;
      h += '<div class="bat" style="--y0:' + y0.toFixed(1) + "vh;--y1:" + y1.toFixed(1) + "vh;--x0:" + (ltr ? -14 : 112) + "vw;--x1:" + (ltr ? 112 : -14) + "vw;--w:" + sz.toFixed(0) + "px;--dur:" + dur.toFixed(2) + "s;--dl:" + dl.toFixed(2) + "s;--fl:" + (.16 + Math.random() * .1).toFixed(2) + "s;--dir:" + (ltr ? 1 : -1) + '"><div class="bat-in"><div class="bat-fl">' + batSvg() + "</div></div></div>";
      setTimeout(function () { noiseBurst(.25, .03, .06, "bandpass", 3200 + Math.random() * 1500); }, dl * 1000 + 300);
    }
    box.innerHTML = h; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 8200);
  }
  /* ---- Autres animations de fête (ouverture du sas) : Noël, Nouvel An, Pâques, Fête de la musique ---- */
  function fxBox(ms) { var b = document.createElement("div"); b.className = "bat-box"; b.setAttribute("aria-hidden", "true"); document.body.appendChild(b); setTimeout(function () { b.remove(); }, ms); return b; }
  function reindeerSvg(x, y, k, s) {
    return '<g transform="translate(' + x + " " + y + ") scale(" + (s || 1) + ')"><g class="rd-leg" style="--k:' + k + '"><path d="M16 10 C24 14 30 22 41 20 M8 11 C14 18 22 26 33 26" stroke="#6B4423" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-18 10 C-28 16 -38 14 -47 8 M-10 12 C-22 22 -34 24 -43 22" stroke="#6B4423" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="#2A1A10"><ellipse cx="43" cy="20" rx="3.4" ry="2.6"/><ellipse cx="35" cy="26" rx="3.4" ry="2.6"/><ellipse cx="-49" cy="8" rx="3.4" ry="2.6"/><ellipse cx="-45" cy="22" rx="3.4" ry="2.6"/></g></g>' +
      '<path d="M-27 -2 C-27 -14 -8 -17 6 -15 C18 -14 25 -8 25 0 C25 10 8 14 -8 13 C-20 13 -27 8 -27 -2 Z" fill="url(#rdg)" stroke="#4A2D14" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="2" cy="8" rx="17" ry="5" fill="#EBD3A4" opacity=".85"/>' +
      '<path d="M14 -10 C22 -20 26 -28 30 -35 L41 -29 C35 -21 31 -9 25 2 Z" fill="url(#rdg)" stroke="#4A2D14" stroke-width="1.8" stroke-linejoin="round"/><path d="M22 -14 C26 -20 29 -26 32 -31" stroke="#F3E3C0" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M29 -39 C35 -46 47 -44 53 -35 C57 -31 57 -26 51 -26 C45 -26 38 -24 32 -29 Z" fill="url(#rdg)" stroke="#4A2D14" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<circle cx="54" cy="-30.5" r="9" fill="#FF3B30" opacity=".28"><animate attributeName="opacity" values=".15;.45;.15" dur=".9s" repeatCount="indefinite"/></circle><circle cx="54" cy="-30.5" r="5" fill="#FF3B30" stroke="#9E1A14" stroke-width="1"/><circle cx="52.5" cy="-32" r="1.6" fill="#fff" opacity=".8"/>' +
      '<path d="M33 -43 L25 -52 L39 -46 Z" fill="#A8733B" stroke="#4A2D14" stroke-width="1.4" stroke-linejoin="round"/><circle cx="41" cy="-37" r="1.9" fill="#1A0F08"/>' +
      '<path d="M37 -45 C35 -57 40 -63 35 -72 M37 -55 L29 -59 M38 -61 L46 -67 M36 -67 L31 -73" stroke="#DDBB86" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M13 -13 C18 -6 18 4 13 11" stroke="#D0302A" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="17" cy="-1" r="3" fill="#F5C451" stroke="#B07A12" stroke-width="1"/><circle cx="-24" cy="-9" r="4.5" fill="#fff" stroke="#D5DAE4" stroke-width="1"/></g>';
  }
  function sleighSvg() {
    return '<svg viewBox="0 0 450 150" aria-hidden="true"><defs><linearGradient id="slg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0584A"/><stop offset="1" stop-color="#A81E16"/></linearGradient><linearGradient id="rdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7814A"/><stop offset="1" stop-color="#7D5028"/></linearGradient><linearGradient id="gld" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9962A"/><stop offset=".5" stop-color="#FFE08A"/><stop offset="1" stop-color="#C9962A"/></linearGradient></defs>' +
      '<path d="M112 66 C170 60 210 62 262 66 M112 72 C190 70 260 74 358 70" stroke="#E8C14B" stroke-width="1.8" fill="none"/>' + reindeerSvg(368, 66, 0, 1) + reindeerSvg(268, 74, 1, 1) +
      '<ellipse cx="42" cy="46" rx="26" ry="24" fill="#8B5E3C" stroke="#4A2F18" stroke-width="2"/><path d="M28 28 C38 22 50 24 58 30" stroke="#4A2F18" stroke-width="2.2" fill="none"/><path d="M44 28 C50 18 60 22 56 32" fill="#E8C14B" stroke="#B07A12" stroke-width="1.6"/>' +
      '<g transform="rotate(-14 30 24)"><rect x="18" y="8" width="20" height="18" rx="2" fill="#3DBE6B" stroke="#1F7A44" stroke-width="1.6"/><rect x="26" y="8" width="4" height="18" fill="#FFD66B"/></g><g transform="rotate(12 54 20)"><rect x="46" y="4" width="18" height="16" rx="2" fill="#4C9BFF" stroke="#2358B8" stroke-width="1.6"/><rect x="53" y="4" width="4" height="16" fill="#FFF"/></g><g transform="rotate(-4 40 12)"><rect x="32" y="-2" width="16" height="14" rx="2" fill="#B79BFF" stroke="#6C46C9" stroke-width="1.6"/><rect x="38" y="-2" width="4" height="14" fill="#FFD66B"/></g>' +
      '<path d="M2 112 C34 124 128 124 160 104 C170 96 164 84 154 88 C150 94 144 98 136 100 C104 112 44 108 14 102" fill="none" stroke="url(#gld)" stroke-width="5.5" stroke-linecap="round"/><path d="M26 108 L30 88 M70 114 L70 92 M114 110 L110 90" stroke="#E8C14B" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M12 70 C10 98 54 108 130 98 C146 96 156 84 160 66 L156 50 C146 62 124 68 102 66 C72 64 42 60 28 50 C18 44 12 56 12 70 Z" fill="url(#slg)" stroke="#6E150F" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 76 C46 92 100 94 146 80" stroke="url(#gld)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M158 54 C166 46 164 38 156 38 C150 38 150 46 156 48" stroke="url(#gld)" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M64 70 C60 44 70 32 88 32 C106 32 114 44 110 70 Z" fill="url(#slg)" stroke="#6E150F" stroke-width="2" stroke-linejoin="round"/><rect x="62" y="62" width="50" height="9" rx="4" fill="#fff" stroke="#D5DAE4" stroke-width="1.2"/><rect x="64" y="50" width="46" height="7" fill="#1E1E28"/><rect x="82" y="48.5" width="10" height="10" rx="1.5" fill="url(#gld)" stroke="#8A6414" stroke-width="1.2"/>' +
      '<path d="M104 42 C116 46 124 52 134 58" stroke="#E5342B" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="136" cy="59" r="6.5" fill="#fff" stroke="#D5DAE4" stroke-width="1.2"/>' +
      '<circle cx="88" cy="22" r="12.5" fill="#F9C9A0" stroke="#B9703F" stroke-width="1.6"/><ellipse cx="80" cy="27" rx="3.6" ry="2.4" fill="#FF9DB8" opacity=".7"/><ellipse cx="96" cy="27" rx="3.6" ry="2.4" fill="#FF9DB8" opacity=".7"/><path d="M76 26 C74 42 102 42 100 26 C96 34 80 34 76 26 Z" fill="#fff" stroke="#D5DAE4" stroke-width="1.3" stroke-linejoin="round"/><path d="M80 28 C84 25 88 28 88 28 C88 28 92 25 96 28 C92 32 84 32 80 28 Z" fill="#fff" stroke="#D5DAE4" stroke-width="1"/><circle cx="88" cy="25" r="2.6" fill="#F0806A"/><circle cx="83" cy="19" r="1.5" fill="#2A1608"/><circle cx="93" cy="19" r="1.5" fill="#2A1608"/><path d="M80 15 C83 13 86 14 87 15 M89 15 C90 14 93 13 96 15" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M75 16 C74 -2 90 -8 104 -2 C112 3 118 10 124 22 C117 16 108 13 100 14 L76 19 Z" fill="url(#slg)" stroke="#6E150F" stroke-width="1.8" stroke-linejoin="round"/><rect x="74" y="13" width="28" height="8" rx="4" fill="#fff" stroke="#D5DAE4" stroke-width="1.2"/><circle cx="126" cy="24" r="6" fill="#fff" stroke="#D5DAE4" stroke-width="1.2"/></svg>';
  }
  function sleighFlight() {
    if (liteOn() && !DEV_PAGES) return;
    var box = fxBox(9500), dur = 6.6, y = 20, h = '<div class="slg" style="--dur:' + dur + 's;--y:' + y + 'vh"><div class="slg-in">' + sleighSvg() + "</div></div>", i;
    for (i = 0; i < 16; i++) h += '<i class="slg-star" style="--dur:' + dur + "s;--y:" + (y + 4 + (Math.random() * 6 - 3)).toFixed(1) + "vh;--dl:" + (i * .13).toFixed(2) + "s;font-size:" + (12 + Math.random() * 14).toFixed(0) + 'px">' + (i % 3 ? "✨" : "⭐") + "</i>";
    for (i = 0; i < 6; i++) { var p = .18 + i * .13; h += '<i class="slg-gift" style="left:' + (-30 + 100 * p * 1.35).toFixed(1) + "vw;--y:" + (y + 10) + "vh;--dl:" + (p * dur).toFixed(2) + 's">' + ["🎁", "🎁", "🍬", "⭐", "🎁", "🎄"][i] + "</i>"; }
    box.innerHTML = h;
    [0, 700, 1500, 2300].forEach(function (d, k) { setTimeout(function () { tone(1320 + k * 220, 0, .12, "triangle", .06, 1320 + k * 220); tone(1760 + k * 150, .09, .14, "triangle", .05, 1760); }, d); });
  }
  function confettiRain(cols, n) {
    var box = fxBox(7000), h = "";
    for (var i = 0; i < n; i++) h += '<i class="cf" style="left:' + (Math.random() * 100).toFixed(1) + "%;background:" + cols[i % cols.length] + ";--dx:" + Math.round(-90 + Math.random() * 180) + "px;--rot:" + Math.round(360 + Math.random() * 720) + "deg;--dur:" + (2.8 + Math.random() * 2.4).toFixed(2) + "s;--dl:" + (Math.random() * 1.6).toFixed(2) + "s;width:" + (6 + Math.random() * 6).toFixed(0) + "px;height:" + (10 + Math.random() * 8).toFixed(0) + 'px"></i>';
    box.innerHTML = h;
  }
  function newYearFx() { seamFireworks(["#FFD66B", "#FFFFFF", "#F5C451", "#C9D3E8", "#FFB02E"]); confettiRain(["#FFD66B", "#FFFFFF", "#F5C451", "#C9D3E8", "#FF6C95", "#6FB4FF"], 70); }
  function bunnySvg() {
    return '<svg viewBox="0 0 100 112" aria-hidden="true"><defs><radialGradient id="bnb" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7E1F2"/></radialGradient></defs><ellipse cx="46" cy="108" rx="34" ry="4" fill="#000" opacity=".25"/>' +
      '<circle cx="14" cy="84" r="9" fill="#fff" stroke="#C9C2D6" stroke-width="1.6"/><ellipse cx="40" cy="82" rx="30" ry="23" fill="url(#bnb)" stroke="#B9B1CC" stroke-width="1.8"/><ellipse cx="24" cy="98" rx="15" ry="8" fill="#fff" stroke="#B9B1CC" stroke-width="1.6"/><ellipse cx="62" cy="100" rx="9" ry="6" fill="#fff" stroke="#B9B1CC" stroke-width="1.6"/>' +
      '<g transform="rotate(-10 56 20)"><ellipse cx="56" cy="20" rx="7.5" ry="25" fill="url(#bnb)" stroke="#B9B1CC" stroke-width="1.6"/><ellipse cx="56" cy="22" rx="3.6" ry="18" fill="#FFB6CE"/></g><g transform="rotate(12 76 22)"><ellipse cx="76" cy="22" rx="7.5" ry="25" fill="url(#bnb)" stroke="#B9B1CC" stroke-width="1.6"/><ellipse cx="76" cy="24" rx="3.6" ry="18" fill="#FFB6CE"/></g>' +
      '<circle cx="66" cy="56" r="21" fill="url(#bnb)" stroke="#B9B1CC" stroke-width="1.8"/><circle cx="72" cy="52" r="3.4" fill="#2A1A3A"/><circle cx="73.2" cy="50.8" r="1.1" fill="#fff"/><ellipse cx="80" cy="60" rx="3.4" ry="2.6" fill="#FF7FA0"/><ellipse cx="62" cy="62" rx="5" ry="3.2" fill="#FF9DB8" opacity=".65"/><path d="M80 63 Q76 68 72 65 M80 63 Q83 68 87 65" stroke="#8A5A6A" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M82 58 L96 55 M82 61 L97 62" stroke="#B9B1CC" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M44 66 C54 72 66 72 76 68" stroke="#7ED6A5" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="60" cy="72" r="3.4" fill="#FF6C95"/><circle cx="50" cy="69" r="3" fill="#FFD66B"/></svg>';
  }
  function eggSvg(c1, c2) {
    return '<svg viewBox="-14 -18 28 38" aria-hidden="true"><path d="M0 -17 C10 -17 14 -2 14 6 C14 14 8 19 0 19 C-8 19 -14 14 -14 6 C-14 -2 -10 -17 0 -17 Z" fill="' + c1 + '" stroke="#00000040" stroke-width="1.2"/><path d="M-14 3 L-7 -1 L0 3 L7 -1 L14 3" stroke="' + c2 + '" stroke-width="3" fill="none"/><circle cx="-5" cy="10" r="1.8" fill="' + c2 + '"/><circle cx="5" cy="10" r="1.8" fill="' + c2 + '"/><ellipse cx="-5" cy="-6" rx="2.2" ry="5" fill="#fff" opacity=".55"/></svg>';
  }
  function bunnyHop() {
    if (liteOn() && !DEV_PAGES) return;
    var box = fxBox(9000), dur = 5.6, h = '<div class="bny" style="--dur:' + dur + 's"><div class="bny-in">' + bunnySvg() + "</div></div>", pal = [["#FF8FB4", "#FFF"], ["#7FC8FF", "#FFE27A"], ["#9BE08A", "#FFF"], ["#FFD34D", "#FF7FA8"], ["#B79BFF", "#FFF"], ["#FF9E6A", "#FFF3C4"]];
    for (var i = 0; i < 6; i++) { var p = .14 + i * .14; h += '<div class="bny-egg" style="left:' + (-14 + p * 124).toFixed(1) + "vw;--dl:" + (p * dur + .15).toFixed(2) + 's">' + eggSvg(pal[i][0], pal[i][1]) + "</div>"; }
    box.innerHTML = h;
    for (var k = 0; k < 7; k++) setTimeout(function () { tone(300, 0, .12, "sine", .08, 520); }, 250 + k * 780);
  }
  function seamNotes() {
    if (liteOn() && !DEV_PAGES) return;
    var box = fxBox(3800), ns = ["♪", "♫", "🎵", "🎶", "♬"], cs = ["#6FB4FF", "#FF6C95", "#FFD66B", "#7ED6A5", "#B79BFF"], h = "";
    for (var i = 0; i < 30; i++) { var side = Math.random() < .5 ? -1 : 1; h += '<i class="sh nt" style="left:' + (49.6 + Math.random() * .8) + "%;top:" + (45 + Math.random() * 30) + "%;font-size:" + (20 + Math.random() * 30).toFixed(0) + "px;color:" + cs[i % 5] + ";--dx:" + (side * (40 + Math.random() * 340)).toFixed(0) + "px;--dy:" + (-(140 + Math.random() * 420)).toFixed(0) + "px;--rot:" + Math.round(-30 + Math.random() * 60) + "deg;--d:" + (Math.random() * .9).toFixed(2) + 's">' + ns[i % 5] + "</i>"; }
    box.className = "bat-box fw-seam"; box.innerHTML = h;
    [523, 659, 784, 1047].forEach(function (f, k) { setTimeout(function () { tone(f, 0, .16, "triangle", .08, f); }, k * 150); });
  }
  function festFx(id) {
    if (id === "quatorze") seamFireworks(); else if (id === "valentin") seamHearts(); else if (id === "halloween") batFlock(11);
    else if (id === "noel") sleighFlight(); else if (id === "nouvelan") newYearFx(); else if (id === "paques") bunnyHop(); else if (id === "musique") seamNotes();
  }
  window.PU_fx = festFx;
  function showIntro(fx, mode, forceFeu) {
    if (document.querySelector(".intro")) return;
    fx = fx || introFx();
    var closing = mode === "close", who = P.pseudo ? esc(P.pseudo) : "recrue", el = document.createElement("div");
    var isDoor = DOOR_FX.indexOf(fx) !== -1, feu = !closing && feuEligible(forceFeu);
    el.className = "intro " + (isDoor ? "fx-portes dv-" + (fx === "portes" || fx === "eclair" || fx.indexOf("n-") === 0 ? "doors" : "sas") + (fx.indexOf("n-") === 0 ? " nd nd-" + fx.slice(2) : "") + (fx === "sas" ? " sas-full" : "") : "fx-" + fx) + (closing ? " closing" : ""); el.setAttribute("role", "dialog"); el.setAttribute("aria-label", closing ? "Au revoir" : "Bienvenue au QG"); if (feu) el.classList.add("feu-hot");
    var streaks = ""; if (fx === "hyperespace") for (var i = 0; i < 40; i++) streaks += '<i style="--a:' + (i * 137.5 % 360).toFixed(1) + "deg;--d:" + (i % 7 * 0.04).toFixed(2) + "s;--l:" + (30 + i * 13 % 50) + 'vmax"></i>';
    var stage = closing
      ? '<div class="intro-stage"><span class="intro-mascot">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 190) : "") + '</span><div class="intro-bubble">À bientôt !</div><p class="intro-sub">Le QG garde la lumière allumée pour toi. Reviens vite pour garder ta cape au chaud.</p><button type="button" class="btn btn-primary intro-go">' + I.bolt("currentColor", 18) + "Rouvrir le QG</button><small>Tu peux fermer l'onglet en toute sécurité.</small></div>"
      : '<div class="intro-stage"><span class="intro-mascot">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 210) : "") + '</span><div class="intro-bubble">Prêt à entrer au QG ?</div><button type="button" class="btn btn-primary intro-go">' + I.bolt("currentColor", 18) + "Entrer au QG</button>" + (window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches ? "" : "<small>ou appuie sur Entrée</small>") + "</div>";
    el.innerHTML = doorsHtml(fx) + '<div class="intro-streaks">' + streaks + '</div><div class="intro-flash"></div>' + stage;
    document.body.appendChild(el); document.documentElement.classList.add("intro-open");
    if (closing) { void el.offsetWidth; setTimeout(function () { el.classList.add("shut"); sfx("doorSlide"); }, 60); setTimeout(function () { sfx("doorUnlock"); el.classList.add("locked"); humStart(); }, 1350); } /* les portes partent ouvertes et se referment sous les yeux */
    else humStart();
    var btn = el.querySelector(".intro-go"); setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) { } }, closing ? 1200 : 50);
    var gone = false;
    function enter(e) {
      if (gone) return;
      if (closing && !el.classList.contains("locked")) return;
      /* clic à côté du bouton : n'entre pas, mais débloque le son (le navigateur l'exige) pour entendre le bourdonnement puis les portes */
      if (e && e.type === "click" && !(e.target.closest && e.target.closest(".intro-go"))) { audio(); humStart(); return; }
      gone = true; humStart(); /* au premier clic, le navigateur autorise enfin le son */
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch (err) { }
      /* on rentre toujours par l'accueil du QG, pas là où on était resté (sauf lien partagé avec des paramètres, ex. un défi) */
      try { var hh = location.hash || ""; if (hh.indexOf("?") === -1 && hh !== "" && hh !== "#" && hh !== "#/") location.hash = "#/"; window.scrollTo(0, 0); } catch (err) { }
      el.classList.remove("shut", "locked"); el.classList.add("opening"); document.removeEventListener("keydown", key);
      try { var cev = costumeEvent(); if (DEV_PAGES) toastMsg("Test ouverture · thème : " + (cev ? cev.id : "aucun")); if (cev) { festFx(cev.id); } } catch (err) { }
      sfx("doorUnlock"); humStop(); if (feu) feuPlay(!!forceFeu);
      setTimeout(function () { sfx("doorSlide"); }, isDoor ? 380 : 0); /* voix d'accueil retirée à la demande de Rachel (essais conservés dans Maintenance) */
      if (!isDoor) sfx("enter");
      setTimeout(function () { el.remove(); document.documentElement.classList.remove("intro-open"); logoFxUntil = Date.now() + 1500; try { powerOnLogo(); } catch (err) { } if (!closing) { try { afterIntro(); } catch (err) { } } }, fx === "hyperespace" ? 1500 : 1650);
    }
    function key(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } }
    el.addEventListener("click", enter); document.addEventListener("keydown", key);
  }
  function askQuit() {
    if (document.querySelector(".quit-confirm")) return;
    var d = document.createElement("div"); d.className = "quit-confirm"; d.setAttribute("role", "alertdialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "qc-t");
    d.innerHTML = '<div class="qc-card"><span class="qc-ico"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 3v8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6.3 7.2a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><h2 class="h-s" id="qc-t">Quitter le QG ?</h2><p class="muted">Ta progression est enregistrée sur cet appareil. Les portes vont se refermer.</p><div class="qc-actions"><button type="button" class="btn btn-ghost" data-qc-no>Rester</button><button type="button" class="btn btn-primary qc-yes" data-qc-yes>Quitter le QG</button></div></div>';
    document.body.appendChild(d); sfx("open");
    var no = d.querySelector("[data-qc-no]"); setTimeout(function () { no.focus(); }, 30);
    function close() { d.remove(); document.removeEventListener("keydown", k); }
    function k(e) { if (e.key === "Escape") close(); }
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-qc-no]")) close(); else if (e.target.closest("[data-qc-yes]")) { close(); closeSite(); } });
    document.addEventListener("keydown", k);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-quit-ask]")) askQuit(); });
  function closeSite() { humStop(); var f = introFx(); showIntro(DOOR_FX.indexOf(f) !== -1 ? f : "sascadre", "close"); }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-close-site]")) { e.preventDefault(); closeSite(); } });
  /* ---------- Entrée en feu (étape 87) ----------
     Le jour où la cape est Flamboyante (5 jours de suite, cape en feu active), la première ouverture du QG de la journée s'enflamme :
     jointure orange, flammes entre les battants, puis le site s'embrase 4 à 5 s avant de se calmer en braises.
     Une seule fois par jour (clé powerup365.feu). Flammes dessinées en canvas, sons de synthèse. En « Animations légères » : lueur seule. */
  var FEU_KEY = "powerup365.feu", feuRun = null;
  function feuDay() { try { return localStorage.getItem(FEU_KEY) || ""; } catch (e) { return ""; } }
  function feuEligible(force) { if (force || window.PU_FEU_DEMO) return true; if (navigator.webdriver) return false; try { return capeHeat() >= 5 && capeFireOn() && feuDay() !== todayStr(); } catch (e) { return false; } }
  function feuKeyframes(t, k) { if (t <= k[0][0]) return k[0][1]; for (var i = 1; i < k.length; i++) { if (t < k[i][0]) { var a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0]); u = u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * u; } } return k[k.length - 1][1]; }
  var FEU_SPR = null;
  function feuSprites() {
    if (FEU_SPR) return FEU_SPR; FEU_SPR = [];
    var stops = [[0, [255, 244, 200]], [.18, [255, 200, 70]], [.45, [255, 120, 25]], [.75, [210, 45, 15]], [1, [90, 15, 8]]];
    function col(f) { for (var i = 1; i < stops.length; i++) { if (f <= stops[i][0]) { var a = stops[i - 1], b = stops[i], u = (f - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * u); }); } } return stops[4][1]; }
    for (var i = 0; i < 20; i++) { var c = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d"), rgb = col(i / 19), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(" + rgb + ",1)"); gr.addColorStop(.38, "rgba(" + rgb + ",.55)"); gr.addColorStop(1, "rgba(" + rgb + ",0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); FEU_SPR.push(c); }
    return FEU_SPR;
  }
  function feuSound() {
    if (!soundOn || !audio()) return;
    capeNoise(0, 2.6, "bandpass", 180, 1400, 500, 0.9, 0.5, 0, 0); tone(70, 0, 1.6, "sine", 0.5, 38);
    capeNoise(2.2, 2.2, "bandpass", 180, 1400, 500, 0.9, 0.35, 0, 0);
    capeNoise(0.4, 9.5, "lowpass", 650, 650, 650, 0.4, 0.14, 1, 0.3); /* grondement étouffé, lent */
    for (var i = 0; i < 70; i++) noiseBurst(0.6 + Math.random() * 8, 0.015 + Math.random() * 0.035, 0.03 + Math.random() * 0.07, "highpass", 1800 + Math.random() * 2400); /* crépitement */
  }
  function feuPlay(force) {
    if (feuRun) return; force = force || !!window.PU_FEU_DEMO;
    if (!force) { try { localStorage.setItem(FEU_KEY, todayStr()); } catch (e) { } }
    var lite = liteOn(), root = document.documentElement, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    var glow = document.createElement("div"); glow.className = "feu-glow"; document.body.appendChild(glow);
    feuRun = { stop: function () { } };
    feuSound();
    later(function () { root.classList.add("feu-flare"); }, 2800);
    later(function () { root.classList.remove("feu-flare"); }, 10500);
    later(function () { feuSay(); }, 3400);
    if (lite) {
      glow.style.setProperty("--g", .85); later(function () { glow.style.setProperty("--g", .28); }, 4500);
      later(function () { glow.remove(); feuRun = null; }, 12000); return;
    }
    var cv = document.createElement("canvas"); cv.className = "feu-canvas"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
    var cx = cv.getContext("2d"), spr = feuSprites(), dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight, Hb = Math.min(H, 700);
    function size() { W = window.innerWidth; H = window.innerHeight; Hb = Math.min(H, 700); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0); } size();
    window.addEventListener("resize", size);
    var FLOOR = [[0, 0], [.3, 0], [2.2, 1], [2.8, 1], [6, .7], [9, .14], [10, .1]], HS = [[0, .34], [2.2, .55], [3.5, .34], [9, .2]],
      EDGE = [[0, 0], [2.4, 0], [3.6, 1], [6.5, 1], [9.5, .16], [10, .12]], GLOW = [[0, 0], [.5, .25], [2.4, .6], [3.8, 1], [6.5, .8], [9.5, .34], [10, .3]];
    var P2 = [], raf = 0, t0 = performance.now(), last = t0, cap = W < 600 ? 900 : 1500, rate = W < 600 ? .75 : .5;
    function tongue(x, t) { return .5 + .5 * (.6 * Math.sin(x * .012 + t * 1.9) + .4 * Math.sin(x * .031 - t * 2.7)); }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function per(r, dt) { return Math.floor(r * dt + Math.random()); }
    function spawn(dt, t) {
      if (P2.length > cap) return;
      var FI = feuKeyframes(t, FLOOR), HSv = feuKeyframes(t, HS), EI = feuKeyframes(t, EDGE), i, n, x, L, h, tg;
      n = per(W * rate * FI, dt);
      for (i = 0; i < n; i++) { x = Math.random() * W; tg = tongue(x, t); L = rnd(.65, 1.2); h = Hb * HSv * (.3 + .7 * tg) * rnd(.8, 1.2); P2.push({ x: x, y: H + 8, vx: 0, vy: -h / (L * .85), age: 0, life: L, size: (26 + Math.random() * 26) * (.7 + .6 * tg), ph: Math.random() * 6.28, k: 0 }); }
      if (t > .15 && t < 2.6) { var p = Math.min(1, (t - .15) / 1.5), e = p * p * (3 - 2 * p), x0 = W * .5 - W * .53 * e, x1 = W * .5 + W * .5 * e;
        n = per((x1 - x0) * rate * .8 * FI, dt);
        for (i = 0; i < n; i++) { x = rnd(x0, x1); tg = tongue(x, t); L = rnd(.7, 1.3); h = Hb * HSv * 1.35 * (.35 + .65 * tg); P2.push({ x: x, y: H + 8, vx: 0, vy: -h / (L * .85), age: 0, life: L, size: rnd(30, 56), ph: Math.random() * 6.28, k: 0 }); } }
      for (var s = 0; s < 2; s++) { n = per(H * .2 * EI, dt);
        for (i = 0; i < n; i++) { var yy = H * (1 - Math.pow(Math.random(), 1.6)); P2.push({ x: s ? W - Math.random() * 10 : Math.random() * 10, y: yy, vx: (s ? -1 : 1) * rnd(15, 65), vy: -rnd(50, 150), age: 0, life: rnd(.5, 1), size: rnd(16, 34), ph: Math.random() * 6.28, k: 0 }); } }
      n = per((60 * FI + 90 * EI) * Math.min(1, W / 900 + .25), dt);
      for (i = 0; i < n; i++) { var r = Math.random(); x = r < .5 ? Math.random() * W : (r < .75 ? Math.random() * 34 : W - Math.random() * 34); P2.push({ x: x, y: H * rnd(.5, 1), vx: rnd(-15, 45), vy: -rnd(70, 200), age: 0, life: rnd(1.4, 3.2), size: rnd(1.4, 3.6), ph: Math.random() * 6.28, k: 1 }); }
    }
    function draw(dt, t) {
      cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = "lighter";
      for (var i = P2.length - 1; i >= 0; i--) { var p = P2[i]; p.age += dt;
        if (p.age >= p.life) { P2[i] = P2[P2.length - 1]; P2.pop(); continue; }
        var f = p.age / p.life;
        if (p.k === 0) { p.x += (p.vx + Math.sin(t * 5 + p.ph + p.y * .025) * 22) * dt; p.y += p.vy * dt; p.vy *= 1 - .35 * dt; var s = p.size * (1 - f * .55); cx.globalAlpha = Math.min(1, (1 - f) * 1.5) * .5; cx.drawImage(spr[Math.min(19, (f * 20) | 0)], p.x - s / 2, p.y - s * .7, s, s * 1.4); }
        else { p.x += (p.vx + Math.sin(t * 3 + p.ph) * 20) * dt; p.y += p.vy * dt; cx.globalAlpha = (1 - f) * (.35 + .65 * (.5 + .5 * Math.sin(p.age * 26 + p.ph))); cx.fillStyle = "#ffc15a"; cx.fillRect(p.x, p.y, p.size, p.size); } }
      cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    }
    function end() { cancelAnimationFrame(raf); window.removeEventListener("resize", size); timers.forEach(clearTimeout); cv.remove(); glow.remove(); root.classList.remove("feu-flare"); feuRun = null; }
    function loop(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now; var t = (now - t0) / 1000;
      if (t > 11.5 && !P2.length) { end(); return; }
      glow.style.setProperty("--g", (feuKeyframes(t, GLOW) * (.93 + .07 * Math.sin(t * 9) + .03 * Math.sin(t * 23.7))).toFixed(3));
      if (t < 10.5) spawn(dt, t); draw(dt, t); raf = requestAnimationFrame(loop);
    }
    feuRun.stop = end; raf = requestAnimationFrame(loop);
  }
  function feuSay() {
    var t = document.createElement("div"); t.className = "rb-toast badge-toast feu-toast"; t.setAttribute("role", "status"); t.style.animationDuration = "7.5s";
    t.innerHTML = '<span class="feu-face">' + (window.heroSvg && window.heroById ? window.heroSvg(window.heroById("volt"), 46) : "") + "</span><span><b>5 jours de suite… ta cape est en feu !</b>Le QG s'embrase pour toi. · +10 % d'XP en mode classé</span><button type=\"button\" class=\"toast-x\" aria-label=\"Fermer\">×</button>";
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 7800);
  }
  /* Toucher une bulle (ou sa croix) la ferme */
  document.addEventListener("click", function (e) { var tt = e.target.closest && e.target.closest(".rb-toast"); if (tt) tt.remove(); });
  /* Maintenance : revoir l'effet à volonté, sans toucher à la règle du jour */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-feu-test]"); if (b) { var k = b.getAttribute("data-feu-test"); if (k === "reset") { try { localStorage.removeItem(FEU_KEY); } catch (err) { } toastMsg("Jour réinitialisé : la prochaine ouverture en cape flamboyante sera en feu."); return; } if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } showIntro(introFx(), null, true); }
  });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-door-test]"); if (!b || !DEV_PAGES) return; if (!soundOn) { soundOn = true; if (volume === 0) volume = 0.5; try { localStorage.setItem(SOUND_KEY, "on"); } catch (err) { } refreshSound(); } window.PU_intro(b.getAttribute("data-door-test")); });

  /* =========================================================
     MOBILE : menu « Plus », retour en haut, glisser gauche/droite entre onglets
     ========================================================= */
  (function () {
    var ORDER = ["/", "/jouer", "/mission", "/stats", "/collectif", "/detente", "/veille"];
    function isMobile() { return window.matchMedia && window.matchMedia("(max-width: 760px), (max-height: 480px) and (orientation: landscape)").matches; }
    function closeMore() { var m = document.querySelector(".tabmore"), b = document.querySelector("[data-tabmore]"); if (m) m.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }
    document.addEventListener("click", function (e) {
      var t = e.target, b = t.closest && t.closest("[data-tabmore]");
      if (b) { var m = document.querySelector(".tabmore"); if (!m) return; var open = m.hidden; m.hidden = !open; b.setAttribute("aria-expanded", open ? "true" : "false"); return; }
      var tt = t.closest && t.closest("[data-to-top]"); if (tt) { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); return; }
      closeMore();
    });
    window.addEventListener("hashchange", closeMore);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMore(); });
    function toTopState() { var b = document.querySelector(".to-top"); if (b) b.classList.toggle("on", window.pageYOffset > 600); }
    window.addEventListener("scroll", toTopState, { passive: true });
    /* glisser au doigt : seulement sur les pages d'onglet, jamais pendant un jeu, dans un défilement horizontal ou un champ */
    var x0 = null, y0 = 0, t0 = 0;
    function blocked(el) {
      if (!el || !el.closest) return true;
      if (el.closest("input, textarea, select, [contenteditable], .order-row, .draggable, .tabbar, .tabmore, dialog[open], .hero-modal[open], [role=dialog], .intro-hud, .ev-menu, [data-noswipe]")) return true;
      for (var n = el; n && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 4) { var ox = getComputedStyle(n).overflowX; if (ox === "auto" || ox === "scroll") return true; } }
      return false;
    }
    document.addEventListener("touchstart", function (e) {
      x0 = null; if (!isMobile() || e.touches.length !== 1 || blocked(e.target)) return;
      var p = (location.hash || "#/").slice(1).split("?")[0] || "/"; if (ORDER.indexOf(p) < 0 && p !== "/profil") return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (x0 === null) return; var c = e.changedTouches[0], dx = c.clientX - x0, dy = c.clientY - y0; x0 = null;
      if (Date.now() - t0 > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (window.getSelection && String(window.getSelection()).length) return;
      var p = (location.hash || "#/").slice(1).split("?")[0] || "/", i = ORDER.indexOf(p), j = i + (dx < 0 ? 1 : -1);
      if (p === "/profil") { var tabs = [].slice.call(document.querySelectorAll(".ptab")), cur = tabs.map(function (b) { return b.classList.contains("on"); }).indexOf(true), nx = tabs[cur + (dx < 0 ? 1 : -1)]; if (cur >= 0 && nx) { nx.click(); window.scrollTo(0, 0); } return; }
      if (i < 0 || j < 0 || j >= ORDER.length) return;
      location.hash = "#" + ORDER[j];
    }, { passive: true });
  })();
  /* ---------- Installer l'application + bienvenue des nouveaux joueurs (scan du QG) ----------
     - Carte « Installe Power Up » dans Profil (onglet Mon héros) + petit bandeau sur l'accueil du QG, sur téléphone seulement.
     - Android : bouton Installer (invite du navigateur). iPhone : étapes Safari + prévention (la progression de Safari ne suit pas l'appli).
     - Le site ne peut pas savoir si l'appli est installée depuis le navigateur : bouton « Déjà installée » (mémorisé). Dans l'appli elle-même (mode standalone), rien ne s'affiche.
     - Nouveau joueur (pas de pseudo, 0 XP) : après l'ouverture des portes, scan du QG « identité inconnue » qui invite à créer son héros (2 fois au plus).
     - Mode sobriété / réduction des animations : pas d'animation de scan ni de son. */
  var INST_KEY = "powerup365.install", WELC_KEY = "powerup365.welcome", WELC_PENDING = "powerup365.welcome.pending";
  var instPrompt = null, instScroll = false;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
  function isStandalone() { return !!((window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true); }
  function isTouchPhone() { return !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches); }
  function isIOSDevice() { var ua = navigator.userAgent || ""; return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  /* "" = rien à afficher ; sinon "ios" ou "android" */
  function installKind() {
    if (isStandalone() || !isTouchPhone()) return "";
    var v = lsGet(INST_KEY) || "";
    if (v === "done") return "";
    if (v.indexOf("later:") === 0 && Date.now() - (+v.slice(6) || 0) < 7 * 864e5) return "";
    return isIOSDevice() ? "ios" : "android";
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); instPrompt = e; });
  window.addEventListener("appinstalled", function () { lsSet(INST_KEY, "done"); instPrompt = null; try { if (V) render(); } catch (e) { } });

  function instNum(n) { return '<span class="inst-n" aria-hidden="true">' + n + "</span>"; }
  function instCardHtml() {
    var k = installKind(); if (!k) return "";
    var head = '<div class="inst-head"><span class="inst-ico" aria-hidden="true">' + I.bolt("currentColor", 28) + '</span><div><span class="eyebrow inst-new">Nouveau</span><h2 class="h-s" id="inst-t">' + (k === "ios" ? "Installe Power Up sur ton iPhone" : "Installe Power Up sur ton téléphone") + "</h2></div></div>";
    var foot = '<div class="inst-row"><button type="button" class="btn btn-ghost inst-done" data-inst-done><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="var(--green)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Déjà installée</button><button type="button" class="inst-later" data-inst-later>Plus tard</button></div>';
    if (k === "ios") {
      return '<section class="panel inst-card" id="inst" aria-labelledby="inst-t">' + head +
        '<ol class="inst-steps"><li>' + instNum(1) + "<span>Ouvre ce site dans <b>Safari</b></span></li><li>" + instNum(2) + "<span>Touche <b>Partager</b></span></li><li>" + instNum(3) + "<span>Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b></span></li></ol>" +
        '<p class="inst-warn"><b>Installe-la avant de jouer.</b> Sur iPhone, l\'application a sa propre mémoire : si tu as déjà joué dans Safari, elle repart de zéro. Ensuite, ta progression reste.</p>' + foot + "</section>";
    }
    return '<section class="panel inst-card" id="inst" aria-labelledby="inst-t">' + head +
      '<p class="muted inst-txt">Ouvre le jeu en un toucher depuis ton écran d\'accueil, en plein écran, sans taper l\'adresse. Ta progression reste là.</p>' +
      '<button type="button" class="btn btn-primary inst-go" data-inst-go>Installer l\'application</button>' +
      '<p class="muted inst-hint" hidden>Dans le menu de ton navigateur (⋮), choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».</p>' + foot + "</section>";
  }
  function placeInstallBanner() {
    var old = document.querySelector(".inst-banner"); if (old) old.remove();
    if (!V || V.nav !== "qg") return;
    var k = installKind(); if (!k) return;
    var main = app.querySelector("main"); if (!main) return;
    main.insertAdjacentHTML("afterbegin", '<div class="inst-banner" role="region" aria-label="Installer l\'application"><span class="inst-ico sm" aria-hidden="true">' + I.bolt("currentColor", 22) + '</span><div class="inst-b-txt"><b>' + (k === "ios" ? "Ajoute Power Up à ton écran d'accueil" : "Power Up sur ton écran d'accueil") + "</b><small>" + (k === "ios" ? "À faire avant de jouer pour garder ta progression" : "Un toucher, plein écran") + '</small></div><button type="button" class="btn ' + (k === "ios" ? "btn-gold" : "btn-primary") + ' inst-b-go" data-inst-banner>' + (k === "ios" ? "Voir comment faire" : "Installer") + '</button><button type="button" class="inst-x" data-inst-later aria-label="Fermer">×</button></div>');
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-inst-go],[data-inst-banner],[data-inst-done],[data-inst-later]"); if (!t) return;
    if (t.hasAttribute("data-inst-done")) { lsSet(INST_KEY, "done"); sfx("toggle"); render(); return; }
    if (t.hasAttribute("data-inst-later")) { lsSet(INST_KEY, "later:" + Date.now()); render(); return; }
    if (t.hasAttribute("data-inst-banner") && (isIOSDevice() || !instPrompt)) { instScroll = true; if (location.hash === "#/profil") route(); else location.hash = "#/profil"; return; }
    if (instPrompt) {
      var pr = instPrompt; instPrompt = null;
      try { pr.prompt(); pr.userChoice.then(function (c) { if (c && c.outcome === "accepted") { lsSet(INST_KEY, "done"); render(); } }, function () { }); } catch (err) { }
      return;
    }
    var h = document.querySelector(".inst-hint"); if (h) h.hidden = false;
  });
  function afterRenderInstall() {
    if (instScroll) { instScroll = false; var c = document.getElementById("inst"); if (c) setTimeout(function () { try { c.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); } catch (e) { c.scrollIntoView(); } }, 80); }
    /* après la création du héros : le QG reconnaît enfin le joueur */
    if (lsGet(WELC_PENDING) === "1" && P.pseudo) { lsDel(WELC_PENDING); setTimeout(function () { sfx("wlcOk"); toastMsg("Profil reconnu. Bienvenue au QG, " + P.pseudo + " !"); }, 700); }
  }

  /* Sons du scan : souffle de sas + balayage montant avec bips, double note grave (inconnu), accord clair (reconnu) */
  SFX.wlcScan = function () { noiseBurst(0, 0.5, 0.05, "bandpass", 1800); tone(300, 0, 1.5, "triangle", 0.045, 1500); [0.1, 0.5, 0.9, 1.3].forEach(function (t) { tone(1320, t, 0.07, "sine", 0.05); }); };
  SFX.wlcNo = function () { tone(330, 0, 0.14, "triangle", 0.07); tone(247, 0.16, 0.28, "triangle", 0.07); };
  SFX.wlcOk = function () { [784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.09, 0.3, "triangle", 0.09); }); tone(1568, 0.3, 0.5, "sine", 0.06); };

  function isNewPlayer() { return !P.pseudo && !P.xp && (parseInt(lsGet(WELC_KEY) || "0", 10) || 0) < 2; }
  function showWelcome() {
    if (!isNewPlayer() || document.querySelector(".wlc")) return;
    lsSet(WELC_KEY, String((parseInt(lsGet(WELC_KEY) || "0", 10) || 0) + 1)); lsSet(WELC_PENDING, "1");
    var k = installKind(), calm = liteOn() || reduceMotion, el = document.createElement("div");
    el.className = "wlc"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "wlc-t");
    var steps = [];
    if (k === "ios") steps.push("<b>Installe l'application</b> (Partager, puis Sur l'écran d'accueil). Facultatif, mais à faire d'abord.");
    steps.push("<b>Crée ton héros</b> dans Profil : pseudo, avatar et cape.");
    if (k === "android") steps.push("<b>Installe l'application</b> pour ouvrir le jeu en un toucher. C'est facultatif.");
    steps.push("<b>Lance ton premier entraînement</b> : au niveau Débutant, tu ne perds jamais d'XP.");
    var ol = '<ol class="inst-steps">' + steps.map(function (s, i) { return "<li>" + instNum(i + 1) + "<span>" + s + "</span></li>"; }).join("") + "</ol>";
    var warn = k === "ios" ? '<p class="inst-warn"><b>Sur iPhone, installe l\'application avant de jouer.</b> Sinon, ta progression de Safari ne la suivra pas.</p>' : "";
    var btns = k === "ios"
      ? '<button type="button" class="btn btn-gold" data-wlc-install>Voir comment installer</button><button type="button" class="btn btn-ghost" data-wlc-create>Créer mon héros d\'abord</button>'
      : '<button type="button" class="btn btn-primary" data-wlc-create>Créer mon héros</button>';
    el.innerHTML = '<div class="wlc-card scanning"><div class="wlc-scan" aria-hidden="true"><span class="wlc-beam"></span>' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 84) : "") + "</div>" +
      '<div class="wlc-status" role="status" aria-live="polite"><span class="eyebrow wlc-eb">Scan du QG en cours…</span><h2 class="h-s" id="wlc-t">Identification du nouveau venu</h2></div>' +
      '<div class="wlc-body" hidden>' + warn + ol + '<div class="wlc-btns">' + btns + "</div></div>" +
      '<button type="button" class="inst-later wlc-skip" data-wlc-skip>Passer</button></div>';
    document.body.appendChild(el);
    var card = el.querySelector(".wlc-card"), done = false;
    function reveal() {
      if (done) return; done = true;
      card.classList.remove("scanning"); card.classList.add("unknown");
      el.querySelector(".wlc-eb").textContent = "Identité : inconnue";
      el.querySelector("#wlc-t").textContent = "Je ne te connais pas encore, mais tu as l'air prometteur.";
      el.querySelector(".wlc-body").hidden = false;
      if (!calm) sfx("wlcNo");
      var first = el.querySelector(".wlc-btns .btn"); if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { } }, 50);
    }
    function close() { document.removeEventListener("keydown", onKey); el.classList.add("out"); setTimeout(function () { el.remove(); }, calm ? 0 : 220); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    el.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-wlc-skip]")) { close(); return; }
      if (t.closest("[data-wlc-install]")) { close(); instScroll = true; if (location.hash === "#/profil") route(); else location.hash = "#/profil"; return; }
      if (t.closest("[data-wlc-create]")) { close(); if (location.hash === "#/profil") route(); else location.hash = "#/profil"; return; }
      if (t === el) close();
    });
    if (calm) reveal(); else { sfx("wlcScan"); setTimeout(reveal, 1700); }
  }
  window.PU_welcome = showWelcome;
  /* Générateur de QR code (octets, correction d'erreur L, versions 1 à 25), sans bibliothèque : renvoie la grille de modules ou null si le texte est trop long. */
  function qrEncode(text) {
    var ECC = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26],
        BLK = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12];
    var data = [], i, j, k;
    for (i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 255);
    function rawMods(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; } return r; }
    function dataCwOf(v) { return Math.floor(rawMods(v) / 8) - ECC[v] * BLK[v]; }
    var ver = 1;
    for (; ver <= 25; ver++) { if (4 + (ver <= 9 ? 8 : 16) + data.length * 8 <= dataCwOf(ver) * 8) break; }
    if (ver > 25) return null;
    var bits = [];
    function put(val, len) { for (var q = len - 1; q >= 0; q--) bits.push((val >>> q) & 1); }
    put(4, 4); put(data.length, ver <= 9 ? 8 : 16); for (i = 0; i < data.length; i++) put(data[i], 8);
    var cap = dataCwOf(ver) * 8;
    put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var cw = [];
    for (i = 0; i < bits.length; i += 8) { var by = 0; for (j = 0; j < 8; j++) by = (by << 1) | bits[i + j]; cw.push(by); }
    /* Reed-Solomon sur GF(256) */
    var EXP = [], LOG = [], x = 1;
    for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
    function rsDiv(deg) { var r = []; for (var q = 0; q < deg - 1; q++) r.push(0); r.push(1); var root = 1; for (q = 0; q < deg; q++) { for (var w = 0; w < deg; w++) { r[w] = mul(r[w], root); if (w + 1 < deg) r[w] ^= r[w + 1]; } root = mul(root, 2); } return r; }
    function rsRem(d, div) { var r = div.map(function () { return 0; }); d.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, q) { r[q] ^= mul(c, f); }); }); return r; }
    var nb = BLK[ver], eccLen = ECC[ver], raw = Math.floor(rawMods(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), blocks = [], div = rsDiv(eccLen);
    k = 0;
    for (i = 0; i < nb; i++) { var dl = shortLen - eccLen + (i < nShort ? 0 : 1), dat = cw.slice(k, k + dl); k += dl; var ecc = rsRem(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    var all = [];
    for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (bl, jj) { if (i !== shortLen - eccLen || jj >= nShort) all.push(bl[i]); });
    /* grille */
    var size = ver * 4 + 17, mod = [], fn = [];
    for (i = 0; i < size; i++) { mod.push([]); fn.push([]); for (j = 0; j < size; j++) { mod[i].push(false); fn[i].push(false); } }
    function setFn(px, py, dark) { mod[py][px] = dark; fn[py][px] = true; }
    for (i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = cx + dx, yy = cy + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) { var d = Math.max(Math.abs(dx), Math.abs(dy)); setFn(xx, yy, d !== 2 && d !== 4); } } }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var ap = [];
    if (ver > 1) { var na = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; ap = [6]; for (var ps = size - 7; ap.length < na; ps -= step) ap.splice(1, 0, ps); }
    for (i = 0; i < ap.length; i++) for (j = 0; j < ap.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) setFn(ap[i] + ax, ap[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }
    function formatBits(mask) {
      var d = (1 << 3) | mask, rem = d; for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var b = ((d << 10) | rem) ^ 0x5412; function bit(n) { return ((b >>> n) & 1) !== 0; }
      for (var q2 = 0; q2 <= 5; q2++) setFn(8, q2, bit(q2)); setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (q2 = 9; q2 < 15; q2++) setFn(14 - q2, 8, bit(q2));
      for (q2 = 0; q2 < 8; q2++) setFn(size - 1 - q2, 8, bit(q2));
      for (q2 = 8; q2 < 15; q2++) setFn(8, size - 15 + q2, bit(q2));
      setFn(8, size - 8, true);
    }
    formatBits(0);
    if (ver >= 7) { var vr = ver; for (i = 0; i < 12; i++) vr = (vr << 1) ^ ((vr >>> 11) * 0x1F25); var vb = (ver << 12) | vr; for (i = 0; i < 18; i++) { var vbit = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, b2 = Math.floor(i / 3); setFn(a, b2, vbit); setFn(b2, a, vbit); } }
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var px = right - j, up = ((right + 1) & 2) === 0, py = up ? size - 1 - vert : vert;
        if (!fn[py][px] && bi < all.length * 8) { mod[py][px] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
      }
    }
    function applyMask(m) {
      for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) {
        var inv; switch (m) {
          case 0: inv = (xx + yy) % 2 === 0; break; case 1: inv = yy % 2 === 0; break; case 2: inv = xx % 3 === 0; break; case 3: inv = (xx + yy) % 3 === 0; break;
          case 4: inv = (Math.floor(xx / 3) + Math.floor(yy / 2)) % 2 === 0; break; case 5: inv = xx * yy % 2 + xx * yy % 3 === 0; break;
          case 6: inv = (xx * yy % 2 + xx * yy % 3) % 2 === 0; break; default: inv = ((xx + yy) % 2 + xx * yy % 3) % 2 === 0;
        }
        if (!fn[yy][xx] && inv) mod[yy][xx] = !mod[yy][xx];
      }
    }
    function penalty() {
      var p = 0, y, xx, run, line, dark = 0;
      for (y = 0; y < size; y++) { run = 1; for (xx = 1; xx < size; xx++) { if (mod[y][xx] === mod[y][xx - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (xx = 0; xx < size; xx++) { run = 1; for (y = 1; y < size; y++) { if (mod[y][xx] === mod[y - 1][xx]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (y = 0; y < size - 1; y++) for (xx = 0; xx < size - 1; xx++) { var c = mod[y][xx]; if (c === mod[y][xx + 1] && c === mod[y + 1][xx] && c === mod[y + 1][xx + 1]) p += 3; }
      for (y = 0; y < size; y++) { line = ""; for (xx = 0; xx < size; xx++) { line += mod[y][xx] ? "1" : "0"; if (mod[y][xx]) dark++; } p += 40 * ((line.split("10111010000").length - 1) + (line.split("00001011101").length - 1)); }
      for (xx = 0; xx < size; xx++) { line = ""; for (y = 0; y < size; y++) line += mod[y][xx] ? "1" : "0"; p += 40 * ((line.split("10111010000").length - 1) + (line.split("00001011101").length - 1)); }
      p += (Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1) * 10;
      return p;
    }
    var best = 0, bestP = 1e9;
    for (var m = 0; m < 8; m++) { applyMask(m); formatBits(m); var pe = penalty(); if (pe < bestP) { bestP = pe; best = m; } applyMask(m); }
    applyMask(best); formatBits(best);
    return mod;
  }
  function qrSvg(mod) {
    var n = mod.length, q = 4, d = "";
    for (var y = 0; y < n; y++) { var x = 0; while (x < n) { if (mod[y][x]) { var s = x; while (x < n && mod[y][x]) x++; d += "M" + (s + q) + " " + (y + q) + "h" + (x - s) + "v1h-" + (x - s) + "z"; } else x++; } }
    return '<svg viewBox="0 0 ' + (n + 2 * q) + " " + (n + 2 * q) + '" width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="QR code de ton héros"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#0B0E13"/></svg>';
  }
  /* ---------- Transfert du héros entre appareils (code, et QR code sur ordinateur) ----------
     Rien ne passe par un serveur : le code contient le profil (compressé), une date de dernière progression et une somme de contrôle.
     Le QR code ouvre le site avec le code dans le fragment du lien (#t=…), que le navigateur n'envoie jamais au serveur.
     À l'import : aperçu côte à côte, le plus récent en grand et en vert, copie de sécurité du profil actuel et bouton « Annuler l'import » (7 jours). */
  var XFR_BACKUP = "powerup365.xfr.backup", XFR_DONE = "powerup365.xfr.done", XFR_PREFS = ["powerup365.capestyle", "powerup365.capefire"], XFR_QR_MAX = 1000;
  var pendingCode = null;
  function b64u(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function xfrSum(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ("0000000" + h.toString(36)).slice(-7); }
  function xfrPrefsNow() { var o = {}; XFR_PREFS.forEach(function (k) { var v = lsGet(k); if (v !== null) o[k] = v; }); return o; }
  /* Version allégée pour le QR code : le héros et sa progression, sans le planning de révisions, sans l'historique détaillé des jours (7 derniers) ni les repères « déjà vu ». Le planning est ~80 % du poids d'un profil actif. */
  function xfrLightP() {
    var q = JSON.parse(JSON.stringify(P));
    q.srs = {}; if (q.stats && q.stats.days) q.stats.days = q.stats.days.slice(-7);
    ["newSeen", "rel", "bgsSeen", "badgesSeen", "capesSeen", "bgOpen"].forEach(function (k) { delete q[k]; });
    return q;
  }
  function xfrMake(light) {
    var bytes = new TextEncoder().encode(JSON.stringify(light ? { v: 1, l: 1, at: Date.now(), p: xfrLightP(), c: xfrPrefsNow() } : { v: 1, at: Date.now(), p: P, c: xfrPrefsNow() }));
    function finish(pre, b) { var body = b64u(b); return pre + body + "." + xfrSum(pre + body); }
    if (window.CompressionStream) {
      var cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter(); w.write(bytes); w.close();
      return new Response(cs.readable).arrayBuffer().then(function (buf) { return finish("PU1-", new Uint8Array(buf)); });
    }
    return Promise.resolve(finish("PU0-", bytes));
  }
  function xfrParse(raw) {
    var bad = function (t) { return Promise.resolve({ ok: false, err: t }); };
    var s = String(raw || "").replace(/\s+/g, "");
    var m = s.match(/(PU[01]-[A-Za-z0-9_-]+)\.([0-9a-z]{7})/);
    if (!m) return bad("Ce n'est pas un code Power Up : il commence par PU1-. Copie-le en entier depuis ton autre appareil.");
    if (xfrSum(m[1]) !== m[2]) return bad("Le code est incomplet ou contient une faute. Copie-le de nouveau en entier.");
    var pre = m[1].slice(0, 4), bytes;
    try { bytes = unb64u(m[1].slice(4)); } catch (e) { return bad("Le code est illisible. Copie-le de nouveau en entier."); }
    var dec;
    if (pre === "PU0-") dec = Promise.resolve(bytes);
    else if (window.DecompressionStream) { var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(bytes); w.close(); dec = new Response(ds.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
    else return bad("Ce navigateur est trop ancien pour lire ce code. Mets-le à jour ou utilise un autre navigateur.");
    return dec.then(function (b) {
      var o = JSON.parse(new TextDecoder().decode(b));
      if (!o || o.v !== 1 || !o.p || typeof o.p !== "object" || typeof o.p.xp !== "number" || !(o.p.xp >= 0)) throw new Error("bad");
      return { ok: true, snap: o };
    }).catch(function () { return { ok: false, err: "Le code est illisible. Copie-le de nouveau en entier." }; });
  }
  /* "code" = le code est plus récent, "device" = cet appareil l'est, "same" = identiques */
  function xfrNewer(a) {
    var ta = +a.savedAt || 0, tb = +P.savedAt || 0, xa = a.xp || 0, xb = P.xp || 0;
    if (!P.pseudo && xb <= 50) return xa > xb ? "code" : "same"; /* appareil neuf : le bonus de première visite ne compte pas comme une progression */
    if (ta && tb && ta !== tb) return ta > tb ? "code" : "device";
    if (xa !== xb) return xa > xb ? "code" : "device";
    if (ta !== tb) return ta > tb ? "code" : "device";
    return "same";
  }
  function xfrDate(t) {
    if (!t) return "date inconnue";
    var d = new Date(+t), p2 = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getDate() + " " + d.toLocaleDateString("fr-FR", { month: "short" }) + ", " + p2(d.getHours()) + " h " + p2(d.getMinutes());
  }
  function xfrRow(l, v, c) { return '<div class="xfr-row"><span>' + l + "</span><b" + (c ? ' style="color:var(--green)"' : "") + ">" + v + "</b></div>"; }
  function xfrHero(p, label, big) {
    return '<div class="xfr-card' + (big ? " big" : "") + '"><div class="eyebrow">' + label + "</div>" + (big ? '<span class="xfr-pill">Plus récent</span>' : "") + '<b class="xfr-name">' + esc(p.pseudo || "Héros sans nom") + "</b>" +
      xfrRow("Grade", esc(rankInfo(p.xp || 0).name)) + xfrRow("XP", String(p.xp || 0), big) + '<small>Dernière partie : ' + xfrDate(p.savedAt) + "</small></div>";
  }
  function xfrClose() { var d = document.querySelector(".xfr"); if (d) d.remove(); }
  function xfrApply(snap) {
    lsSet(XFR_BACKUP, JSON.stringify({ at: Date.now(), p: P, c: xfrPrefsNow() }));
    var np = snap.p, d = defaultProfile(); for (var k in d) if (!(k in np)) np[k] = d[k];
    if (snap.l) { /* code allégé : on garde les révisions et les jours de jeu déjà présents sur cet appareil */
      var os = P.srs || {}, ns = np.srs || {}; Object.keys(ns).forEach(function (k) { os[k] = ns[k]; }); np.srs = os;
      var od = (P.stats && P.stats.days) || [], nd = (np.stats && np.stats.days) || [], all = od.slice(); nd.forEach(function (x) { if (all.indexOf(x) === -1) all.push(x); }); all.sort();
      if (np.stats) np.stats.days = all.slice(-400);
    }
    window.__puXfr = true;
    lsSet(STORE_KEY, JSON.stringify(np));
    XFR_PREFS.forEach(function (k2) { if (snap.c && typeof snap.c[k2] === "string") lsSet(k2, snap.c[k2]); });
    lsSet(XFR_DONE, "1"); location.reload();
  }
  function xfrDialog(snap) {
    xfrClose(); pendingCode = null;
    var who = xfrNewer(snap.p), el = document.createElement("div");
    el.className = "wlc xfr"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "xfr-t");
    var codeCard = xfrHero(snap.p, "Dans le code", who === "code"), devCard = xfrHero(P, "Sur cet appareil", who === "device");
    var body;
    if (who === "same") {
      body = '<h2 class="h-s" id="xfr-t">Les deux héros sont identiques</h2><div class="xfr-cmp">' + codeCard + devCard + '</div><p class="muted xfr-note">Il n\'y a rien à charger : ton héros est déjà à jour sur cet appareil.</p><div class="wlc-btns"><button type="button" class="btn btn-primary" data-xfr-no>Fermer</button></div>';
    } else if (who === "code") {
      body = '<div class="xfr-ok"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Code valide</div><h2 class="h-s" id="xfr-t">Charger ce héros sur cet appareil ?</h2><div class="xfr-cmp">' + codeCard + devCard + '</div><p class="muted xfr-note">Le code est plus récent : tu retrouves ta progression. Ton profil actuel est mis de côté juste avant, tu pourras l\'annuler.' + (snap.l ? ' Ce code est une version allégée (QR) : ton planning de révisions déjà présent sur cet appareil est conservé.' : '') + '</p><div class="wlc-btns"><button type="button" class="btn btn-primary" data-xfr-yes>Charger ce héros</button><button type="button" class="inst-later" data-xfr-no>Annuler</button></div>';
    } else {
      body = '<div class="xfr-ok" style="color:var(--gold)"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 2 20h20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.5v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Tu vas revenir en arrière</div><h2 class="h-s" id="xfr-t">Ce code est plus ancien que ton héros</h2><div class="xfr-cmp">' + devCard + codeCard + '</div><p class="inst-warn">Ton héros sur cet appareil a avancé depuis ce code. Le charger te ferait perdre cette avancée.</p><div class="wlc-btns"><button type="button" class="btn btn-primary" data-xfr-no>Garder mon profil actuel</button><button type="button" class="inst-later" data-xfr-yes>Charger ce code quand même</button></div>';
    }
    el.innerHTML = '<div class="wlc-card xfr-dlg">' + body + "</div>"; document.body.appendChild(el);
    var first = el.querySelector(".wlc-btns .btn"); if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { } }, 50);
    function onKey(ev) { if (ev.key === "Escape") { document.removeEventListener("keydown", onKey); xfrClose(); } }
    document.addEventListener("keydown", onKey);
    el.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-xfr-yes]")) { sfx("good"); xfrApply(snap); return; }
      if (t.closest("[data-xfr-no]") || t === el) { document.removeEventListener("keydown", onKey); xfrClose(); }
    });
  }
  function xfrCheck(raw, errEl) {
    if (errEl) errEl.hidden = true;
    if (!String(raw || "").trim()) { if (errEl) { errEl.textContent = "Colle d'abord ton code dans la zone ci-dessus."; errEl.hidden = false; } return; }
    xfrParse(raw).then(function (r) {
      if (r.ok) { xfrDialog(r.snap); return; }
      sfx("bad"); if (errEl) { errEl.textContent = r.err; errEl.hidden = false; }
    });
  }
  function xfrBackup() { try { var b = JSON.parse(lsGet(XFR_BACKUP) || "null"); return b && b.p && Date.now() - (+b.at || 0) < 7 * 864e5 ? b : null; } catch (e) { return null; } }
  /* Point sur l'onglet Portail : jamais sauvegardé (dès 50 XP), ou héros qui a progressé depuis plus de 7 jours */
  function portalNeeds() { var last = P.portal && P.portal.last; if (!last) return (P.xp || 0) >= 50; return (+P.savedAt || 0) - last > 7 * 864e5; }
  function xfrStatusHtml() {
    var last = P.portal && P.portal.last, saved = +P.savedAt || 0;
    if (!last) return '<div class="portal-status warn" data-portal-status><b>Pas encore sauvegardé.</b> Ton héros n\'existe nulle part ailleurs que dans ce navigateur.</div>';
    if (last >= saved) return '<div class="portal-status ok" data-portal-status><b>À jour.</b> Dernier code créé : ' + xfrDate(last) + ".</div>";
    return '<div class="portal-status warn" data-portal-status><b>Ton héros a progressé</b> depuis ton dernier code (' + xfrDate(last) + "). Crée-en un nouveau.</div>";
  }
  /* Premier code ou lien créé : badge + 25 XP une seule fois. À chaque fois : on note le moment. */
  function xfrMarkSent() {
    var first = !(P.portal && P.portal.at); P.portal = P.portal || {};
    if (first) { P.portal.at = Date.now(); P.xp = (P.xp || 0) + 25; }
    P.portal.last = Date.now(); saveProfile();
    var el = document.querySelector("[data-portal-status]"); if (el) el.outerHTML = xfrStatusHtml();
    if (first) { setTimeout(render, 1200); }
  }
  function xfrCardHtml() {
    var rk = rankInfo(P.xp || 0).name, desk = !isTouchPhone(), bk = xfrBackup();
    var ring = '<svg class="portal-ring" viewBox="0 0 120 120" width="112" height="112" aria-hidden="true"><defs><radialGradient id="pgl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8F9BFF" stop-opacity=".55"/><stop offset="1" stop-color="#8F9BFF" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="60" r="58" fill="url(#pgl)"/><g fill="none" stroke-linecap="round"><ellipse class="pr1" cx="60" cy="60" rx="22" ry="48" stroke="#8F9BFF" stroke-width="4"/><ellipse class="pr2" cx="60" cy="60" rx="14" ry="36" stroke="#F5C451" stroke-width="3"/><ellipse class="pr3" cx="60" cy="60" rx="7" ry="22" stroke="#E8ECF4" stroke-width="2.5"/></g></svg>';
    var rk0 = '<path d="M12 2.5c3.2 2.3 4.8 5.6 4.8 9.3v3.2H7.2v-3.2c0-3.7 1.6-7 4.8-9.3z"/><circle cx="12" cy="9.6" r="1.7"/><path d="M7.2 12.6 4.6 15.4v3.1l2.6-1.6M16.8 12.6l2.6 2.8v3.1l-2.6-1.6M10 18.2c0 1.6.8 2.8 2 3.3 1.2-.5 2-1.7 2-3.3"/>';
    var up = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + rk0 + '</svg>';
    var down = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform:rotate(180deg)">' + rk0 + '</svg>';
    return '<section class="panel xfr-main portal" id="xfr" aria-labelledby="xfr-h"><div class="portal-hero">' + ring + '<div class="portal-txt"><span class="eyebrow inst-new">Portail · sauvegarde</span><h2 class="h-m" id="xfr-h">Mets ton héros à l\'abri</h2>' +
      '<p class="muted">Ton héros n\'existe que dans ce navigateur, sur cet appareil. Si tu changes d\'appareil (téléphone, tablette, ordinateur), de navigateur (Chrome, Firefox…) ou si tu vides les données du navigateur, tu repars de zéro. Le portail le garde avec toi : rien ne passe par un serveur.</p>' + xfrStatusHtml() + '</div></div>' +
      '<div class="portal-cols"><div class="portal-box send"><h3 class="portal-h"><span class="portal-ico" aria-hidden="true">' + up + '</span>Envoyer mon héros</h3>' +
      '<p class="muted portal-p">Copie ton code ou ton lien, puis ouvre-le sur ton autre appareil.</p>' +
      '<div class="xfr-codebox" data-xfr-codebox tabindex="0" aria-label="Ton code" hidden></div>' +
      '<div class="xfr-btns"><button type="button" class="btn btn-primary xfr-copy" data-xfr-copy>Copier mon code</button><button type="button" class="btn btn-ghost xfr-copy" data-xfr-link>Copier le lien</button></div>' +
      '<small class="muted xfr-sub" data-xfr-sub>Ton héros tel qu\'il est maintenant : ' + esc(rk) + " · " + (P.xp || 0) + ' XP. <button type="button" class="xfr-showcode" data-xfr-show>Voir le code</button></small><small class="muted xfr-sub" data-xfr-qrno hidden></small>' +
      (desk ? '<div class="xfr-col xfr-qrcol" data-xfr-qrcol hidden><span class="eyebrow">Avec ton téléphone</span><div class="xfr-qr" data-xfr-qr aria-live="polite" title="Touche pour agrandir"></div><small class="muted xfr-qrtxt" data-xfr-qrtxt></small></div>' : "") + "</div>" +
      '<div class="portal-box recv"><h3 class="portal-h"><span class="portal-ico" aria-hidden="true">' + down + '</span>Recevoir un héros</h3>' +
      '<label for="xfr-in" class="muted portal-p">Colle ici le code de ton autre appareil.</label>' +
      '<textarea id="xfr-in" class="xfr-in" rows="3" placeholder="PU1-…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>' +
      '<p class="inst-warn xfr-err" data-xfr-err role="alert" hidden></p><button type="button" class="btn btn-ghost xfr-check" data-xfr-check>Vérifier le code</button></div></div>' +
      (bk ? '<div class="xfr-undo"><small class="muted">Dernier import : ' + xfrDate(bk.at) + '. Ton ancien héros est gardé 7 jours.</small><button type="button" class="inst-later" data-xfr-undo>Annuler l\'import</button></div>' : "") + "</section>";
  }
  function fillTransfer() {
    var box = document.querySelector("[data-xfr-codebox]"), qr = document.querySelector("[data-xfr-qr]"); if (!box) return;
    Promise.all([xfrMake(), xfrMake(true)]).then(function (cs) {
      var code = cs[0], b2 = document.querySelector("[data-xfr-codebox]"); if (!b2) return; b2.textContent = code;
      var q = document.querySelector("[data-xfr-qr]"), qt = document.querySelector("[data-xfr-qrtxt]"), url = location.origin + location.pathname + "#t=" + cs[1], mod = url.length <= XFR_QR_MAX ? qrEncode(url) : null;
      var qc = document.querySelector("[data-xfr-qrcol]"), qn = document.querySelector("[data-xfr-qrno]");
      if (q && mod) { if (qc) qc.hidden = false; q.innerHTML = qrSvg(mod); if (qt) qt.textContent = "Vise-le avec l'appareil photo de ton téléphone (touche-le pour l'agrandir). Version allégée : ton héros, mais sans ton planning de révisions. Pour tout transférer, utilise le lien."; }
      else if (q) { if (qc) qc.hidden = true; if (qn) { qn.hidden = false; qn.textContent = "Ton héros est trop riche pour un QR code : envoie-toi le lien (message, mail) ou copie le code."; } }
    });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-xfr-copy],[data-xfr-link],[data-xfr-check],[data-xfr-undo]"); if (!t) return;
    if (t.hasAttribute("data-xfr-check")) { var ta = document.getElementById("xfr-in"); xfrCheck(ta ? ta.value : "", document.querySelector("[data-xfr-err]")); return; }
    if (t.hasAttribute("data-xfr-undo")) {
      var b = xfrBackup(); if (!b) { render(); return; }
      window.__puXfr = true; lsSet(STORE_KEY, JSON.stringify(b.p)); XFR_PREFS.forEach(function (k) { if (b.c && typeof b.c[k] === "string") lsSet(k, b.c[k]); }); lsDel(XFR_BACKUP); location.reload(); return;
    }
    var asLink = t.hasAttribute("data-xfr-link");
    xfrMake().then(function (code0) {
      var code = asLink ? location.origin + location.pathname + "#t=" + code0 : code0;
      var box = document.querySelector("[data-xfr-codebox]"), shown = function () { if (box) { box.hidden = false; box.textContent = code; try { var r = document.createRange(); r.selectNodeContents(box); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (err) { } } };
      var ok = function () { sfx("good"); toastMsg(asLink ? "Lien copié. Ouvre-le sur ton autre appareil." : "Code copié. Colle-le sur ton autre appareil."); xfrMarkSent(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, function () { shown(); toastMsg("Copie impossible ici : le code est sélectionné, copie-le à la main."); });
      else { shown(); toastMsg("Copie impossible ici : le code est sélectionné, copie-le à la main."); }
    });
  });
  document.addEventListener("click", function (e) { var q = e.target.closest && e.target.closest("[data-xfr-qr]"); if (q) q.classList.toggle("zoom"); var sh = e.target.closest && e.target.closest("[data-xfr-show]"); if (sh) { var bx = document.querySelector("[data-xfr-codebox]"); if (bx) { bx.hidden = !bx.hidden; sh.textContent = bx.hidden ? "Voir le code" : "Masquer le code"; } } });
  document.addEventListener("paste", function (e) { if (e.target && e.target.id === "xfr-in") setTimeout(function () { xfrCheck(e.target.value, document.querySelector("[data-xfr-err]")); }, 0); });
  /* Lien du QR code : #t=<code>. On le range tout de suite pour que le routeur ne le voie pas, puis on ouvre l'aperçu après l'intro. */
  (function () {
    var h = location.hash || "";
    if (h.indexOf("#t=") === 0) { try { pendingCode = decodeURIComponent(h.slice(3)); } catch (e0) { pendingCode = h.slice(3); } try { history.replaceState(null, "", location.pathname + location.search + "#/profil"); route(); } catch (e) { } }
  })();
  function afterIntro() { if (pendingCode) { var c = pendingCode; pendingCode = null; xfrCheck(c, null); } else showWelcome(); }
  setTimeout(function () { if (pendingCode && !document.querySelector(".intro")) afterIntro(); }, 600);
  function afterRenderTransfer() {
    if (lsGet(XFR_DONE) === "1") { lsDel(XFR_DONE); setTimeout(function () { sfx("wlcOk"); toastMsg("Héros chargé : " + (P.pseudo || "Héros") + " · " + rankInfo(P.xp || 0).name + " · " + (P.xp || 0) + " XP"); }, 600); }
    fillTransfer();
  }
  setTimeout(function () { try { fillTransfer(); } catch (e) { } }, 60); /* 1er affichage direct sur le profil : la carte est dessinée avant que ces variables existent */
  window.PU_intro = showIntro;
  (function () { var seen = false; try { seen = !!sessionStorage.getItem(INTRO_KEY); } catch (e) { } if (!seen && !navigator.webdriver) showIntro(); })();
})();
