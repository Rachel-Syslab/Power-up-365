# Power Up

Site d'entraînement **gratuit et ludique** sur Microsoft 365, la cybersécurité, l'informatique, le développement, l'IA et le numérique responsable. Projet personnel né d'une idée : offrir aux équipes un outil de révision par le jeu. Conçu avant mon stage, dans le cadre de ma reconversion TSSR, il pourrait être proposé à l'entreprise qui m'accueille pour un usage interne.

**Site en ligne : https://powerup365.pages.dev**

## Pourquoi

On apprend plus facilement quand c'est un jeu. Power Up transforme la révision en quêtes, rangs, héros et boss, et chaque réponse est accompagnée d'une courte explication.

## Fonctionnalités

- **Entraînement** par thème et par niveau (Débutant, Confirmé, Expert, Légende), sans pression.
- **Mode classé** : plus la difficulté est haute, plus on gagne d'XP et plus une erreur coûte cher.
- **Missions boss** inspirées de situations réelles (phishing…).
- **Révision espacée** et mode « mes erreurs » ; page **Mes stats** personnelle (données gardées dans le navigateur).
- **Défis entre collègues** : mêmes questions pour tous, générées de façon déterministe, sans serveur.
- **Veille technologique** : alertes de sécurité et actualités.
- **Français et anglais**, **mode hors ligne** (service worker).
- Six formats de questions : choix unique, vrai/faux, réponses multiples, remise dans l'ordre, repérage d'indices, réponse à saisir.

## Choix techniques

- HTML, CSS et JavaScript simples : pas de framework, pas de serveur, pas de base de données.
- Progression enregistrée uniquement dans le navigateur (`localStorage`) : ni compte, ni cookies, ni pisteurs.
- Sécurité : en-têtes stricts dans `_headers` (Content Security Policy sans script en ligne, `frame-ancestors 'none'`…), polices et sons hébergés avec le site.
- Éco-conception : site léger, scripts et CSS minifiés à la construction.
- Intégration et déploiement continus : GitHub Actions construit le site (`outils/construire.py`, esbuild), lance des contrôles de sécurité puis publie sur Cloudflare Pages.

## Structure

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `css/` | Page et styles |
| `js/app.js` | Application (vues, modes de jeu, profil, stats) |
| `js/questions.js`, `js/banque/` | Piliers, thèmes et banque de questions |
| `js/i18n.js`, `js/i18n/` | Interface et questions en anglais |
| `js/boss.js`, `js/heroes.js` | Missions boss et héros |
| `outils/construire.py` | Construction du dossier `dist/` |
| `.github/workflows/deploiement.yml` | Déploiement automatique |
| `sw.js`, `manifest.webmanifest` | Mode hors ligne et installation |

## Lancer en local

Ouvre `index.html` dans un navigateur, ou lance un petit serveur (`python3 -m http.server`). Aucune installation n'est nécessaire.

## Ajouter des questions

Copie un bloc existant dans `js/banque/` (un fichier par thème) et modifie-le : le mode d'emploi des champs est en haut de `js/questions.js`.

## Signaler une erreur

Utilise le bouton « Signaler » dans le site, ou ouvre une *issue* sur ce dépôt.

## Licence

Tous droits réservés (voir `LICENSE`). Le code est visible pour présenter le projet ; merci de me demander avant de le réutiliser.
