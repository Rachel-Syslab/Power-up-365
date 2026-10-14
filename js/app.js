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
  var SHOW_COUNTS = DEV_PAGES;

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
  function saveProfile() { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { } }
  var P = loadProfile();
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
  function avatarUnlocked(a) { return a && (!a.locked || P.xp >= (a.unlockXp || 0)); }
  function validAvatarId(id) { var a = avatarInfo(id); return avatarUnlocked(a) ? id : (window.DEFAULT_AVATAR || "patch"); }
  function myAvatar(size, capeId) { var av = window.avatarSvg ? (window.avatarSvg(validAvatarId(P.avatar), size) || "") : ""; return capeWrap(av, size, capeId); }
  function heroSay(hero, text, extraCls) {
    if (!hero || !window.heroSvg) return "";
    return '<div class="hero-say' + (extraCls ? " " + extraCls : "") + '"><span class="hero-say-face">' + window.heroSvg(hero, 56) + '</span><div><b>' + esc(hero.name) + "</b><p>" + esc(text) + "</p></div></div>";
  }
  function heroExplain(theme, text) {
    var h = window.heroForTheme ? window.heroForTheme(theme) : null;
    if (!h) return "<p>" + esc(text) + "</p>";
    return '<div class="hero-say explain"><span class="hero-say-face">' + window.heroSvg(h, 48) + '</span><div><b>' + esc(h.name) + " t'explique</b><p>" + esc(text) + "</p></div></div>";
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
    { id: "password", title: "Le pire mot de passe", done: "Tu as tapé un des mots de passe les plus utilisés au monde : Phishbuster a déclenché l'alarme.", hint: "Phishbuster monte la garde. Tape au clavier (ou dans le champ pseudo) un des pires mots de passe du monde, les six premiers chiffres, ou la première rangée de ton clavier AZERTY…" },
    { id: "sobre", title: "Lumières éteintes", done: "Green Byte a passé le QG en mode sobriété : moins de couleurs, moins d'animations, moins d'énergie.", hint: "Tout en bas de la page, une petite feuille fait pousser les économies d'énergie. Clique-la trois fois de suite." },
    { id: "birthday", title: "Joyeux anniversaire !", done: "Tu as souhaité son anniversaire à un gardien le bon jour.", hint: "Certains gardiens ont aussi une date d'anniversaire précise (les autres, on ne connaît que leur année). Consulte leurs fiches… et reviens le bon jour." }
  ];
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
  function renderSecrets() {
    var nb = nextBirthday(), found = secretsFound(), all = found === SECRETS.length;
    var cards = SECRETS.filter(function (x) { return P.secrets && P.secrets[x.id]; }).map(function (x) {
      return '<div class="secret-card found"><span class="secret-ico" aria-hidden="true">★</span><div><b>' + esc(x.title) + "</b><p>" + esc(x.done) + "</p></div></div>";
    }).join("");
    if (!all) {
      var left = SECRETS.filter(function (x) { return !(P.secrets && P.secrets[x.id]); }), pick = left[new Date().getDate() % left.length];
      var pp = P.secretsProgress || {};
      if (!(P.secrets && P.secrets.terminal) && (pp.sudo || pp.ping)) pick = SECRETS.filter(function (x) { return x.id === "terminal"; })[0];
      var hint = (pick.id === "terminal" && (pp.sudo || pp.ping) ? "Tu as déjà appelé " + (pp.sudo ? "Sudo" : "Miss Ping") + ". Un deuxième gardien répond à son nom tapé au clavier : lequel ?" : pick.hint) + (pick.id === "birthday" && nb ? " Prochain anniversaire : " + window.heroById(nb.id).name + ", le " + nb.d.getDate() + " " + ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][nb.d.getMonth()] + "." : "");
      cards += '<div class="secret-card"><span class="secret-ico" aria-hidden="true">?</span><div><b>' + (found ? "D'autres secrets t'attendent…" : "Des secrets se cachent dans le QG…") + "</b><p>Indice du jour : " + esc(hint) + "</p></div></div>";
    }
    return '<section class="section secrets" aria-labelledby="secrets-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--gold)">Chasse aux secrets</span><h2 class="h-l" id="secrets-title">Les secrets du QG</h2></div><p class="muted" style="margin:0">' + (all ? "Tous les secrets sont trouvés · badge Chasseur de secrets obtenu !" : (found ? found + " secret" + (found > 1 ? "s" : "") + " trouvé" + (found > 1 ? "s" : "") + " · +20 XP par secret" : "+20 XP par secret trouvé")) + '</p></div><div class="secrets-grid">' + cards + "</div></section>";
  }


  /* =========================================================
     BADGES : vitrine de médailles néon (étape 26)
     ========================================================= */
  var openPG = {};
  document.addEventListener("toggle", function (e) { var d = e.target; if (d && d.dataset && d.dataset.pg) openPG[d.dataset.pg] = d.open; }, true);
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
        { n: "Chasseur de secrets", d: "Trouver tous les secrets du QG", i: BI.key, s: "star", on: secretsFound() >= SECRETS.length }
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
      var first = items.slice(0, 3), rest = items.slice(3);
      return '<div class="vit-fam"><h3 class="vit-title" style="color:' + f.color + '">' + esc(f.title) + ' <small>' + f.items.filter(function (b) { return b.on; }).length + " / " + f.items.length + '</small></h3><div class="vit-grid">' + first.map(card).join("") + "</div>" +
        (rest.length ? '<details class="vit-more" data-pg="vit-' + f.id + '"' + (openPG["vit-" + f.id] ? " open" : "") + '><summary>Voir les ' + rest.length + " autres badges" + ' <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="vit-grid">' + rest.map(card).join("") + "</div></details>" : "") + "</div>";
    }).join("");
    return '<section class="section vitrine" aria-labelledby="vit-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow" style="color:var(--gold)">Mes récompenses</span><h2 class="h-l" id="vit-title">La vitrine des badges</h2></div><p class="muted" style="margin:0">' + got + " badge" + (got > 1 ? "s" : "") + " sur " + total + ". Les médailles grises t'attendent : leur condition est écrite dessous.</p></div>" + html + "</section>";
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
  function heroReply(heroId, text, cmd) {
    P.secretsProgress = P.secretsProgress || {}; P.secretsProgress[cmd] = 1; saveProfile();
    var both = P.secretsProgress.sudo && P.secretsProgress.ping, already = P.secrets && P.secrets.terminal;
    document.querySelectorAll(".hero-toast").forEach(function (x) { x.remove(); });
    var h = window.heroById(heroId), el = document.createElement("div"); el.className = "hero-toast"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="ht-face">' + window.heroSvg(h, 48) + "</span><div><b>" + esc(h.name) + "</b><code>" + esc(text) + "</code>" +
      (!both && !already ? '<small class="ht-next">1 commande sur 2 · Un autre gardien du QG répond aussi quand on tape son nom… Trouve-le pour débloquer le secret.</small>' : "") + "</div>";
    document.body.appendChild(el); sfx("open"); setTimeout(function () { el.remove(); }, both || already ? 4200 : 6500);
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
  }
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) { kIdx = 0; retroMode(); }
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "TEXTAREA" || (tag === "INPUT" && tg.id === "type-answer")) return;
    if (k.length === 1) { typed = (typed + k).slice(-12); if (tag !== "INPUT") checkTyped(); }
  });
  document.addEventListener("input", function (e) { var tg = e.target; if (tg && tg.tagName === "INPUT" && tg.id !== "type-answer") { var v = String(tg.value || "").toLowerCase(); if (/(sudo|ping)$/.test(v) || BAD_PW.test(v)) { typed = v.slice(-12); checkTyped(); } } });

  /* =========================================================
     BOÎTE À IDÉES : remarques, suggestions, bugs
     (site statique : le message part par la messagerie de l'utilisateur, ou via un formulaire Microsoft Forms)
     ========================================================= */
  function openFeedback() {
    var cfg = window.POWERUP_CONFIG || {}, dlg = document.querySelector(".fb-modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "fb-modal"; dlg.setAttribute("aria-labelledby", "fb-title"); document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || (e.target.closest && e.target.closest("[data-fb-close]"))) dlg.close(); }); }
    var types = ["Suggestion", "Remarque", "Bug", "Question", "Idée de question ou de boss"];
    dlg.innerHTML = '<form class="fb-inner" method="dialog"><button type="button" class="hm-close" data-fb-close aria-label="Fermer"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>' +
      '<span class="eyebrow">Ton avis compte</span><h2 class="h-m" id="fb-title">Boîte à idées</h2><p class="muted" style="margin:0">Une remarque, une idée, un bug, une question à ajouter ? Écris-nous : chaque message aide à améliorer Power Up.</p>' +
      '<fieldset class="fb-types"><legend class="sr-only">Type de message</legend>' + types.map(function (t, k) { return '<label class="fb-type"><input type="radio" name="fbtype" value="' + t + '"' + (k === 0 ? " checked" : "") + "><span>" + t + "</span></label>"; }).join("") + "</fieldset>" +
      '<label class="fb-label" for="fb-msg">Ton message</label><textarea id="fb-msg" rows="6" placeholder="Par exemple : ce serait génial d\'avoir un boss sur Teams…"></textarea>' +
      '<p class="fb-warn" role="alert" hidden>Écris quelques mots avant d\'envoyer.</p>' +
      '<div class="fb-actions">' + (cfg.feedbackEmail ? '<button type="button" class="btn btn-primary" data-fb-send>Envoyer par e-mail</button>' : "") + (cfg.feedbackFormUrl ? '<a class="btn ' + (cfg.feedbackEmail ? "btn-ghost" : "btn-primary") + '" href="' + esc(safeUrl(cfg.feedbackFormUrl)) + '" target="_blank" rel="noopener">Répondre via le formulaire</a>' : "") +
      '<button type="button" class="btn btn-ghost" data-fb-copy>Copier mon message</button></div>' +
      (cfg.feedbackEmail || cfg.feedbackFormUrl ? "" : '<p class="muted" style="margin:0;font-size:13px">L\'adresse de réception n\'est pas encore configurée (fichier js/config.js). En attendant, copie ton message et envoie-le à l\'équipe.</p>') + "</form>";
    function payload() {
      var type = (dlg.querySelector('input[name="fbtype"]:checked') || {}).value || "Suggestion", msg = dlg.querySelector("#fb-msg").value.trim();
      return { type: type, msg: msg, full: "[" + type + "] " + msg + "\n\n— " + (P.pseudo || "Héros anonyme") + " · " + rankInfo(P.xp).name + " · page " + (location.hash || "#/") };
    }
    dlg.onclick = function (e) {
      var send = e.target.closest && e.target.closest("[data-fb-send]"), copy = e.target.closest && e.target.closest("[data-fb-copy]"); if (!send && !copy) return;
      var d = payload(), warn = dlg.querySelector(".fb-warn"); if (!d.msg) { warn.hidden = false; dlg.querySelector("#fb-msg").focus(); return; } warn.hidden = true;
      if (send) { location.href = "mailto:" + encodeURIComponent(cfg.feedbackEmail).replace("%40", "@") + "?subject=" + encodeURIComponent("Power Up · " + d.type) + "&body=" + encodeURIComponent(d.full); announce("Ta messagerie s'ouvre avec ton message."); }
      if (copy) { var done = function () { copy.textContent = "Message copié !"; setTimeout(function () { copy.textContent = "Copier mon message"; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(d.full).then(done, function () {}); else { var ta = dlg.querySelector("#fb-msg"); ta.value = d.full; ta.select(); try { document.execCommand("copy"); done(); } catch (err) { } } }
    };
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    setTimeout(function () { var t = dlg.querySelector("#fb-msg"); if (t) t.focus(); }, 50);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-feedback]")) openFeedback(); });

  function navBadge() {
    var n = typeof unreadCount === "function" ? unreadCount() : 0;
    return n ? '<span class="nav-badge"><span class="sr-only">, </span>' + (n > 99 ? "99+" : n) + '<span class="sr-only"> non lues</span></span>' : "";
  }
  function header(active) {
    var r = rankInfo(P.xp);
    function link(href, id, label) { return '<a href="' + href + '"' + (active === id ? ' class="active" aria-current="page"' : "") + ">" + label + "</a>"; }
    return '<header class="topbar"><div class="container">' +
      '<a class="logo" href="#/">' + I.logo + 'POWER <span>UP</span></a>' +
      '<nav class="nav" aria-label="Navigation principale">' +
      link("#/", "qg", "QG") + link("#/entrainement", "train", "Entraînement") + link("#/classe", "ranked", "Mode classé") + link("#/mission", "mission", "Boss") + link("#/veille", "veille", "Veille" + navBadge()) + link("#/collectif", "collectif", 'Collectif<span class="nav-soon" aria-label=", bientôt">bientôt</span>') + (!DEV_PAGES ? "" : link("#/maintenance", "sons", "Maintenance")) +
      "</nav>" + soundButton() +
      '<a class="profile-chip" href="#/profil" style="text-decoration:none;color:inherit" aria-label="Mon profil"><span class="avatar">' + myAvatar(34) + "</span><span><b>" + esc(P.pseudo || "Crée ton héros") + "</b><small>" + esc(r.name) + " · " + P.xp + " XP</small></span></a>" +
      '<button type="button" class="quit-btn" data-quit-ask title="Quitter le QG" aria-label="Quitter le QG"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6.3 7.2a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
      "</div></header>";
  }
  function footer() {
    var found = secretsFound();
    return '<footer class="footer"><div class="container"><span>Power Up · projet de stage · <a href="#/confidentialite">Confidentialité</a></span><a class="footer-secret" href="#/profil?s=secrets"><span class="ft-ico ft-egg" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.5c-3.6 0-6.5 5.6-6.5 10.2A6.5 6.5 0 0 0 12 21.5a6.5 6.5 0 0 0 6.5-8.8C18.5 8.1 15.6 2.5 12 2.5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.3 11.5l2.4 1.6 2.2-2 2.2 2 2.2-2 2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9.5" cy="16.3" r="1.1" fill="currentColor"/><circle cx="14.6" cy="15.6" r="1.1" fill="currentColor"/></svg></span>' + (found >= SECRETS.length ? "Tous les secrets du QG sont trouvés. Bravo, chasseur !" : "Il y a des secrets cachés dans ce QG…") + '</a><button type="button" class="footer-idea" data-feedback><span class="ft-ico ft-bulb" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M9 17.5h6M10 21h4M12 2.8a6.3 6.3 0 0 0-3.8 11.3c.6.5.8 1.1.8 1.9v.5h6V16c0-.8.3-1.4.8-1.9A6.3 6.3 0 0 0 12 2.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="ft-rays" d="M12 .2v.9M3.4 3.6l.7.6M20.6 3.6l-.7.6M.9 10h.9M22.2 10h.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>Boîte à idées</button><span class="footer-eco"><span class="ft-ico ft-leaf" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M20 3.5C9.5 3.5 4 8.5 4 15c0 1.9.6 3.6 1.5 5 6.9-.4 14.5-4.4 14.5-16.5z" fill="#4CC37A" fill-opacity=".25" stroke="#4CC37A" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.5 20c2.4-4.4 6-7.8 10-10" fill="none" stroke="#4CC37A" stroke-width="1.8" stroke-linecap="round"/></svg></span>Éco-conçu : léger, sans vidéo, sans pisteur</span></div></footer>';
  }

  /* =========================================================
     VUE : banc de sons (onglet temporaire pour Rachel, à retirer à la fin)
     ========================================================= */
  var SOUND_BENCH = [
    ["Nouveaux sons", true, [["badge", "Nouveau badge", "Petit carillon quand une médaille rejoint ta vitrine."], ["cape", "Nouvelle cape", "Souffle puissant de départ en vol quand une cape arrive au vestiaire ou que tu en changes."], ["ignite", "Légende se débloque", "Les chaînes cliquettent, se brisent, puis la flamme repart."], ["fightReal", "Entrée dans un combat", "Ta cloche de ring (sons/Bell.mp3)."], ["fightReal3", "Entrée dans un combat (niveau 3)", "Double coup de cloche."], ["bossStart", "Combat · son de secours", "Joué seulement si le fichier Bell manque."], ["shutdown", "Captain Reboot plante", "Glitchs puis extinction (secret des 7 clics)."], ["boot", "Captain Reboot redémarre", "Bourdonnement, bips de diagnostic, accord de démarrage."], ["read", "Article lu", "Petit « tic » quand tu réponds « Oui, c'est lu » dans la veille."], ["vol", "Réglage du volume", "Bip quand tu lâches la tirette."]]],
    ["En jeu", false, [["good", "Bonne réponse", ""], ["bad", "Mauvaise réponse", "Aussi quand on clique sur Légende verrouillée."], ["shield", "Bouclier gagné", "Aussi joué quand tu trouves un secret."], ["end", "Fin de partie", ""]]],
    ["Grades", false, [["promo", "Promotion", ""], ["demote", "Rétrogradation", ""], ["maxRank", "Grade maximum", "Promotion, puis carillon de Captain Reboot."]]],
    ["Boss", false, [["bossWin", "Boss vaincu", "Le boss se brise."], ["bossLose", "Défaite", "Le boss rit et casse tes boucliers."], ["mail", "Message envoyé", "Le coup de grâce part."]]],
    ["Interface", false, [["tab", "Onglet", ""], ["open", "Ouverture d'une fiche", ""], ["toggle", "Interrupteur", ""]]]
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
  function currentBg() { var l = bgList(), c = l.filter(function (x) { return x.id === P.bg && x.open; })[0]; return c || l.filter(function (x) { return x.id === "qg"; })[0]; }
  /* tall = carte en hauteur (profil, carte de héros) : le décor se cale en bas en entier au lieu d'être rogné sur les côtés */
  var BG_PATTERNS = ["disquettes", "serpent"];
  function bgLayers(g, tall) { var deco = (window.BG_DECO || {})[g.id]; if (!deco) return ""; if (tall && BG_PATTERNS.indexOf(g.id) === -1) deco = deco.replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMax meet"'); return '<span class="pbg-deco' + (tall ? " tall" : "") + '">' + deco + "</span>"; }
  function bgClass(g) { return "pbg pbg-" + g.id + (g.prestige ? " pbg-prestige" : ""); }
  function maintGallery() {
    var capes = capeList().map(function (c) { return '<div class="mg-item" style="--cape:' + c.color + '"><span class="mg-cape">' + capeSvg(c, 0) + "</span><b>" + esc(c.name) + "</b><small>" + esc(c.how) + "</small></div>"; }).join("");
    var bosses = (window.BOSSES || []).map(function (b) {
      return '<div class="mg-boss"><b style="color:' + b.color + '">' + esc(b.name.charAt(0).toUpperCase() + b.name.slice(1)) + '</b><div class="mg-boss-row">' + [1, 2, 3].map(function (lv) { return '<span class="mg-bl"><span class="mg-bart">' + window.bossArt(b.id, b.color, lv) + "</span><small>Niveau " + lv + "</small></span>"; }).join("") + "</div></div>";
    }).join("");
    function bgCard(g) {
      var deco = (window.BG_DECO || {})[g.id];
      return '<div class="mg-bg"><div class="public-card pbg pbg-' + g.id + (g.prestige ? " pbg-prestige" : "") + '">' + (deco ? '<span class="pbg-deco">' + deco + "</span>" : "") + (g.y ? '<span class="pbg-year">' + esc(g.y) + "</span>" : "") + '<div class="public-head"><span class="public-face">' + myAvatar(56) + '</span><div><b>' + esc(P.pseudo || "Héros sans nom") + '</b><small class="muted">Carte de héros</small>' + favSlots() + '</div></div><ul class="public-list"><li><span>Grade</span><b>' + esc(RANKS[rankIndex(P.xp)].n) + '</b></li><li><span>Badges</span><b>' + earnedBadges().length + '</b></li></ul></div><b class="mg-bg-name">' + esc(g.name) + '</b><small>' + esc(g.how) + "</small></div>";
    }
    var bgs = PROFILE_BGS.map(bgCard).join(""), musee = MUSEE_BGS.map(bgCard).join(""), prestige = PRESTIGE_BGS.map(bgCard).join("");
    var grades = RANKS.map(function (r, i) { return '<div class="mg-item"><span class="mg-rank">' + rankBadge(i, 56) + '</span><b style="color:' + RANK_COLORS[i] + '">' + esc(r.n) + "</b><small>" + r.min + " XP</small></div>"; }).join("");
    return '<section class="bench-grp new"><h2 class="h-s">Proposition : fonds prestige (niveaux max)</h2><p class="muted" style="margin:0 0 12px">Les fonds les plus travaillés, réservés aux exploits : bordure animée, décor vivant.</p><div class="mg-bgs">' + prestige + "</div></section>" +
      '<section class="bench-grp new"><h2 class="h-s">Proposition : fonds de la carte de héros</h2><p class="muted" style="margin:0 0 12px">Des fonds au choix pour ta carte de héros, à débloquer comme les capes et les cadres. Survole les badges pour voir la nouvelle bulle. Dis-moi lesquels tu gardes !</p><div class="mg-bgs">' + bgs + "</div></section>" +
      '<section class="bench-grp new"><h2 class="h-s">Proposition : le musée de l\'informatique</h2><p class="muted" style="margin:0 0 12px">Une collection de fonds qui raconte l\'histoire de l\'informatique et du jeu vidéo, des cartes perforées à l\'IA. Idée : on les débloque en découvrant les anecdotes des gardiens ou en lisant la veille.</p><div class="mg-bgs">' + musee + "</div></section>" +
      '<section class="bench-grp"><h2 class="h-s">Les grades</h2><div class="mg-grid">' + grades + "</div></section>" +
      '<section class="bench-grp"><h2 class="h-s">Toutes les capes</h2><div class="mg-grid">' + capes + "</div></section>" +
      '<section class="bench-grp"><h2 class="h-s">Les boss à chaque niveau</h2><div class="mg-bosses">' + bosses + "</div></section>";
  }
  function SoundsView() {
    return {
      nav: "sons",
      render: function () {
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:24px"><span class="eyebrow" style="color:var(--gold)">Onglet temporaire · pour Rachel</span><h1 class="h-l">Maintenance</h1><p class="lead">Tout ce qu\'on ne voit pas encore en jouant : les sons, les effets, les capes, les badges et les boss à chaque niveau. Le volume se règle avec le haut-parleur en haut de page. ' + (soundOn ? "" : '<b style="color:var(--gold)">Les sons sont coupés : active-les avec le haut-parleur.</b>') + "</p></div>" +
          '<section class="bench-grp new"><h2 class="h-s">Aperçu : style de la page d\'accueil</h2><p class="muted" style="margin:0 0 12px">Trois rendus à comparer : tel quel, une version équilibrée (même énergie, moins criarde), et une version pro (sobre, pour montrer le projet). Actif uniquement sur cet appareil, uniquement sur la page d\'accueil.</p><div class="test-actions">' +
            HOME_STYLES.map(function (s) { return '<button type="button" class="btn ' + (homeStyleOn() === s[0] ? "btn-primary" : "btn-ghost") + '" data-home-style="' + s[0] + '">' + esc(s[1]) + "</button>"; }).join("") +
            '<a class="btn btn-ghost" href="#/">Voir la page d\'accueil</a></div></section>' +
          '<section class="bench-grp test-mode"><h2 class="h-s">Mode test</h2><p class="muted" style="margin:0 0 12px">Débloque tout sur cet appareil (grade max, tous les boss aux 3 niveaux, badges, capes, cadres, secrets, cape flamboyante) pour faire des essais. Ton profil actuel est sauvegardé et peut être restauré.</p><div class="test-actions"><button type="button" class="btn btn-primary" data-test-unlock>Tout débloquer</button>' + (hasBackup() ? '<button type="button" class="btn btn-ghost" data-test-restore>Restaurer mon profil d\'avant</button>' : "") + (P.secrets && P.secrets.konami ? '<button type="button" class="btn btn-ghost" data-test-konami-reset>Ré-essayer la découverte du code Konami</button>' : "") + "</div></section>" +
          capeStyleBench() + capeFireBench() +
          '<section class="bench-grp"><h2 class="h-s">Intro : « Prêt à entrer au QG ? »</h2><p class="muted" style="margin:0 0 12px">L\'écran d\'accueil de Captain Reboot s\'affiche à l\'ouverture du site (une fois par session). Effet retenu : portes plein écran, jointure emboîtée.</p><div class="test-actions"><button type="button" class="btn btn-ghost" data-intro-test="eclair">▶ Revoir l\'intro</button></div><p class="muted" style="margin:14px 0 8px;font-size:13px"><b>Essais de voix</b> (retirées du site, gardées ici pour tester) : choisis la version puis écoute.</p><div class="test-actions">' +
            [["fort", "Robot fort"], ["moyen", "Robot moyen"], ["leger", "Robot léger"], ["brut", "Voix d'origine"]].map(function (x) { return '<button type="button" class="btn btn-small ' + (voiceChoiceSaved() === x[0] ? "btn-primary" : "btn-ghost") + '" data-voice-pick="' + x[0] + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div class="test-actions" style="margin-top:8px"><button type="button" class="btn btn-small btn-ghost" data-voice-play="bienvenue">▶ « Bienvenue au QG »</button><button type="button" class="btn btn-small btn-ghost" data-voice-play="abientot">▶ « À bientôt »</button></div></section>' +
          '<section class="bench-grp new"><h2 class="h-s">Son au survol de « super-pouvoirs »</h2><p class="muted" style="margin:0 0 12px">Le mot du titre d\'accueil s\'électrise au survol : écoute les propositions. Choix actuel pour tout le monde : 8 · ton son d\'aura, qui dure tant que la souris reste sur le mot et s\'éteint en douceur. Le bouton essayé devient le son choisi sur cet appareil.</p><div class="test-actions">' +
            PW_SFX_LIST.map(function (x) { return '<button type="button" class="btn btn-small ' + (pwSfxSaved() === x[0] ? "btn-primary" : "btn-ghost") + '" data-pw-pick="' + x[0] + '">' + esc(x[1]) + "</button>"; }).join("") + "</div></section>" +
          SOUND_BENCH.map(function (g) {
            return '<section class="bench-grp' + (g[1] ? " new" : "") + '"><h2 class="h-s">' + esc(g[0]) + '</h2><div class="bench-grid">' + g[2].map(function (x) {
              return '<button type="button" class="bench-card" data-bench="' + x[0] + '"><span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="txt"><b>' + esc(x[1]) + "</b>" + (x[2] ? "<small>" + esc(x[2]) + "</small>" : "") + "</span></button>";
            }).join("") + "</div></section>";
          }).join("") + maintGallery() + "</main>";
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
  function capeFireBench() {
    var list = capeList(), c = list[3] || list[0];
    return '<section class="bench-grp"><h2 class="h-s">Cape en feu (chaleur maximale)</h2><p class="muted" style="margin:0 0 12px">Quand la cape est Flamboyante (5 jours de suite), elle s\'embrase : flammes animées et braises qui montent. Le joueur peut l\'éteindre dans son profil (« 3 · Ta cape »). Forme retenue : Drapée ouverte ; en « Animations légères », les flammes restent figées.</p><div class="fire-grid">' +
      '<div class="fire-card"><span class="fire-big">' + capeSvg(c, 5, "drapee", true) + "</span><small>7 · Drapée ouverte</small></div>" + "</div></section>";
  }
  function capeStyleBench() {
    var list = capeList(), samples = [list[0], list[2], list[4], list.filter(function (x) { return x.id === "b-phisher"; })[0]].filter(Boolean);
    return '<section class="bench-grp"><h2 class="h-s">Forme des capes</h2><p class="muted" style="margin:0 0 12px">Forme retenue pour tout le monde : « 7 · Drapée ouverte », avec les décorations de chaque grade (Recrue, Super technicien, Super directeur technique, cape anti-Phisher). Utilisée partout : barre du haut, profil, vestiaire, cartes de héros.</p><div class="cs-grid">' +
      '<div class="cs-card selected"><div class="cs-big" style="--cape:' + samples[1].color + '">' + capeSvg(samples[1], 0, "drapee") + '</div><div class="cs-row">' + samples.map(function (c) { return '<span class="cs-mini" title="' + esc(c.name) + '">' + capeSvg(c, 0, "drapee") + "</span>"; }).join("") + "</div><b>7 · Drapée ouverte</b></div>" + "</div></section>";
  }
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
  function CollectifView() {
    return {
      nav: "collectif",
      render: function () {
        return '<main class="container page"><div class="collectif-alert" role="status"><span class="ca-light" aria-hidden="true"></span><div><span class="eyebrow" style="color:var(--gold)">Alerte QG · en cours de déploiement</span>' +
          '<h1 class="h-l">Challenge collectif</h1><p class="lead">Les gardiens préparent la salle de réunion… Bientôt, tu pourras relever des défis en équipe avec tes collègues, cumuler des points ensemble et grimper au classement du QG.</p>' +
          '<ul class="ca-list"><li>Objectifs d\'équipe hebdomadaires</li><li>Classement entre collègues (avec les réglages de confidentialité de ta fiche de héros)</li><li>Boss à affronter à plusieurs</li></ul>' +
          '<div class="ca-bar" aria-hidden="true"><i></i></div><p class="muted" style="margin:0">Déploiement en cours… Reviens vite, héros !</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/classe">' + I.bolt() + 'En attendant, le mode classé</a><button type="button" class="btn btn-ghost" data-feedback>Proposer une idée</button></div></div></div></main>';
      }
    };
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
      '<div class="rl-actions"><a class="btn btn-primary" href="#/classe" data-rank-close>Aller au mode classé</a>' + (!DEV_PAGES ? "" : '<a class="btn btn-ghost" href="#/demo" data-rank-close>Aperçu d\'une promotion</a>') + '</div></div>';
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
      '<div class="cer-actions"><button type="button" class="btn btn-ghost" data-cer-ladder>Voir les paliers</button><button type="button" class="btn ' + (up ? "btn-primary" : "btn-ghost") + '" data-cer-close>Continuer</button></div></div>';
    document.body.appendChild(el);
    var closeBtn = el.querySelector("[data-cer-close]"); if (closeBtn) closeBtn.focus({ preventScroll: true });
    function close() { if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.remove(); var nx = document.querySelector('[data-key="next"]'); if (nx) nx.focus({ preventScroll: true }); }, reduceMotion ? 0 : 280); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-cer-ladder]")) { close(); setTimeout(openRankLadder, 300); return; }
      if (e.target.closest("[data-cer-close]") || !e.target.closest(".cer-card")) close();
    });
    setTimeout(close, up ? (idx === RANKS.length - 1 ? 7000 : 5200) : 4200);
  }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-rank-ladder]")) openRankLadder(); });

  /* ---------- Bandeau des héros (QG) : défilement auto, flèches discrètes, fiche au clic ---------- */
  function heroTrainHref(h) { return h.mascot ? "#/entrainement?pillar=m365" : "#/entrainement?theme=" + h.themes[0]; }
  function heroCarousel() {
    var list = window.ALL_CHARACTERS || window.HEROES;
    if (!list) return "";
    var cards = list.map(function (h, i) {
      return '<button type="button" class="hs-card" style="--hc:' + h.glow + '" data-hero-open="' + h.id + '" aria-label="Voir la fiche de ' + esc(h.name) + '">' +
        '<span class="hc-portrait">' + window.heroSvg(h, 88) + (birthdayHero() === h.id ? '<span class="hc-cake" title="C\'est son anniversaire !">🎂</span>' : "") + "</span>" +
        '<span class="hc-text"><span class="hc-world">' + esc(h.world) + '</span><b class="hc-name">' + esc(h.name) + "</b>" +
        '<span class="hc-title">' + esc(h.title) + "</span>" +
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

        return '<main class="container">' +
          '<section class="hero"><div class="stack">' +
          '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="tag">QG · Saison 1</span><span class="muted" style="font-size:14px">Seul·e, on va vite. Ensemble, on va loin.</span></div>' +
          '<h1 class="h-xl">Active tes<br><span class="neon power-word" style="color:var(--blue-2)" tabindex="0">super-pouvoirs</span><br>Microsoft 365 <span class="and-co">&amp; co.</span></h1>' +
          '<p class="lead">Microsoft 365, cyber, IT, dev, IA et numérique responsable : entraîne-toi, grimpe les grades et affronte les boss, un power-up à la fois.</p>' +
          "</div>" +
          '<div class="comic-wrap" aria-hidden="false"><div class="comic-panel halftone mascot-panel">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 330) : I.robot) + '</div><div class="speech" aria-live="polite">' + esc(mood.bubble) + "</div></div>" +
          "</section>" +


          (P.pseudo ? (function () { var ri = rankIndex(P.xp), cur = RANKS[ri], nx = RANKS[ri + 1], pct = nx ? Math.round((P.xp - cur.min) / (nx.min - cur.min) * 100) : 100;
            return '<section class="welcome slim"><span class="welcome-face">' + myAvatar(52) + '</span><div class="welcome-main"><h2 class="welcome-greet">' + esc(mood.greet) + '</h2><div class="welcome-prog"><span class="wp-bar" style="--rc:' + RANK_COLORS[ri] + '"><i style="width:' + pct + '%"></i></span><span class="muted">' + esc(mood.status) + ' · <button type="button" class="link-btn" data-rank-ladder>Voir les paliers</button></span></div></div>' + '<a class="btn btn-primary btn-small btn-next-grade" style="--ng:' + RANK_COLORS[Math.min(ri + 1, RANKS.length - 1)] + '" href="' + mood.cta.href + '">' + RANK_PIP + esc(mood.cta.label) + "</a></section>"; })() : '<section class="welcome panel"><span class="welcome-face">' + myAvatar(72) + '</span><div class="stack" style="gap:6px;flex-grow:1"><h2 class="h-s">Bienvenue au QG, recrue !</h2><p class="muted" style="margin:0">Choisis ton pseudo et ton avatar pour commencer l\'aventure.</p></div><div class="welcome-actions"><a class="btn btn-primary" href="#/profil">Créer mon héros</a>' + '<a class="btn btn-ghost" href="' + mood.cta.href + '">' + esc(mood.cta.label) + "</a></div></section>") +
          heroCarousel() +
          '<section class="section" aria-labelledby="modes-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Comment jouer</span><h2 class="h-l" id="modes-title">Trois façons de progresser<span class="for-now">… pour l\'instant</span></h2></div></div>' +
          '<div class="modes">' +
          '<a class="mode-card" href="#/entrainement" style="--mc:#4CC37A"><span class="tag" style="background:var(--green-2)">Entraînement</span><blockquote class="mode-quote">« Même les plus grands héros ont eu besoin d\'une salle d\'entraînement. »<cite>Hotfix</cite></blockquote><p>Par pilier, par thème ou par niveau, à ton rythme. Aucune XP en jeu : trompe-toi, lis les explications, recommence.</p><span class="muted" style="font-size:14px">' + QUESTIONS.length + " questions · 6 formats</span></a>" +
          '<a class="mode-card" href="#/classe" style="--mc:#D9A35B"><span class="tag">Classé</span><blockquote class="mode-quote">« Avec de grands droits admin viennent de grandes responsabilités. »<cite>Sudo</cite></blockquote><p>Tous sujets confondus. Choisis ta difficulté : plus c\'est dur, plus tu grimpes vite… et plus une erreur coûte cher.</p><span class="muted" style="font-size:14px">4 difficultés · bouclier · rétrogradation</span></a>' +
          '<a class="mode-card" href="#/mission" style="--mc:#FF6B8A"><span class="tag" style="background:var(--pink)">Boss</span><blockquote class="mode-quote">« Gardiens, rassemblement ! Le QG a besoin de toi. »<cite>Captain Reboot</cite></blockquote><p>Un boss par domaine, en mise en situation réelle : tickets, journaux, commandes à taper. Maîtrise son domaine pour l\'affronter.</p><span class="muted" style="font-size:14px">' + bossesWon() + " boss vaincu" + (bossesWon() > 1 ? "s" : "") + "</span></a>" +
          '<a class="mode-card soon" href="#/collectif" style="--mc:#8EA2FF"><span class="tag tag-outline">Bientôt</span><h3 class="h-s">Challenge collectif</h3><p>Objectifs d\'équipe et classement partagé entre collègues. Arrive dans une prochaine version.</p></a>' +
          "</div></section>" +

          '<section class="section" id="mondes" aria-labelledby="worlds-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Les gardiens</span><h2 class="h-l" id="worlds-title">Chacun veille sur son domaine</h2></div><p class="muted" style="max-width:420px;margin:0">Chaque pilier a son gardien et son boss. Clique pour découvrir son contenu et des ressources pour aller plus loin.</p></div>' +
          '<div class="worlds">' +
          PILLARS.map(function (pl, i) {
            var n = QUESTIONS.filter(function (q) { return pl.subs.indexOf(q.theme) !== -1; }).length;
            var apps = pl.subs.map(function (id) { return themeLabel(id); }).join(" · ");
            var href = pl.id;
            return world("0" + (i + 1), href, "", pl.label, "Gardien" + (window.heroById(pl.hero).gender === "f" ? "ne" : "") + " : " + esc(window.heroById(pl.hero).name), pl.desc, pl.boss, pl.bonus ? " green osb" : "", pl.hero, pl.color);
          }).join("") +
          "</div></section>" +
          (function () { var d = veilleData(); if (!d.items.length) return ""; return '<section class="section" aria-labelledby="veille-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Veille</span><h2 class="h-l" id="veille-title">Les dernières actus</h2></div><a class="btn btn-ghost" href="#/veille">Toute la veille</a></div><div class="news-grid">' + d.items.slice(0, 3).map(function (it) { return veilleCard(it); }).join("") + "</div></section>"; })() +
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
        return QUESTIONS.filter(function (q) { return matchScope(q, self.pillar, self.theme) && (self.level === "all" || q.level === self.level) && legendOpen(q); });
      },
      countFor: function (theme, pillar) {
        var self = this;
        return QUESTIONS.filter(function (q) { return matchScope(q, pillar, theme) && (self.level === "all" || q.level === self.level) && legendOpen(q); }).length;
      },
      onAnswer: function (good) { this.answered++; if (good) this.score++; },
      endHero: function () {
        if (this.theme !== "all") return window.heroForTheme(this.theme);
        var pl = pillarById(this.pillar);
        return window.heroById(pl ? pl.hero : "volt");
      },
      actions: {
        /* Parcours pas à pas : pilier → sous-thème → niveau, avec un fil d'Ariane cliquable */
        mode: function (d) { V.mode = d.id; V.pillar = "all"; V.theme = "all"; V.level = "all"; V.step = "pillar"; V._focusKey = "mode-" + d.id; },
        pillar: function (d) { V.pillar = d.id; V.theme = "all"; V.level = "all"; var pl = pillarById(d.id); V.step = pl && pl.subs.length > 1 ? "theme" : "level"; V._scroll = true; V._focusKey = "stephead"; },
        theme: function (d) { V.theme = d.id; V.level = "all"; V.step = "level"; V._scroll = true; V._focusKey = "stephead"; },
        level: function (d) { V.level = d.id; V._focusKey = "start"; },
        goto: function (d) { V.phase = "choose"; V.step = d.id; V._scroll = true; V._focusKey = "stephead"; },
        start: function () {
          var pool = V.pool(); if (!pool.length) return;
          V.list = shuffle(pool); V.i = 0; V.score = 0; V.answered = 0; V.run = newRun(V.list[0]); V.phase = "play"; V._scroll = true;
        },
        next: function () {
          if (V.i >= V.list.length - 1) { V.phase = "end"; V._scroll = true; sfx("end"); return; }
          V.i++; V.run = newRun(V.list[V.i]); V._scroll = true; V._focusKey = "q";
        },
        finish: function () { V.phase = "end"; V._scroll = true; sfx("end"); },
        choose: function () { V.phase = "choose"; V._scroll = true; }
      },
      render: function () {
        if (this.phase === "choose") return this.renderChoose();
        if (this.phase === "play") return this.renderPlay();
        return this.renderEnd();
      },
      crumbs: function (current) {
        /* Fil d'Ariane : chaque étape déjà franchie est cliquable pour revenir la modifier */
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
            var sel = pl.id === self.pillar;
            return '<button type="button" class="choice pillar-choice' + (sel ? " selected" : "") + '" style="--c:' + pl.color + '" data-action="pillar" data-id="' + pl.id + '" data-key="p-' + pl.id + '"><span class="name">' + esc(pl.label) + "" + "</span>" + (SHOW_COUNTS ? "<small>" + QUESTIONS.filter(function (q) { return matchScope(q, pl.id, "all"); }).length + " questions</small>" : "") + "</button>";
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
            var sel = l.id === self.level, n = QUESTIONS.filter(function (q) { return matchScope(q, self.pillar, self.theme) && (l.id === "all" || q.level === l.id) && legendOpen(q); }).length, trialOnly = l.id === "legende" && !legendUnlocked();
            return '<button type="button" class="choice' + (trialOnly ? " trial" : "") + (sel ? " selected" : "") + '" style="--c:' + l.color + '" data-action="level" data-id="' + l.id + '" data-key="l-' + l.id + '" aria-pressed="' + sel + '"' + (n ? "" : " disabled") + '><span class="name">' + esc(l.name) + (trialOnly ? ' <em class="trial-tag">essai</em>' : "") + "</span>" + (SHOW_COUNTS || trialOnly ? "<small>" + (trialOnly ? (n ? (SHOW_COUNTS ? n + " question" + (n > 1 ? "s" : "") : "Questions") + " d'essai · tout le niveau au grade Super technicien" : "Débloqué au grade Super technicien") : n + " question" + (n > 1 ? "s" : "")) + "</small>" : "") + "</button>";
          }).join("") + "</div>";
          var n = this.pool().length;
          var ultT = this.level === "legende";
          foot = '<button type="button" class="btn ' + (ultT ? "btn-ultimate btn-fire" : "btn-primary btn-lv-" + this.level) + '" data-action="start" data-key="start"' + (n ? "" : " disabled") + ">" + (ultT ? I.flame : I.bolt()) + (n ? "Commencer" + (SHOW_COUNTS ? " · " + n + " question" + (n > 1 ? "s" : "") : "") : "Aucune question pour ce choix") + "</button>";
        }
        return '<main class="container page train-wizard">' +
          (this.step === "pillar" ? '<div class="stack" style="gap:10px;margin-bottom:22px"><span class="eyebrow" style="color:var(--green-2)">Salle d\'entraînement · sans XP</span><h1 class="h-l">Entraîne-toi sans pression</h1><p class="lead">Trompe-toi autant que tu veux, lis les explications, et quand tu te sens prêt·e, passe au mode classé.</p></div>' : "") +
          (this.step === "pillar" ? "" : this.crumbs(step)) +
          modeSwitch + '<section class="wiz-step" aria-labelledby="wiz-h"><div class="wiz-head"><span class="wiz-num">' + (this.mode === "level" && this.step === "pillar" ? "Tous les piliers" : "Étape " + num + (step === "pillar" ? "" : " sur " + total)) + '</span><h2 class="h-m" id="wiz-h" tabindex="-1" data-key="stephead">' + head + "</h2></div>" + body +
          (foot ? '<div class="wiz-foot">' + foot + "</div>" : "") + "</section></main>";
      },
      renderPlay: function () {
        var r = this.run, q = r.q, v = r.validated;
        var pct = Math.round(((this.i + (v ? 1 : 0)) / this.list.length) * 100);
        var side;
        if (!v) side = '<div class="side-card halftone"><h3 class="h-s">Mode entraînement</h3><p class="muted" style="margin:0">Rien à perdre ici. Réponds, puis lis l\'explication : c\'est elle qui te fera progresser.</p></div>';
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "OUPS !") + '</span><b>' + (r.good ? "Bonne réponse !" : "Pas tout à fait. Regarde la correction.") + "</b></div>" + heroExplain(q.theme, q.e) + '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= this.list.length - 1 ? "Voir le bilan" : "Question suivante") + "</button></div>";
        return '<main class="container page">' + this.crumbs("play") +
          '<div class="q-meta"><span class="tag">' + esc(themeLabel(q.theme)) + '</span><span class="tag tag-outline">' + esc(FORMAT[q.format].label) + '</span><span class="muted" style="font-size:14px;flex-grow:1">Question ' + (this.i + 1) + (SHOW_COUNTS ? " / " + this.list.length : "") + '</span><div class="bar green" style="width:200px"><div style="width:' + pct + '%"></div></div><b style="color:var(--green-2);font-size:14px">' + this.score + ' juste(s)</b><button type="button" class="btn btn-ghost btn-small" data-action="finish">Terminer</button></div>' +
          '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      },
      renderEnd: function () {
        var ratio = this.answered ? this.score / this.answered : 0;
        var txt = "Continue à t'entraîner : relis les explications des questions ratées, puis retente.";
        if (ratio >= 0.8) txt = "Excellent niveau sur ce thème. Tu peux te lancer en mode classé, en Confirmé voire en Expert.";
        else if (ratio >= 0.5) txt = "Bonne base ! Encore un ou deux tours d'entraînement et le mode classé est à toi.";
        return '<main class="container page"><div class="end-card halftone" style="box-shadow:14px 14px 0 var(--green)"><span class="burst big" style="background:var(--green-2)">BIEN JOUÉ !</span><h1 class="h-l">' + this.score + " / " + this.answered + " bonnes réponses</h1><p>" + txt + "</p>" + heroSay(window.heroForTheme ? this.endHero() : null, ratio >= 0.5 ? (this.endHero().win) : (this.endHero().lose)) + '<div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="#/classe">Je me sens prêt·e : mode classé</a><button type="button" class="btn btn-ghost" data-action="start">Recommencer</button><button type="button" class="btn btn-ghost" data-action="choose">Changer de thème</button></div></div></main>';
      }
    };
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
        level: function (d) { if (d.id === "legende" && !legendUnlocked()) { V.shakeLegend = true; sfx("bad"); clearTimeout(V._shT); V._shT = setTimeout(function () { if (V.shakeLegend) { V.shakeLegend = false; render(); } }, 2600); V._focusKey = "lv-legende"; [0, 30].forEach(function (d) { setTimeout(function () { var el = document.querySelector('.choice.level[data-id="legende"]'); if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); } }, d); }); return; } V.shakeLegend = false; V.level = d.id; },
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
          '<div class="btn-row" style="align-items:center"><button type="button" class="btn ' + (ult ? "btn-ultimate btn-fire" : "btn-primary btn-lv-" + this.level) + '" style="min-height:60px;padding:0 30px;font-size:18px" data-action="start" data-key="start">' + (ult ? I.flame : I.bolt()) + "Lancer la partie · " + LEVELS[this.level].name + '</button><button type="button" class="btn btn-ghost btn-small" data-action="reset">' + (V && V.confirmReset ? "Sûr·e ? Clique encore pour tout effacer" : "Remettre ma progression à zéro") + '</button></div>' +
          "</main>";
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
            heroExplain(q.theme, q.e) + '<button type="button" class="btn ' + (hc ? "btn-ultimate" : "btn-primary") + '" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= this.list.length - 1 ? "Voir le bilan" : "Question suivante") + "</button></div>";
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
          "<p>" + txt + "</p>" + (window.heroById ? heroSay(window.heroById("volt"), now < before ? window.heroById("volt").lose : window.heroById("volt").win) : "") + '<div class="btn-row" style="justify-content:center"><button type="button" class="btn ' + (hc ? "btn-ultimate" : "btn-primary") + '" data-action="start">Rejouer en ' + LEVELS[this.level].name + '</button><button type="button" class="btn btn-ghost" data-action="choose">Changer de difficulté</button><a class="btn btn-ghost" href="#/">Retour au QG</a></div></div></main>';
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
            (window.heroById ? heroSay(window.heroById("sentinelle"), win ? window.heroById("sentinelle").win : window.heroById("sentinelle").lose) : "") + '<p class="muted" style="font-size:14px">Réflexe à retenir : un doute sur un mail ? Bouton « Signaler » d\'Outlook et on prévient le support. Victime d\'une arnaque en ligne ? 17Cyber, le service d\'assistance de cybermalveillance.gouv.fr.</p>' +
            '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="restart">Rejouer la mission</button><a class="btn btn-ghost" href="#/entrainement?theme=phishing">M\'entraîner sur le phishing</a><a class="btn btn-ghost" href="#/">Retour au QG</a></div></div></main>';
        }
        var r = this.run, v = r.validated, side;
        if (!v) side = (window.heroById ? heroSay(window.heroById("sentinelle"), "Le Phisher attaque ! Lis bien chaque détail avant de répondre.", "big") : "") + '<div class="side-card halftone"><h3 class="h-s">Mission scénarisée</h3><p class="muted" style="margin:0">Bonne réponse : le Phisher perd de la vie. Erreur : tu perds un bouclier. Il en faut au moins 4 sur 5 pour le vaincre. Ta première victoire ajoute l\'XP gagnée à ton profil.</p></div>';
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "AÏE !") + "</span><b>" + (r.good ? "Le Phisher encaisse le coup ! +50 XP" : "Raté, tu perds un bouclier.") + "</b></div>" + heroExplain("phishing", r.q.e) + '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.i >= MISSION.length - 1 || this.lives <= 0 ? "Voir le résultat" : "Question suivante") + "</button></div>";
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
  function veilleCard(it) {
    var c = VEILLE_CATS[it.category] || { label: it.category || "Actu", color: "#8EA2FF" };
    var unread = isUnread(it), prog = isInProgress(it), u = esc(safeUrl(it.url));
    return '<article class="news' + (it.category === "alerte" ? " news-alert" : "") + (unread ? " unread" : (prog ? " in-progress" : " read")) + '" style="--c:' + c.color + '">' +
      '<div class="news-meta"><span class="level-tag">' + esc(c.label) + "</span>" + (unread ? '<span class="badge-new"><span class="dot-live" aria-hidden="true"></span>New<span class="sr-only"> (non lu)</span></span>' : (prog ? '<span class="badge-prog"><span class="prog-ico" aria-hidden="true"></span>En cours</span>' : '<span class="badge-read">Lu</span>')) + (it.lang === "en" ? '<span class="badge-lang" title="Article en anglais">EN</span>' : "") + '<span class="muted">' + esc(it.source) + " · " + esc(frDate(it.date)) + "</span></div>" +
      '<h3 class="news-title"><a href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">' + esc(it.title) + "</a></h3>" +
      (it.summary ? "<p>" + esc(it.summary) + "</p>" : "") +
      '<a class="news-link" href="' + u + '" target="_blank" rel="noopener noreferrer" data-read-url="' + esc(it.url) + '">Lire la source<span class="sr-only"> : ' + esc(it.title) + " (nouvel onglet)</span> ↗</a>" + (prog ? '<button type="button" class="btn btn-ghost btn-small news-finish" data-finish-url="' + esc(it.url) + '">✓ J\'ai fini</button>' : "") + "</article>";
  }

  function VeilleView(params) {
    return {
      nav: "veille",
      cat: params.cat || "all",
      actions: {
        cat: function (d) { V.cat = d.id; V.showAll = false; },
        more: function () { V.showAll = !V.showAll; V._focusKey = "news-more"; },
        readAll: function () { veilleData().items.forEach(function (it) { if (V.cat === "all" || it.category === V.cat) { veilleRead[it.url] = 1; delete veilleProg[it.url]; } }); saveRead(); saveProg(); }
      },
      render: function () {
        var data = veilleData(), self = this;
        var counts = { all: data.items.length };
        data.items.forEach(function (it) { counts[it.category] = (counts[it.category] || 0) + 1; });
        var chips = [{ id: "all", label: "Toutes", color: "#8EA2FF" }].concat(Object.keys(VEILLE_CATS).filter(function (k) { return counts[k]; }).map(function (k) { return { id: k, label: VEILLE_CATS[k].label, color: VEILLE_CATS[k].color }; })).map(function (c) {
          var sel = c.id === self.cat;
          var nu = unreadCount(c.id);
          return '<button type="button" class="choice chip-news' + (sel ? " selected" : "") + (nu ? " has-new" : "") + '" style="--c:' + c.color + '" data-action="cat" data-id="' + c.id + '" data-key="vc-' + c.id + '" aria-pressed="' + sel + '">' + (nu ? '<span class="dot-live chip-dot" aria-hidden="true"></span>' : "") + '<span class="name">' + esc(c.label) + "</span><small>" + (counts[c.id] || 0) + " actu" + ((counts[c.id] || 0) > 1 ? "s" : "") + (nu ? ' · <b class="new-count">' + nu + " non lue" + (nu > 1 ? "s" : "") + "</b>" : "") + "</small></button>";
        }).join("");
        var list = data.items.filter(function (it) { return self.cat === "all" || it.category === self.cat; });
        var LIMIT = 6, shown = this.showAll ? list : list.slice(0, LIMIT);
        var cards = shown.map(function (it) { return veilleCard(it); }).join("");
        var moreBtn = list.length > LIMIT ? '<div class="news-more"><button type="button" class="btn btn-ghost" data-action="more" data-key="news-more" aria-expanded="' + !!this.showAll + '">' + (this.showAll ? "Réduire la liste ↑" : "Voir toutes les actus (" + list.length + ") ↓") + "</button></div>" : "";
        var nuCat = unreadCount(this.cat), catNow = this.cat, npCat = veilleData().items.filter(function (it) { return isInProgress(it) && (catNow === "all" || it.category === catNow); }).length;
        var toolbar = '<div class="news-toolbar"><span class="muted">' + (nuCat ? '<span class="dot-live" aria-hidden="true"></span> ' + nuCat + " actu" + (nuCat > 1 ? "s" : "") + " non lue" + (nuCat > 1 ? "s" : "") : "Tout est lu, bravo !") + (npCat ? ' · <span class="prog-ico" aria-hidden="true"></span> ' + npCat + " en cours" : "") + "</span>" + (nuCat ? '<button type="button" class="btn btn-ghost btn-small" data-action="readAll">Tout marquer comme lu</button>' : "") + "</div>";
        var help = '<details class="upd-help"><summary class="btn btn-ghost btn-small"><span aria-hidden="true">↻</span> Mettre à jour</summary><div class="upd-pop stack" style="gap:10px">' +
          "<p>Dans le dossier du site, ouvre le dossier <code>veille</code> et double-clique sur <code>mettre-a-jour-veille.bat</code>. Le script récupère les dernières actualités des sources officielles, puis il suffit de rafraîchir cette page (F5).</p>" +
          "<p>Pour une mise à jour automatique chaque matin, lance une fois <code>activer-mise-a-jour-quotidienne.bat</code>.</p>" +
          '<p class="muted">Sources : CERT-FR, Cybermalveillance.gouv.fr, Microsoft Security Blog, Blog Microsoft 365. Les résumés viennent des sources elles-mêmes ; lis toujours l\'article original avant d\'agir.</p></div></details>';
        return '<main class="container page">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px;align-items:end;margin-bottom:28px"><div class="stack" style="gap:10px"><span class="eyebrow" style="color:#FF8AA3">Veille technologique</span><h1 class="h-l">Ce qui bouge dans nos métiers</h1><p class="lead">Cyber, informatique, Microsoft 365, IA, lois et numérique responsable : les actus du moment, depuis des sources fiables.</p></div>' +
          '<div class="veille-upd"><span class="upd-when"><span class="muted">Mise à jour :</span> <b>' + (data.updated ? esc(frDate(data.updated, true)) : "jamais") + '</b></span>' + help + "</div></div>" +
          '<div class="choices veille-chips" style="margin-bottom:28px">' + chips + "</div>" +
          (cards ? toolbar + '<div class="news-grid">' + cards + "</div>" + moreBtn : '<div class="panel"><p style="margin:0">Aucune actualité pour le moment. Utilise le bouton « Mettre à jour » en haut.</p></div>') +
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
      avatar: validAvatarId(P.avatar), draft: P.pseudo, saved: false,
      keepDraft: function () { var el = document.getElementById("pseudo"); if (el) V.draft = el.value; },
      actions: {
        avatar: function (d) { V.keepDraft(); if (!avatarUnlocked(avatarInfo(d.id))) return; V.avatar = d.id; V.saved = false; },
        save: function () {
          V.keepDraft();
          var ps = cleanPseudo(V.draft);
          P.pseudo = ps; P.avatar = V.avatar; saveProfile();
          V.draft = ps; V.saved = true; V._focusKey = "save";
        },
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
          if (!V.confirmReset) { V.confirmReset = true; return; }
          var keep = { pseudo: P.pseudo, avatar: P.avatar, pub: P.pub }; P = defaultProfile(); P.pseudo = keep.pseudo; P.avatar = keep.avatar; P.pub = keep.pub; ensureStats(); saveProfile(); V.confirmReset = false;
        }
      },
      render: function () {
        var self = this, r = rankInfo(P.xp);
        var grid = (window.AVATARS || []).map(function (a) {
          var sel = a.id === self.avatar, open = avatarUnlocked(a);
          if (!open) return '<button type="button" class="avatar-pick locked" disabled aria-disabled="true" title="' + esc(a.name) + ' : débloqué au rang Super directeur technique">' + a.svg(76) + '<span>' + esc(a.name) + '</span><em class="lock-badge">Rang max</em><b class="unlock-ribbon"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg>Atteins le rang Super directeur technique</b></button>';
          return '<button type="button" class="avatar-pick' + (sel ? " selected" : "") + (a.locked ? " unlocked" : "") + '" data-action="avatar" data-id="' + a.id + '" data-key="av-' + a.id + '" aria-pressed="' + sel + '" title="' + esc(a.name) + '">' + a.svg(76) + '<span>' + esc(a.name) + "</span></button>";
        }).join("");
        var preview = capeWrap(window.avatarSvg ? window.avatarSvg(this.avatar, 140) : "", 140);
        var heat = capeHeat(), cur = currentCape();
        var capes = capeList().map(function (c) {
          var sel = c.id === cur.id;
          return '<button type="button" class="cape-pick' + (c.open ? "" : " locked") + (sel ? " selected" : "") + '"' + (c.open ? ' data-action="cape" data-id="' + c.id + '"' : ' disabled aria-disabled="true"') + ' data-key="cape-' + c.id + '" aria-pressed="' + sel + '" title="' + esc(c.open ? c.name : c.how) + '" style="--cape:' + c.color + '">' + capeSvg(c, 0) + "<span>" + esc(c.name) + "</span>" + (c.open ? "" : "<small>" + esc(c.how) + "</small>") + "</button>";
        }).join("");
        var curF = currentFrame(), framesHtml = frameList().map(function (f) {
          var sel = f.id === curF.id;
          return '<button type="button" class="frame-pick' + (f.open ? "" : " locked") + (sel ? " selected" : "") + '"' + (f.open ? ' data-action="frame" data-id="' + f.id + '"' : ' disabled aria-disabled="true"') + ' data-key="frame-' + f.id + '" aria-pressed="' + sel + '" style="--fc:' + f.color + '">' + capeWrap(window.avatarSvg ? window.avatarSvg(self.avatar, 56) : "", 56, null, f.id) + "<span>" + esc(f.name) + "</span>" + (f.open ? "" : "<small>" + esc(f.how) + "</small>") + "</button>";
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
          return '<button type="button" class="fav-pick' + (on ? " selected" : "") + '" data-action="fav" data-id="' + esc(x.b.n) + '" data-key="fav-' + esc(x.b.n) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Retirer de ma carte : " : "Afficher sur ma carte : ") + esc(x.b.n) + '" style="--c:' + bCol(x) + '">' + medalSvg(x.col, x.b.i, x.b.s, x.b.t, 44) + "<span>" + esc(x.b.n) + "</span>" + (on ? '<em class="fav-pos">' + (pos + 1) + "</em>" : "") + bTip(x) + "</button>"; };
        var list = allB.filter(function (x) { return x.b.on || showLocked; });
        var earnedHtml = '<div class="feat-row" data-feat-row role="list" aria-label="Badges affichés sur ta carte">' + slots + '</div>' +
          '<details class="vit-more fav-more" data-pg="fav-more"' + (openPG["fav-more"] ? " open" : "") + '><summary>Voir tous tes badges obtenus (' + earned.length + ') <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary>' +
          '<label class="locked-toggle"><input type="checkbox" data-action="badgesLocked" data-key="bl-toggle"' + (showLocked ? " checked" : "") + '> Afficher aussi les badges pas encore obtenus</label><div class="fav-grid">' + list.map(favPick).join("") + "</div></details>";
        function step(n, title, current, body) { return '<details class="custom-step" data-pg="step' + n + '"' + (openPG["step" + n] ? " open" : "") + '><summary><span class="eyebrow">' + n + " · " + title + '</span><span class="step-cur">' + esc(current) + '</span><span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="step-body">' + body + "</div></details>"; }
        var heatBar = ""; for (var hk = 1; hk <= 5; hk++) heatBar += '<i class="' + (hk <= heat ? "on" : "") + '"></i>';
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:28px"><span class="eyebrow">Mon profil</span><h1 class="h-l">Crée ton héros</h1><p class="lead">Choisis un pseudo et un avatar parmi les gardiens du QG (Captain Reboot se débloque au grade maximum). Ils apparaissent dans le QG et serviront plus tard pour les défis d\'équipe.</p></div>' +
          '<div class="profile-layout">' +
          '<aside class="panel profile-card ' + bgClass(currentBg()) + '">' + bgLayers(currentBg(), true) + '<div class="profile-face">' + preview + '</div><h2 class="h-s">' + esc(cleanPseudo(this.draft) || "Héros sans nom") + '</h2><button type="button" class="rank-link small" data-rank-ladder aria-label="Voir tous les paliers">' + rankBadge(rankIndex(P.xp), 22) + esc(r.name) + " · " + P.xp + ' XP<svg class="rank-link-caret" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="bar" style="width:100%"><div style="width:' + r.pct + '%"></div></div><small class="muted">' + esc(r.label) + '</small>' +
          '<div class="stats" style="margin-top:8px"><div class="stat"><small>Meilleure série</small><b style="color:var(--amber)">' + P.bestStreak + '</b></div><div class="stat cape-stat"><small>Chaleur de la cape</small><b class="heat-' + heat + '">' + HEAT_LABELS[heat] + '</b><span class="heat-bar" aria-hidden="true">' + heatBar + "</span></div></div>" +
          '<p class="cape-note">' + (heat >= 5 ? "🔥 Cape flamboyante : +10 % d'XP sur tes bonnes réponses en mode classé. Reviens demain pour la garder !" : "Reviens jouer " + (5 - heat) + " jour" + (5 - heat > 1 ? "s" : "") + " de suite de plus pour une cape flamboyante (+10 % d'XP en classé).") + "</p></aside>" +
          '<form class="panel profile-form" data-form="profile" novalidate>' +
          '<label for="pseudo" class="eyebrow">1 · Ton pseudo</label>' +
          '<input id="pseudo" name="pseudo" type="text" maxlength="20" autocomplete="nickname" placeholder="Ex. CyberNova" value="' + esc(this.draft) + '">' +
          '<small class="muted">20 caractères maximum. Un pseudo plutôt que ton nom complet : c\'est aussi une bonne pratique de sécurité !</small>' +
          step(2, "Ton avatar", (avatarInfo(this.avatar) || {}).name || "", '<div class="avatar-grid" role="group" aria-label="Choix de l\'avatar">' + grid + "</div>") +
          step(3, "Ta cape", cur.name + " · " + HEAT_LABELS[heat], '<p class="muted step-help">Le vestiaire : une cape par grade atteint et par boss vaincu. Ton choix est enregistré tout de suite.</p><div class="cape-grid" role="group" aria-label="Vestiaire des capes">' + capes + "</div>" +
            (heat >= 5 ? '<div class="fire-row"><span><b>🔥 Cape en feu</b><small>Ta cape flamboyante s\'embrase, animée, partout sur le site.</small></span><button type="button" class="snd-switch' + (capeFireOn() ? " on" : "") + '" data-fire-toggle role="switch" aria-checked="' + capeFireOn() + '"><span class="knob"></span><span class="sr-only">Activer la cape en feu</span></button></div>'
              : '<div class="fire-row locked"><span><b>🔒 Cape en feu</b><small>Se débloque avec une cape flamboyante : joue 5 jours de suite.</small></span></div>')) +
          step(4, "Ton cadre", curF.name, '<p class="muted step-help">Plus ton grade est haut, plus ton cadre est travaillé. Choisis parmi ceux que tu as débloqués.</p><div class="frame-grid" role="group" aria-label="Choix du cadre">' + framesHtml + "</div>") +
          step(5, "Tes badges", favs.length ? favs.length + " affiché" + (favs.length > 1 ? "s" : "") + " sur ta carte" : "aucun affiché", '<p class="muted step-help">Clique un badge pour l\'ajouter à ta carte de héros (3 emplacements), clique-le à nouveau pour le retirer. Glisse les badges affichés pour changer leur ordre.</p>' + (earned.length ? earnedHtml : '<p class="muted" style="margin:0">Tu n\'as pas encore de badge : joue pour en gagner !</p>')) +
          step(6, "Le fond de ta carte", currentBg().name, (function () {
            var all = bgList(), cur = currentBg(), fav = P.bgFav || [];
            all.sort(function (x, y) { var fx = fav.indexOf(x.id), fy = fav.indexOf(y.id); if ((fx !== -1) !== (fy !== -1)) return fx !== -1 ? -1 : 1; if (fx !== -1) return fx - fy; if ((x.id === cur.id) !== (y.id === cur.id)) return x.id === cur.id ? -1 : 1; if (!!x.prestige !== !!y.prestige) return x.prestige ? 1 : -1; if (x.open !== y.open) return x.open ? -1 : 1; return 0; });
            var tile = function (g) { var sel = g.id === cur.id, isFav = fav.indexOf(g.id) !== -1;
              return '<div class="bg-pick' + (g.open ? "" : " locked") + (sel ? " selected" : "") + (g.prestige ? " is-prestige" : "") + '"><button type="button" class="bg-main"' + (g.open ? ' data-action="bg" data-id="' + g.id + '"' : ' disabled aria-disabled="true"') + ' data-key="bg-' + g.id + '" aria-pressed="' + sel + '"><span class="bg-thumb ' + bgClass(g) + '">' + (g.open ? bgLayers(g) : '<span class="bg-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/></svg></span>') + "</span><span>" + esc(g.name) + "</span>" + (g.open ? "" : "<small>" + esc(g.how) + "</small>") + "</button>" +
                '<button type="button" class="bg-fav' + (isFav ? " on" : "") + '" data-action="bgFav" data-id="' + g.id + '" data-key="bgf-' + g.id + '" aria-pressed="' + isFav + '" aria-label="' + (isFav ? "Retirer des favoris : " : "Ajouter aux favoris : ") + esc(g.name) + '" title="' + (isFav ? "Retirer des favoris" : "Mettre en favori") + '">' + (isFav ? "★" : "☆") + "</button></div>"; };
            var top = all.slice(0, 5), rest = all.slice(5);
            return '<p class="muted step-help">Clique un fond : ta carte à gauche change tout de suite. L\'étoile ☆ met un fond en favori, il remonte en tête de liste.</p><div class="bg-grid" role="group" aria-label="Fonds de la carte de héros">' + top.map(tile).join("") + "</div>" +
              (rest.length ? '<details class="vit-more fav-more" data-pg="bg-more"' + (openPG["bg-more"] ? " open" : "") + '><summary>Voir les ' + rest.length + ' autres fonds <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="bg-grid">' + rest.map(tile).join("") + "</div></details>" : "");
          })()) +
          '<div class="btn-row" style="align-items:center;margin-top:18px"><button type="submit" class="btn btn-primary" data-key="save">Enregistrer mon héros</button>' + (this.saved ? '<span class="saved-ok" role="status">✓ Enregistré !</span>' : "") + '<button type="button" class="btn btn-ghost btn-small" data-action="reset" style="margin-left:auto">' + (this.confirmReset ? "Sûr·e ? Clique encore pour tout effacer" : "Remettre ma progression à zéro") + '</button></div>' +
          "</form></div>" + this.renderStats() + renderVitrine() + renderSecrets() + "</main>";
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
          return '<div class="stat-tile' + (pub ? "" : " is-private") + '"><div class="stat-top"><span class="stat-label">' + esc(t.label) + '</span><button type="button" class="vis-toggle' + (pub ? " on" : "") + '" data-action="vis" data-id="' + t.id + '" data-key="vis-' + t.id + '" aria-pressed="' + pub + '" aria-label="' + esc(t.label) + ' : ' + (pub ? "public, cliquer pour masquer" : "masqué, cliquer pour rendre public") + '">' + (pub ? eyeOn + "Public" : eyeOff + "Masqué") + '</button></div><b class="stat-value">' + esc(t.value) + '</b>' + (t.id === "badges" && t.badges.length > 3 ? '<small class="muted">' + esc(t.badges.slice(0, 3).join(" · ")) + '</small><details class="vit-more tile-more" data-pg="tile-badges"' + (openPG["tile-badges"] ? " open" : "") + '><summary>Voir les ' + (t.badges.length - 3) + ' autres <span class="pg-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><small class="muted">' + esc(t.badges.slice(3).join(" · ")) + "</small></details>" : '<small class="muted">' + esc(t.sub) + "</small>") + "</div>";
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
        // carte publique
        var pubTiles = list.filter(function (t) { return P.pub[t.id]; });
        var myBg = currentBg(), card = '<div class="public-card ' + bgClass(myBg) + '">' + bgLayers(myBg, true) + '<div class="public-head"><span class="public-face">' + myAvatar(64) + '</span><div><b>' + esc(P.pseudo || "Héros sans nom") + '</b><small class="muted">Carte de héros</small>' + favSlots() + "</div></div>" +
          (pubTiles.length ? '<ul class="public-list">' + pubTiles.map(function (t) { return "<li><span>" + esc(t.label) + "</span><b>" + esc(t.id === "badges" ? (t.badges.length ? t.badges.length + " badge" + (t.badges.length > 1 ? "s" : "") : "Aucun") : t.value) + "</b></li>"; }).join("") + "</ul>" : '<p class="muted" style="margin:0">Tout est masqué : seuls ton pseudo et ton avatar seront visibles.</p>') + "</div>";
        return '<section class="section" aria-labelledby="stats-title"><div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Mes caractéristiques</span><h2 class="h-l" id="stats-title">Fiche de héros</h2></div></div>' +
          '<div class="stats-layout"><div class="stat-grid">' + tiles + '</div><aside class="panel"><h3 class="h-s" style="margin-bottom:14px">Ce que les autres verront</h3>' + card + "</aside></div>" +
          '<div class="panel" style="margin-top:20px"><h3 class="h-s" style="margin-bottom:16px">Mes thèmes</h3><div class="theme-rows">' + themeRows + "</div></div></section>";
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
          var chip = lvWon >= 3 ? '<span class="bm-chip won">3 niveaux vaincus</span>' : (acc.ok ? '<span class="bm-chip live">Niveau ' + nextLv + " disponible</span>" : '<span class="bm-chip soon">Niveau ' + nextLv + " · prêt à " + acc.pct + ' %</span><span class="acc-bar mini" aria-hidden="true"><i style="width:' + acc.pct + '%"></i></span>');
          var inner = '<span class="bm-art">' + window.bossArt(b.id, b.color, nextLv) + "</span>" +
            '<div class="bm-txt"><span class="bm-world" style="color:' + (pl ? pl.color : "var(--blue-3)") + '">' + esc(pl ? pl.label : "") + "</span><h2 class=\"h-s\">" + esc(b.name.charAt(0).toUpperCase() + b.name.slice(1)) + "</h2><p>" + esc(b.teaser) + '</p><div class="bm-foot">' + chip + (hero ? '<span class="bm-hero">' + window.heroSvg(hero, 26) + "Avec " + esc(hero.name) + "</span>" : "") + "</div></div>";
          return live ? '<a class="bm-card' + (won ? " won" : "") + '" href="' + b.href + '" style="--bc:' + b.color + '">' + inner + "</a>" : '<div class="bm-card soon" style="--bc:' + b.color + '" aria-disabled="true">' + inner + "</div>";
        }).join("");
        return '<main class="container page"><div class="stack" style="gap:10px;margin-bottom:28px"><span class="eyebrow" style="color:var(--pink)">Boss · un par domaine</span><h1 class="h-l">Six gardiens, six boss, un ultime</h1><p class="lead">Des mises en situation réelles : un incident arrive, à toi de prendre les bonnes décisions. Chaque erreur laisse le boss contre-attaquer et te coûte un bouclier.</p><p class="muted" style="margin:0">Pour affronter un boss, il faut le bon grade <b style="color:var(--text)">et</b> maîtriser son domaine. À chaque niveau vaincu, le boss revient plus fort… et il le montre.</p><p class="muted" style="margin:0">' + bossesWon() + " / " + (window.BOSSES || []).length + " boss vaincus (boss ultime compris)</p></div>" +
          '<div class="bm-grid">' + cards + "</div>" + (ult ? (function (b) {
            var rec = (P.bosses || {})[b.id] || {}, lvWon = rec.levels ? Object.keys(rec.levels).length : 0, nextLv = Math.min(3, lvWon + 1), acc = bossAccess(b.id, nextLv);
            var chip = lvWon >= 3 ? '<span class="bm-chip won">3 niveaux vaincus</span>' : (acc.ok ? '<span class="bm-chip live">Niveau ' + nextLv + " disponible</span>" : '<span class="bm-chip soon">Niveau ' + nextLv + " · " + acc.done.length + " / " + acc.others.length + ' boss vaincus</span><span class="acc-bar mini" aria-hidden="true"><i style="width:' + acc.pct + '%"></i></span>');
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
            heroSay(hero, "Je suis avec toi. Garde ton calme : on diagnostique avant d'agir. Chaque mauvaise décision te coûte un bouclier… et quand il n'en reste plus, c'est la chute.") +
            '<div class="boss-levels">' + window.BOSS_LEVELS.map(function (L) {
              var acc = bossAccess(id, L.n), open = acc.ok || self.levelWon(L.n), won = self.levelWon(L.n), n = M.steps.filter(function (st) { return (st.lv || 1) <= L.n; }).length;
              return '<button type="button" class="boss-level' + (open ? "" : " locked") + (won ? " won" : "") + '" data-action="bossStart" data-lv="' + L.n + '"' + (open ? "" : ' disabled aria-disabled="true"') + (L.n === 1 ? ' data-key="q"' : "") + '>' +
                '<span class="bl-top"><b>' + L.label + "</b>" + (won ? '<span class="bm-chip won">Vaincu</span>' : (open ? '<span class="bm-chip live">Disponible</span>' : '<span class="bm-chip soon">Verrouillé</span>')) + "</span>" +
                '<span class="bl-art">' + window.bossArt(id, M.color, L.n) + '</span><span class="bl-lives">' + (function () { if (bossShields(L) === 0) return '<span class="no-net">' + I.flame + "Sans filet</span>"; var h = ""; for (var k = 0; k < bossShields(L); k++) h += I.shield(true, 18); return h; })() + "</span>" +
                '<span class="bl-info">' + n + " étapes · " + (bossShields(L) === 0 ? "aucune erreur permise" : (bossShields(L) === 1 ? "1 seule erreur permise" : bossShields(L) + " erreurs permises")) + " · " + (won ? "+" + L.replay + " XP (rejouer)" : "+" + L.xp + " XP") + "</span>" +
                (open ? "" : '<span class="bl-lock">Pour l\'affronter :</span>' + accessList(acc) + '<span class="acc-bar"><i style="width:' + acc.pct + '%"></i></span>') + "</button>";
            }).join("") + "</div>" +
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
            heroSay(hero, this.won ? M.win : M.lose) +
            (this.won ? '<div class="stats"><div class="stat"><small>Boucliers restants</small><b>' + (this.maxShields === 0 ? "Sans filet" : Math.max(0, this.shields) + " / " + this.maxShields) + '</b></div><div class="stat"><small>' + (this.firstWin ? "Première victoire" : "Victoire rejouée") + '</small><b style="color:#6FD99A">+' + this.baseXp + " XP</b></div>" + (this.sent ? '<div class="stat"><small>Coup de grâce</small><b style="color:var(--gold)">+' + (this.bonusXp || 0) + " XP</b></div>" : "") + (this.skipped ? '<div class="stat"><small>Coup de grâce ignoré</small><b style="color:#FF8AA3">' + signed(this.bonusXp) + " XP</b></div>" : "") + "</div>" : "") +
            '<div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-primary" data-action="restart">Rejouer le niveau ' + this.level + '</button><button type="button" class="btn btn-ghost" data-action="levels">Changer de niveau</button><a class="btn btn-ghost" href="#/mission">Carte des boss</a><a class="btn btn-ghost" href="#/entrainement?pillar=' + meta.pillar + '">M\'entraîner</a></div></div>' + bonus + "</main>";
        }
        var st = this.steps[this.i], r = this.run, v = r.validated, side;
        var phaseBanner = st.phase2 && this.i > 0 ? '<div class="phase2-banner" role="status"><b>Phase 2 !</b> ' + esc(M.phase2) + "</div>" : "";
        if (!v) side = heroSay(hero, st.phase2 ? "Attention, il riposte ! Reste méthodique." : "Lis bien la situation avant de décider.", "big");
        else side = '<div class="feedback' + (r.good ? " good" : "") + '" role="status"><div class="top"><span class="burst ' + (r.good ? "ok" : "ko") + '">' + (r.good ? "BAM !" : "AÏE !") + "</span><b>" + (r.good ? "Le boss encaisse : " + esc(this.lastHit) : esc(st.counter) + " −1 bouclier") + "</b></div>" +
          '<div class="hero-say explain"><span class="hero-say-face">' + window.heroSvg(hero, 48) + "</span><div><b>" + esc(hero.name) + " t'explique</b><p>" + esc(st.q.e) + "</p></div></div>" +
          '<button type="button" class="btn btn-primary" style="align-self:flex-end" data-action="next" data-key="next">' + (this.shields < 0 ? "Voir le bilan" : (this.i >= this.steps.length - 1 ? "Terminer le boss" : "Étape suivante")) + "</button></div>";
        return '<main class="container page boss-page">' + this.top() + phaseBanner + '<div class="q-layout"><div data-key="q" tabindex="-1">' + renderBossScene(st.scene) + renderRun(r) + "</div><div>" + side + "</div></div></main>";
      }
    };
    return view;
  }
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
  function PrivacyView() {
    return {
      nav: "",
      render: function () {
        return '<main class="container page"><span class="eyebrow">Transparence</span><h1 class="h-l">Confidentialité</h1>' +
          '<p class="lead">Power Up est un projet pédagogique réalisé dans le cadre d\'une formation TSSR. Le site ne demande ni compte ni adresse e-mail, et n\'envoie aucune donnée de jeu à un serveur.</p>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Ce qui est enregistré, et où</h2>' +
          '<p>Ta progression (points d\'expérience, rang, boss vaincus, pseudo et héros, lectures de la veille) et tes réglages (son, volume, thème, mode léger, styles) sont enregistrés <b>uniquement dans ton navigateur</b>, grâce au stockage local (localStorage). Ils restent sur ton appareil : personne d\'autre ne peut les lire, et ils ne passent par aucun serveur du site.</p>' +
          '<p>Pour tout effacer, vide les données du site dans les réglages de ton navigateur. Ta progression sera alors remise à zéro.</p>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Ce que le site n\'utilise pas</h2>' +
          '<ul style="padding-left:20px;line-height:1.7"><li>aucun cookie, aucun pisteur, aucune statistique de fréquentation ;</li><li>aucune publicité et aucun réseau social intégré ;</li><li>aucune ressource externe : les scripts, les polices et les sons sont hébergés avec le site, et une politique de sécurité (CSP) empêche de contacter d\'autres serveurs.</li></ul>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Boîte à idées</h2>' +
          '<p>Elle ouvre ta propre messagerie avec un message préparé, ou copie le texte dans ton presse-papiers. Le site n\'envoie rien lui-même : c\'est toi qui décides d\'envoyer ou non.</p>' +
          '<h2 class="h-m" style="font-size:24px;margin:28px 0 8px">Hébergement et liens externes</h2>' +
          '<p>Le site est hébergé par Cloudflare. Comme tout hébergeur, il peut conserver des journaux techniques de connexion (adresse IP, date, page demandée) pour assurer le fonctionnement et la sécurité du service. Je n\'exploite pas ces journaux. Certaines pages renvoient vers des sites externes (Microsoft Learn, CNIL, OWASP…) : une fois dessus, c\'est leur propre politique qui s\'applique.</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/">Retour à l\'accueil</a></div></main>';
      }
    };
  }

  function route() {
    var r = parseHash();
    if (r.path === "/entrainement") V = TrainView(r.params);
    else if (r.path === "/classe") V = RankedView();
    else if (r.path === "/mission") V = BossMapView();
    else if (r.path === "/veille") V = VeilleView(r.params);
    else if (r.path === "/profil") { V = ProfileView(); V._scrollTo = r.params.s; }
    else if (r.path === "/collectif") V = CollectifView();
    else if (r.path === "/confidentialite") V = PrivacyView();
    else if ((r.path === "/sons" || r.path === "/maintenance") && DEV_PAGES) V = SoundsView();
    else if (r.path === "/demo" && DEV_PAGES) V = DemoView();
    else if (r.path.indexOf("/mission/") === 0 && window.BOSS_MISSIONS && window.BOSS_MISSIONS[r.path.slice(9)]) V = BossView(r.path.slice(9));
    else V = QGView();
    V._scroll = true;
    render();
  }

  function render() {
    var active = document.activeElement, key = V._focusKey || (active && active.getAttribute && active.getAttribute("data-key"));
    V._focusKey = null;
    app.innerHTML = header(V.nav) + V.render() + footer();
    if (V._scroll) { window.scrollTo(0, 0); V._scroll = false; }
    if (V._scrollTo) { var tgt = document.getElementById(V._scrollTo + "-title"); V._scrollTo = null; if (tgt) setTimeout(function () { tgt.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); var sec = tgt.closest("section"); if (sec) { sec.classList.add("flash-section"); setTimeout(function () { sec.classList.remove("flash-section"); }, 1800); } }, 60); }
    if (Date.now() < logoFxUntil) powerOnLogo();
    try { checkUnlocks(); } catch (e) { }
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
      var hand = function (cls, col) { return '<svg class="fx-hand ' + cls + '" viewBox="0 0 40 30"><path d="M2 10 H16 L24 6 Q30 4 33 8 L38 14 Q39 17 36 18 L28 19 Q26 24 21 25 L10 25 Q6 25 4 22 L2 20 Z" fill="' + col + '" stroke="#0B0E13" stroke-width="2" stroke-linejoin="round"/><path d="M16 10 L20 16 M22 12 L26 18" stroke="#0B0E13" stroke-width="1.6" stroke-linecap="round" opacity=".5"/></svg>'; };
      return '<span class="fx-flash" style="--fc:rgba(245,196,81,.45)"></span>' + hand("hl", "#F5C451") + hand("hr", "#6E88FF") + fxSparks(8, ["#F5C451", "#6E88FF", "#FFFFFF"], 26, 44);
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
      spawnFx(fxKindFor(tab), x, y);
      sfx("tab");
      if ((tab.getAttribute("href") || "") === location.hash) e.preventDefault(); /* déjà sur la page : on ne remonte pas en haut */
    }
  }, true);

  window.addEventListener("hashchange", route);
  route();

  /* =========================================================
     INTRO : Captain Reboot accueille à l'ouverture du site (une fois par session), effet d'ouverture au clic
     ========================================================= */
  var INTRO_KEY = "powerup365.intro", INTRO_FX_KEY = "powerup365.introfx", INTRO_FX = ["portes", "eclair", "sas", "sascadre", "iris", "hyperespace"], DOOR_FX = ["portes", "eclair", "sas", "sascadre"];
  function introFx() { var v = "eclair"; try { v = localStorage.getItem(INTRO_FX_KEY) || "eclair"; } catch (e) { } return INTRO_FX.indexOf(v) === -1 ? "eclair" : v; }
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
  function doorsHtml(fx) {
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
      '<div class="intro-status bottom"><span class="is-txt">SAS PRINCIPAL · SECT. 07</span></div></div>';
    return '<div class="intro-door l zig" style="clip-path:polygon(' + ptsL + ')"><span class="id-panel"></span>' + deco("l") + zseam("l") + '<span class="id-scan"></span></div><div class="intro-door r zig" style="clip-path:polygon(' + ptsR + ')"><span class="id-panel"></span>' + deco("r") + zseam("r") + '<span class="id-scan"></span></div>' +
      bulkhead + '<span class="intro-steam t"></span><span class="intro-steam b"></span>' + lock + hud;
  }
  function showIntro(fx, mode) {
    if (document.querySelector(".intro")) return;
    fx = fx || introFx();
    var closing = mode === "close", who = P.pseudo ? esc(P.pseudo) : "recrue", el = document.createElement("div");
    var isDoor = DOOR_FX.indexOf(fx) !== -1;
    el.className = "intro " + (isDoor ? "fx-portes dv-" + (fx === "portes" || fx === "eclair" ? "doors" : "sas") + (fx === "sas" ? " sas-full" : "") : "fx-" + fx) + (closing ? " closing" : ""); el.setAttribute("role", "dialog"); el.setAttribute("aria-label", closing ? "Au revoir" : "Bienvenue au QG");
    var streaks = ""; if (fx === "hyperespace") for (var i = 0; i < 40; i++) streaks += '<i style="--a:' + (i * 137.5 % 360).toFixed(1) + "deg;--d:" + (i % 7 * 0.04).toFixed(2) + "s;--l:" + (30 + i * 13 % 50) + 'vmax"></i>';
    var stage = closing
      ? '<div class="intro-stage"><span class="intro-mascot">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 190) : "") + '</span><div class="intro-bubble">À bientôt !</div><p class="intro-sub">Le QG garde la lumière allumée pour toi. Reviens vite pour garder ta cape au chaud.</p><button type="button" class="btn btn-primary intro-go">' + I.bolt("currentColor", 18) + "Rouvrir le QG</button><small>Tu peux fermer l'onglet en toute sécurité.</small></div>"
      : '<div class="intro-stage"><span class="intro-mascot">' + (window.heroSvg ? window.heroSvg(window.heroById("volt"), 210) : "") + '</span><div class="intro-bubble">Prêt à entrer au QG ?</div><button type="button" class="btn btn-primary intro-go">' + I.bolt("currentColor", 18) + "Entrer au QG</button><small>ou appuie sur Entrée</small></div>";
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
      el.classList.remove("shut", "locked"); el.classList.add("opening"); document.removeEventListener("keydown", key);
      sfx("doorUnlock"); humStop();
      setTimeout(function () { sfx("doorSlide"); }, isDoor ? 380 : 0); /* voix d'accueil retirée à la demande de Rachel (essais conservés dans Maintenance) */
      if (!isDoor) sfx("enter");
      setTimeout(function () { el.remove(); document.documentElement.classList.remove("intro-open"); logoFxUntil = Date.now() + 1500; try { powerOnLogo(); } catch (err) { } }, fx === "hyperespace" ? 1500 : 1650);
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
  window.PU_intro = showIntro;
  (function () { var seen = false; try { seen = !!sessionStorage.getItem(INTRO_KEY); } catch (e) { } if (!seen && !navigator.webdriver) showIntro(); })();
})();
