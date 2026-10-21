# REKOLLECTE – notes de patch

## Patch v7 — grille tarifaire publique et corrections mobile (21/10/2026), par-dessus le v6

Décompresser à la racine. Aucune migration. **Vérifié** : syntaxe TypeScript des fichiers modifiés (aucune erreur de syntaxe), contrôle exécutable du verrou de défilement (`node --experimental-strip-types frontend/scripts/scrollLock.check.mjs`). **Non testé** : `next build`, tests e2e (`frontend/e2e/tarifs.spec.ts`) et rendu sur appareil réel (dépendances absentes de l'archive) : lancer `npm ci && npm run build && npm run test:e2e` avant de déployer.

### Grille tarifaire et gratuité jusqu'au 1er décembre 2026
- Nouvelle section « Tarifs » sur la landing (`PricingSection.tsx`, ancre `#tarifs`, lien « Tarifs » dans le menu). **Pendant la période de lancement, tout est gratuit et libre : les prix payants sont barrés** avec « Usage libre jusqu'au 1er décembre 2026 », et les premiers utilisateurs sont invités à utiliser le bouton Feedback (ils sont les testeurs). Données dans `frontend/src/lib/pricing.ts` (une seule source : prix, date, notes). **Interrupteur du 1er décembre : `FREE_PERIOD_ACTIVE = false`**, puis republier (checklist dans `docs/PLANS_ET_ABONNEMENTS.md`).
- Les mentions « gratuit à ce jour » (description du site, FAQ, pages « À propos » et « Logiciel de gestion des visiteurs », CGU art. 6, JSON-LD `priceValidUntil`) suivent la même date. Nouvelle question « Combien coûte REKOLLECTE ? » dans la FAQ de la landing.
- **À faire valider par un juriste** : le texte de l'article 6 des CGU (tarification et résiliation).
- Rien n'est verrouillé : `PLAN_ENFORCEMENT_STARTS_AT` reste vide. Voir `docs/PLANS_ET_ABONNEMENTS.md` et `Brief_implementation_plans_Rekollecte.md`.

### Mobile
- **Paramètres et REKOLLECTE+ ne défilaient plus.** Cause : quatre fenêtres (réglages, dialogues, menu, bandeau cookies) mémorisaient chacune « l'overflow précédent » ; deux fenêtres fermées dans le désordre laissaient la page figée. Remplacé par un verrou partagé à compteur (`lib/scrollLock.ts`) et un filet de sécurité au changement de page (`dashboard/layout.tsx`).
- **QR visiteurs (mode Accueil)** : le QR était étiré (largeur réduite, hauteur fixe). Cadre carré (`aspect-square`), canvas à 100 % ; marges réduites sur téléphone pour agrandir le QR.
- **Éditeur de formulaire** : « Repartir d'un modèle » est pliable (replié quand le formulaire a déjà des champs). Un champ ajouté (ou un modèle appliqué) apparaît en vert avec le badge « Nouveau » et un message « pas encore enregistré », s'affiche à l'écran et prend le focus ; la couleur disparaît après « Enregistrer ».

## Patch v6 — plans, abonnements et conformité (20/10/2026), par-dessus le v5

Décompresser à la racine. **Migrations à jouer** : `python manage.py migrate` (accounts 0010, organizations 0005, billing 0001 et 0002). Détail : `docs/PLANS_ET_ABONNEMENTS.md` et `docs/CONSERVATION_DONNEES.md`.
**Aucune limite n'est appliquée par défaut** : tant que `PLAN_ENFORCEMENT_STARTS_AT` est vide, les plans fonctionnent en mode « observer » (ils journalisent ce qui serait bloqué, sans rien bloquer, et aucun cadenas ne s'affiche).
**Vérifié** : suite backend complète verte (hors le test OCR déjà en échec sur le zip d'origine), `tsc` propre, `next build` OK. **Non testé** : interface sur appareil réel, paiements réels.

### P0 — conformité (dossier ARTCI)
- Durées de conservation par catégorie, réglables ; purge automatique des visites (`purge_expired_visits` + purge au fil de l'eau), sans jamais toucher aux paiements.
- Export et suppression complets pour une personne (téléphone ou e-mail exacts). Fiche client anonymisée si des réservations y sont rattachées.
- Mention d'information complète sous le formulaire (responsable, finalité, catégories, destinataires, durée, droits, hébergement), mise en cache pour les tablettes hors ligne. **Textes à faire valider.**
- Option « motifs prédéfinis uniquement » (retire « Autre »). Numéro de pièce masqué par défaut ; texte OCR brut jamais conservé.
- Acceptation des conditions d'utilisation tracée sur chaque compte (version + date) : bandeau « J'accepte » dans le dashboard.

### P1 — moteur de plans (`backend/apps/billing`)
- Modèles `Subscription` et `Payment` ; droits et quotas dans un seul fichier (`plans.py`) ; plan effectif calculé à la lecture (essai 14 jours, délai de grâce 7 jours, fondateurs).
- Contrôles serveur : OCR (champ retiré du formulaire public + route refusée), téléphone, points d'accueil, formulaires, membres, export, fenêtre d'historique, REKOLLECTE+. Erreur toujours `{code: "plan_required", feature, required_plan}`.
- Jamais bloqués : la synchronisation des fiches et l'export de sortie (`?purpose=exit`).
- Comptes existants : statut « fondateur » (migration), limitation seulement après préavis écrit renseigné dans l'administration.

### P3/P4 — interface et encaissement
- Paramètres › **Abonnement** (plan, échéance, limites, reçus, export de sortie) et › **Données et confidentialité** (patron).
- Cadenas (`LockedFeature`, export du registre) et bandeaux d'essai, de retard et d'expiration : visibles seulement quand les plans s'appliquent.
- Administration › Entreprises › bouton carte : abonnement et **Enregistrer un paiement** (idempotent sur la référence ; « Reçu interne, non fiscal » sans référence FNE).

### Décisions laissées ouvertes
- Quotas de `plans.py` : hypothèses de départ. Le palier « ressources » n'est pas appliqué.
- Durées de conservation et textes de la mention d'information : à valider avec ton conseil.
- Acceptation des CGU : demandée par bandeau (pas dans l'onboarding). Le texte des CGU lui-même reste à finaliser.
- Pas d'agrégateur de paiement ni d'e-mails d'échéance automatiques (J-7, J-1) : encaissement et préavis manuels pour l'instant.

## Patch v5 — QA/UX (20/10/2026), par-dessus le v4

Décompresser **à la racine du projet**, puis lancer **une fois** `supprimer-fichiers-obsoletes.sh` (ou `.ps1`) : il retire `/dashboard/onboarding`, doublon exact de `/onboarding` (que tu gardes). **Aucune migration.**
**Vérifié** : 249 tests backend verts, `tsc` propre, `next build` OK (copie de vérification sans Google Fonts : le bac à sable n'y a pas accès). Un test échoue aussi sur le zip d'origine : `test_ocr_extracts_fields_from_synthetic_document` (dépend de la version de Tesseract installée). **Non testé sur un vrai appareil** : voir la recette en D.

### A. Bugs corrigés
- **Registre** (`CheckInsTable.tsx`, `lib/responseDisplay.ts`, `ClientHistoryPanel.tsx`) : une pièce scannée s'affichait « [object Object] » et une photo en base64 brut dans la cellule. Désormais « Photo fournie » ou les champs extraits de la pièce. La précision d'un choix « Autre » apparaît (registre, historique client, export CSV).
- **Liste du registre** (`checkins/serializers.py`) : elle n'envoie plus les photos ni les images et textes OCR bruts (plusieurs Mo par fiche, rechargés toutes les 30 s). Rien n'est supprimé en base. `select_related` : plus une requête SQL par ligne pour le nom du client.
- **Alarme des rappels** (`app/dashboard/layout.tsx`, `rekollecte/layout.tsx`, `karnet/layout.tsx`, `ReminderAlarm.tsx`) : le moteur de rappels est monté sur tout le dashboard dès que REKOLLECTE+ est actif, plus seulement sur la page REKOLLECTE+. Limite : « Mode formulaire » ouvre la page visiteur, hors dashboard, donc sans alarme.
- **« Actualiser les motifs »** (`VisitorForm.tsx`, `usePublicForm.ts`) : le bouton ne faisait rien. Il recharge le formulaire et répond « Liste à jour » ou « Hors ligne : la dernière liste connue est conservée ».
- **Motifs hors ligne** (`usePublicForm.ts`, `lib/db.ts`) : les motifs n'étaient pas mis en cache, une tablette hors ligne affichait une liste vide.
- **Kiosque sur tablette 7"** (`VisitorForm.tsx`, `useSubmitForm.ts`, `lib/device.ts`) : sous 640 px, `window.close()` ne faisait rien et la tablette restait bloquée sur « Merci ». Tablette détectée (écran ≥ 600 px ou appli installée) : remise à zéro après 4,5 s sans recharger la page, bouton « Enregistrer un autre visiteur », et la réponse tardive d'un envoi précédent ne peut plus rouvrir un « Merci » sur la saisie suivante.
- **Signature** (`SignaturePad.tsx`) : le canvas gardait sa taille HTML par défaut (300×150) étirée en CSS, donc le trait était décalé du doigt. Il est redimensionné à sa taille réelle ; les proportions sont conservées (avant : étiré en 500×180) ; la page ne défile plus pendant la signature.
- **Onboarding en double** : `dashboard/layout.tsx` ne le gère plus ; le dossier est supprimé par le script.

### B. UX visiteur
- Vouvoiement (formulaire, scanner de pièce, messages d'erreur).
- Mention sous le formulaire : « les informations servent uniquement à tenir le registre d'accès de… » + lien vers la confidentialité. **Texte à faire relire par un juriste.**
- Libellés reliés aux champs ; autocomplétion coupée sur tablette partagée (sinon le navigateur proposerait les coordonnées du visiteur précédent), activée sur téléphone.
- Champ manquant : défilement et focus sur le champ, message annoncé aux lecteurs d'écran. Une précision « Autre » n'est plus envoyée si le visiteur change de motif.
- Bandeau de synchronisation sans information interne (plus de nombre de fiches en attente ni d'heure de dernière synchro).
- Photo réduite (1280 px max, JPEG) avant la file hors-ligne. Zones tactiles de 44 px minimum.

### C. UX patron et staff
- **Registre** : recherche (nom, téléphone, motif, nom du client ; seulement le texte des champs, jamais les images) et période (Aujourd'hui, 7 jours, 30 jours). API : `GET /checkins/?q=…&from=AAAA-MM-JJ`.
- Moins de trafic : formulaire, établissement et profil chargés à l'ouverture et au retour sur l'onglet ; liste et statistiques toutes les 30 s seulement si l'onglet est visible (avant : 5 requêtes toutes les 30 s, même onglet masqué).
- Guide « Installer la tablette d'accueil » (page Accueil et dernière étape de l'onboarding) + bouton « Tester le formulaire visiteur ».
- Menu : « Accueil » pour tous les rôles (au lieu de « Mode Staff » pour patron/gérant) ; texte inactif de la barre mobile plus contrasté.

### D. Recette manuelle à faire (non testable ici)
1. Tablette 7" (600 px) : valider une fiche, retour au formulaire vierge après environ 4,5 s.
2. Signature au doigt sur téléphone et tablette : le trait suit le doigt, la page ne bouge pas.
3. Charger le formulaire en ligne, couper le réseau, recharger : les motifs sont présents. Modifier les motifs, cliquer « Actualiser les motifs ».
4. Agent resté sur « Accueil », créneau échu : bannière et sonnerie (après un premier toucher de l'écran, règle des navigateurs).
5. Registre : recherche par nom et par téléphone, filtres de période, photo et pièce lisibles.

### E. Décisions laissées ouvertes
- **Heure de sortie du visiteur** (« qui est encore là ? ») : non ajoutée (modèle + migration).
- Le tableau du registre n'affiche que les colonnes du formulaire par défaut : les fiches d'un autre formulaire ont des cellules « — ».
- La recherche est sensible aux accents (Kone ≠ Koné). L'export CSV complet ignore les filtres.

## Patch v4 (par-dessus le v3 que tu as déjà appliqué)

Décompresser **à la racine du projet** (les chemins `backend/…` et `frontend/…` écrasent les fichiers existants). **1 migration à appliquer** (nouvelle app `analytics`) : `python manage.py migrate` **avant** de déployer le front. Aucune dépendance ajoutée, aucun fichier à supprimer.

### A. Administration refaite (`app/admin/page.tsx`, `components/admin/*`)
- **Même navigation que l'app** : la barre latérale repliable sur ordinateur et la **barre ronde du bas sur téléphone** (Accueil · Trafic · Clients · Équipe · Retours · Journal). Le code est partagé (`components/dashboard/AppNav.tsx`, utilisé par `Sidebar.tsx` et par l'admin) : même repli mémorisé, mêmes états actifs, un seul endroit à maintenir.
- **Nouvel onglet « Trafic du site »** (voir B) et une **vue d'ensemble** qui montre les visites de la vitrine sur 7 jours + le nombre de personnes en ligne.
- **Entreprises / Personnel / Feedbacks / Journal** : recherche, filtres par statut ou rôle, cartes sur téléphone et tableaux sur ordinateur, états vides, pastille « nouveau » sur les retours à traiter. Tes confirmations existantes (supprimer, désactiver, changer de rôle/d'entreprise, renommer, déconnexion) sont conservées.
- L'onglet ouvert est dans l'adresse (`/admin#trafic`, `#feedbacks`…) ; le rechargement le retrouve. Une erreur du serveur s'affiche dans une bannière avec « Réessayer » au lieu de vider l'écran ; seule une vraie session expirée (401/403) ramène à la connexion.
- Écran de connexion admin : œil pour voir le mot de passe, message clair, logo → accueil du site. L'adresse d'un retour s'affiche **sans paramètres**.

### B. Cookies et suivi du site (`apps/analytics`, `components/privacy/*`, `lib/analytics.ts`)
- **Fenêtre cookies avec SVG animé** (le petit cookie), « Accepter » et « Refuser » à poids égal, « Personnaliser », lien vers la confidentialité ; « Gérer les cookies » en pied de page pour changer d'avis. Le choix est gardé 6 mois (`localStorage`, clé `rk_cookie_consent`).
- **Le suivi est branché sur ce choix** : sans accord, **aucun cookie, aucune visite enregistrée** (seul un compteur anonyme « accepté / refusé » est tenu, sans identifiant). Avec accord, le serveur Django pose deux cookies de première partie `httpOnly` : `rk_vid` (13 mois) et `rk_sid` (30 min glissantes). Aucune adresse IP stockée, robots filtrés, chemins sans paramètres, liste d'actions fermée (`cta_click`, `login_start`, `contact_click`), débit limité (120/min).
- **Jamais dans l'app connectée, l'admin ni le formulaire visiteur.** Refuser ou retirer son accord **efface** le visiteur (`/api/v1/analytics/forget/`).
- **Visible dans l'admin** : `GET /api/v1/admin/traffic/?days=7|30|90` → visiteurs (nouveaux/de retour), visites, pages vues, pages les plus vues, provenance, appareils, navigateurs, systèmes, actions, dernières visites, **taux de cookies acceptés** et visiteurs en ligne ; rafraîchi tout seul toutes les 30 s.
- **Conservation 395 jours** : purge automatique (5 % des nouvelles visites) ou à la demande/cron : `python manage.py purge_analytics`. 
- Page `/confidentialite` mise à jour (cookies, durées, droits). **À faire relire par un professionnel** (loi ivoirienne sur la protection des données personnelles) avant mise en ligne.

### C. Gooey partout (`lib/gooey.tsx`)
- Toute fenêtre ouverte depuis un bouton **sort de ce bouton comme une goutte** et s'y résorbe à la fermeture : réglages, **confirmations/saisies/alertes** (`DialogProvider`), formulaires (`Modal`), avis flottant, **menu du profil**, fenêtre cookies (depuis le pied de page). Rien à ajouter sur les boutons. « Mouvement réduit » : aucune animation. La cloche d'arrivées garde sa propre animation.

### D. Connexion (`app/connexion/page.tsx`, `auth-stage.css`)
- Retirés comme demandé : paragraphe barré, mention « aucun mot de passe à retenir », **grille de points** du volet gauche, **bouton « Retour au site »**, **interrupteur de thème**. Le **logo est un lien vers la page d'accueil**.

### Vérifications
`tsc --noEmit` propre ; `next build` OK (24 pages) ; `pytest` **242 verts** (hors `test_document_ocr`, déjà en échec : dépend de Tesseract) et aucune migration manquante ; navigateur : **admin 81/81** (PC, mobile 320 et 390, sombre, dialogues, erreur serveur), **connexion 95/95**, **cookies 68/68**, **menu profil 21/21**, app 35/35, rubriques 13/13, alertes 46/46.

### Bon à savoir
- Comme dans l'app, la barre latérale **dépliée recouvre** le contenu (elle ne le pousse pas) ; repliée, elle occupe 72 px. Le choix est mémorisé.
- En mobile, le titre « REKOLLECTE · Admin » est masqué sous 400 px (la place revient aux boutons).

---

# Historique : patch v3 (déjà appliqué)

Décompresser **à la racine du projet** (les chemins `frontend/…` écrasent les fichiers existants). **Aucune migration, aucune dépendance, aucun fichier à supprimer** : seuls des fichiers du front changent (GSAP est déjà installé). Ta base (`rekollecte.zip`) a été comparée au code de travail : le backend est identique, seuls 3 fichiers du front différaient.

### A. Cloche d'arrivées « gooey » (`components/dashboard/VisitAlerts.tsx`, `globals.css`)
- Le panneau **sort de la cloche comme une goutte** (filtre SVG gooey + animation élastique GSAP, chargée à la demande) et s'y **resserre** à la fermeture. Le filtre n'est actif que panneau ouvert (zone filtrée = GPU). « Mouvement réduit » : animation raccourcie, sans élastique.
- **Lues / pas encore lues** : une arrivée est « non lue » tant que le panneau n'a pas été ouvert puis refermé ; la pastille et le titre d'onglet `(n)` comptent les non lues.
- **Boutons** : « Tout marquer comme lu », « Effacer les lues », « Effacer les non lues », « Tout effacer », et une croix par notification. Les boutons n'apparaissent que s'ils servent.
- La liste est celle **de la session** (30 arrivées max, en mémoire) : un rechargement la repart vide, seules les nouvelles arrivées s'y ajoutent. Les toasts (3 max, 9 s) ne s'affichent pas panneau ouvert.

### B. Menu
- Ordre : **Visiteurs, Mode Staff, REKOLLECTE (REKOLLECTE+ au Niveau 2), Paramètres en dernier** (`Sidebar.tsx`).

### C. Page de connexion refaite (`app/connexion/page.tsx`, `auth-stage.css`, `components/auth/WelcomeScene.tsx`)
- **Ordinateur (≥ 860 px)** : un cadre arrondi à **deux volets**, comme E-Carnet. À gauche, la scène (fond vert profond, halos, bulle de bienvenue qui tourne — « Bonjour/Bonsoir » selon l'heure — et message de la marque) ; à droite, la connexion.
- **SVG de bienvenue animé** (sans image ni script, boucle CSS de 10 s) : le visiteur scanne le QR, la fiche se remplit, la signature se trace, le bouton passe au vert, le badge « Bienvenue » éclate. Il **réagit** : le scan s'emballe pendant la connexion, le téléphone se secoue sur une erreur ; parallaxe douce avec la souris.
- **Mobile (< 860 px)** : un seul écran, façon application : bandeau de scène compact en haut (retour et thème par-dessus), **feuille de connexion qui remonte** par-dessus, bouton Google visible sans défiler dès 320×568, marges de sécurité (encoche, barre du bas). Tablette en portrait : même feuille, scène plus grande.
- **Mouvement réduit** : la scène reste sur l'image finale, aucune animation. Thème clair et sombre : mêmes tokens que le reste de l'application.
- Inchangé : le flux Google (bouton officiel invisible étiré), Facebook/Apple, les messages d'erreur `?auth_error=`, le loader plein écran, l'accessibilité (un seul `h1`, scène et bulle masquées aux lecteurs d'écran).

### D. Petits correctifs
- `app/layout.tsx` : `suppressHydrationWarning` sur `<html>` (le script de thème ajoute `.dark` avant l'hydratation : l'avertissement de développement « hydration mismatch » disparaît pour les utilisateurs en mode sombre).
- `frontend/e2e/critical.spec.ts` : deux assertions périmées corrigées (titre `/REKOLLECTE/` au lieu de `/R3S3IGN3M3NT/`, titre de la page de connexion « Connecte-toi à ton espace » au lieu de « Se connecter »).
- Tests navigateur : les fenêtres sont désormais ciblées par `[role=dialog][aria-modal=true]` (le panneau de la cloche est un `role="dialog"` toujours présent mais masqué).

### Vérifications
`tsc --noEmit` propre ; `next build` OK (24 pages) ; navigateur : connexion **96/96** (PC 1280/1024/900/1920, mobile 320–412, tablette, sombre, mouvement réduit, erreur, chargement), cloche et alertes **46/46**, espace connecté **35/35**, rubriques **13/13**. Backend inchangé (224 tests verts).

---

# Historique : patch v2 (déjà appliqué)

Décompresser **à la racine du projet** (les chemins `backend/…` et `frontend/…` écrasent les fichiers existants). Aucune nouvelle dépendance. **2 migrations à appliquer** (alerte à l'hôte, section 6) : `python manage.py migrate` (accounts `0009`, checkins `0005`) — elles ne font qu'ajouter une colonne et un index, rien n'est réécrit.

**Fichiers obsolètes à supprimer** (déjà fait si tu as appliqué le v2) : lancer `sh supprimer-fichiers-obsoletes.sh` (ou `supprimer-fichiers-obsoletes.ps1` sous Windows PowerShell) à la racine, une seule fois. Liste :
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

## 2. Page de connexion (mise en page remplacée par le v3-C ; le reste reste valable)
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
- **4 liens** (barre latérale / barre du bas), dans cet ordre : **Visiteurs** (ex-Clients/Registre), **Mode Staff**, **REKOLLECTE**, **Paramètres** (toujours en dernier) — le 3ᵉ lien garde la même place au Niveau 2 et devient **REKOLLECTE+** : l'activation ne déplace rien pour l'utilisateur.
- **Paramètres** : Moi (nom, prénom/nom, photo — `PATCH /auth/me/`, photo en `https://` uniquement), Entreprise, Équipe, Connexion, Administration, Votre avis. **REKOLLECTE** : Formulaire, QR codes ; au Niveau 2 s'ajoutent Clients, Ressources, Réservations, Paiements, Rappels, Audit.
- **Plus d'onglets** : des lignes (icône, titre, description, chevron) qui ouvrent une fenêtre (feuille qui monte du bas sur téléphone). L'URL `?open=<ligne>` ouvre une fenêtre directement.
- Le **bouton d'avis flottant** ne s'affiche plus dans l'application (ligne « Votre avis » dans Paramètres) ; il reste sur le site public.
- Page **Crédits** : titre lisible sur le bandeau vert (la règle `.prose-legal` ne s'applique plus aux sections `not-prose`).
- Décision à valider : **Équipe** reste dans Paramètres (ta liste ne la citait pas).

## 6. Alerte à l'hôte (fonctionnalité #1)
- **Formulaire** : nouveau type de champ « Qui venez-vous voir ? » (constructeur de formulaire). Côté visiteur c'est une liste des personnes cochées « Peut être visité·e » ; si personne n'est coché, le champ est masqué et n'apparaît pas.
- **Équipe → Personnes à prévenir** : le patron coche les membres visitables (journalisé dans l'audit). Les gérants voient la liste en lecture seule.
- **Qui est prévenu** : la personne demandée ; sans réponse (le champ est facultatif, ou le nom a été retiré depuis), le **patron et les gérants**.
- **Cloche dans l'en-tête** (effet gooey, lues/non lues et boutons d'effacement : voir v3-A) : pastille rouge, notification, carillon (activable dans le panneau ; bouton de réactivation honnête si le navigateur bloque le son), compteur dans le titre de l'onglet. Pas de WhatsApp/e-mail : choix « tableau de bord seulement ». La cloche est cachée pour un staff non visitable (patron et gérants l'ont toujours).
- **API** : `GET /checkins/alerts/?since=<curseur>` (curseur d'horloge serveur, 24 h max, 20 arrivées max, aucune donnée sensible : ni pièce d'identité, ni téléphone, ni signature) et `PATCH /auth/team/members/<id>/visit-host/` (patron uniquement). Sondage toutes les 8 s tant que l'application est ouverte — l'onglet reste donc réveillé côté Render.
- **Limite connue** : l'alerte n'arrive que si l'application est ouverte dans un onglet (pas de notification quand le navigateur est fermé) — c'est ce que permettrait un envoi WhatsApp/e-mail plus tard.
- Tests : `test_visit_alerts.py` (19), `test_profile_update.py`. Suite backend : **224 verts** ; seul `test_document_ocr` échoue (inchangé).

## 7. Documents
- `ROADMAP.md` : état du projet, actions avant reprise, fonctionnalités à ajouter, consolidation.
- `AUDIT.md` : détail de l'audit (corrigé / à décider).
