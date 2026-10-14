/* Fonds de la carte de héros : décors SVG (créations originales, clins d'œil à l'histoire de l'informatique et du jeu vidéo) */
(function () {
  var S = function (inner, extra) { return '<svg viewBox="0 0 280 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"' + (extra || "") + ">" + inner + "</svg>"; };
  var D = {};

  /* 1890-1970 : cartes perforées */
  (function () {
    var h = "", cols = [0, 3, 1, 4, 2, 5, 0, 2, 4, 1, 3, 5, 2, 0, 4, 1, 3, 5, 1, 4, 0, 2, 5, 3];
    for (var i = 0; i < cols.length; i++) { var x = 150 + (i % 12) * 10, y0 = i < 12 ? 20 : 110;
      h += '<rect x="' + x + '" y="' + (y0 + cols[i] * 13) + '" width="4" height="8" rx="1" fill="#6B4E1E" opacity=".55"/>';
      h += '<rect x="' + x + '" y="' + (y0 + ((cols[i] + 3) % 6) * 13) + '" width="4" height="8" rx="1" fill="#6B4E1E" opacity=".55"/>'; }
    for (var r = 0; r < 12; r++) h += '<text x="138" y="' + (28 + r * 14.5) + '" font-family="monospace" font-size="7" fill="#8A6A30" opacity=".6">' + (r % 10) + "</text>";
    D.cartes = S('<path d="M130 6h144v188H130z" fill="none" stroke="#B8955A" stroke-width="1" opacity=".6"/><path d="M130 6l12 0-12 12z" fill="#E4D2A6"/>' + h);
  })();

  /* 1946 : lampes à vide */
  (function () {
    var h = "";
    for (var i = 0; i < 6; i++) { var x = 20 + i * 44, d = (i * 0.37).toFixed(2);
      h += '<g transform="translate(' + x + ',120)"><rect x="4" y="54" width="28" height="12" rx="2" fill="#3A2A1A"/><path d="M6 54V18a12 12 0 0 1 24 0v36z" fill="rgba(255,200,140,.08)" stroke="rgba(255,220,180,.35)" stroke-width="1.2"/>' +
        '<path d="M12 50V30M24 50V30M12 30q6-10 12 0" fill="none" stroke="#FF9A3C" stroke-width="1.6" stroke-linecap="round"><animate attributeName="opacity" values=".45;1;.6;.9;.45" dur="2.2s" begin="' + d + 's" repeatCount="indefinite"/></path>' +
        '<circle cx="18" cy="36" r="12" fill="#FF8A2B" opacity=".18"><animate attributeName="opacity" values=".1;.28;.12" dur="2.2s" begin="' + d + 's" repeatCount="indefinite"/></circle></g>'; }
    D.lampes = S('<path d="M0 186h280" stroke="#5A3A20" stroke-width="3"/>' + h);
  })();

  /* 1958-1972 : tennis sur écran */
  D.tennis = S('<path d="M140 0v200" stroke="#fff" stroke-width="3" stroke-dasharray="8 8" opacity=".35"/>' +
    '<rect x="14" y="70" width="6" height="36" fill="#fff" opacity=".85"><animate attributeName="y" values="30;120;60;140;30" dur="4s" repeatCount="indefinite"/></rect>' +
    '<rect x="260" y="70" width="6" height="36" fill="#fff" opacity=".85"><animate attributeName="y" values="120;40;130;50;120" dur="4s" repeatCount="indefinite"/></rect>' +
    '<rect width="7" height="7" fill="#fff"><animate attributeName="x" values="21;253;21" dur="2s" repeatCount="indefinite"/><animate attributeName="y" values="50;150;30;170;50" dur="3.3s" repeatCount="indefinite"/></rect>' +
    '<text x="110" y="30" font-family="monospace" font-size="22" fill="#fff" opacity=".35" text-anchor="middle">3</text><text x="170" y="30" font-family="monospace" font-size="22" fill="#fff" opacity=".35" text-anchor="middle">2</text>');

  /* 1970 : terminal à phosphore vert */
  D.terminal = S('<g font-family="monospace" font-size="9" fill="#39FF7A" opacity=".55">' +
    '<text x="120" y="24">C:\\QG&gt; DIR</text><text x="120" y="38">HEROS    DAT   1024</text><text x="120" y="52">BOSS     EXE   2048</text><text x="120" y="66">CAPES    SYS    512</text>' +
    '<text x="120" y="88">C:\\QG&gt; RUN POWERUP</text><text x="120" y="102">CHARGEMENT......OK</text><text x="120" y="116">BIENVENUE, HEROS</text><text x="120" y="138">C:\\QG&gt;</text></g>' +
    '<rect x="163" y="130" width="7" height="10" fill="#39FF7A"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1s" repeatCount="indefinite"/></rect>');

  /* 1980 : labyrinthe à pastilles (le petit robot du QG mange les pastilles) */
  (function () {
    var dots = "", n = 12;
    for (var i = 0; i < n; i++) { var x = 30 + i * 20, t = ((x - 16) / 264).toFixed(3), t2 = (Math.min(0.999, +t + 0.005)).toFixed(3);
      dots += '<circle cx="' + x + '" cy="160" r="2.6" fill="#FFD9A8"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;' + t + ";" + t2 + ';1" dur="5s" repeatCount="indefinite"/></circle>'; }
    var walls = '<g fill="none" stroke="#3651F5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".8"><path d="M8 142h264M8 178h264"/><path d="M150 20h60v30h40M150 20v60h30M230 80v40h-40M260 20v100"/></g>' +
      '<g fill="#FFD9A8" opacity=".7"><circle cx="166" cy="36" r="2"/><circle cx="194" cy="66" r="2"/><circle cx="244" cy="100" r="2"/><circle cx="210" cy="100" r="2"/><circle cx="244" cy="36" r="4"><animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite"/></circle></g>';
    var bot = '<g><animateTransform attributeName="transform" type="translate" values="16 160;280 160" dur="5s" repeatCount="indefinite"/>' +
      '<circle r="9" fill="#E8ECF4"/><rect x="-6" y="-4" width="12" height="5" rx="2" fill="#0B0E13"/><rect x="-4.5" y="-3" width="3" height="2" fill="#5CE1FF"/><rect x="1.5" y="-3" width="3" height="2" fill="#5CE1FF"/><path d="M-3 4h6" stroke="#0B0E13" stroke-width="1.2"/></g>';
    D.labyrinthe = S(walls + dots + bot);
  })();

  /* 1997 : serpent sur écran de téléphone */
  (function () {
    var body = "", pts = [[0,0],[-8,0],[-16,0],[-24,0],[-24,-8],[-24,-16],[-32,-16],[-40,-16]];
    pts.forEach(function (p) { body += '<rect x="' + (p[0] - 3.5) + '" y="' + (p[1] - 3.5) + '" width="7" height="7" fill="#1F2E0A"/>'; });
    D.serpent = S('<defs><pattern id="lcd" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none" stroke="#6E8A2A" stroke-width=".4" opacity=".35"/></pattern></defs><rect width="280" height="200" fill="url(#lcd)"/>' +
      '<rect x="200" y="114" width="7" height="7" fill="#1F2E0A"><animate attributeName="opacity" values="1;.2;1" dur=".8s" repeatCount="indefinite"/></rect>' +
      '<g><animateTransform attributeName="transform" type="translate" values="140 118;148 118;156 118;164 118;172 118;180 118;188 118;196 118" calcMode="discrete" dur="2.4s" repeatCount="indefinite"/>' + body + "</g>" +
      '<text x="250" y="40" font-family="monospace" font-size="10" fill="#1F2E0A" text-anchor="end" opacity=".7">0042</text>');
  })();

  /* 1971-2000 : disquettes */
  D.disquettes = S('<defs><pattern id="flop" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><g transform="translate(8 8)" opacity=".5"><path d="M0 2a2 2 0 0 1 2-2h22l6 6v22a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z" fill="#3651F5"/><rect x="7" y="0" width="14" height="9" fill="#C9D3E3"/><rect x="16" y="1.5" width="3" height="6" fill="#3651F5"/><rect x="5" y="15" width="20" height="13" rx="1" fill="#F2F6FF"/></g></pattern></defs><rect width="280" height="200" fill="url(#flop)"/>');

  /* années 80-90 : paysage 8 bits */
  D.pixels = S('<g fill="#fff" opacity=".8"><rect x="30" y="20" width="3" height="3"/><rect x="200" y="14" width="3" height="3"/><rect x="250" y="40" width="2" height="2"/><rect x="120" y="30" width="2" height="2"/></g>' +
    '<g fill="#FFD36B"><rect x="210" y="60" width="36" height="12"/><rect x="204" y="72" width="48" height="12"/><rect x="210" y="84" width="36" height="6"/></g>' +
    '<g fill="#fff" opacity=".85"><animateTransform attributeName="transform" type="translate" values="-60 0;300 0" dur="16s" repeatCount="indefinite"/><rect x="0" y="40" width="30" height="6"/><rect x="6" y="34" width="16" height="6"/></g>' +
    '<path d="M0 200V140h20v-10h20v-10h20v10h20v20h20v-30h20v-10h20v20h20v10h20v-20h20v-10h20v10h20v20h20v-10h20V200z" fill="#6E3FC8"/>' +
    '<path d="M0 200v-30h30v-10h30v10h40v-20h30v20h40v-10h40v10h30v-20h40v50z" fill="#3A1E7A"/>');

  /* 2009 : monde en blocs (cubes isométriques aux couleurs du QG) */
  (function () {
    var cube = function (x, y, a, b, c, anim) { return '<g transform="translate(' + x + " " + y + ')">' + (anim || "") + '<path d="M0 -12l14 8-14 8-14-8z" fill="' + a + '"/><path d="M-14 -4l14 8v16l-14-8z" fill="' + b + '"/><path d="M14 -4l-14 8v16l14-8z" fill="' + c + '"/></g>'; };
    var h = "", g = ["#7CC596", "#3F8F5E", "#2B6A44"], s = ["#8EA2FF", "#4C6BFF", "#2E48D8"], w = ["#C9A26A", "#8A6A3A", "#6B4E2A"];
    [[168,170,g],[196,170,g],[224,170,g],[252,170,g],[182,162,w],[210,162,g],[238,162,s],[196,154,g],[224,154,s],[266,162,g],[210,146,s]].forEach(function (p) { h += cube(p[0], p[1], p[2][0], p[2][1], p[2][2]); });
    h += cube(238, 110, "#F5C451", "#C99A2B", "#9A7418", '<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -6;0 0" dur="2.4s" repeatCount="indefinite"/>');
    D.blocs = S(h);
  })();

  /* 2006 : le nuage */
  D.nuage = S('<g fill="#FFFFFF" opacity=".85"><g><animateTransform attributeName="transform" type="translate" values="0 0;14 0;0 0" dur="8s" repeatCount="indefinite"/><ellipse cx="210" cy="60" rx="34" ry="16"/><ellipse cx="190" cy="54" rx="18" ry="14"/><ellipse cx="228" cy="50" rx="20" ry="16"/></g>' +
    '<g opacity=".7"><animateTransform attributeName="transform" type="translate" values="0 0;-12 0;0 0" dur="10s" repeatCount="indefinite"/><ellipse cx="90" cy="176" rx="40" ry="12"/><ellipse cx="70" cy="170" rx="18" ry="10"/></g></g>' +
    '<g stroke="#3651F5" stroke-width="1.2" opacity=".55" stroke-dasharray="3 4"><path d="M200 76l-30 70M220 76l20 70M210 76v40"><animate attributeName="stroke-dashoffset" values="0;-14" dur="1s" repeatCount="indefinite"/></path></g>' +
    '<g fill="#3651F5" opacity=".7"><rect x="162" y="146" width="16" height="12" rx="2"/><rect x="232" y="146" width="16" height="12" rx="2"/><rect x="202" y="116" width="16" height="12" rx="2"/></g>');

  /* 2020 : réseau de neurones */
  (function () {
    var L = [[150,[40,100,160]],[200,[25,70,115,160]],[250,[60,120]]], lines = "", nodes = "", k = 0;
    for (var a = 0; a < L.length - 1; a++) L[a][1].forEach(function (y1) { L[a + 1][1].forEach(function (y2) { lines += '<path d="M' + L[a][0] + " " + y1 + "L" + L[a + 1][0] + " " + y2 + '"/>'; }); });
    L.forEach(function (col, ci) { col[1].forEach(function (y) { nodes += '<circle cx="' + col[0] + '" cy="' + y + '" r="6"><animate attributeName="r" values="5;8;5" dur="1.8s" begin="' + (ci * 0.45).toFixed(2) + 's" repeatCount="indefinite"/><animate attributeName="fill-opacity" values=".5;1;.5" dur="1.8s" begin="' + (ci * 0.45).toFixed(2) + 's" repeatCount="indefinite"/></circle>'; k++; }); });
    D.neurones = S('<g stroke="#C9A8FF" stroke-width="1" opacity=".35">' + lines + '</g><g fill="#E0CCFF">' + nodes + "</g>");
  })();


  /* Rayons comics, version 2 : case de BD avec trame, traits de vitesse et onomatopée */
  (function () {
    var lines = "";
    for (var i = 0; i < 14; i++) { var y = 10 + i * 14, len = 60 + (i * 37 % 70);
      lines += '<path d="M280 ' + y + 'h-' + len + '" stroke="#fff" stroke-width="' + (1 + i % 3) + '" stroke-linecap="round" opacity=".5"><animate attributeName="stroke-dasharray" values="0 300;' + len + ' 300;0 300" dur="' + (1.2 + (i % 4) * .2).toFixed(1) + 's" begin="' + (i * .09).toFixed(2) + 's" repeatCount="indefinite"/></path>'; }
    D.rayons = S('<defs><radialGradient id="htfade" cx="1" cy="1" r="1.1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><pattern id="htdots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.4" fill="#FF3D8A"/></pattern><mask id="htm"><rect width="280" height="200" fill="url(#htfade)"/></mask></defs>' +
      '<rect width="280" height="200" fill="url(#htdots)" mask="url(#htm)" opacity=".55"/>' + lines +
      '<g transform="translate(222 150)"><g><animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur="1.4s" repeatCount="indefinite"/>' +
      '<path d="M0-42L10-18 36-30 22-6 46 4 20 12 30 38 6 22-6 46-12 20-40 30-24 6-46-6-20-14-32-38-6-22z" fill="#FFE14D" stroke="#16204A" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="0" y="8" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="#E3120B" stroke="#16204A" stroke-width="1" transform="rotate(-10)">ZAP!</text></g></g>');
  })();

  /* 1984 : blocs qui tombent (formes originales) */
  (function () {
    var sq = function (x, y, c) { return '<rect x="' + x + '" y="' + y + '" width="11" height="11" fill="' + c + '" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="M' + (x + 1) + " " + (y + 10) + "v-9h9" + '" stroke="rgba(255,255,255,.45)" fill="none"/>'; };
    var cols = ["#4CC37A", "#6E88FF", "#FF3D6E", "#F5C451", "#B98CFF", "#3FE0C5", "#E0661B"], h = "";
    var stack = [[0,0],[1,0],[2,0],[3,1],[4,1],[5,0],[6,0],[7,2],[8,2],[9,3],[10,3],[11,1],[12,1],[13,4],[14,4],[15,5],[16,5],[17,6],[18,6],[19,0],[0,1],[1,2],[2,2],[5,3],[6,3],[9,4],[12,5],[13,5],[16,6],[19,6],[18,2]];
    stack.forEach(function (p, i) { var col = p[0], row = i < 20 ? 0 : 1; h += sq(58 + col * 11, 188 - row * 11 - 11, cols[p[1]]); });
    var piece = sq(0, 0, "#F5C451") + sq(11, 0, "#F5C451") + sq(11, 11, "#F5C451") + sq(22, 11, "#F5C451") + sq(11, 22, "#F5C451");
    var steps = []; for (var k = 0; k <= 12; k++) steps.push("190 " + (-30 + k * 11));
    h += '<g><animateTransform attributeName="transform" type="translate" values="' + steps.join(";") + '" calcMode="discrete" dur="3.9s" repeatCount="indefinite"/>' + piece + "</g>";
    D.tombent = S('<defs><pattern id="tgrid" width="11" height="11" patternUnits="userSpaceOnUse" x="58"><rect width="11" height="11" fill="none" stroke="rgba(255,255,255,.06)"/></pattern></defs><rect x="58" y="0" width="220" height="200" fill="url(#tgrid)"/><path d="M57 0v200" stroke="rgba(255,255,255,.2)" stroke-width="2"/>' + h);
  })();

  /* PRESTIGE — Porteur de lumière (boss ultime vaincu) : la ville se rallume */
  (function () {
    var city = "", win = "", xs = [[0,70,36],[36,40,48],[76,95,30],[106,60,42],[148,110,26],[174,75,40],[214,50,34],[248,90,32]];
    xs.forEach(function (b, i) { city += '<rect x="' + b[0] + '" y="' + (200 - b[1]) + '" width="' + b[2] + '" height="' + b[1] + '" fill="#1A2350" stroke="#2E3A78" stroke-width="1"/>';
      for (var r = 0; r < Math.floor(b[1] / 14); r++) for (var c = 0; c < Math.floor(b[2] / 10); c++) { var d = ((i * 7 + r * 3 + c * 5) % 23) / 10;
        win += '<rect x="' + (b[0] + 3 + c * 10) + '" y="' + (200 - b[1] + 6 + r * 14) + '" width="5" height="6" fill="#FFD36B" opacity="0"><animate attributeName="opacity" values=".15;.15;1;1;.15" keyTimes="0;.3;.4;.9;1" dur="6s" begin="' + d + 's" repeatCount="indefinite"/></rect>'; } });
    var cols = ["#6E88FF", "#FF3D6E", "#4CC37A", "#B98CFF", "#3FE0C5", "#7CC596"], ring = "";
    cols.forEach(function (c, i) { var a0 = i * 60 * Math.PI / 180, a1 = (i * 60 + 50) * Math.PI / 180, R = 34;
      ring += '<path d="M' + (R * Math.cos(a0)).toFixed(1) + " " + (R * Math.sin(a0)).toFixed(1) + "A" + R + " " + R + " 0 0 1 " + (R * Math.cos(a1)).toFixed(1) + " " + (R * Math.sin(a1)).toFixed(1) + '" stroke="' + c + '" stroke-width="5" fill="none" stroke-linecap="round"/>'; });
    var rays = ""; for (var k = 0; k < 12; k++) rays += '<path d="M0 0L' + (140 * Math.cos(k * Math.PI / 6)).toFixed(0) + " " + (140 * Math.sin(k * Math.PI / 6)).toFixed(0) + '" stroke="url(#plr)" stroke-width="10"/>';
    D.lumiere = S('<defs><linearGradient id="plr" x1="0" x2="1"><stop offset="0" stop-color="#FFF3C2" stop-opacity=".5"/><stop offset="1" stop-color="#FFF3C2" stop-opacity="0"/></linearGradient><radialGradient id="plo"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".4" stop-color="#FFE38A"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient></defs>' +
      '<g transform="translate(225 62)"><g opacity=".6"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="30s" repeatCount="indefinite"/>' + rays + '</g><g><animateTransform attributeName="transform" type="rotate" values="0;-360" dur="14s" repeatCount="indefinite"/>' + ring + '</g><circle r="26" fill="url(#plo)"><animate attributeName="r" values="22;28;22" dur="3s" repeatCount="indefinite"/></circle></g>' + city + win);
  })();

  /* PRESTIGE — Poste de commandement (Super admin) */
  (function () {
    var bars = ""; for (var i = 0; i < 8; i++) bars += '<rect x="' + (150 + i * 14) + '" y="150" width="8" height="40" fill="#E0661B" opacity=".55"><animate attributeName="height" values="' + (10 + i * 5 % 30) + ";" + (38 - i * 3) + ";" + (14 + i * 4) + '" dur="' + (1 + i % 3 * .3).toFixed(1) + 's" repeatCount="indefinite"/><animate attributeName="y" values="' + (190 - (10 + i * 5 % 30)) + ";" + (190 - (38 - i * 3)) + ";" + (190 - (14 + i * 4)) + '" dur="' + (1 + i % 3 * .3).toFixed(1) + 's" repeatCount="indefinite"/></rect>';
    D.commandement = S('<defs><linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF8A3C" stop-opacity="0"/><stop offset="1" stop-color="#FF8A3C" stop-opacity=".55"/></linearGradient><pattern id="cgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,138,60,.12)"/></pattern></defs><rect width="280" height="200" fill="url(#cgrid)"/>' +
      '<g transform="translate(222 70)"><circle r="52" fill="none" stroke="rgba(255,138,60,.35)"/><circle r="34" fill="none" stroke="rgba(255,138,60,.3)"/><circle r="16" fill="none" stroke="rgba(255,138,60,.3)"/><path d="M-52 0H52M0-52V52" stroke="rgba(255,138,60,.2)"/>' +
      '<path d="M0 0L52 0A52 52 0 0 0 36.8 -36.8z" fill="url(#sweep)"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="4s" repeatCount="indefinite"/></path>' +
      '<g><animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur="2s" repeatCount="indefinite"/><path d="M0-24l20 8v12c0 13-9 22-20 27-11-5-20-14-20-27v-12z" fill="#1A0C04" stroke="#FF8A3C" stroke-width="2.5"/><path d="M-8 2l6 6 11-12" fill="none" stroke="#FFD0A8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<circle cx="30" cy="-20" r="3" fill="#FFD0A8"><animate attributeName="opacity" values="0;1;0" dur="4s" begin="1s" repeatCount="indefinite"/></circle><circle cx="-24" cy="30" r="3" fill="#FFD0A8"><animate attributeName="opacity" values="0;1;0" dur="4s" begin="3s" repeatCount="indefinite"/></circle></g>' + bars);
  })();

  /* PRESTIGE — Couronne du QG (Super directeur technique) */
  (function () {
    var rays = ""; for (var k = 0; k < 18; k++) rays += '<path d="M0 0L' + (160 * Math.cos(k * Math.PI / 9)).toFixed(0) + " " + (160 * Math.sin(k * Math.PI / 9)).toFixed(0) + " L" + (160 * Math.cos(k * Math.PI / 9 + .09)).toFixed(0) + " " + (160 * Math.sin(k * Math.PI / 9 + .09)).toFixed(0) + 'z" fill="#F5C451" opacity=".16"/>';
    var sp = ""; [[160,30],[260,20],[190,120],[250,160],[140,90],[270,100]].forEach(function (p, i) { sp += '<path d="M' + p[0] + " " + (p[1] - 6) + "L" + (p[0] + 1.6) + " " + (p[1] - 1.6) + "L" + (p[0] + 6) + " " + p[1] + "L" + (p[0] + 1.6) + " " + (p[1] + 1.6) + "L" + p[0] + " " + (p[1] + 6) + "L" + (p[0] - 1.6) + " " + (p[1] + 1.6) + "L" + (p[0] - 6) + " " + p[1] + "L" + (p[0] - 1.6) + " " + (p[1] - 1.6) + 'z" fill="#FFF3C2"><animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="' + (i * .37).toFixed(2) + 's" repeatCount="indefinite"/></path>'; });
    D.couronne = S('<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".5" stop-color="#F5C451"/><stop offset="1" stop-color="#B8860B"/></linearGradient></defs>' +
      '<g transform="translate(215 78)"><g><animateTransform attributeName="transform" type="rotate" values="0;360" dur="40s" repeatCount="indefinite"/>' + rays + '</g>' +
      '<g transform="translate(0 4)"><path d="M-34 14L-40-18-18 0 0-28 18 0 40-18 34 14z" fill="url(#gold)" stroke="#7A5A08" stroke-width="2" stroke-linejoin="round"/><rect x="-35" y="14" width="70" height="10" rx="3" fill="url(#gold)" stroke="#7A5A08" stroke-width="2"/>' +
      '<circle cx="0" cy="-30" r="4" fill="#FF3D6E"/><circle cx="-40" cy="-20" r="3.5" fill="#6E88FF"/><circle cx="40" cy="-20" r="3.5" fill="#4CC37A"/><path d="M3-10l-8 12h6l-3 10 9-13h-6l3-9z" fill="#3651F5"/></g></g>' +
      '<g fill="none" stroke="#F5C451" stroke-width="1.5" opacity=".6"><path d="M4 30V10a6 6 0 0 1 6-6h20M4 18c8 0 10-4 10-10"/><path d="M276 170v20a6 6 0 0 1-6 6h-20M276 182c-8 0-10 4-10 10"/></g>' + sp);
  })();

  /* PRESTIGE — Flamme de la Légende (Légende absolue) */
  (function () {
    var fl = "", em = "";
    [[190,1.1,"#FF3D6E"],[225,1.4,"#FF7A1A"],[255,1,"#FF3D6E"],[208,.8,"#FFB347"],[240,.9,"#FFD36B"]].forEach(function (f, i) {
      fl += '<path d="M' + f[0] + ' 200c-22 0-26-26-14-44 4 12 10 12 10 2 0-14 8-26 18-34-4 18 14 26 12 50 8-6 8-14 6-20 12 14 10 46-16 46z" fill="' + f[2] + '" opacity=".75" transform-origin="' + (f[0] + 8) + ' 200" transform="scale(' + f[1] + ')"><animateTransform attributeName="transform" type="scale" values="' + f[1] + " " + f[1] + ";" + (f[1] * .92) + " " + (f[1] * 1.12) + ";" + f[1] + " " + f[1] + '" dur="' + (.9 + i * .15).toFixed(2) + 's" repeatCount="indefinite"/></path>'; });
    for (var i = 0; i < 10; i++) { var x = 160 + (i * 29 % 110), d = (i * .31).toFixed(2);
      em += '<circle cx="' + x + '" cy="190" r="' + (1.2 + i % 3 * .6) + '" fill="#FFD36B"><animate attributeName="cy" values="190;40" dur="' + (2.2 + i % 4 * .4).toFixed(1) + 's" begin="' + d + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="' + (2.2 + i % 4 * .4).toFixed(1) + 's" begin="' + d + 's" repeatCount="indefinite"/></circle>'; }
    D.flamme = S('<defs><radialGradient id="fgl" cx=".8" cy="1" r=".9"><stop offset="0" stop-color="#FF3D6E" stop-opacity=".55"/><stop offset="1" stop-color="#FF3D6E" stop-opacity="0"/></radialGradient></defs><rect width="280" height="200" fill="url(#fgl)"/>' + fl + em);
  })();


  /* Saut dans l'hyperespace (clin d'œil aux space operas) : les étoiles s'étirent en traînées */
  (function () {
    var h = "", cx = 200, cy = 90;
    for (var i = 0; i < 46; i++) { var a = i * 137.5 * Math.PI / 180, r0 = 8 + (i * 7 % 30), r1 = 160 + (i * 13 % 80), d = ((i * 0.13) % 1.2).toFixed(2), dur = (0.9 + (i % 5) * 0.18).toFixed(2);
      var x0 = (cx + r0 * Math.cos(a)).toFixed(1), y0 = (cy + r0 * Math.sin(a)).toFixed(1), x1 = (cx + r1 * Math.cos(a)).toFixed(1), y1 = (cy + r1 * Math.sin(a)).toFixed(1), c = i % 7 === 0 ? "#9FD4FF" : "#FFFFFF";
      h += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + c + '" stroke-width="' + (0.8 + i % 3 * 0.5) + '" stroke-linecap="round" stroke-dasharray="0 400"><animate attributeName="stroke-dasharray" values="0 400;40 400;0 400" dur="' + dur + 's" begin="' + d + 's" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" values="0;-' + (r1 - r0).toFixed(0) + '" dur="' + dur + 's" begin="' + d + 's" repeatCount="indefinite"/></line>'; }
    D.hyperespace = S('<defs><radialGradient id="hyc"><stop offset="0" stop-color="#E6F4FF"/><stop offset=".25" stop-color="#6FB8FF" stop-opacity=".6"/><stop offset="1" stop-color="#0A1640" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="70" fill="url(#hyc)"><animate attributeName="r" values="55;80;55" dur="2.4s" repeatCount="indefinite"/></circle>' + h +
      '<circle cx="60" cy="175" r="46" fill="#1B2A5A"/><path d="M14 175a46 46 0 0 1 92 0" fill="none" stroke="#6FB8FF" stroke-width="2" opacity=".6"/>');
  })();

  window.BG_DECO = D;
})();
