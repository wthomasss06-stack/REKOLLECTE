# REKOLLECTE — Feuille de route

> Où en est le projet, ce qu'il reste à faire avant de reprendre, et ce qu'on peut ajouter ensuite.
> Le détail technique de l'audit est dans `AUDIT.md`.

## 1. État actuel

| Domaine | État |
|---|---|
| Serveur Render qui dort (cold start) | ✅ Géré : attente automatique, plus de fausse « session expirée » |
| Connexion (Google, Facebook, Apple) | ✅ Page refaite, trois boutons identiques, aucun message technique affiché |
| SEO (3 mots-clés, 1 page chacun) | ✅ En place — reste à soumettre le sitemap dans Search Console |
| Parcours visiteur hors-ligne | ✅ Corrigé et testé en navigateur (serveur endormi, envoi différé) |
| Sécurité / robustesse | ✅ Audit fait, failles sûres corrigées et testées |
| Déploiement | ⏳ 3 actions de ta part (section 2) |

## 2. Avant de reprendre — à faire de ton côté (≈ 30 min)

- [ ] **Secret Cloudinary** : supprimer `frontend/hh` du dépôt et de l'historique git, puis régénérer le secret API dans Cloudinary et mettre à jour Render / Vercel.
- [ ] **Variables Render** : `DEBUG=False`, `ALLOWED_HOSTS` explicite, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`.
- [ ] **`NUM_PROXIES=2`** (Vercel puis Render) : sans lui, les limiteurs de débit se contournent en falsifiant l'IP.
- [ ] Lancer `python scripts/verify_production.py` sur le serveur configuré.
- [ ] **Test réel après déploiement** : se connecter, scanner un QR et enregistrer une visite pendant que Render dort.
- [ ] Search Console : soumettre `sitemap.xml` et demander l'indexation des 3 pages SEO.
- [ ] (Conseillé) Ping externe (UptimeRobot / cron-job.org) sur `/api/v1/health/` toutes les 10 min pour limiter l'endormissement.

## 3. Fonctionnalités à ajouter

Classées par valeur pour le client (hôtel, PME, établissement à Abidjan). Effort : **S** = quelques heures, **M** = 1 à 3 jours, **L** = plus d'une semaine.

### Priorité haute

| # | Fonctionnalité | Pourquoi | Effort |
|---|---|---|---|
| 1 | **Alerte à l'hôte** (WhatsApp ou e-mail) quand un visiteur arrive | C'est ce qui donne de la valeur au produit : la personne attendue est prévenue tout de suite. Cible WhatsApp = marché ivoirien. | M |
| 2 | **Sortie du visiteur** (heure de départ, durée de présence) | Un registre sans sortie est incomplet pour la sécurité (qui est encore dans les locaux ?). | M |
| 3 | **Conservation des données** : suppression automatique après N mois + mention de consentement sur le formulaire | Tu stockes des pièces d'identité. Vérifie ce que la loi ivoirienne sur la protection des données personnelles (ARTCI) impose — à confirmer avec un juriste. | M |

### Priorité moyenne

| # | Fonctionnalité | Pourquoi | Effort |
|---|---|---|---|
| 4 | **Pré-enregistrement** : l'hôte envoie un lien ou un QR au visiteur attendu | Arrivée plus rapide, moins de saisie sur place. | M |
| 5 | **Rapport quotidien** (e-mail ou PDF des visites du jour) | Utile au patron sans ouvrir le tableau de bord. | S–M |
| 6 | **Suivi d'erreurs** (Sentry) | Être prévenu d'un problème avant le client. | S |
| 7 | **Facturation par Mobile Money** (Wave, Orange Money, MTN) et plans payants | Nécessaire pour monétiser. À ce moment-là, passer Render en offre payante supprime l'endormissement. | L |

### Plus tard

| # | Fonctionnalité | Pourquoi | Effort |
|---|---|---|---|
| 8 | Liste de vigilance (visiteurs à signaler) | Besoin des sites sensibles ; attention aux obligations légales. | M |
| 9 | Interface en anglais | Hôtels et clients internationaux. | M |
| 10 | Statistiques avancées (heures de pointe, durée moyenne) | Après la sortie du visiteur (#2). | M |

**Si une seule à garder pour la reprise : la #1.**

## 4. Consolidation technique (issue de l'audit)

À planifier, sans urgence mais avant d'avoir beaucoup de données ou de clients :

- **Statistiques** : le calcul charge tous les check-ins en mémoire → passer à des agrégats SQL + cache.
- **Listes Karnet** non paginées → ajouter la pagination.
- **Invitations sans expiration** → durée de vie (ex. 7 jours), nécessite une migration.
- **Suppression d'un établissement** → confirmation par saisie du nom.
- **Cookie de refresh** en `SameSite=None` → `Lax` suffit avec le proxy same-origin.
- **Cloudinary** : restreindre les envois signés (dossier, taille, formats).
- **`FACEBOOK_EMAIL_TRUSTED`** vaut `true` par défaut → à passer à `false` si l'e-mail Facebook n'est pas vérifié.
- **CSP** : remplacer `'unsafe-inline'` par une CSP à nonce.
- **Dépendances en retard** : Django 5.0.6 (fin de support), requests, Pillow, gunicorn, simplejwt → mise à jour par paliers avec la suite de tests.
- **Chemin de l'admin Django** : définir `DJANGO_ADMIN_URL` en production.
- **Test OCR** (`test_document_ocr`) dépend de la version de Tesseract → à rendre robuste.

## 5. Ordre conseillé à la reprise

1. Section 2 (déploiement propre et test réel).
2. Fonctionnalité #1 (alerte à l'hôte).
3. Fonctionnalité #3 (conservation des données) — avant d'avoir des clients payants.
4. Fonctionnalité #2 (sortie du visiteur).
5. Consolidation technique, au fil de l'eau.
