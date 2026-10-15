# REKOLLECTE – patch cold start Render + connexion + SEO + espace connecté + alerte à l'hôte

Décompresser **à la racine du projet** (les chemins `backend/…` et `frontend/…` écrasent les fichiers existants). Aucune nouvelle dépendance. **2 migrations à appliquer** (alerte à l'hôte, section 6) : `python manage.py migrate` (accounts `0009`, checkins `0005`) — elles ne font qu'ajouter une colonne et un index, rien n'est réécrit.

**Fichiers obsolètes à supprimer** (un zip ne supprime rien) — **obligatoire**, sinon le build échoue : lancer `sh supprimer-fichiers-obsoletes.sh` (ou `supprimer-fichiers-obsoletes.ps1` sous Windows PowerShell) à la racine, une seule fois. Liste :
- `frontend/src/components/dashboard/MobileNav.tsx`, `frontend/src/components/ServerWakeBanner.tsx`, `frontend/src/components/ui/Skeleton.tsx`, `frontend/src/hooks/useServerWake.ts`
- `frontend/src/app/dashboard/parametres/` : `layout.tsx`, `entreprise/`, `connexion/`, `administration/`, `equipe/`, `formulaire/`, `qr-code/` (seul `page.tsx` reste)
- `frontend/src/app/dashboard/` : `qr-code/`, `equipe/`, `formulaire/`
- `frontend/src/app/dashboard/karnet/` : `page.tsx`, `ressources/`, `reservations/`, `paiements/`, `rappels/`, `visiteurs/` (restent : `layout.tsx` et `clients/[id]/`)
Les anciennes adresses ne cassent pas : `next.config.mjs` les redirige vers les nouvelles (favoris, liens e-mail, retours OAuth `?auth_error=`).

## 1. Serveur Render qui dort
- Le front sonde `/api/v1/health/` AVANT d'envoyer la moindre requête (attente max 3 min, backoff 1→5 s). Aucun refresh n'est lancé tant que le serveur dort : le cookie de refresh n'est plus perdu, donc plus de fausse « session expirée ».
- Chargement = le **loader REKOLLECTE** (plus de squelettes ni de message « le serveur se réveille » dans l'application), relance automatique silencieuse à la place des boutons « Réessayer », session mise en cache réaffichée immédiatement.
- Les GET sont rejoués tout seuls après le réveil ; les mutations ne le sont que sur une erreur de passerelle (502/503/504).
- Garde-fou conseillé : un ping externe (UptimeRobot / cron-job.org) sur `https://<ton-render>/api/v1/health/` toutes les 10 min empêche l'endormissement.

## 2. Page de connexion
- Nouvelle mise en page (colonne marque, **trois boutons au même gabarit** : le bouton Google visible est un bouton Facebook/Apple-like, et le vrai bouton Google (invisible, étiré à 48 px) reçoit le clic — le jeton vient toujours de Google, le serveur ne change pas ; squelette de chargement, Facebook/Apple anti double-clic, **plus aucun message « le serveur se réveille » sur la page** (seule la ligne « Connexion sécurisée… » reste), messages dismissibles, URL nettoyée de `?auth_error=` et `#_=_`).
- Backend OAuth : un retour Facebook/Apple rejoué (double tap) reprend l'issue du premier au lieu d'échouer en `provider` ; la cause réelle d'un échec est loguée (`qr_register.oauth`) sans secret. 4 tests ajoutés (25 verts dans `test_oauth_flow.py`).
- Note : le cache de rejeu est le cache Django par défaut (mémoire du process). Avec plusieurs workers gunicorn il est best-effort.

## 3. SEO
- 1 mot-clé = 1 intention = 1 page : accueil (marque + « logiciel de gestion des visiteurs par QR Code »), `/logiciel-gestion-visiteurs`, `/gestion-visiteurs-qr-code`, `/guide/registre-visiteurs-numerique` (« registre numérique des visiteurs »).
- Chaque page : H1 unique, réponse directe en tête, tableau comparatif, FAQ, JSON-LD (WebPage/Article + BreadcrumbList + FAQPage), maillage interne, titre ≤ 60 car., description ≤ 160 car.
- Sitemap (lastmod honnêtes), pied de page, section « Pour aller plus loin » sur l'accueil, `llms.txt` / `llms-full.txt` mis à jour. Les pages légales restent en noindex.
- Après déploiement : soumettre le sitemap dans Search Console et demander l'indexation des 3 pages.

## 4. Audit sécurité / robustesse (voir `AUDIT.md` pour le détail et les points à décider)
- Tests ajoutés : `test_hardening.py` (common, accounts, checkins, karnet) + `test_platform_admin_hardening.py`. Seul `test_document_ocr` échoue (dépend de la version de Tesseract, échoue aussi sur le code d'origine).
- Nouvelles variables d'environnement (toutes optionnelles) : `NUM_PROXIES`, `EXPOSE_API_DOCS` (Swagger/schéma masqués en prod), `DJANGO_ADMIN_URL`, `API_MAX_BODY_BYTES` (24 Mo). Détail dans `backend/.env.example`.
- `Dockerfile` : exécution hors root, 1 worker + 4 threads, `--timeout 90`, `PORT` par défaut.
- Check-list Render avant déploiement : `DEBUG=False`, `ALLOWED_HOSTS` explicite, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS`, `NUM_PROXIES=2` (Vercel + Render). Lancer `python scripts/verify_production.py`.
- À faire hors code : **faire tourner le secret API Cloudinary** et supprimer `frontend/hh` (secret en clair dans le dépôt).

## 5. Espace connecté refait (modèle E-Carnet)
- **En-tête** : logo + `REKOLLECTE` (Niveau 1) ou `REKOLLECTE+` (Niveau 2) à gauche ; profil à droite. Sur téléphone, le thème clair/sombre et la déconnexion sont dans le menu du profil ; sur ordinateur ils restent en bas de la barre latérale.
- **4 liens** (barre latérale / barre du bas) : **Visiteurs** (ex-Clients/Registre), **Mode Staff**, **Paramètres**, **REKOLLECTE** — le 4ᵉ lien garde la même place au Niveau 2 et devient **REKOLLECTE+** : l'activation ne déplace rien pour l'utilisateur.
- **Paramètres** : Moi (nom, prénom/nom, photo — `PATCH /auth/me/`, photo en `https://` uniquement), Entreprise, Équipe, Connexion, Administration, Votre avis. **REKOLLECTE** : Formulaire, QR codes ; au Niveau 2 s'ajoutent Clients, Ressources, Réservations, Paiements, Rappels, Audit.
- **Plus d'onglets** : des lignes (icône, titre, description, chevron) qui ouvrent une fenêtre (feuille qui monte du bas sur téléphone). L'URL `?open=<ligne>` ouvre une fenêtre directement.
- Le **bouton d'avis flottant** ne s'affiche plus dans l'application (ligne « Votre avis » dans Paramètres) ; il reste sur le site public.
- Page **Crédits** : titre lisible sur le bandeau vert (la règle `.prose-legal` ne s'applique plus aux sections `not-prose`).
- Décision à valider : **Équipe** reste dans Paramètres (ta liste ne la citait pas).

## 6. Alerte à l'hôte (fonctionnalité #1)
- **Formulaire** : nouveau type de champ « Qui venez-vous voir ? » (constructeur de formulaire). Côté visiteur c'est une liste des personnes cochées « Peut être visité·e » ; si personne n'est coché, le champ est masqué et n'apparaît pas.
- **Équipe → Personnes à prévenir** : le patron coche les membres visitables (journalisé dans l'audit). Les gérants voient la liste en lecture seule.
- **Qui est prévenu** : la personne demandée ; sans réponse (le champ est facultatif, ou le nom a été retiré depuis), le **patron et les gérants**.
- **Cloche dans l'en-tête** : pastille rouge, notification, carillon (activable dans le panneau ; bouton de réactivation honnête si le navigateur bloque le son), compteur dans le titre de l'onglet. Pas de WhatsApp/e-mail : choix « tableau de bord seulement ». La cloche est cachée pour un staff non visitable (patron et gérants l'ont toujours).
- **API** : `GET /checkins/alerts/?since=<curseur>` (curseur d'horloge serveur, 24 h max, 20 arrivées max, aucune donnée sensible : ni pièce d'identité, ni téléphone, ni signature) et `PATCH /auth/team/members/<id>/visit-host/` (patron uniquement). Sondage toutes les 8 s tant que l'application est ouverte — l'onglet reste donc réveillé côté Render.
- **Limite connue** : l'alerte n'arrive que si l'application est ouverte dans un onglet (pas de notification quand le navigateur est fermé) — c'est ce que permettrait un envoi WhatsApp/e-mail plus tard.
- Tests : `test_visit_alerts.py` (19), `test_profile_update.py`. Suite backend : **224 verts** ; seul `test_document_ocr` échoue (inchangé).

## 7. Documents
- `ROADMAP.md` : état du projet, actions avant reprise, fonctionnalités à ajouter, consolidation.
- `AUDIT.md` : détail de l'audit (corrigé / à décider).
