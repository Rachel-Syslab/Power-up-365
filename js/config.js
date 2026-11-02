/* Réglages du site — à personnaliser.
   feedbackEmail   : adresse qui reçoit les messages de la « Boîte à idées » (ouvre la messagerie de l'utilisateur).
                     ATTENTION : cette adresse sera lisible par tout le monde dans le code du site, et l'expéditeur n'est pas anonyme
                     (son adresse apparaît). Pour des retours anonymes, préférer feedbackFormUrl (formulaire sans connexion).
   feedbackEmailB64: même chose que feedbackEmail, mais encodée en base64 (btoa) : les robots qui collectent les adresses ne la voient pas en clair.
                     Elle reste visible pour un humain qui lit le code ou ouvre sa messagerie.
   feedbackFormUrl : (facultatif) lien d'un formulaire ; s'il est rempli, un bouton « Répondre via le formulaire » apparaît.
   reportFormUrl   : (facultatif) lien du formulaire « Signaler une question » (Tally, Framaforms…). Le site ajoute
                     l'identifiant de la question dans l'adresse : ?question=xxxx (nom réglable avec reportFormParam).
                     Dans le formulaire, crée un champ caché (« hidden field ») portant ce même nom.
   analyticsUrl    : (facultatif, onglet Stats en local) lien vers ton tableau Cloudflare Web Analytics. */
window.POWERUP_CONFIG = {
  feedbackEmail: "",
  feedbackEmailB64: "", /* adresse e-mail désactivée : seuls les retours par formulaire anonyme sont proposés (pour la réactiver : y remettre l'adresse encodée en base64) */
  feedbackFormUrl: "https://tally.so/r/xVXAAG",
  feedbackEmbed: true, /* true = le formulaire s'affiche dans la fenêtre (à tester en local). EN LIGNE : ajouter « frame-src https://tally.so » dans _headers, sinon mettre false. */
  reportFormUrl: "",
  reportFormParam: "question",
  analyticsUrl: ""
};
