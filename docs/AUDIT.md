# REKOLLECTE — Audit : ce qui est corrigé, ce qui reste à décider

## 🔴 À faire toi-même (hors code, urgent)
1. **Secret Cloudinary exposé** : un fichier `frontend/hh` contient le secret API en clair. Le supprimer du dépôt et de l'historique git, puis **régénérer le secret** dans la console Cloudinary (et mettre à jour Render/Vercel).
2. **Variables Render** à vérifier : `DEBUG=False`, `ALLOWED_HOSTS` explicite, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`. Sans `GOOGLE_CLIENT_ID` la connexion Google est maintenant refusée (avant : acceptée sans contrôle d'audience).
3. **`NUM_PROXIES=2`** (Vercel puis Render). Non défini, l'en-tête `X-Forwarded-For` est falsifiable : les limiteurs de débit (OTP, login admin, OCR) se contournent en changeant d'IP à chaque requête. Je ne l'ai pas forcé : une mauvaise valeur bloquerait tout le monde derrière la même IP.

## ✅ Corrigé (testé)
**Suivi du site et cookies (v4)**
- Suivi **uniquement avec accord** : sans choix ou avec refus, aucun cookie et aucune visite stockée (compteur anonyme accepté/refusé seulement). Cookies de première partie `httpOnly`, posés par le serveur, `SameSite=Lax`, `Secure` en production, limités au chemin `/api/v1/analytics/`.
- Pas d'adresse IP, pas de paramètres d'URL, referrer réduit au domaine, robots exclus, actions limitées à une liste fermée, débit limité (120/min) ; `/dashboard`, `/admin`, `/v/…` jamais suivis (côté navigateur **et** re-vérifié côté serveur).
- Droit à l'oubli : refuser ou retirer l'accord efface le visiteur ; conservation 395 jours (purge automatique + `purge_analytics`). **Texte légal à faire relire.**
**Visiteur / hors-ligne (QR)**
- Faux « QR invalide » / « Pas encore configuré » quand Render dort → écran d'attente + réveil automatique + cache.
- File hors-ligne bloquée en « syncing » (onglet fermé en plein envoi) ; « Réessayer » ne renvoyait pas les fiches en échec ; aucun renvoi automatique pendant le sommeil du serveur.
- Les pages publiques utilisaient `NEXT_PUBLIC_API_URL` (repli `localhost`) au lieu du proxy same-origin.
- Données personnelles (réponses, signature) restaient dans IndexedDB après synchronisation → effacées, purge à 7 jours.
- Sonde de santé : un 401/429 ou une page HTML d'attente passait pour « serveur réveillé ».
- Lots d'envoi limités par poids (photos de pièces d'identité) pour rester sous le plafond serveur.

**Profil / alertes (nouveau)**
- `PATCH /auth/me/` : la photo n'accepte que `https://` (pas de `javascript:` ni `data:`), 1000 car. max ; nom nettoyé ; rôle, établissement et `is_visit_host` ne sont pas modifiables par ce point d'entrée (testé).
- `GET /checkins/alerts/` : limité à l'établissement de l'utilisateur ; un membre simple ne voit que les visites où on le demande ; la réponse ne contient jamais la fiche complète (pièce d'identité, signature, téléphone) ; fenêtre de 24 h, 20 éléments max.
- `PATCH /auth/team/members/<id>/visit-host/` : patron uniquement, même établissement, journalisé (`member.visit_host_updated`).

**Authentification**
- Google : audience non vérifiée si `GOOGLE_CLIENT_ID` absent (fail-open) → fail-closed.
- Invitation révoquée qui bloquait une nouvelle invitation ; lien d'invitation pointait vers l'hôte API.
- Chaque refresh écrivait un `auth.login` dans le journal et la table `RefreshSession` grossissait sans limite.
- Admin plateforme : reconnexion forcée toutes les 10 min ; 500 sur un mot de passe non-ASCII ; limiteur dédié (10/min).

**API / données**
- Synchronisation publique : plantage sur éléments non-dict, aucune limite de taille, dates futures, fuite de `client_id` d'un autre établissement via la clé d'idempotence, choix du formulaire aléatoire sans formulaire par défaut.
- Export CSV : injection de formules (`=`, `@`, `+cmd`…), colonnes dupliquées, pas de BOM (accents illisibles sous Excel), images brutes dans les cellules.
- Filtres invalides (dates, UUID) → 500 ; nom de point d'accueil en double → 500 ; suppression d'un formulaire supprimait en cascade les QR imprimés.
- Karnet : quantité/montant/date hors bornes → 500 ; double réservation concurrente (verrou `select_for_update`) ; suppression d'un établissement avec réservations → 500 (`PROTECT`).
- Plafond de taille de requête (24 Mo), identifiant de requête assaini, Swagger/schéma/admin Django masquables, connexions Neon inactives (`conn_health_checks`), CSP sans jsdelivr.
- Docker : exécution hors root, 1 worker + 4 threads (512 Mo / 0,1 CPU), `--timeout 90`.

## 🟠 À décider (non modifié)
- **Suppression d'un établissement** : aucune confirmation par saisie du nom côté API.
- **Invitations sans expiration** : ajouter une durée de vie (ex. 7 jours) — nécessite une migration.
- **Cookie de refresh** `SameSite=None` en prod : avec le proxy same-origin `/api/v1`, `Lax` suffirait et réduirait le risque CSRF.
- **Cloudinary** : restreindre les uploads signés (dossier, taille, formats).
- **`FACEBOOK_EMAIL_TRUSTED`** vaut `true` par défaut : un e-mail Facebook non vérifié permettrait une prise de compte par e-mail.
- **Listes Karnet non paginées** et **`CheckInStatsView`** qui charge tous les check-ins en mémoire : passer à des agrégats SQL + cache avant d'avoir beaucoup de données.
- **CSP** : `'unsafe-inline'` reste pour les scripts ; viser une CSP à nonce à terme.
- **Dépendances en retard** : Django 5.0.6 (fin de support), requests 2.32.3, Pillow 10.4.0, gunicorn 22.0.0, simplejwt 5.3.1. À monter par paliers avec la suite de tests (non appliqué ici).
- Chemin de l'admin Django (`DJANGO_ADMIN_URL`) à changer en prod ; fichiers parasites à la racine du dépôt à nettoyer.
- `test_document_ocr` dépend de la version de Tesseract (lit « KOUASS ») : fragile en CI.
