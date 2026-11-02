/* Power Up — effet « décryptage » + mini-jeu du secret ARPANET.
   - PUDecode.scramble(el, opts)  : les lettres d'un élément défilent en symboles puis se fixent de gauche à droite.
   - PUDecode.arpanet(opts)       : le secret « Le premier message d'Internet » (intro + 3 messages à décoder, chiffre de César).
   Aucune dépendance : l'application passe ses sons et sa récompense dans opts (sfx, lite, onWin, onClose).
   Symboles et effet 100 % originaux. */
(function () {
  "use strict";
  var GLYPHS = "▓▒░█▌▐◊◇◆◈∆∇Ξ§¤¥£€$#%&@?!<>{}[]/\\|~^=+*ΩΨΣЖЯЫ";
  function rnd() { return GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }
  function reduced() { try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }

  /* ---------- effet : lettres qui tournent puis se fixent ---------- */
  function textNodes(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { if (/\S/.test(n.nodeValue)) out.push(n); }
    return out;
  }
  function scramble(el, opts) {
    opts = opts || {};
    if (!el || opts.lite || reduced()) { if (opts.onDone) opts.onDone(); return; }
    var nodes = textNodes(el), orig = nodes.map(function (n) { return n.nodeValue; }), total = 0;
    orig.forEach(function (s) { total += s.replace(/\s/g, "").length; });
    if (!total) { if (opts.onDone) opts.onDone(); return; }
    var dur = opts.duration || 900, tick = 45, start = Date.now(), had = el.hasAttribute("aria-label");
    if (!had) el.setAttribute("aria-label", orig.join(""));
    var iv = setInterval(function () {
      var t = Date.now() - start, done = Math.min(total, Math.floor((t / dur) * (total + 2))), seen = 0;
      nodes.forEach(function (n, k) {
        var s = orig[k], out = "";
        for (var i = 0; i < s.length; i++) {
          var c = s.charAt(i);
          if (/\s/.test(c)) { out += c; continue; }
          out += seen < done ? c : rnd(); seen++;
        }
        n.nodeValue = out;
      });
      if (done >= total) {
        clearInterval(iv); nodes.forEach(function (n, k) { n.nodeValue = orig[k]; });
        if (!had) el.removeAttribute("aria-label");
        if (opts.onDone) opts.onDone();
      }
    }, tick);
    return function stop() { clearInterval(iv); nodes.forEach(function (n, k) { n.nodeValue = orig[k]; }); if (!had) el.removeAttribute("aria-label"); };
  }

  /* ---------- chiffre de César ---------- */
  var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function shift(s, k) {
    return s.replace(/[A-Z]/g, function (c) { return A.charAt((A.indexOf(c) + k % 26 + 26) % 26); });
  }
  /* Trois casse-têtes de plus en plus durs : décalage donné, puis déduit d'un mot connu, puis trouvé par l'analyse des lettres */
  var LEVELS = [
    { plain: "LOGIN", s: 3, clue: "Jules César décalait chaque lettre de 3 rangs. Règle le disque sur 3, lis ce que devient chaque lettre chiffrée, puis écris le mot.", hint1: "Dans la table, trouve la lettre chiffrée (ligne du haut) : la lettre en clair est juste dessous.", hint2: "Le mot est LOGIN : c'est ce que le premier message d'Internet voulait dire.", lesson: "LOGIN : le mot que le tout premier message d'Internet voulait dire." },
    { plain: "DOUBLE FACTEUR", s: 9, clue: "Cette fois, personne ne te donne le décalage. Mais tu sais que le message commence par « DOUBLE ». Compare la 1re lettre chiffrée (M) à la lettre D : de combien de rangs a-t-on avancé ?", hint1: "De D à M, combien de lettres dans l'alphabet ? Compte sur tes doigts : D, E, F… jusqu'à M.", hint2: "Le décalage est 9. Règle le disque sur 9.", lesson: "On appelle ça une « attaque par mot probable » : les décrypteurs de Bletchley Park devinaient des mots que les messages Enigma contenaient presque toujours." },
    { plain: "VERIFIE LE LIEN", s: 13, clue: "Plus aucun mot connu. Fais comme Al-Kindi, au IXe siècle : compte les lettres ! En français, la lettre la plus fréquente est E. Quelle lettre chiffrée revient le plus souvent, et de combien de rangs est-elle décalée par rapport à E ?", hint1: "Regarde le compteur : la lettre la plus fréquente est probablement un E chiffré. De E jusqu'à elle, combien de rangs ?", hint2: "Le décalage est 13 : c'est le célèbre ROT13, qui coupe l'alphabet en deux.", lesson: "Vérifie le lien avant de cliquer : survole-le, lis l'adresse réelle, et signale le mail suspect. Et retiens l'analyse des fréquences : c'est l'arme qui a ruiné tous les chiffres par substitution simple." }
  ];
  function norm(t) { return String(t || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, ""); }

  /* ---------- le secret ARPANET ---------- */
  var open = false;
  function arpanet(opts) {
    if (open) return; open = true; opts = opts || {};
    var lite = !!opts.lite || reduced(), sfx = opts.sfx || function () { };
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var el = document.createElement("div"); el.className = "dx"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Décodeur : le premier message d'Internet");
    el.innerHTML = '<div class="dx-in"><button type="button" class="dx-x" aria-label="Fermer">✕</button><p class="dx-eye">ARPANET · 29 octobre 1969</p><div class="dx-body"></div></div>';
    document.body.appendChild(el); document.body.style.overflow = "hidden";
    var body = el.querySelector(".dx-body"), timers = [], stops = [], dead = false, won = false;
    function later(fn, ms) { var t = setTimeout(function () { if (!dead) fn(); }, ms); timers.push(t); return t; }
    function close() {
      if (dead) return; dead = true; timers.forEach(clearTimeout); stops.forEach(function (f) { try { f(); } catch (e) { } });
      el.classList.add("out"); document.removeEventListener("keydown", onKey, true);
      setTimeout(function () { el.remove(); document.body.style.overflow = prevOverflow; open = false; if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { } if (opts.onClose) opts.onClose(won); }, 260);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === "Tab") { var f = el.querySelectorAll("button:not([disabled]),input:not([disabled])"); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    }
    document.addEventListener("keydown", onKey, true);
    el.querySelector(".dx-x").addEventListener("click", close);
    el.addEventListener("mousedown", function (e) { if (e.target === el) close(); });
    function cells(txt, cls) {
      return txt.split(" ").map(function (w) { return '<span class="dx-w">' + w.split("").map(function (c) { return '<span class="dx-c ' + (cls || "") + '">' + c + "</span>"; }).join("") + "</span>"; }).join('<span class="dx-sp"></span>');
    }
    function focusFirst() { var b = body.querySelector("button,input"); if (b) b.focus(); }

    /* ----- Intro : l'envoi de « LOGIN » qui plante après « LO » ----- */
    function intro() {
      body.innerHTML = '<p class="dx-line">UCLA → SRI · Envoi du mot de passe de connexion…</p><div class="dx-row dx-intro" aria-hidden="true">' + cells("LOGIN", "") + '</div><p class="dx-line dx-status" role="status"></p><div class="dx-actions"><button type="button" class="dx-btn dx-skip">Passer l\'intro</button></div>';
      var cs = body.querySelectorAll(".dx-intro .dx-c"), st = body.querySelector(".dx-status"), real = ["L", "O", "I", "G", "N"];
      cs.forEach(function (c) { c.textContent = "_"; });
      body.querySelector(".dx-skip").addEventListener("click", function () { toGame(); });
      function crashed() {
        st.innerHTML = '<b class="dx-err">Le système de SRI vient de planter.</b> Seules 2 lettres sont arrivées : « LO ». Le premier message d\'Internet a duré deux lettres.';
        var b = body.querySelector(".dx-actions");
        b.innerHTML = '<button type="button" class="dx-btn dx-go">Décoder les messages interceptés →</button>';
        b.querySelector(".dx-go").addEventListener("click", toGame); focusFirst();
      }
      if (lite) { cs[0].textContent = "L"; cs[1].textContent = "O"; for (var i = 2; i < 5; i++) cs[i].textContent = "▓"; crashed(); return; }
      later(function () { cs[0].textContent = "L"; cs[0].classList.add("on"); sfx("toggle"); }, 900);
      later(function () { cs[1].textContent = "O"; cs[1].classList.add("on"); sfx("toggle"); }, 1800);
      later(function () {
        sfx("shutdown"); el.classList.add("glitch");
        var iv = setInterval(function () { for (var i = 2; i < 5; i++) cs[i].textContent = rnd(); }, 60); stops.push(function () { clearInterval(iv); });
        later(function () { clearInterval(iv); el.classList.remove("glitch"); for (var i = 2; i < 5; i++) { cs[i].textContent = "▓"; cs[i].classList.add("bad"); } crashed(); }, 1700);
      }, 2900);
    }

    /* ----- Jeu : trois casse-têtes (disque de décalage + message à écrire) ----- */
    var lv = 0, stars = [];
    function toGame() { timers.forEach(clearTimeout); timers.length = 0; stops.forEach(function (f) { try { f(); } catch (e) { } }); stops.length = 0; el.classList.remove("glitch"); lv = 0; stars = []; level(); }
    function level() {
      var L = LEVELS[lv], cipher = shift(L.plain, L.s), dial = 0, locked = false, tries = 0, hints = 0;
      var dots = LEVELS.map(function (_, i) { return '<i class="' + (i < lv ? "done" : i === lv ? "cur" : "") + '"></i>'; }).join("");
      function wheel() {
        var h = "";
        for (var half = 0; half < 2; half++) {
          h += '<div class="dx-wh" role="presentation">';
          for (var i = half * 13; i < half * 13 + 13; i++) h += '<span class="dx-wc"><i>' + A.charAt(i) + "</i><b>" + A.charAt((i - dial + 26) % 26) + "</b></span>";
          h += "</div>";
        }
        return h;
      }
      var freq = "";
      if (lv === 2) {
        var cnt = {}; norm(cipher).split("").forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; });
        freq = '<p class="dx-line">Compteur de lettres :</p><div class="dx-freq" aria-label="Lettres du message chiffré, de la plus fréquente à la moins fréquente">' + Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x] || (x < y ? -1 : 1); }).map(function (c) { return '<span class="dx-fc"><b>' + c + '</b><i style="height:' + (cnt[c] * 14) + 'px"></i><em>' + cnt[c] + "</em></span>"; }).join("") + "</div>";
      }
      body.innerHTML = '<div class="dx-top"><span class="dx-lv">Message intercepté ' + (lv + 1) + " / " + LEVELS.length + '</span><span class="dx-dots" aria-hidden="true">' + dots + "</span></div>" +
        '<p class="dx-line">Chiffré :</p><div class="dx-row dx-cipher" aria-label="Message chiffré : ' + cipher + '">' + cells(cipher, "") + "</div>" +
        '<p class="dx-clue"><b>Indice :</b> ' + L.clue + "</p>" + freq +
        '<p class="dx-line">Disque de décodage : chaque lettre chiffrée (en haut) devient la lettre du dessous.</p>' +
        '<div class="dx-dial"><button type="button" class="dx-btn dx-minus" aria-label="Décalage moins un">−</button><span class="dx-lbl">Décalage : <b class="dx-val">0</b></span><button type="button" class="dx-btn dx-plus" aria-label="Décalage plus un">+</button></div>' +
        '<div class="dx-wheel">' + wheel() + "</div>" +
        '<form class="dx-form" autocomplete="off"><label class="dx-lbl" for="dx-ans">Écris le message décodé :</label><div class="dx-ans"><input id="dx-ans" class="dx-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40"><button type="submit" class="dx-btn dx-go">Valider</button></div></form>' +
        '<p class="dx-msg" role="status"></p><div class="dx-actions"><button type="button" class="dx-btn dx-hint">Un coup de pouce (−1 ★)</button></div>';
      var val = body.querySelector(".dx-val"), msg = body.querySelector(".dx-msg"), wh = body.querySelector(".dx-wheel"), inp = body.querySelector(".dx-input"), form = body.querySelector(".dx-form");
      function set(d) { if (locked) return; dial = (d + 26) % 26; val.textContent = dial; wh.innerHTML = wheel(); }
      body.querySelector(".dx-minus").addEventListener("click", function () { set(dial - 1); });
      body.querySelector(".dx-plus").addEventListener("click", function () { set(dial + 1); });
      function curStars() { return Math.max(1, 3 - tries - hints); }
      form.addEventListener("submit", function (e) {
        e.preventDefault(); if (locked) return;
        var a = norm(inp.value), t = norm(L.plain); if (!a) { msg.className = "dx-msg"; msg.textContent = "Écris d'abord ton message."; return; }
        if (a === t) { win(); return; }
        tries++; var ok = 0; for (var i = 0; i < t.length; i++) if (a.charAt(i) === t.charAt(i)) ok++;
        sfx("shutdown"); msg.className = "dx-msg bad";
        msg.textContent = "Pas encore : " + ok + " lettre" + (ok > 1 ? "s" : "") + " bien placée" + (ok > 1 ? "s" : "") + " sur " + t.length + (a.length !== t.length ? " (ton message fait " + a.length + " lettres, il en faut " + t.length + ")" : "") + ".";
        inp.focus(); inp.select();
      });
      body.querySelector(".dx-hint").addEventListener("click", function () {
        hints++; msg.className = "dx-msg"; msg.textContent = hints === 1 ? "Coup de pouce : " + L.hint1 : "Coup de pouce : " + L.hint2;
        if (hints >= 2) this.disabled = true;
      });
      function win() {
        locked = true; var st = curStars(); stars.push(st); inp.disabled = true;
        body.querySelector(".dx-minus").disabled = true; body.querySelector(".dx-plus").disabled = true; body.querySelector(".dx-hint").disabled = true; body.querySelector(".dx-form .dx-go").disabled = true;
        body.querySelector(".dx-dots").innerHTML = body.querySelector(".dx-dots").innerHTML;
        var row = body.querySelector(".dx-cipher"); row.classList.add("ok"); (function () { var cs = row.querySelectorAll(".dx-c"), ch = norm(L.plain).split(""); cs.forEach(function (c, i) { c.textContent = ch[i]; }); })();
        sfx("open"); msg.className = "dx-msg ok"; msg.textContent = "Décodé ! " + "★★★".slice(0, st) + "☆☆☆".slice(0, 3 - st) + "  " + L.lesson;
        var last = lv === LEVELS.length - 1, a = body.querySelector(".dx-actions");
        a.innerHTML = '<button type="button" class="dx-btn dx-go dx-next">' + (last ? "Terminer" : "Message suivant →") + "</button>";
        a.querySelector(".dx-next").addEventListener("click", function () { if (last) finale(); else { lv++; level(); } });
        later(function () { var g = a.querySelector(".dx-next"); if (g) g.focus(); }, 120);
      }
      inp.focus();
    }

    /* ----- Fin ----- */
    function finale() {
      won = true;
      body.innerHTML = '<p class="dx-big" aria-live="polite">LOGIN</p><p class="dx-line"><b>Mission accomplie : tu as cassé trois chiffres de César.</b> Score : <span class="dx-stars">' + stars.reduce(function (x, y) { return x + y; }, 0) + ' / 9 ★</span></p>' +
        '<p class="dx-txt">Jules César l\'utilisait il y a plus de 2 000 ans. Aujourd\'hui, ce chiffre se casse en quelques secondes : il n\'existe que 25 décalages à essayer, et l\'analyse des fréquences, inventée par Al-Kindi vers l\'an 850, suffit à le percer. Les vrais systèmes (AES, TLS) ont des milliards de milliards de clés possibles, et c\'est pour ça que ton cadenas du navigateur compte.</p>' +
        '<p class="dx-txt">Et le 29 octobre 1969, la deuxième tentative d\'envoi de « LOGIN » a fonctionné, environ une heure plus tard. Internet venait de naître.</p>' +
        '<div class="dx-actions"><button type="button" class="dx-btn dx-go">Retour au QG</button></div>';
      var big = body.querySelector(".dx-big"); scramble(big, { duration: 1100, lite: lite });
      sfx("badge"); body.querySelector(".dx-go").addEventListener("click", close); focusFirst();
      if (opts.onWin) { try { opts.onWin(stars.reduce(function (x, y) { return x + y; }, 0)); } catch (e) { } }
    }

    intro();
    var sk = body.querySelector(".dx-skip"); if (sk) sk.focus();
  }

  window.PUDecode = { scramble: scramble, arpanet: arpanet, shift: shift, glyphs: GLYPHS };
})();
