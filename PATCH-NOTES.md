# REKOLLECTE – patch cold start Render + connexion + SEO

Décompresser **à la racine du projet** (les chemins `backend/…` et `frontend/…` écrasent les fichiers existants). Aucune nouvelle dépendance, aucune migration.

## 1. Serveur Render qui dort
- Le front sonde `/api/v1/health/` AVANT d'envoyer la moindre requête (attente max 3 min, backoff 1→5 s). Aucun refresh n'est lancé tant que le serveur dort : le cookie de refresh n'est plus perdu, donc plus de fausse « session expirée ».
- Squelettes à la place des spinners, relance automatique à la place des boutons « Réessayer », session mise en cache réaffichée immédiatement.
- Les GET sont rejoués tout seuls après le réveil ; les mutations ne le sont que sur une erreur de passerelle (502/503/504).
- Garde-fou conseillé : un ping externe (UptimeRobot / cron-job.org) sur `https://<ton-render>/api/v1/health/` toutes les 10 min empêche l'endormissement.

## 2. Page de connexion
- Nouvelle mise en page (colonne marque, bouton Google avec squelette et largeur adaptée, Facebook/Apple anti double-clic, messages dismissibles, URL nettoyée de `?auth_error=` et `#_=_`).
- Backend OAuth : un retour Facebook/Apple rejoué (double tap) reprend l'issue du premier au lieu d'échouer en `provider` ; la cause réelle d'un échec est loguée (`qr_register.oauth`) sans secret. 4 tests ajoutés (25 verts dans `test_oauth_flow.py`).
- Note : le cache de rejeu est le cache Django par défaut (mémoire du process). Avec plusieurs workers gunicorn il est best-effort.

## 3. SEO
- 1 mot-clé = 1 intention = 1 page : accueil (marque + « logiciel de gestion des visiteurs par QR Code »), `/logiciel-gestion-visiteurs`, `/gestion-visiteurs-qr-code`, `/guide/registre-visiteurs-numerique` (« registre numérique des visiteurs »).
- Chaque page : H1 unique, réponse directe en tête, tableau comparatif, FAQ, JSON-LD (WebPage/Article + BreadcrumbList + FAQPage), maillage interne, titre ≤ 60 car., description ≤ 160 car.
- Sitemap (lastmod honnêtes), pied de page, section « Pour aller plus loin » sur l'accueil, `llms.txt` / `llms-full.txt` mis à jour. Les pages légales restent en noindex.
- Après déploiement : soumettre le sitemap dans Search Console et demander l'indexation des 3 pages.
