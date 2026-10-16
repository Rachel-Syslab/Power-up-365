/* Réglages du site — à personnaliser.
   feedbackEmail   : adresse qui reçoit les messages de la « Boîte à idées » (ouvre la messagerie de l'utilisateur).
   feedbackFormUrl : (facultatif) lien d'un formulaire ; s'il est rempli, un bouton « Répondre via le formulaire » apparaît.
   reportFormUrl   : (facultatif) lien du formulaire « Signaler une question » (Tally, Framaforms…). Le site ajoute
                     l'identifiant de la question dans l'adresse : ?question=xxxx (nom réglable avec reportFormParam).
                     Dans le formulaire, crée un champ caché (« hidden field ») portant ce même nom.
   analyticsUrl    : (facultatif, onglet Stats en local) lien vers ton tableau Cloudflare Web Analytics. */
window.POWERUP_CONFIG = {
  feedbackEmail: "",
  feedbackFormUrl: "",
  reportFormUrl: "",
  reportFormParam: "question",
  analyticsUrl: ""
};
