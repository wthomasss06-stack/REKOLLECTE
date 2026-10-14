# REKOLLECTE – patch cold start Render + connexion + SEO

Décompresser **à la racine du projet** (les chemins `backend/…` et `frontend/…` écrasent les fichiers existants). Aucune nouvelle dépendance, aucune migration (valable pour l'ensemble du patch, audit compris).

## 1. Serveur Render qui dort
- Le front sonde `/api/v1/health/` AVANT d'envoyer la moindre requête (attente max 3 min, backoff 1→5 s). Aucun refresh n'est lancé tant que le serveur dort : le cookie de refresh n'est plus perdu, donc plus de fausse « session expirée ».
- Squelettes à la place des spinners, relance automatique à la place des boutons « Réessayer », session mise en cache réaffichée immédiatement.
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
- Tests ajoutés : `test_hardening.py` (common, accounts, checkins, karnet) + `test_platform_admin_hardening.py`. Suite : 198 verts ; seul `test_document_ocr` échoue (dépend de la version de Tesseract, échoue aussi sur le code d'origine).
- Nouvelles variables d'environnement (toutes optionnelles) : `NUM_PROXIES`, `EXPOSE_API_DOCS` (Swagger/schéma masqués en prod), `DJANGO_ADMIN_URL`, `API_MAX_BODY_BYTES` (24 Mo). Détail dans `backend/.env.example`.
- `Dockerfile` : exécution hors root, 1 worker + 4 threads, `--timeout 90`, `PORT` par défaut.
- Check-list Render avant déploiement : `DEBUG=False`, `ALLOWED_HOSTS` explicite, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS`, `NUM_PROXIES=2` (Vercel + Render). Lancer `python scripts/verify_production.py`.
- À faire hors code : **faire tourner le secret API Cloudinary** et supprimer `frontend/hh` (secret en clair dans le dépôt).

## 5. Documents
- `ROADMAP.md` : état du projet, actions avant reprise, fonctionnalités à ajouter, consolidation.
- `AUDIT.md` : détail de l'audit (corrigé / à décider).
