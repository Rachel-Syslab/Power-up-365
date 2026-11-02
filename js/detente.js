/* Power Up — Espace détente : « Le tri du courrier ».
   Mini-jeu d'arcade : des mails défilent, tu dois repérer les phishings (← ou bouton) et laisser passer les vrais (→ ou bouton).
   Aucune dépendance : l'application passe sons, meilleur score et récompense dans opts (sfx, lite, best, target, onEnd, onClose).
   Les adresses et marques des mails sont fictives. */
(function () {
  "use strict";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function reduced() { try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }

  var MAILS = [
    /* ---- phishings ---- */
    { n: "Support Microsoft 365", a: "no-reply@m1crosoft-support.com", s: "Votre boîte mail est pleine : action requise sous 24 h", b: "Votre espace sera suspendu aujourd'hui. Cliquez pour libérer de l'espace.", l: ["Libérer mon espace", "http://m1crosoft-support.com/login"], p: 1, why: "Le domaine est truqué (« m1crosoft » avec un chiffre 1) et la pression du délai est un classique." },
    { n: "Philippe Durand (DG)", a: "pdurand.direction@outlook.com", s: "Urgent et confidentiel", b: "Je suis en réunion. Achète-moi 5 cartes cadeaux de 100 € et envoie-moi les codes. Ne préviens personne.", p: 1, why: "Arnaque au président : adresse personnelle, demande inhabituelle, secret et urgence." },
    { n: "Livraison Colis", a: "suivi@colis-express-livraison.net", s: "Votre colis n'a pas pu être livré", b: "Réglez 1,99 € de frais de douane pour reprogrammer la livraison.", l: ["Payer 1,99 €", "https://colis-express-livraison.net/pay"], p: 1, why: "Un petit montant sert à récupérer ta carte bancaire. Vérifie sur le site officiel du transporteur." },
    { n: "Service des impôts", a: "remboursement@impots-gouv-fr.info", s: "Vous avez droit à un remboursement de 312 €", b: "Saisissez vos coordonnées bancaires pour recevoir le virement.", l: ["Récupérer mon remboursement", "http://impots-gouv-fr.info/rembourse"], p: 1, why: "L'administration ne demande jamais tes coordonnées bancaires par mail, et ce domaine (.info) n'est pas le sien." },
    { n: "Alerte Sécurité", a: "security@banque-lumiere.help", s: "Connexion suspecte détectée sur votre compte", b: "Confirmez votre identité en saisissant votre mot de passe et le code reçu par SMS.", l: ["Confirmer mon identité", "https://banque-lumiere.help/verif"], p: 1, why: "Un vrai mail de sécurité ne te demande jamais ton mot de passe ni ton code SMS." },
    { n: "RH", a: "rh@votre-societe.co", s: "Nouveau planning des congés (à ouvrir)", b: "Veuillez consulter le document joint et activer les macros pour l'afficher.", f: "Planning_conges.xlsm", p: 1, why: "Un fichier .xlsm qui demande d'activer les macros est un grand classique pour installer un malware." },
    { n: "Admin Webmail", a: "admin@service-it-helpdesk.com", s: "Votre mot de passe expire dans 2 heures", b: "Cliquez ici pour conserver votre mot de passe actuel.", l: ["Conserver mon mot de passe", "http://service-it-helpdesk.com/pwd"], p: 1, why: "Ton service informatique écrit depuis son vrai domaine et ne te presse pas avec un compte à rebours." },
    { n: "Grand Concours", a: "gagnant@mega-lots.top", s: "Félicitations ! Vous avez gagné un smartphone", b: "Répondez à 3 questions pour recevoir votre lot gratuitement.", l: ["Réclamer mon lot", "http://mega-lots.top/gagne"], p: 1, why: "Tu n'as participé à aucun concours : le lot « gratuit » sert à collecter tes données." },
    { n: "Comptabilité", a: "compta@fournisseur-factures.ru", s: "Facture impayée n°48213 : dernier rappel", b: "Ouvrez la facture ci-jointe pour éviter des pénalités.", f: "facture_48213.zip", p: 1, why: "Une archive .zip inattendue et une menace de pénalités : n'ouvre rien, préviens le service informatique." },
    { n: "Messages en attente", a: "notification@teams-messages-pending.com", s: "3 messages non lus vous attendent", b: "Connectez-vous pour les lire.", l: ["Lire mes messages", "https://teams-messages-pending.com/signin"], p: 1, why: "Ce n'est pas le domaine de l'application. Ouvre-la directement plutôt que de suivre ce lien." },
    { n: "Stationnement", a: "contact@stationnement-paiement.com", s: "Amende de stationnement impayée", b: "Scannez le QR code pour régler 35 € avant majoration.", l: ["QR code · paiement de l'amende", "http://stationnement-paiement.com/pay"], p: 1, why: "Un QR code cache l'adresse du site. Une amende ne se règle pas par un lien reçu par mail." },
    { n: "Jean Dupont", a: "jean.dupont@entreprise-partenaire.com", s: "Re: Re: Contrat", b: "Voici notre nouveau RIB pour le prochain virement. Merci de l'utiliser dès aujourd'hui.", p: 1, why: "Un changement de RIB par mail est une fraude au fournisseur. Appelle ton contact avec un numéro que tu connais." },
    { n: "Stockage Cloud", a: "alerte@cloud-stockage-pro.com", s: "Votre espace est presque plein (98 %)", b: "Passez à l'offre premium pour 0,99 €, sans engagement.", l: ["Passer à l'offre premium", "http://cloud-stockage-pro.com/offre"], p: 1, why: "Alerte alarmiste et offre à prix dérisoire : c'est une collecte de carte bancaire." },
    { n: "Recrutement Express", a: "recrutement@job-rapide.work", s: "Gagnez 2 000 € par mois depuis chez vous", b: "Envoyez une copie de votre pièce d'identité et votre RIB pour commencer.", p: 1, why: "Aucun vrai recruteur ne demande pièce d'identité et RIB dès le premier mail." },
    /* ---- vrais mails ---- */
    { n: "Marie Lefort", a: "marie.lefort@entreprise.fr", s: "Compte rendu de la réunion de mardi", b: "Bonjour, voici le compte rendu validé. Dis-moi si j'ai oublié un point.", f: "CR_reunion.pdf", p: 0, why: "Collègue connue, adresse de l'entreprise, contexte attendu : tout est cohérent." },
    { n: "DSI", a: "dsi@entreprise.fr", s: "Maintenance planifiée samedi de 8 h à 10 h", b: "Les services seront indisponibles. Aucune action n'est requise de ta part.", p: 0, why: "Une simple information, sans demande d'action, depuis l'adresse interne habituelle." },
    { n: "Calendrier", a: "calendrier@entreprise.fr", s: "Invitation : point d'équipe jeudi à 10 h", b: "Salle B12 ou en visio. Réponds à l'invitation depuis ton agenda.", p: 0, why: "Invitation interne attendue, sans lien suspect." },
    { n: "Service Paie", a: "paie@entreprise.fr", s: "Ton bulletin de salaire est disponible", b: "Retrouve-le dans ton coffre-fort numérique habituel. Il n'y a pas de pièce jointe.", p: 0, why: "Pas de lien ni de pièce jointe : on te renvoie vers l'outil que tu connais déjà." },
    { n: "Lucas Bernard", a: "lucas.bernard@entreprise.fr", s: "Question sur le dossier client Martin", b: "As-tu 5 minutes cet après-midi pour qu'on en parle ?", p: 0, why: "Message simple d'un collègue, sans pression ni lien." },
    { n: "Cybermalveillance", a: "info@cybermalveillance.gouv.fr", s: "Alerte : campagne de phishing en cours", b: "Retrouvez nos conseils de prévention sur notre site officiel.", l: ["Conseils de prévention", "https://www.cybermalveillance.gouv.fr"], p: 0, why: "Domaine officiel exact (.gouv.fr) et lien cohérent avec l'expéditeur." },
    { n: "Support informatique", a: "helpdesk@entreprise.fr", s: "[Ticket n°2841] Ton problème d'imprimante est résolu", b: "Si le souci revient, réponds simplement à ce mail.", p: 0, why: "C'est la réponse à une demande que tu avais faite, depuis l'adresse du support." },
    { n: "Sophie Girard (RH)", a: "sophie.girard@entreprise.fr", s: "Bienvenue à Nathan, qui nous rejoint lundi", b: "Merci de lui réserver un bon accueil. Il sera dans l'open space B.", p: 0, why: "Annonce interne classique, sans demande suspecte." },
    { n: "Formation", a: "formation@entreprise.fr", s: "Ton inscription à la session sécurité est confirmée", b: "Rendez-vous le 12 novembre à 14 h, en salle de formation.", p: 0, why: "Tu t'étais inscrit·e, l'adresse est interne, il n'y a aucun lien." },
    { n: "Boutique en ligne", a: "commande@boutique-exemple.fr", s: "Votre commande n°7742 a été expédiée", b: "Vous l'avez passée hier. Le suivi est disponible depuis votre compte, sur notre site.", p: 0, why: "Commande réellement passée, et le mail te renvoie vers ton compte sans lien piégé." },
    { n: "Direction", a: "direction@entreprise.fr", s: "Résultats du trimestre : un mot du directeur", b: "Merci à toutes et tous pour votre travail. Les détails seront donnés en réunion générale vendredi.", p: 0, why: "Communication interne habituelle, depuis la bonne adresse, sans demande." },
    { n: "Ma banque", a: "contact@banque-exemple.fr", s: "Votre relevé mensuel est disponible", b: "Connectez-vous à votre espace client depuis l'application ou le site habituel.", p: 0, why: "Aucun lien ni demande de données : le mail te renvoie vers ton application habituelle." },
    { n: "Thomas Roux", a: "thomas.roux@entreprise.fr", s: "Photos du séminaire", b: "Voici le dossier partagé sur notre SharePoint interne.", l: ["Dossier séminaire", "https://entreprise.sharepoint.com/sites/equipe/seminaire"], p: 0, why: "Le lien pointe vers le SharePoint de l'entreprise (domaine attendu) et vient d'un collègue." },
    { n: "Sécurité du compte", a: "no-reply@entreprise.fr", s: "Ton mot de passe a été modifié", b: "Tu viens de le changer : tout est normal. Sinon, appelle le support par téléphone.", p: 0, why: "Tu as fait l'action toi-même, et le mail ne te demande aucun clic." },
    /* ---- niveau corsé : domaines imités, comptes internes piratés, vrais mails qui ressemblent à des pièges ---- */
    { d: 2, n: "Marie Lefort", a: "marie.lefort@entreprise.fr", r: "m.lefort.perso@gmail.com", s: "Re: Compte rendu : peux-tu me renvoyer le RIB ?", b: "Je suis en déplacement, réponds-moi directement sur ma boîte perso, c'est plus simple.", p: 1, why: "L'expéditeur semble interne, mais l'adresse de réponse est externe : compte usurpé ou piraté." },
    { d: 2, n: "Sécurité du compte", a: "securite@microsoft.com.compte-verif.net", s: "Activité inhabituelle sur votre compte", b: "Vérifiez vos connexions récentes.", l: ["Voir l'activité", "https://microsoft.com.compte-verif.net/activite"], p: 1, why: "Lis le domaine de droite à gauche : le vrai domaine est compte-verif.net. « microsoft.com » n'est qu'un sous-domaine décoratif." },
    { d: 2, n: "Service Paie", a: "paie@entreprlse.fr", s: "Mise à jour de votre RIB obligatoire", b: "Pour recevoir votre prochaine paie, confirmez vos coordonnées bancaires.", l: ["Mettre à jour mon RIB", "https://paie.entreprlse.fr/rib"], p: 1, why: "« entreprlse » : un L a pris la place du I. Le domaine est imité." },
    { d: 2, n: "Thomas Roux", a: "thomas.roux@entreprise.fr", s: "Document partagé avec vous : Budget 2027", b: "Thomas a partagé un fichier. Ouvrez-le avec vos identifiants professionnels.", l: ["Ouvrir le document", "https://entreprise.sharepoint.com.partage-securise.org/budget"], p: 1, why: "Compte interne piraté, mais le lien se termine par partage-securise.org : ce n'est pas ton vrai SharePoint." },
    { d: 2, n: "DSI", a: "dsi@entreprise.fr", s: "Installez le correctif de sécurité urgent", b: "Téléchargez l'outil joint et exécutez-le en administrateur.", f: "CorrectifSecurite.exe", p: 1, why: "La DSI ne diffuse pas de correctif en .exe par mail. Même avec la bonne adresse, elle peut être usurpée." },
    { d: 2, n: "Direction financière", a: "daf@entreprise.fr", s: "Virement urgent : fournisseur à régler aujourd'hui", b: "Merci de virer 18 400 € sur le compte indiqué en pièce jointe. Je suis injoignable jusqu'à ce soir.", f: "coordonnees.pdf", p: 1, why: "Urgence, indisponibilité et coordonnées bancaires en pièce jointe : fraude au président. Vérifie par téléphone." },
    { d: 2, n: "Abonnement Vidéo+", a: "facturation@videoplus-mail.com", s: "Votre paiement a été refusé", b: "Mettez à jour votre moyen de paiement pour ne pas perdre l'accès.", l: ["Mettre à jour mon paiement", "https://videoplus-mail.com.verification-paiement.fr"], p: 1, why: "Le vrai domaine est verification-paiement.fr, caché derrière un faux « videoplus-mail.com »." },
    { d: 2, n: "DSI", a: "dsi@entreprise.fr", s: "Ton mot de passe expire dans 3 jours", b: "Change-le depuis ton poste : Ctrl + Alt + Suppr, puis « Modifier un mot de passe ». Aucun lien dans ce mail.", p: 0, why: "Il y a de l'urgence, mais l'adresse est la bonne et rien ne te fait cliquer : on t'indique la procédure habituelle." },
    { d: 2, n: "Service sécurité", a: "securite@entreprise.fr", s: "[Sensibilisation] Simulation de phishing ce mois-ci", b: "Tu pourrais recevoir un faux mail d'entraînement. S'il te semble suspect, signale-le avec le bouton « Signaler ».", p: 0, why: "Annonce interne sans lien ni demande, qui te dit justement de signaler." },
    { d: 2, n: "Marie Lefort", a: "marie.lefort@entreprise.fr", s: "Document partagé : Budget 2027", b: "Je viens de te partager le fichier sur notre SharePoint, tu devrais le voir dans ton espace.", l: ["Ouvrir le document", "https://entreprise.sharepoint.com/sites/finance/budget2027"], p: 0, why: "L'adresse se termine bien par sharepoint.com juste après le nom de l'entreprise, et le fichier vient d'une collègue." },
    { d: 2, n: "Ma banque", a: "alerte@banque-exemple.fr", s: "Opération de 1 250 € sur votre compte", b: "Si vous ne reconnaissez pas cette opération, appelez le numéro au dos de votre carte. N'utilisez aucun lien.", p: 0, why: "Alerte qui ne demande aucun clic ni aucune donnée, et renvoie vers le numéro officiel." },
    { d: 2, n: "DSI", a: "dsi@entreprise.fr", s: "Correctif de sécurité déployé ce soir à 20 h", b: "Il s'installera automatiquement. Laisse ton poste allumé. Il n'y a rien à télécharger.", p: 0, why: "Même sujet que le faux correctif, mais ici tout est automatique et rien n'est à télécharger." },
    { d: 2, n: "Transporteur", a: "suivi@transporteur-exemple.fr", s: "Colis en attente : choisis ton créneau", b: "Tu as commandé un article ce matin. Choisis un créneau dans ton espace client.", l: ["Choisir un créneau", "https://www.transporteur-exemple.fr/suivi"], p: 0, why: "Domaine identique à l'expéditeur, commande réellement passée, aucune demande de paiement." },
    { d: 2, n: "Sophie Girard (RH)", a: "sophie.girard@entreprise.fr", s: "URGENT : valide ton planning avant 17 h", b: "Merci de valider ton planning dans l'outil RH habituel avant 17 h pour la paie.", p: 0, why: "C'est urgent, mais interne, sans lien, et on te renvoie vers l'outil que tu connais." }
  ];

  var open = false;
  function mail(opts) {
    if (open) return; open = true; opts = opts || {};
    var lite = !!opts.lite || reduced(), sfx = opts.sfx || function () { }, best = opts.best || 0, target = opts.target || 0;
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var el = document.createElement("div"); el.className = "dx dt"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Le tri du courrier");
    el.innerHTML = '<div class="dx-in dt-in"><button type="button" class="dx-x" aria-label="Fermer">✕</button><p class="dx-eye">Espace détente · Le tri du courrier</p><div class="dt-body"></div></div>';
    document.body.appendChild(el); document.body.style.overflow = "hidden";
    var root = el.querySelector(".dt-body"), dead = false, rafId = 0, st = null;
    function close() {
      if (dead) return; dead = true; cancelAnimationFrame(rafId); document.removeEventListener("keydown", onKey, true);
      el.classList.add("out");
      setTimeout(function () { el.remove(); document.body.style.overflow = prevOverflow; open = false; if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { } if (opts.onClose) opts.onClose(); }, 260);
    }
    el.querySelector(".dx-x").addEventListener("click", close);
    el.addEventListener("mousedown", function (e) { if (e.target === el) close(); });

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); if (st && st.phase === "play") answer(e.key === "ArrowLeft"); else if (st && st.phase === "fb") next(); return; }
      if ((e.key === "Enter" || e.key === " ") && st && st.phase === "fb" && document.activeElement && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); e.stopPropagation(); next(); return; }
      if (e.key === "Tab") { var f = el.querySelectorAll("button:not([disabled])"); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    }
    document.addEventListener("keydown", onKey, true);

    /* Tirage progressif : surtout des mails faciles au début, puis de plus en plus de pièges */
    function pick() {
      var hardP = st.ok < 3 ? 0.1 : st.ok < 8 ? 0.5 : 0.8, wantHard = Math.random() < hardP, pool = MAILS.filter(function (m) { return (m.d === 2) === wantHard && m !== st.cur && st.recent.indexOf(m) === -1; });
      if (!pool.length) pool = MAILS.filter(function (m) { return m !== st.cur; });
      var m = pool[(Math.random() * pool.length) | 0]; st.recent.push(m); if (st.recent.length > 8) st.recent.shift(); return m;
    }
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    /* ----- écran de départ ----- */
    function intro() {
      st = { phase: "intro" };
      root.innerHTML = '<h2 class="dt-h">Le tri du courrier</h2><p class="dt-p">Des mails arrivent un par un. Lis l\'expéditeur, <b>l\'adresse réelle</b> et le lien : est-ce un <b class="dt-bad">phishing</b> ou un <b class="dt-good">vrai mail</b> ?</p>' +
        '<ul class="dt-rules"><li><b>← ou bouton rouge</b> : phishing, à la corbeille.</li><li><b>→ ou bouton vert</b> : mail légitime, tu le laisses passer.</li><li>Enchaîne les bonnes réponses pour monter ton <b>combo</b> (jusqu\'à ×4). Tu as 3 vies, et le temps par mail diminue vite. Des pièges de plus en plus fins arrivent : domaines imités, comptes internes piratés… et de vrais mails qui ressemblent à des pièges.</li></ul>' +
        '<p class="dt-p dt-best">' + (best ? "Ton meilleur score : <b>" + best + "</b>" : "Aucun score pour l'instant") + (target ? " · Objectif pour Combo dans ce jeu : <b>" + target + "</b>" : "") + '</p><div class="dx-actions"><button type="button" class="dx-btn dx-go dt-start">Jouer</button><button type="button" class="dx-btn dt-quit">Fermer</button></div>';
      root.querySelector(".dt-start").addEventListener("click", start); root.querySelector(".dt-quit").addEventListener("click", close); root.querySelector(".dt-start").focus();
    }

    /* ----- partie ----- */
    function start() {
      st = { phase: "play", score: 0, lives: 3, combo: 0, maxCombo: 0, ok: 0, ko: 0, left: 90, recent: [], cur: null, t0: 0, cap: 14, missed: [], last: 0 };
      root.innerHTML = '<div class="dt-hud" aria-live="off"><span class="dt-sc">Score <b>0</b></span><span class="dt-combo" aria-hidden="true"></span><span class="dt-lives" aria-label="Vies restantes"></span><span class="dt-time">90 s</span></div>' +
        '<div class="dt-bar" aria-hidden="true"><i></i></div><div class="dt-stage"></div>' +
        '<div class="dt-btns"><button type="button" class="dx-btn dt-btn-bad">⚠ Phishing <kbd>←</kbd></button><button type="button" class="dx-btn dt-btn-good">✓ Légitime <kbd>→</kbd></button></div><p class="dx-msg" role="status" aria-live="polite"></p>';
      root.querySelector(".dt-btn-bad").addEventListener("click", function () { if (st.phase === "play") answer(true); });
      root.querySelector(".dt-btn-good").addEventListener("click", function () { if (st.phase === "play") answer(false); });
      sfx("open"); hud(); showMail(); st.last = performance.now(); rafId = requestAnimationFrame(tick);
    }
    function hud() {
      root.querySelector(".dt-sc b").textContent = st.score;
      var m = mult(); root.querySelector(".dt-combo").textContent = st.combo >= 3 ? "Combo ×" + m : "";
      root.querySelector(".dt-lives").textContent = new Array(st.lives + 1).join("♥") + new Array(3 - st.lives + 1).join("♡");
      root.querySelector(".dt-time").textContent = Math.max(0, Math.ceil(st.left)) + " s";
    }
    function mult() { return Math.min(4, 1 + Math.floor(st.combo / 3)); }
    function capNow() { return Math.max(8.2, 13 - st.ok * 0.22); } /* +5 s par mail pour avoir le temps de lire */
    function showMail() {
      var m = st.cur = pick(); st.t0 = 0; st.cap = capNow(); st.phase = "play";
      var h = '<article class="dt-mail' + (lite ? "" : " dt-in-anim") + '"><div class="dt-from"><span class="dt-av" aria-hidden="true">' + esc(m.n.charAt(0)) + '</span><div><b>' + esc(m.n) + '</b><code>&lt;' + esc(m.a) + '&gt;</code></div></div>' +
        (m.r ? '<p class="dt-reply"><i>Répondre à :</i> <code>' + esc(m.r) + '</code></p>' : '') + '<div class="dt-subj">' + esc(m.s) + '</div><p class="dt-text">' + esc(m.b) + "</p>" +
        (m.f ? '<p class="dt-att">📎 ' + esc(m.f) + "</p>" : "") +
        (m.l ? '<p class="dt-linkrow"><span class="dt-link">' + esc(m.l[0]) + '</span><span class="dt-url"><i>Adresse réelle du lien :</i> <code>' + esc(m.l[1]) + "</code></span></p>" : "") +
        '<div class="dt-fb" hidden></div></article>';
      root.querySelector(".dt-stage").innerHTML = h; root.querySelector(".dx-msg").textContent = "Mail de " + m.n + " : " + m.s;
    }
    function tick(now) {
      if (dead) return; var dt = Math.min(0.1, (now - st.last) / 1000); st.last = now;
      if (st.phase === "play") {
        st.t0 += dt; st.left -= dt;
        var f = Math.max(0, 1 - st.t0 / st.cap), bar = root.querySelector(".dt-bar i"); if (bar) { bar.style.transform = "scaleX(" + f + ")"; bar.className = f < 0.3 ? "low" : ""; }
        var tm = root.querySelector(".dt-time"); if (tm) tm.textContent = Math.max(0, Math.ceil(st.left)) + " s";
        if (st.left <= 0) { finish(); return; }
        if (st.t0 >= st.cap) { answer(null); }
      }
      rafId = requestAnimationFrame(tick);
    }
    function answer(sayPhish) {
      if (st.phase !== "play") return; var m = st.cur, good = sayPhish !== null && (!!sayPhish === !!m.p), gain = 0, card = root.querySelector(".dt-mail"), fb = root.querySelector(".dt-fb");
      st.phase = "fb";
      if (good) {
        gain = 100 * mult() + Math.round(50 * Math.max(0, 1 - st.t0 / st.cap)); st.score += gain; st.combo++; st.ok++; if (st.combo > st.maxCombo) st.maxCombo = st.combo;
        sfx("toggle"); card.classList.add("good"); fb.hidden = false; fb.innerHTML = '<b>+' + gain + (mult() > 1 ? " (combo ×" + mult() + ")" : "") + "</b> " + (m.p ? "Bien vu, c'était un phishing." : "Bien vu, c'était un vrai mail.");
        hud(); rafId = rafId; later(next, lite ? 650 : 750);
      } else {
        st.lives--; st.ko++; st.combo = 0; st.missed.push(m); sfx("shutdown"); card.classList.add("bad"); fb.hidden = false;
        fb.innerHTML = "<b>" + (sayPhish === null ? "Trop lent !" : (m.p ? "C'était un phishing." : "C'était un vrai mail.")) + "</b> " + esc(m.why) + '<button type="button" class="dx-btn dt-cont">Continuer</button>';
        hud(); var c = fb.querySelector(".dt-cont"); c.addEventListener("click", next); c.focus();
      }
    }
    var timer = 0;
    function later(fn, ms) { clearTimeout(timer); timer = setTimeout(function () { if (!dead) fn(); }, ms); }
    function next() {
      clearTimeout(timer); if (st.phase !== "fb") return;
      if (st.lives <= 0 || st.left <= 0) { finish(); return; }
      st.last = performance.now(); showMail();
    }
    function finish() {
      cancelAnimationFrame(rafId); st.phase = "end";
      var total = st.ok + st.ko, acc = total ? Math.round((st.ok / total) * 100) : 0, isBest = st.score > best, prev = best;
      if (isBest) best = st.score;
      var uniq = []; st.missed.forEach(function (m) { if (uniq.indexOf(m) === -1) uniq.push(m); });
      root.innerHTML = '<h2 class="dt-h">' + (st.lives <= 0 ? "Boîte débordée !" : "Temps écoulé !") + '</h2><p class="dt-score">' + st.score + '</p>' + (isBest ? '<p class="dt-new">✨ Nouveau meilleur score !</p>' : '<p class="dt-p dt-best">Meilleur score : <b>' + best + "</b></p>") +
        '<ul class="dt-stats"><li><b>' + st.ok + "</b> bonnes réponses</li><li><b>" + acc + " %</b> de réussite</li><li>combo max <b>×" + Math.min(4, 1 + Math.floor(st.maxCombo / 3)) + "</b> (" + st.maxCombo + " d'affilée)</li></ul>" +
        (target ? '<p class="dt-p">' + (best >= target ? "🎮 Objectif de ce jeu atteint ! Combo demande aussi les trois autres jeux de l'espace détente." : "Objectif pour Combo dans ce jeu : " + target + " points (il te manque " + (target - best) + ").") + "</p>" : "") +
        (uniq.length ? '<div class="dt-learn"><b>À retenir :</b><ul>' + uniq.slice(0, 4).map(function (m) { return "<li><i>" + esc(m.s) + "</i> : " + esc(m.why) + "</li>"; }).join("") + "</ul></div>" : '<p class="dt-p">Aucune erreur : tu as l\'œil de lynx.</p>') +
        '<div class="dx-actions"><button type="button" class="dx-btn dx-go dt-again">Rejouer</button><button type="button" class="dx-btn dt-quit">Fermer</button></div>';
      sfx(isBest ? "badge" : "open");
      root.querySelector(".dt-again").addEventListener("click", start); root.querySelector(".dt-quit").addEventListener("click", close); root.querySelector(".dt-again").focus();
      if (opts.onEnd) { try { opts.onEnd({ score: st.score, ok: st.ok, ko: st.ko, maxCombo: st.maxCombo, best: best, prev: prev }); } catch (e) { } }
    }
    intro();
  }

  window.PUDetente = { mail: mail, MAILS: MAILS };
})();
