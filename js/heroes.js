/* =========================================================
   Power Up — les héros (personnages originaux, style « néon anguleux »)
   10 avatars jouables (6 hommes, 4 femmes) + Captain Reboot,
   la mascotte, débloquée au rang maximum.
   Chaque personnage a son propre cadre (bouclier, flamme, feuille…).
   ========================================================= */
(function () {
  "use strict";

  var UID = 0;

  /* ---------- cadres (dans un carré de 400 × 400) ---------- */
  function gearPath() {
    var pts = [], n = 12;
    for (var i = 0; i < n * 2; i++) {
      var a = (Math.PI * 2 * i) / (n * 2) - Math.PI / 2 + 0.13, r = i % 2 ? 168 : 192;
      pts.push((200 + r * Math.cos(a)).toFixed(1) + "," + (200 + r * Math.sin(a)).toFixed(1));
    }
    return "M" + pts.join(" L") + " Z";
  }
  /* Cadre « puce électronique » (héroïne de l'IA) : un carré aux coins coupés, avec des broches sur chaque côté */
  function chipPath() {
    var lo = 46, hi = 354, out = 14, pins = [104, 164, 236, 296], w = 12, c = 30, p = [];
    p.push([lo + c, lo]);
    pins.forEach(function (x) { p.push([x - w, lo], [x - w, out], [x + w, out], [x + w, lo]); });
    p.push([hi - c, lo], [hi, lo + c]);
    pins.forEach(function (y) { p.push([hi, y - w], [400 - out, y - w], [400 - out, y + w], [hi, y + w]); });
    p.push([hi, hi - c], [hi - c, hi]);
    pins.slice().reverse().forEach(function (x) { p.push([x + w, hi], [x + w, 400 - out], [x - w, 400 - out], [x - w, hi]); });
    p.push([lo + c, hi], [lo, hi - c]);
    pins.slice().reverse().forEach(function (y) { p.push([lo, y + w], [out, y + w], [out, y - w], [lo, y - w]); });
    p.push([lo, lo + c]);
    return "M" + p.map(function (q) { return q[0] + " " + q[1]; }).join(" L") + " Z";
  }
  var FRAMES = {
    hex: "M200 10 L365 105 L365 295 L200 390 L35 295 L35 105 Z",
    shield: "M200 12 L362 62 L350 236 L290 336 L200 390 L110 336 L50 236 L38 62 Z",
    bubble: "M36 36 L364 36 L364 196 L394 228 L364 240 L364 390 L36 390 Z",
    folder: "M26 72 L150 72 L176 42 L374 42 L374 390 L26 390 Z",
    cell: "M70 18 L330 18 L382 70 L382 330 L330 382 L70 382 L18 330 L18 70 Z",
    flame: "M200 6 L240 88 L290 36 L302 128 L364 98 L352 390 L48 390 L36 98 L98 128 L110 36 L160 88 Z",
    leaf: "M200 6 L332 88 L384 220 L322 340 L200 394 L78 340 L16 220 L68 88 Z",
    gear: gearPath(),
    terminal: "M18 28 L382 28 L382 382 L18 382 Z",
    diamond: "M200 4 L396 200 L200 396 L4 200 Z",
    arrow: "M200 8 L384 118 L384 392 L16 392 L16 118 Z",
    chip: chipPath()
  };

  /* ---------- pièces communes ---------- */
  var FACE = {
    m: { face: "M200 84 L254 100 L280 150 L278 212 L256 258 L222 282 L178 282 L144 258 L122 212 L120 150 L146 100 Z",
         shade: "M200 84 L254 100 L280 150 L278 212 L256 258 L222 282 L200 282 Z",
         rim: "M120 150 L122 212 L144 258", mouth: "M182 248 L218 248" },
    f: { face: "M200 88 L250 102 L274 150 L272 208 L248 254 L200 280 L152 254 L128 208 L126 150 L150 102 Z",
         shade: "M200 88 L250 102 L274 150 L272 208 L248 254 L200 280 Z",
         rim: "M126 150 L128 208 L152 254", mouth: "" }
  };
  var LIPS = "M184 244 L200 239 L216 244 L208 253 L192 253 Z";
  var MASKS = {
    domino: function (h) {
      return '<path d="M130 166 L190 170 L200 183 L210 170 L270 166 L262 200 L216 206 L200 194 L184 206 L138 200 Z" fill="' + h.mask + '" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M146 182 L184 186 L182 195 L150 193 Z M254 182 L216 186 L218 195 L250 193 Z" fill="#FFFFFF" filter="url(#g' + h._u + ')"/>';
    },
    visor: function (h) {
      return '<path d="M122 164 L278 164 L268 202 L200 216 L132 202 Z" fill="#0B0E13"/>' +
        '<path d="M142 180 L186 187 L183 198 L146 192 Z M258 180 L214 187 L217 198 L254 192 Z" fill="' + h.mask + '" filter="url(#g' + h._u + ')"/>' +
        '<path d="M130 170 L270 170" stroke="' + h.neon + '" stroke-width="2" opacity=".7"/>';
    },
    grid: function (h) {
      return '<path d="M124 166 L276 166 L270 204 L130 204 Z" fill="' + h.mask + '" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M150 166 V204 M176 166 V204 M200 166 V204 M224 166 V204 M250 166 V204 M126 185 H274" stroke="#8A5A12" stroke-width="2.5"/>' +
        '<path d="M136 170 L190 170" stroke="#FFFFFF" stroke-width="3" opacity=".6"/>';
    },
    goggles: function (h) {
      return '<path d="M188 180 H212" stroke="#0B0E13" stroke-width="6"/>' +
        '<path d="M132 168 L192 168 L188 204 L140 204 Z M268 168 L208 168 L212 204 L260 204 Z" fill="' + h.mask + '" stroke="#0B0E13" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M142 176 L170 176 M230 176 L258 176" stroke="#FFFFFF" stroke-width="4" opacity=".75"/>';
    },
    helmet: function (h) {
      return '<path d="M116 200 L118 140 L146 90 L200 66 L254 90 L282 140 L284 200 L262 200 L258 152 L200 134 L142 152 L138 200 Z" fill="#8FA3C8" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M200 66 L254 90 L282 140 L284 200 L262 200 L258 152 L200 134 Z" fill="#0B0E13" opacity=".22"/>' +
        '<path d="M146 90 L200 66 L200 104 L158 118 Z" fill="#FFFFFF" opacity=".45"/>' +
        '<path d="M200 66 L200 30" stroke="' + h.neon + '" stroke-width="8" stroke-linecap="square" filter="url(#g' + h._u + ')"/>' +
        '<path d="M134 164 L266 164 L258 198 L200 210 L142 198 Z" fill="#0B0E13"/>' +
        '<path d="M148 178 L188 184 L186 194 L152 190 Z M252 178 L212 184 L214 194 L248 190 Z" fill="' + h.neon + '" filter="url(#g' + h._u + ')"/>';
    }
  };

  function portrait(h, size) {
    var u = ++UID; h._u = u;
    var s = size || 120, F = FACE[h.jaw || "m"];
    var o = '<svg width="' + s + '" height="' + s + '" viewBox="0 0 400 400" role="img" aria-label="' + h.name + '">';
    o += '<defs><linearGradient id="b' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h.bg1 + '"/><stop offset="1" stop-color="' + h.bg2 + '"/></linearGradient>' +
      '<filter id="g' + u + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="x"/><feMerge><feMergeNode in="x"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<clipPath id="c' + u + '"><path d="' + FRAMES[h.frame] + '"/></clipPath></defs>';
    o += '<g clip-path="url(#c' + u + ')">';
    o += '<rect width="400" height="400" fill="url(#b' + u + ')"/>';
    o += '<g class="pt-lines" stroke="' + h.neon + '" stroke-opacity=".18" stroke-width="2"><path d="M0 330 L400 250 M0 362 L400 282 M60 0 L20 400 M360 0 L320 400"/></g>';
    o += '<circle class="pt-glow" cx="330" cy="330" r="150" fill="' + h.neon + '" opacity=".10"/>';
    o += '<rect class="pt-sheen" x="-200" y="-100" width="120" height="600" fill="#FFFFFF" opacity=".06" transform="rotate(20 200 200)"/>';
    if (h.frameDeco) o += h.frameDeco;
    if (h.robot) o += h.robot(u);
    else {
      if (h.hairBack) o += '<path d="' + h.hairBack + '" fill="' + h.hair + '" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>';
      // épaules
      o += '<path d="M30 400 L62 322 L140 296 L260 296 L338 322 L370 400 Z" fill="' + h.suit + '"/>';
      o += '<path d="M200 296 L260 296 L338 322 L370 400 L200 400 Z" fill="#000" opacity=".28"/>';
      o += '<path d="M62 322 L140 296 L150 322 L92 344 Z" fill="#FFF" opacity=".14"/><path d="M338 322 L260 296 L250 322 L308 344 Z" fill="#000" opacity=".15"/>';
      o += '<path d="M62 322 L92 344 L80 400" fill="none" stroke="' + h.neon + '" stroke-width="4" filter="url(#g' + u + ')"/>';
      o += '<path d="M160 300 L200 334 L240 300" fill="none" stroke="' + h.trim + '" stroke-width="5" stroke-linejoin="round"/>';
      if (h.hairBackOver) o += '<path d="' + h.hairBackOver + '" fill="' + h.hair + '" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>';
      o += '<polygon points="200,326 224,340 224,366 200,380 176,366 176,340" fill="#0B0E13" stroke="' + h.neon + '" stroke-width="3"/>';
      o += '<g transform="translate(200 353)">' + h.emblem + "</g>";
      // cou + visage
      o += '<path d="M176 268 H224 L230 304 H170 Z" fill="' + h.skin + '"/><path d="M176 268 H224 L227 286 L173 286 Z" fill="#000" opacity=".25"/>';
      o += '<path d="M120 168 L106 178 L108 216 L122 212 Z M280 168 L294 178 L292 216 L278 212 Z" fill="' + h.skin + '"/><path d="M280 168 L294 178 L292 216 L278 212 Z" fill="#000" opacity=".2"/>';
      o += '<path d="' + F.face + '" fill="' + h.skin + '"/>';
      o += '<path d="' + F.shade + '" fill="#000" opacity=".2"/>';
      o += '<path d="M150 102 L200 88 L200 120 L160 134 Z" fill="#FFF" opacity=".28"/><path d="M126 150 L150 102 L160 134 L140 178 Z" fill="#FFF" opacity=".12"/>';
      o += '<path d="' + F.rim + '" fill="none" stroke="' + h.neon + '" stroke-width="4" filter="url(#g' + u + ')"/>';
      if (h.beard) o += '<path d="' + h.beard + '" fill="' + (h.beardColor || h.hair) + '"/>';
      if (h.lips) o += '<path d="' + LIPS + '" fill="' + h.lips + '" stroke="#0B0E13" stroke-width="2.5" stroke-linejoin="round"/>';
      else o += '<path d="' + (F.mouth || FACE.m.mouth) + '" stroke="' + (h.mouthColor || "#0B0E13") + '" stroke-width="5" stroke-linecap="square"/>';
      if (h.hairFront) o += '<path d="' + h.hairFront + '" fill="' + h.hair + '" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>';
      if (h.hairStreak) o += '<path d="' + h.hairStreak + '" fill="' + h.neon + '"/>';
      o += MASKS[h.maskType](h);
      if (h.lashes) o += '<path d="M130 166 L118 158 M138 164 L130 152 M270 166 L282 158 M262 164 L270 152" stroke="#0B0E13" stroke-width="4" stroke-linecap="round"/>';
      if (h.earrings) o += '<path d="M108 222 L115 232 L108 242 L101 232 Z M292 222 L299 232 L292 242 L285 232 Z" fill="' + h.earrings + '" stroke="#0B0E13" stroke-width="2.5"/>';
      if (h.front) o += h.front;
    }
    o += "</g>";
    o += '<path d="' + FRAMES[h.frame] + '" fill="none" stroke="' + h.neon + '" stroke-width="8" stroke-linejoin="round"/>';
    o += "</svg>";
    return o;
  }

  /* ---------- emblèmes de poitrine (centrés en 0,0) ---------- */
  var EM = {
    waves: function (c) { return '<path d="M-10 6 L0 -4 L10 6 M-15 2 L0 -12 L15 2" fill="none" stroke="' + c + '" stroke-width="3.5" stroke-linejoin="miter"/>'; },
    cloud: function (c) { return '<path d="M-13 7 L-13 -1 L-6 -7 L2 -5 L8 -10 L14 -2 L14 7 Z" fill="' + c + '"/>'; },
    sigma: function (c) { return '<path d="M8 -11 H-9 L1 0 L-9 11 H8" fill="none" stroke="' + c + '" stroke-width="4" stroke-linejoin="miter"/>'; },
    shield: function (c) { return '<path d="M0 -12 L11 -8 L9 5 L0 12 L-9 5 L-11 -8 Z" fill="' + c + '"/><path d="M-4 0 L-1 4 L5 -4" fill="none" stroke="#0B0E13" stroke-width="3"/>'; },
    flame: function (c) { return '<path d="M0 -13 L6 -3 L9 -7 L10 4 L4 12 H-4 L-10 4 L-8 -5 L-4 -1 Z" fill="' + c + '"/>'; },
    leaf: function (c) { return '<path d="M-10 10 L-8 -4 L4 -12 L11 -12 L10 -2 L0 9 Z" fill="' + c + '"/><path d="M-10 10 L6 -8" stroke="#0B0E13" stroke-width="2"/>'; },
    plus: function (c) { return '<path d="M-4 -12 H4 V-4 H12 V4 H4 V12 H-4 V4 H-12 V-4 H-4 Z" fill="' + c + '"/>'; },
    prompt: function (c) { return '<path d="M-12 -7 L-4 0 L-12 7" fill="none" stroke="' + c + '" stroke-width="4"/><path d="M0 8 H12" stroke="' + c + '" stroke-width="4"/>'; },
    relay: function (c) { return '<path d="M-13 -4 H9 M4 -9 L9 -4 L4 1 M13 5 H-9 M-4 0 L-9 5 L-4 10" fill="none" stroke="' + c + '" stroke-width="3.5"/>'; },
    neuron: function (c) { return '<path d="M-10 -8 L0 0 L10 -8 M-10 8 L0 0 L10 8 M0 0 V-12" stroke="' + c + '" stroke-width="2.5"/><circle cx="0" cy="0" r="4" fill="' + c + '"/><circle cx="-10" cy="-8" r="3" fill="' + c + '"/><circle cx="10" cy="-8" r="3" fill="' + c + '"/><circle cx="-10" cy="8" r="3" fill="' + c + '"/><circle cx="10" cy="8" r="3" fill="' + c + '"/><circle cx="0" cy="-12" r="2.5" fill="' + c + '"/>'; },
    pulse: function (c) { return '<path d="M-14 1 H-7 L-3 -9 L3 10 L7 1 H14" fill="none" stroke="' + c + '" stroke-width="3.5" stroke-linejoin="miter"/>'; }
  };

  /* ---------- la mascotte ---------- */
  function robot(u) {
    return '<path d="M30 400 L62 320 L140 294 L260 294 L338 320 L370 400 Z" fill="#1B2233"/>' +
      '<path d="M200 294 L260 294 L338 320 L370 400 L200 400 Z" fill="#141A28"/>' +
      '<path d="M62 320 L140 294 L150 320 L92 342 Z" fill="#2B3654"/><path d="M338 320 L260 294 L250 320 L308 342 Z" fill="#222B44"/>' +
      '<path d="M62 320 L92 342 L80 400" fill="none" stroke="#5FE1FF" stroke-width="4" filter="url(#g' + u + ')"/>' +
      '<polygon class="rb-badge" points="200,322 224,336 224,364 200,378 176,364 176,336" fill="#0B0E13" stroke="#3651F5" stroke-width="3"/>' +
      '<path class="rb-bolt" d="M205 330 L190 352 H201 L195 372 L212 346 H201 Z" fill="#5FE1FF" filter="url(#g' + u + ')"/>' +
      '<path d="M170 262 H230 L224 296 H176 Z" fill="#4A5878"/>' +
      '<path d="M200 66 L264 90 L292 148 L294 206 L272 252 L128 252 L106 206 L108 148 L136 90 Z" fill="#DDE3EE"/>' +
      '<path d="M200 66 L264 90 L292 148 L294 206 L272 252 L200 252 Z" fill="#8FA3C8" opacity=".7"/>' +
      '<path d="M136 90 L200 66 L200 112 L150 128 Z" fill="#FFFFFF" opacity=".7"/><path d="M108 148 L136 90 L150 128 L124 170 Z" fill="#FFFFFF" opacity=".3"/>' +
      '<path d="M106 206 L108 148" stroke="#5FE1FF" stroke-width="4" filter="url(#g' + u + ')"/>' +
      '<path d="M212 20 L186 62 H204 L192 100 L230 50 H210 Z" fill="#D9A35B"/><path d="M212 20 L204 62 L230 50 H210 Z" fill="#F2C57C"/>' +
      '<clipPath id="hb' + u + '"><path d="M212 20 L186 62 H204 L192 100 L230 50 H210 Z"/></clipPath><g clip-path="url(#hb' + u + ')"><rect x="150" y="10" width="18" height="100" fill="#FFFFFF" opacity=".85" transform="skewX(-20)"><animate attributeName="x" values="150;150;260" keyTimes="0;0.82;1" dur="3.2s" repeatCount="indefinite"/></rect></g>' +
      '<polygon points="94,168 110,158 110,212 94,202" fill="#3651F5"/><polygon points="306,168 290,158 290,212 306,202" fill="#2A40C8"/>' +
      '<path d="M122 160 L278 160 L266 206 L200 224 L134 206 Z" fill="#0B0E13"/>' +
      '<path class="rb-eyes" d="M142 176 L186 184 L182 196 L146 190 Z M258 176 L214 184 L218 196 L254 190 Z" fill="#5FE1FF" filter="url(#g' + u + ')"/>' +
      '<path d="M130 166 L270 166" stroke="#3651F5" stroke-width="2" opacity=".7"/>' +
      '<path d="M150 252 L250 252 L236 282 L164 282 Z" fill="#AEBBD3"/><path d="M200 252 L250 252 L236 282 L200 282 Z" fill="#8FA3C8"/>' +
      '<path d="M176 264 H224" stroke="#0B0E13" stroke-width="5" stroke-linecap="square"/>';
  }

  /* ---------- les personnages ---------- */
  var HEROES = [
    {
      id: "volt", name: "Captain Reboot", title: "Mascotte du QG · Gardien de M365", world: "Microsoft 365", themes: ["admin", "entra", "intune"], mascot: true,
      power: "Relance n'importe quel système et garde un œil sur tout le tenant.",
      line: "Prêt·e à enfiler la cape ? Chaque power-up compte !",
      win: "Charge maximale ! Tu fais briller tout le QG.",
      lose: "Batterie à plat ? Recharge-toi à l'entraînement et reviens.",
      frame: "hex", neon: "#6E88FF", bg1: "#1A2350", bg2: "#0A0D16", robot: robot, glow: "#6E88FF"
    },
    {
      id: "echo", name: "Miss Ping", title: "Gardienne de Teams, Outlook & Exchange", world: "Microsoft 365", themes: ["teams", "exchange"], gender: "f",
      power: "Relie n'importe quelle équipe en un instant, sans noyer personne sous les mails.",
      line: "Un bon canal vaut mieux que cinquante mails en copie.",
      win: "Message reçu cinq sur cinq !", lose: "Petit brouillage sur la ligne… On réessaie ?",
      frame: "bubble", neon: "#5FE1FF", glow: "#5FE1FF", bg1: "#0E2A44", bg2: "#07111C", jaw: "f",
      suit: "#2A7FFF", trim: "#5FE1FF", skin: "#C68B59", hair: "#1B1B2F", mask: "#5FE1FF", maskType: "domino", lips: "#B8506A", lashes: true,
      hairBack: "M246 88 L304 96 L336 152 L330 236 L300 300 L294 224 L278 160 Z",
      hairFront: "M122 162 L126 116 L152 86 L200 70 L252 84 L280 118 L282 164 L262 128 L228 112 L238 134 L196 110 L150 122 Z",
      emblem: EM.waves("#5FE1FF"),
      front: '<path d="M96 170 L118 160 L120 214 L98 206 Z M304 170 L282 160 L280 214 L302 206 Z" fill="#2A7FFF" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/><path d="M80 164 L70 190 L80 216 M320 164 L330 190 L320 216" fill="none" stroke="#5FE1FF" stroke-width="4"/>'
    },
    {
      id: "nimbus", name: "Docteur Backup", title: "Gardien de OneDrive & SharePoint", world: "Microsoft 365", themes: ["fichiers"], gender: "m",
      power: "Retrouve n'importe quelle version d'un fichier, même effacé la veille.",
      line: "Un lien, pas une pièce jointe. Le nuage s'occupe du reste.",
      win: "Tout est synchronisé, rien ne se perd !", lose: "Pas de panique : l'historique des versions est là pour ça.",
      frame: "folder", neon: "#8FD3FF", glow: "#8FD3FF", bg1: "#14304A", bg2: "#08121C", jaw: "m",
      suit: "#DDE8F4", trim: "#4C9BE8", skin: "#F1D3B8", hair: "#E6ECF3", mask: "#4C9BE8", maskType: "goggles",
      hairFront: "M118 160 L122 108 L160 78 L216 68 L264 84 L284 122 L282 152 L256 112 L208 102 L166 110 L138 132 Z",
      beard: "M176 258 L224 258 L218 282 L200 292 L182 282 Z", beardColor: "#C9D3DE", mouthColor: "#7A5A48",
      emblem: EM.cloud("#4C9BE8")
    },
    {
      id: "calcula", name: "Excelsa", title: "Gardienne d'Office, Copilot & Power Platform", world: "Microsoft 365", themes: ["productivite", "copilot", "powerplatform"], gender: "f",
      power: "Voit les formules à travers les tableaux et dompte l'IA comme une alliée.",
      line: "Une bonne formule, et mille lignes se rangent toutes seules.",
      win: "Résultat : 100 % de réussite. Aucune erreur #N/A !", lose: "Une petite erreur de référence… Mets un $ au bon endroit et recommence.",
      frame: "cell", neon: "#FFC766", glow: "#FFC766", bg1: "#3A2610", bg2: "#140C05", jaw: "f",
      frameDeco: '<g stroke="#FFC766" stroke-opacity=".12" stroke-width="2"><path d="M0 100 H400 M0 200 H400 M0 300 H400 M100 0 V400 M300 0 V400"/></g>',
      suit: "#D9A35B", trim: "#FFE08A", skin: "#8D5A3B", hair: "#2B1A12", mask: "#FFC766", maskType: "grid", lips: "#A8455A", earrings: "#FFC766",
      hairBack: "M92 170 L100 108 L142 62 L200 48 L258 62 L300 108 L308 170 L318 240 L298 302 L258 292 L274 230 L268 160 L200 122 L132 160 L126 230 L142 292 L102 302 L82 240 Z",
      hairFront: "M126 152 L140 108 L178 86 L222 86 L260 108 L274 152 L250 126 L200 114 L150 126 Z",
      emblem: EM.sigma("#FFC766")
    },
    {
      id: "sentinelle", name: "Phishbuster", title: "Gardien de la Cybersécurité", world: "Cybersécurité", themes: ["cyber", "phishing", "identite", "soc", "incident", "vulns", "conformite", "securite365"], gender: "m",
      power: "Repère un faux expéditeur à des kilomètres et ne laisse passer aucun phishing.",
      line: "Vérifie l'expéditeur. Toujours. Même quand ça presse.",
      win: "Menace neutralisée. Le QG est en sécurité grâce à toi !", lose: "Le Phisher a trouvé une faille… mais on apprend de chaque attaque.",
      frame: "shield", neon: "#6E88FF", glow: "#6E88FF", bg1: "#162552", bg2: "#080C18", jaw: "m",
      suit: "#3A4A6B", trim: "#8EA2FF", skin: "#A56B46", hair: "#1B1B2F", maskType: "helmet",
      beard: "M150 250 L178 282 L222 282 L250 250 L244 272 L222 292 L178 292 L156 272 Z", beardColor: "#3A2418",
      emblem: EM.shield("#8EA2FF")
    },
    {
      id: "ignis", name: "Lady Firewall", title: "Gardienne du Réseau & pare-feu", world: "IT", themes: ["reseau", "adressage"], gender: "f",
      power: "Filtre chaque paquet qui tente d'entrer. Tout est refusé… sauf ce qui est autorisé.",
      line: "Deny by default. Le reste se mérite.",
      win: "Pare-feu en place, réseau blindé !", lose: "Une règle trop permissive… Relis-les de haut en bas.",
      frame: "flame", neon: "#FF8A3D", glow: "#FF8A3D", bg1: "#4A150C", bg2: "#140605", jaw: "f",
      suit: "#B33A1F", trim: "#FFB23D", skin: "#E8B894", hair: "#FF8A3D", mask: "#FF8A3D", maskType: "domino", lips: "#C0392B", lashes: true,
      hairBack: "M112 146 L94 222 L102 302 L142 334 L130 262 L136 188 Z M288 146 L306 222 L298 302 L258 334 L270 262 L264 188 Z",
      hairFront: "M122 164 L116 118 L134 76 L150 100 L162 54 L184 90 L204 40 L222 88 L246 52 L256 98 L276 74 L284 120 L278 164 L256 124 L200 108 L144 124 Z",
      hairStreak: "M162 54 L184 90 L174 96 Z M204 40 L222 88 L212 92 Z",
      emblem: EM.flame("#FFB23D")
    },
    {
      id: "sylva", name: "Green Byte", title: "Gardienne du Numérique responsable", world: "Numérique responsable", themes: ["vert"], gender: "f",
      power: "Fait pousser les bonnes habitudes : moins de gaspillage, plus d'impact positif.",
      line: "Le meilleur déchet, c'est celui qu'on ne produit pas.",
      win: "La planète te dit merci !", lose: "Pas grave, chaque petit geste compte. On réessaie ?",
      frame: "leaf", neon: "#7CC596", glow: "#7CC596", bg1: "#12361F", bg2: "#06120A", jaw: "f",
      suit: "#2F7A4D", trim: "#A6E3B8", skin: "#6B4430", hair: "#1F140E", mask: "#7CC596", maskType: "domino", lips: "#9C3D55", earrings: "#A6E3B8",
      hairBack: "M132 168 L112 240 L118 324 L140 326 L134 252 L148 184 Z M268 168 L288 240 L282 324 L260 326 L266 252 L252 184 Z",
      hairFront: "M124 160 L128 114 L160 84 L200 74 L240 84 L272 114 L276 160 L250 122 L200 110 L150 122 Z",
      emblem: EM.leaf("#A6E3B8"),
      front: '<path d="M112 250 L124 250 M110 280 L124 280 M112 308 L124 308 M276 250 L288 250 M276 280 L290 280 M276 308 L288 308" stroke="#A6E3B8" stroke-width="4"/><g stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"><path d="M200 78 L186 52 L200 22 L214 52 Z" fill="#7CC596"/><path d="M172 84 L150 70 L144 42 L170 58 Z" fill="#A6E3B8"/><path d="M228 84 L250 70 L256 42 L230 58 Z" fill="#A6E3B8"/></g>'
    },
    {
      id: "patch", name: "Hotfix", title: "Gardien du Support & du matériel", world: "IT", themes: ["support", "materiel"], gender: "m",
      power: "Répare tout en un temps record, du Wi-Fi capricieux à l'imprimante rebelle.",
      line: "Un problème ? Déjà corrigé.", win: "Ticket résolu en un temps record !", lose: "Pas encore réparé… Relis la procédure et on recommence.",
      frame: "gear", neon: "#4FD1C5", glow: "#4FD1C5", bg1: "#0F3533", bg2: "#061312", jaw: "m",
      suit: "#1F6F6A", trim: "#7EE8DC", skin: "#B07A55", hair: "#2B1A12", mask: "#4FD1C5", maskType: "domino",
      hairFront: "M122 150 L130 106 L166 82 L234 82 L270 106 L278 150 L262 116 L200 104 L138 116 Z",
      beard: "M122 206 L144 258 L178 286 L222 286 L256 258 L278 206 L262 232 L240 246 L200 242 L160 246 L138 232 Z", mouthColor: "#B07A55",
      emblem: EM.plus("#7EE8DC"),
      front: '<path d="M126 118 L274 118 L276 132 L124 132 Z" fill="#0B0E13"/><path d="M146 104 L186 104 L182 134 L150 134 Z M254 104 L214 104 L218 134 L250 134 Z" fill="#4FD1C5" stroke="#0B0E13" stroke-width="4" stroke-linejoin="round"/>'
    },
    {
      id: "sudo", name: "Sudo", title: "Gardien du Développement & de Linux", world: "Développement", themes: ["scripting", "code", "linux"], gender: "m",
      power: "Obtient n'importe quel droit… mais ne l'utilise que quand c'est vraiment nécessaire.",
      line: "Le moindre privilège, c'est ma superpuissance.", win: "Script exécuté sans erreur. Propre !", lose: "Erreur de syntaxe… Un bon dev relit toujours son code.",
      frame: "terminal", neon: "#B98CFF", glow: "#B98CFF", bg1: "#2A1850", bg2: "#0C0716", jaw: "m",
      frameDeco: '<path d="M18 28 H382 V62 H18 Z" fill="#0B0E13" opacity=".7"/><circle cx="44" cy="45" r="7" fill="#FF6B8A"/><circle cx="66" cy="45" r="7" fill="#FFC766"/><circle cx="88" cy="45" r="7" fill="#7CC596"/>',
      suit: "#2B1F4A", trim: "#B98CFF", skin: "#F2C9A8", hair: "#3B2A66", mask: "#B98CFF", maskType: "visor",
      hairBack: "M104 170 L128 90 L200 64 L272 90 L296 170 L306 300 L94 300 Z",
      hairFront: "M124 158 L140 106 L200 84 L260 106 L276 158 L262 124 L200 106 L138 124 Z",
      emblem: EM.prompt("#B98CFF")
    },
    {
      id: "proxy", name: "Proxy", title: "Gardien du Web, des API & de la sécurité du code", world: "Développement", themes: ["web", "devsecu"], gender: "m",
      power: "Se glisse entre toi et Internet pour filtrer ce qui passe.",
      line: "Tout passe par moi. Et je vérifie tout.", win: "Requête 200 OK, bien joué !", lose: "Erreur 404 : réponse introuvable… Réessaie !",
      frame: "diamond", neon: "#FF6B8A", glow: "#FF6B8A", bg1: "#40122A", bg2: "#12060C", jaw: "m",
      suit: "#3B1530", trim: "#FF9BB2", skin: "#5A3825", hair: "#141018", mask: "#FF6B8A", maskType: "domino",
      hairFront: "M126 136 L148 82 L214 66 L272 88 L286 134 L250 108 L192 106 L140 128 Z",
      hairStreak: "M214 66 L240 74 L218 104 L196 106 Z",
      emblem: EM.relay("#FF9BB2")
    },
    {
      id: "uptime", name: "Uptime", title: "Gardien des systèmes · IT", world: "IT", themes: ["systemes", "infra"], gender: "m",
      power: "Ne dort jamais : les serveurs restent en ligne, quoi qu'il arrive.",
      line: "99,99 % de disponibilité. Le 0,01 %, c'est ma pause café.", win: "Tous les voyants sont au vert !", lose: "Petite panne… mais on redémarre toujours plus fort.",
      frame: "arrow", neon: "#B6F35A", glow: "#B6F35A", bg1: "#2A3A0E", bg2: "#0B1005", jaw: "m",
      suit: "#2C3A12", trim: "#D5FF8A", skin: "#D9A27A", hair: "#E9C46A", mask: "#B6F35A", maskType: "visor",
      hairFront: "M118 158 L110 110 L140 104 L134 68 L170 88 L186 48 L208 84 L236 52 L244 92 L276 78 L272 116 L292 128 L282 158 L256 120 L200 108 L144 120 Z",
      emblem: EM.pulse("#D5FF8A")
    },
    {
      id: "prompta", name: "Prompta", title: "Gardienne de l'Intelligence artificielle", world: "Intelligence artificielle", themes: ["iabases", "prompts", "iasecu", "iaethique"], gender: "f",
      power: "Transforme une consigne claire en réponse brillante, et flaire les pièges de l'IA à des kilomètres.",
      line: "L'IA propose, toi tu vérifies. C'est ça, le vrai super-pouvoir !",
      win: "Réponse générée… et vérifiée ! Zéro hallucination.", lose: "Oups, petite hallucination. On reformule et on retente ?",
      frame: "chip", neon: "#3FE0C5", glow: "#3FE0C5", bg1: "#0B3A35", bg2: "#041412", jaw: "f",
      frameDeco: '<g stroke="#3FE0C5" stroke-opacity=".14" stroke-width="2" fill="none"><path d="M60 120 H130 L150 140 M340 280 H270 L250 260 M120 340 V290 L140 270 M280 60 V110 L260 130"/></g>',
      suit: "#1FA88F", trim: "#9FFFEF", skin: "#E8B996", hair: "#DCE6F2", mask: "#3FE0C5", maskType: "visor", lips: "#C0566E", lashes: true,
      hairBack: "M96 176 L104 110 L146 64 L200 52 L254 64 L296 110 L304 176 L300 252 L276 264 L270 190 L262 150 L200 120 L138 150 L130 190 L124 264 L100 252 Z",
      hairFront: "M124 160 L132 112 L170 80 L226 76 L268 100 L280 152 L254 118 L214 104 L176 134 L150 124 Z",
      emblem: EM.neuron("#3FE0C5")
    }
  ];

  var UNLOCK_XP = 5000; // rang maximum : Super directeur technique


  /* ---------- fiches des héros : chacun « naît » avec une vraie invention de l'histoire de l'informatique ---------- */
  var STORIES = {
    volt: { born: "1981", origin: "Le raccourci Ctrl + Alt + Suppr", creator: "David Bradley, ingénieur chez IBM",
      story: "Captain Reboot est né en 1981 dans les laboratoires d'IBM, le jour où l'ingénieur David Bradley a inventé Ctrl + Alt + Suppr pour redémarrer un PC sans l'éteindre. Il a pris du galon en 2011 avec le lancement d'Office 365, devenu Microsoft 365 en 2020, et veille depuis sur tout le tenant du QG.",
      fact: "Ctrl + Alt + Suppr devait rester une astuce réservée aux développeurs. Il est devenu l'un des raccourcis les plus célèbres au monde." },
    echo: { born: "Décembre 1983", origin: "La commande ping", creator: "Mike Muuss, chercheur à l'US Army Ballistic Research Laboratory",
      story: "Miss Ping est née en décembre 1983, quand Mike Muuss a écrit en une soirée un petit programme pour vérifier qu'une machine répond sur le réseau. Il l'a baptisé « ping », comme le bruit d'un sonar. Depuis, elle relie les équipes et fait passer les messages, de Teams à Exchange.",
      fact: "Sa marraine est l'e-mail : en 1971, Ray Tomlinson envoie le premier message entre deux ordinateurs et choisit le symbole @ pour séparer le nom de la machine." },
    nimbus: { born: "1er août 2007", origin: "SkyDrive, l'ancêtre de OneDrive", creator: "Les équipes Windows Live de Microsoft",
      story: "Docteur Backup est né le 1er août 2007 sous le nom de SkyDrive, un espace de stockage en ligne lancé par Microsoft. Rebaptisé OneDrive en 2014, il travaille main dans la main avec SharePoint, apparu en 2001, pour que plus personne ne perde un fichier.",
      fact: "Le nom SkyDrive a dû être abandonné après un litige de marque avec le groupe de télévision britannique Sky." },
    calcula: { born: "30 septembre 1985", origin: "Excel, sorti d'abord sur Mac", creator: "Microsoft, sur les traces de VisiCalc (Dan Bricklin et Bob Frankston, 1979)",
      story: "Excelsa est née le 30 septembre 1985 avec la première version d'Excel, sortie sur Macintosh avant d'arriver sur Windows en 1987. Son ancêtre, VisiCalc, premier tableur de l'histoire, avait été créé en 1979 par Dan Bricklin et Bob Frankston. Aujourd'hui, elle fait équipe avec Copilot et Power Automate.",
      fact: "VisiCalc a fait vendre des milliers d'ordinateurs Apple II : des entreprises achetaient la machine rien que pour ce logiciel." },
    sentinelle: { born: "1995", origin: "L'apparition du mot « phishing »", creator: "Né pour contrer les pirates d'AOL",
      story: "Le mot « phishing » apparaît vers 1995 chez des pirates qui volaient des comptes AOL en se faisant passer pour le support. Phishbuster est né la même année avec une seule mission : démasquer chaque faux mail, faux SMS et faux site avant qu'ils ne fassent une victime.",
      fact: "Le « ph » de phishing est un clin d'œil aux « phreakers », les pirates des lignes téléphoniques des années 1970." },
    ignis: { born: "1988", origin: "Le premier pare-feu à filtrage de paquets", creator: "Des ingénieurs de Digital Equipment Corporation (DEC)",
      story: "Lady Firewall est née en 1988, quand des ingénieurs de DEC ont décrit le premier pare-feu capable de filtrer les paquets réseau. La même année, le ver Morris paralysait une partie d'Internet : elle a compris qu'un réseau sans garde, c'est une porte ouverte.",
      fact: "Le mot « firewall » vient du bâtiment : un mur coupe-feu empêche un incendie de passer d'une pièce à l'autre." },
    sylva: { born: "1992", origin: "Le label Energy Star", creator: "L'agence américaine de protection de l'environnement (EPA)",
      story: "Green Byte est née en 1992 avec Energy Star, l'un des premiers labels à récompenser les ordinateurs moins gourmands en énergie. Elle a gagné en force en France avec la loi REEN de 2021, qui vise à réduire l'empreinte environnementale du numérique.",
      fact: "L'essentiel de l'impact environnemental d'un ordinateur vient de sa fabrication : le garder plus longtemps est le meilleur geste." },
    patch: { born: "9 septembre 1947", origin: "Le premier « bug » informatique", creator: "L'équipe de Grace Hopper, sur l'ordinateur Harvard Mark II",
      story: "Hotfix est né le 9 septembre 1947, quand l'équipe de Grace Hopper a retrouvé un papillon de nuit coincé dans un relais de l'ordinateur Harvard Mark II. Ils l'ont scotché dans le journal de bord avec la mention « premier cas réel de bug trouvé ». Depuis, Hotfix traque les pannes, du logiciel au matériel.",
      fact: "La page du journal, avec son papillon toujours scotché, est conservée au musée national d'histoire américaine du Smithsonian." },
    sudo: { born: "1980", origin: "La commande sudo", creator: "Bob Coggeshall et Cliff Spencer, université de Buffalo (New York)",
      story: "Sudo est né en 1980 à l'université de Buffalo, où Bob Coggeshall et Cliff Spencer ont eu une idée simple : donner temporairement les droits administrateur pour une seule commande, plutôt que de travailler en root en permanence. Le moindre privilège avant l'heure !",
      fact: "Son nom colle « su » (la commande pour changer d'utilisateur) et « do » (faire) : « fais-le avec les droits d'un autre »." },
    proxy: { born: "12 mars 1989", origin: "Le World Wide Web", creator: "Tim Berners-Lee, au CERN",
      story: "Proxy est né le 12 mars 1989, quand Tim Berners-Lee a proposé au CERN un système de documents reliés par des liens : le Web. Le premier site est mis en ligne en 1991. Depuis, Proxy fait circuler les requêtes entre les navigateurs, les serveurs et les API.",
      fact: "Le CERN a remis en ligne le premier site web de l'histoire, à son adresse d'origine : info.cern.ch." },
    uptime: { born: "1er janvier 1970", origin: "L'« époque Unix », l'instant zéro des horloges informatiques", creator: "Ken Thompson et Dennis Ritchie, laboratoires Bell",
      story: "Uptime est né le 1er janvier 1970 à 0 h 00 (UTC) : c'est l'instant zéro à partir duquel Unix et Linux comptent le temps, en secondes. Unix venait d'être créé aux laboratoires Bell par Ken Thompson et Dennis Ritchie. Uptime garde les serveurs debout, sous Windows comme sous Linux.",
      fact: "Le 19 janvier 2038, les systèmes qui comptent encore le temps sur 32 bits déborderont : c'est le « bug de l'an 2038 »." }
  };
  STORIES.prompta = { born: "Été 1956", origin: "La conférence de Dartmouth, où l'expression « intelligence artificielle » s'impose", creator: "John McCarthy, Marvin Minsky, Claude Shannon et Nathaniel Rochester",
    story: "Prompta est née à l'été 1956 au Dartmouth College, aux États-Unis, où une poignée de chercheurs a fait de l'« intelligence artificielle » un domaine de recherche à part entière. Sa grande sœur, ELIZA, premier programme de conversation, est apparue au MIT au milieu des années 1960. Depuis l'arrivée des grands modèles de langage, Prompta apprend aux héros à se servir de l'IA… sans jamais lui confier les yeux fermés.",
    fact: "ELIZA, créée par Joseph Weizenbaum, imitait une psychothérapeute avec des règles très simples. Certains utilisateurs s'y attachaient quand même, ce qui a beaucoup inquiété son créateur." };
  /* « Le savais-tu ? » : plusieurs anecdotes par gardien, une différente chaque jour (elles reviennent en boucle) */
  var MORE_FACTS = {
    volt: ["Office 365 a été lancé en 2011, puis rebaptisé Microsoft 365 en avril 2020.",
      "Le trombone animé de Microsoft, surnommé Clippy, est apparu avec Office 97. Il a été désactivé par défaut dès Office XP.",
      "Windows 1.0 est sorti en novembre 1985. Il fallait deux disquettes et beaucoup de patience."],
    echo: ["Microsoft Teams est sorti officiellement en mars 2017.",
      "Le mot « spam » vient d'un sketch des Monty Python où un menu propose du Spam dans tous les plats.",
      "Outlook est apparu en 1997, avec Office 97. Exchange, son partenaire côté serveur, était sorti un an plus tôt."],
    nimbus: ["SharePoint est né en 2001 sous le nom de SharePoint Portal Server.",
      "En 1956, le premier disque dur (IBM 350) pesait environ une tonne et stockait moins de 4 Mo.",
      "La règle de sauvegarde 3-2-1 : 3 copies, sur 2 supports différents, dont 1 hors site."],
    calcula: ["Depuis Excel 2007, une feuille compte 1 048 576 lignes, soit 2 puissance 20.",
      "PowerPoint s'appelait d'abord « Presenter ». Microsoft a racheté son éditeur, Forethought, en 1987.",
      "Microsoft 365 Copilot a été présenté en mars 2023."],
    sentinelle: ["En 1971, Creeper, un programme expérimental, se déplaçait d'ordinateur en ordinateur en affichant « I'm the creeper, catch me if you can ». Reaper a été créé pour le chasser.",
      "En 2000, le ver ILOVEYOU a infecté des millions d'ordinateurs en se faisant passer pour une lettre d'amour.",
      "Le premier rançongiciel connu, en 1989, était distribué sur des disquettes envoyées par la poste."],
    ignis: ["Le premier message envoyé sur ARPANET, en 1969, devait être « LOGIN ». Le système a planté après « LO ».",
      "Le 1er janvier 1983, ARPANET a basculé sur TCP/IP : on parle souvent de l'anniversaire d'Internet.",
      "IPv4 offre environ 4,3 milliards d'adresses. IPv6, avec ses 128 bits, en offre un nombre astronomique."],
    sylva: ["Un datacenter parfait aurait un PUE de 1 : toute l'énergie servirait aux serveurs, rien au refroidissement.",
      "Depuis 2021, en France, un indice de réparabilité s'affiche sur certains appareils comme les smartphones et les ordinateurs portables.",
      "Un appareil reconditionné évite de fabriquer un appareil neuf, et donc d'extraire de nouvelles matières premières."],
    patch: ["La première souris, inventée par Douglas Engelbart et présentée en 1968, était un boîtier en bois avec deux roues.",
      "Le « Patch Tuesday » de Microsoft tombe le deuxième mardi de chaque mois, depuis 2003.",
      "La norme USB est apparue en 1996. Avant, chaque périphérique avait souvent son propre connecteur."],
    sudo: ["Linus Torvalds a annoncé Linux le 25 août 1991, en le présentant comme « juste un passe-temps ».",
      "Git a été créé par Linus Torvalds en 2005, en quelques semaines seulement.",
      "Le langage Python ne doit pas son nom au serpent, mais aux Monty Python."],
    proxy: ["Le code HTTP 418 « I'm a teapot » vient d'un poisson d'avril de 1998 : un protocole pour contrôler des cafetières.",
      "JavaScript a été écrit en une dizaine de jours en 1995 par Brendan Eich.",
      "L'OWASP, qui publie le fameux Top 10 des risques web, a été fondée en 2001."],
    uptime: ["« Cinq neuf » de disponibilité (99,999 %), c'est à peine plus de 5 minutes de panne par an.",
      "Active Directory est arrivé avec Windows 2000 Server.",
      "IBM faisait déjà tourner des machines virtuelles dans les années 1960."],
    prompta: ["En 1950, Alan Turing propose son « jeu de l'imitation », devenu le test de Turing.",
      "ELIZA, créée en 1966 par Joseph Weizenbaum, simulait une psychothérapeute. Certains utilisateurs s'y attachaient vraiment.",
      "En 2017, l'article « Attention Is All You Need » présente l'architecture Transformer, à la base des grands modèles de langage actuels."]
  };
  Object.keys(MORE_FACTS).forEach(function (k) { if (STORIES[k]) STORIES[k].facts = [STORIES[k].fact].concat(MORE_FACTS[k]).filter(Boolean); });
  HEROES.forEach(function (h) { if (STORIES[h.id]) h.story = STORIES[h.id]; });
  var AVATARS = HEROES.filter(function (h) { return !h.mascot; }).map(function (h) {
    return { id: h.id, name: h.name, gender: h.gender, svg: function (s) { return portrait(h, s); } };
  });
  var MASCOT = HEROES[0];
  AVATARS.push({ id: MASCOT.id, name: MASCOT.name, locked: true, unlockXp: UNLOCK_XP, svg: function (s) { return portrait(MASCOT, s); } });

  window.HEROES = HEROES;
  window.ALL_CHARACTERS = HEROES;
  window.heroSvg = portrait;
  window.AVATARS = AVATARS;
  window.DEFAULT_AVATAR = "patch";
  window.heroForTheme = function (theme) {
    for (var i = 0; i < HEROES.length; i++) if (HEROES[i].themes.indexOf(theme) !== -1) return HEROES[i];
    return HEROES[0];
  };
  window.heroById = function (id) {
    for (var i = 0; i < HEROES.length; i++) if (HEROES[i].id === id) return HEROES[i];
    return HEROES[0];
  };
  window.avatarSvg = function (id, size) {
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i].svg(size);
    return null;
  };
})();
