# R3NS3IGN3M3NT

<div align="center">
  <img src="frontend/public/brand/logo-mark.png" alt="Logo R3NS3IGN3M3NT" width="120" />
  <h3>Le registre digital des établissements</h3>
  <p>QR Code, tablette d’accueil, formulaire visiteur, signatures et dashboard par rôles.</p>
  <p><a href="https://akatech.vercel.app/">Conçu par AKATech Studio</a></p>
</div>

> **Note logo AKATech Studio :** le footer utilise `/akatech-studio-logo.webp` pour révéler le logo au survol de « Conçu par AKATech Studio ». Déposer le fichier fourni dans `frontend/public/akatech-studio-logo.webp` avant le déploiement si le fichier n’est pas déjà présent dans l’arborescence.

## Présentation

R3NS3IGN3M3NT est une solution SaaS de registre d’accueil sans contact conçue par **AKATech Studio**, entreprise digitale basée à Abidjan, Côte d’Ivoire. Un établissement configure plusieurs formulaires, crée plusieurs points d’accueil avec leurs QR Codes et tablettes, puis consulte les arrivées dans un dashboard sécurisé.

Le visiteur n’a pas besoin de créer un compte. Le mode kiosque fonctionne offline-first : après un premier chargement avec Internet, chaque appareil conserve le formulaire de son point d’accueil et les soumissions en attente dans IndexedDB, puis synchronise automatiquement dès que le réseau revient.

## Identité du produit

| Élément | Information |
|---|---|
| Produit | R3NS3IGN3M3NT |
| Concepteur et éditeur du produit | AKATech Studio |
| Site AKATech Studio | [akatech.vercel.app](https://akatech.vercel.app/) |
| Contact | wthomasss06@gmail.com · +225 01 42 50 77 50 |
| Localisation déclarée | Abidjan, Côte d’Ivoire |
| Statut | V1.2 (Niveau 1 — registre) fonctionnelle. Niveau 2 KARN3T fusionné (clients, ressources, réservations, paiements, rappels), phases 1 à 9 livrées, phase 10 (recette) en cours. |

## Fonctionnalités livrées

### Accès et onboarding

- Authentification Google uniquement pour les membres de l’établissement.
- Onboarding avec connexion, rattachement au rôle et configuration de l’établissement ; le premier formulaire est créé simplement, puis les nouveaux formulaires, QR et invitations sont gérés depuis les paramètres.
- Rattachement d’un invité à une organisation par correspondance avec l’email Google invité.
- Avatar Google ou avatar utilisateur et logo de l’établissement.
- Logo sélectionné par glisser-déposer ou sélecteur fichier, uploadé en direct vers Cloudinary via une signature serveur ; aucune image n’est conservée en base64 dans l’application.

### Rôles et permissions

- **Patron :** configuration complète, invitation des Gérants et du Staff, export CSV, régénération du QR et gestion de l’identité de l’établissement.
- **Gérant :** gestion opérationnelle du registre, des formulaires, des points d’accueil et export/QR ; il peut inviter un Staff, sans actions de sécurité critiques.
- **Staff :** consultation du registre, accueil des visiteurs et utilisation de l’interface tablette, sans modification de configuration.
- **Matrice d’équipe :** un seul bouton **i** dans l’onglet **Paramètres > Équipe** ouvre la matrice complète Patron/Gérant/Staff, y compris pour le Patron ; les aides individuelles par rôle ont été retirées.
- **Mode staff :** le Patron ou le Gérant peut prendre le relais en cas d’absence de Staff.

### Parcours visiteur

- Scan d’un QR Code opaque ou ouverture directe du lien public.
- Logo de l’établissement au centre du QR.
- Formulaire dynamique : texte, téléphone, email, nombre, date, liste, case à cocher, photo, signature et bloc d’identification OCR.
- Bloc `document_scan` optionnel : caméra arrière, CNI/passeport/document libre, extraction configurable, correction obligatoire par l’agent et conservation de l’image désactivée par défaut.
- Motifs de visite configurables, bouton d’actualisation et champ libre « Autre ».
- Plusieurs formulaires par établissement, avec formulaire par défaut et affectation par point d’accueil.
- Signature enregistrée en data URI SVG et affichée dans le registre.
- Remise à zéro après enregistrement ; fermeture automatique tentée sur téléphone.

### Accueil et kiosque

- Onglet **Accueil** pour le Staff.
- Onglet **Mode staff** pour le Patron et le Gérant.
- Affichage du QR en grand format pour les visiteurs équipés d’un téléphone.
- Bouton d’ouverture directe du formulaire pour une tablette ou un téléphone d’accueil.
- Plusieurs points d’accueil : nom du lieu, tablette identifiée, QR dédié, formulaire associé et dernière activité.
- Fonctionnement offline-first avec file locale et synchronisation idempotente.

### Dashboard et statistiques

- Registre paginé des visiteurs : 20 lignes par page sur ordinateur et 10 lignes par page sur mobile, avec adaptation automatique au changement de largeur d’écran.
- Rafraîchissement automatique toutes les 30 secondes sans rechargement de page.
- Volume total et volume du jour.
- Heure de pointe et histogramme des visites par heure.
- Motifs de visite les plus fréquents.
- Export CSV.

### Niveau 2 — KARN3T (clients, ressources, réservations)

Optionnel, activable/désactivable à tout moment par le Patron sans perte de
données (`Paramètres > Administration`). Une fois actif, le registre devient
l’espace **Clients** et la navigation ajoute une section **KARN3T**.

- **Ressources (ResourceBuilder)** : catalogue par catégorie (Hébergement,
  Beauté et soins, Espaces professionnels, Événementiel et restauration,
  Stationnement, Sport et loisirs, Autre) avec types prêts à l’emploi (chambre,
  fauteuil, bureau, table…) et champs personnalisables (capacité, prix, mode de
  tarification, emplacement, équipements). Chaque ressource est enregistrée
  immédiatement ; réservé à Patron/Gérant, consultation seule pour le Staff.
  Proposé automatiquement à l’activation de KARN3T, avec option « Plus tard ».
- **Clients** : une visite valide crée ou retrouve automatiquement une fiche
  client (email puis téléphone, normalisés), sans ressaisie. Fiche client
  complète (`/dashboard/karnet/clients/<id>`) : coordonnées, compteurs,
  historique des passages, réservations/paiements, action directe « Créer une
  réservation ».
- **Réservations** : sélection d’un client existant en premier (préremplie
  depuis sa fiche), calcul automatique du montant (quantité × prix), détection
  de conflit de créneau pour les ressources à l’heure/au jour.
- **Paiements** : encaissement ouvert à toute l’équipe ; annuler un
  encaissement déjà enregistré est réservé à Patron/Gérant.
- **Rappels** : sonnerie de fin de créneau pour les ressources facturées à
  l’heure, acquittable par toute l’équipe.
- Trois sous-capacités (Réservations, Paiements, Rappels) activables/
  désactivables indépendamment, avec état conservé même si KARN3T entier est
  désactivé puis réactivé.
- Voir `rapport-fusion-r3ns3ign3m3nt-karnet.md` pour l’historique de livraison
  détaillé et `docs/phase-10-recette.md` pour la checklist de recette manuelle
  (multi-appareils, offline réel) restant à dérouler avant ouverture commerciale.

### Vitrine et conformité

- Landing page marketing responsive et PWA.
- Header/footer avec logo R3NS3IGN3M3NT.
- Logo AKATech Studio révélé au survol du crédit concepteur dans le footer.
- Pages Aide, CGU, Confidentialité et Mentions légales.
- Les informations encore en formalisation juridique sont indiquées dans les pages légales sans être inventées.

### Feedback et administration plateforme

- Widget Feedback flottant sur la landing page et dans l’espace connecté.
- Catégories : amélioration, erreur, observation et autre.
- Association automatique au compte et à l’entreprise lorsque l’utilisateur est connecté.
- Espace `/admin` séparé du dashboard établissement, protégé par `PLATFORM_ADMIN_EMAIL` et `PLATFORM_ADMIN_PASSWORD`.
- Vue globale : nombre d’entreprises, comptes, visites, flux des 30 derniers jours et feedbacks nouveaux.
- Gestion des entreprises : création, modification, suppression et statistiques par entreprise.
- Gestion du personnel : rattachement à une entreprise, rôle, activation/désactivation et suppression.
- Gestion des feedbacks : lecture, classement par statut et suivi des retours utilisateurs.
- L’espace `/admin` possède sa propre connexion avec les identifiants Render et reste séparé de la navigation du dashboard établissement.

## Architecture

```text
qr-register-saas/
├── backend/                         # API Django REST Framework
│   ├── apps/accounts/               # Utilisateurs, Google OAuth, invitations, rôles
│   ├── apps/organizations/          # Établissements, branding, QR et membres
│   ├── apps/checkins/               # Formulaires multiples, points d’accueil, sync, registre
│   ├── apps/karnet/                 # Niveau 2 — clients, ressources (ResourceBuilder), réservations, paiements, rappels
│   ├── apps/feedback/                # Feedback public, admin plateforme et métriques
│   ├── core/                        # Settings, URLs, WSGI
│   ├── manage.py
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/                        # Next.js 14 App Router + Tailwind + PWA
│   ├── src/app/                     # Vitrine, auth, dashboard et page visiteur
│   ├── src/components/              # Logo, loader, navigation, QR, formulaires
│   ├── src/hooks/                   # Auth, cache public, sync offline
│   ├── src/lib/                     # API, IndexedDB/Dexie, export CSV, presets
│   └── public/                      # Logo, images landing, manifest et service worker
├── docs/                            # Cahier des charges, audit et flows SVG
└── README.md
```

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| PWA/offline | Serwist, Dexie/IndexedDB, service worker |
| Backend | Python, Django, Django REST Framework |
| Authentification | Google OAuth, JWT, refresh token httpOnly |
| Base de données | PostgreSQL sur Neon en production, SQLite possible en local |
| Infrastructure | GitHub, Vercel pour le frontend, Render pour le backend, Neon pour PostgreSQL |
| Design | Logo officiel R3NS3IGN3M3NT, Phosphor Icons, Plus Jakarta Sans/Geist et tokens de marque |

## Routes frontend principales

| Route | Usage |
|---|---|
| `/` | Landing page marketing |
| `/connexion` | Connexion Google |
| `/onboarding` | Onboarding public / première configuration |
| `/dashboard` | Registre et statistiques |
| `/dashboard/accueil` | Accueil Staff ou Mode staff Patron/Gérant |
| `/dashboard/qr-code` | Gestion du QR Code |
| `/dashboard/parametres` | Paramètres du compte et de l’établissement |
| `/dashboard/parametres/formulaire` | Configuration du formulaire |
| `/dashboard/parametres/qr-code` | Gestion des QR et points d’accueil/tablettes |
| `/dashboard/parametres/equipe` | Gestion des invitations et de l’équipe |
| `/dashboard/parametres/entreprise` | Branding, suspension et actions de compte |
| `/v/<qr_token>` | Formulaire public visiteur |
| `/aide` | Aide produit |
| `/cgu` | Conditions générales |
| `/confidentialite` | Politique de confidentialité |
| `/mentions-legales` | Mentions légales |
| `/admin` | Administration AKATech Studio : métriques, entreprises, personnel et feedbacks |

## API principale

Toutes les routes API sont préfixées par `/api/v1`.

| Méthode | Route | Accès | Fonction |
|---|---|---|---|
| `POST` | `/auth/google/` | Public | Connexion ou création via Google |
| `POST` | `/auth/token/refresh/` | Cookie | Renouvellement JWT |
| `POST` | `/auth/logout/` | Membre | Déconnexion |
| `GET/PUT` | `/org/me/` | Membre | Lire/modifier l’organisation selon rôle |
| `POST` | `/auth/invite/` | Patron/Gérant selon règle | Inviter un membre |
| `GET/PUT` | `/form-template/` | Membre avec permission | Lire ou modifier le formulaire |
| `GET/POST` | `/form-templates/` | Patron/Gérant | Lister ou créer plusieurs formulaires |
| `PATCH/DELETE` | `/form-templates/<id>/` | Patron/Gérant ou Patron | Modifier, activer, définir par défaut ou supprimer |
| `POST` | `/org/uploads/cloudinary-signature/` | Patron | Obtenir une signature courte pour envoyer une image à Cloudinary |
| `GET/POST` | `/access-points/` | Patron/Gérant | Lister ou créer un point d’accueil/tablette |
| `PATCH/DELETE` | `/access-points/<id>/` | Patron/Gérant ou Patron | Modifier, désactiver ou supprimer un point |
| `GET` | `/public/forms/<qr_token>/` | Public | Charger le formulaire public |
| `POST` | `/checkins/sync/` | Public | Synchroniser les fiches offline, idempotence |
| `POST` | `/feedback/` | Public/authentifié | Envoyer un retour utilisateur |
| `GET` | `/checkins/` | Membre | Registre paginé |
| `GET` | `/checkins/stats/` | Membre | Volume, heures et motifs fréquents |
| `GET` | `/checkins/export/` | Selon permission | Export CSV |
| `POST` | `/org/me/regenerate-qr/` | Patron | Invalider l’ancien QR |
| `GET` | `/auth/audit/?page=&page_size=` | Patron | Journal d’audit, paginé (`count`/`next`/`previous`) |
| `GET` | `/health/` | Public | Vérifier la disponibilité backend |
| `PATCH` | `/org/me/karnet/` | Patron | Activer/désactiver KARN3T et ses sous-capacités |
| `GET/POST` | `/karnet/clients/` | Membre (KARN3T actif) | Lister/créer une fiche client |
| `GET/PATCH` | `/karnet/clients/<id>/` | Membre / Patron·Gérant | Fiche client complète (compteurs) / modifier |
| `GET/POST` | `/karnet/resources/` | Membre (lecture) / Patron·Gérant (création) | Catalogue de ressources (ResourceBuilder) |
| `PATCH/DELETE` | `/karnet/resources/<id>/` | Patron/Gérant | Modifier ou désactiver/supprimer une ressource |
| `GET/POST` | `/karnet/reservations/` | Membre (KARN3T actif) | Lister/créer une réservation (calcul automatique du montant) |
| `PATCH` | `/karnet/reservations/<id>/` | Membre / Patron·Gérant pour annuler un paiement | Statut, paiement, accusé de rappel |
| `GET` | `/checkins/?client=<id>` | Membre | Historique des passages d’un client (fiche client) |
| `POST` | `/admin/login/` | Public avec identifiants Render | Ouvrir une session admin plateforme |
| `GET` | `/admin/overview/` | Admin plateforme | Métriques globales |
| `GET/POST` | `/admin/organizations/` | Admin plateforme | Lister ou créer une entreprise |
| `PATCH/DELETE` | `/admin/organizations/<id>/` | Admin plateforme | Modifier ou supprimer une entreprise |
| `GET` | `/admin/members/` | Admin plateforme | Lister tous les comptes |
| `PATCH/DELETE` | `/admin/members/<id>/` | Admin plateforme | Modifier ou supprimer un membre |
| `GET` | `/admin/feedback/` | Admin plateforme | Lister les retours utilisateurs |
| `PATCH/DELETE` | `/admin/feedback/<id>/` | Admin plateforme | Suivre ou supprimer un feedback |

## Installation locale

### Prérequis

- Python 3.11+ ou 3.12+
- Node.js 18+ (Node 22 recommandé)
- npm
- PostgreSQL/Neon pour reproduire la production, SQLite pour un démarrage local rapide
- Client OAuth Google configuré

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # macOS/Linux
# Windows PowerShell : .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Variables backend importantes :

```env
SECRET_KEY=une-cle-secrete-longue
DEBUG=True
DATABASE_URL=sqlite:///... ou postgres://...
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
PLATFORM_ADMIN_EMAIL=admin@example.com
PLATFORM_ADMIN_PASSWORD=mot-de-passe-aleatoire-de-20-caracteres-minimum
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Variables frontend :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
```

Le frontend est disponible sur `http://localhost:3000` et l’API sur `http://localhost:8000`.

## Mode tablette / offline

1. Ouvrir `/v/<qr_token>` une première fois avec Internet.
2. Vérifier le logo et les motifs affichés.
3. Ajouter la page à l’écran d’accueil ou activer le mode kiosque du navigateur.
4. Créer un point d’accueil dans Paramètres > QR Code, choisir son formulaire et nommer sa tablette.
5. Laisser la tablette sur le formulaire de son QR.
6. Les visiteurs remplissent et signent sans compte.
7. Les données sont enregistrées localement si le réseau est indisponible.
8. La synchronisation reprend automatiquement dès le retour du réseau, avec le point d’accueil et le formulaire d’origine.

Chaque point d’accueil possède un QR opaque indépendant. Sa désactivation ou sa suppression coupe son parcours. Un appareil complètement offline peut conserver temporairement son ancien cache jusqu’à sa reconnexion.

## Tests et validation

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

Les tests couvrent notamment l’idempotence, la validation des champs obligatoires, la protection contre l’IDOR, les invitations, le RBAC et les statistiques.

### Frontend

```bash
cd frontend
npm run type-check
npm run build
```

État de la dernière validation : **65 tests backend passants (dont KARN3T : clients, ressources, réservations, permissions, réactivation), `tsc --noEmit` sans erreur**. Le build `next build` échoue dans cet environnement de développement uniquement à cause du blocage réseau vers `fonts.googleapis.com` (police `Chelsea Market`) — sans rapport avec le code applicatif ; à revérifier en environnement avec accès réseau complet avant mise en production.

## Déploiement production

- **GitHub :** dépôt et historique du code.
- **Vercel :** déploiement du frontend Next.js.
- **Render :** déploiement de l’API Django.
- **Neon :** base PostgreSQL de production.

Avant chaque mise en production :

1. configurer les variables d’environnement sans les committer ;
2. utiliser une `SECRET_KEY` longue et stable ;
3. positionner `DEBUG=False` côté backend ;
4. vérifier `ALLOWED_HOSTS`, CORS et CSRF ;
5. appliquer les migrations Django sur la base de production ;
6. vérifier le login Google, l’invitation, le QR, le mode offline et les permissions par rôle ;
7. tester le formulaire sur plusieurs téléphones et sur la tablette d’accueil.
8. tester plusieurs formulaires, plusieurs QR et la reprise offline de chaque tablette.
8. définir dans Render `PLATFORM_ADMIN_EMAIL` et un `PLATFORM_ADMIN_PASSWORD` aléatoire d’au moins 20 caractères ; ne jamais les mettre dans Git.

## Sécurité et données

- Le QR public utilise un token opaque, jamais un identifiant de base de données.
- Les données sont isolées par organisation côté backend.
- Les permissions sont vérifiées côté API, pas uniquement dans le frontend.
- Le refresh JWT est conservé dans un cookie httpOnly.
- Les routes publiques sont limitées par throttling.
- Les soumissions offline utilisent une clé d’idempotence client.
- Chaque check-in conserve son formulaire et son point d’accueil d’origine pour les statistiques et l’export.
- L’administration plateforme exige un utilisateur marqué superuser par le login contrôlé côté serveur ; un Patron d’entreprise ne peut pas accéder à `/admin`.
- Ne jamais committer `.env`, `.env.local`, tokens, clés OAuth privées ou secrets de déploiement.

## Documentation complémentaire

- [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md) — périmètre et décisions produit.
- [`docs/audit-etat-projet.md`](docs/audit-etat-projet.md) — audit des implémentations et contrôles production.
- [`docs/flow-tablette-employe.md`](docs/flow-tablette-employe.md) — parcours tablette/kiosque.
- [`docs/flows/`](docs/flows/) — six diagrammes SVG des parcours et permissions.
- [`docs/modele-economique.md`](docs/modele-economique.md) — stratégie gratuit, offres payantes et indicateurs de lancement.
- [`rapport-fusion-r3ns3ign3m3nt-karnet.md`](rapport-fusion-r3ns3ign3m3nt-karnet.md) — historique de livraison de la fusion registre + KARN3T, phase par phase.
- [`docs/phase-10-recette.md`](docs/phase-10-recette.md) — checklist de recette manuelle (multi-appareils, offline réel) à dérouler avant ouverture commerciale.

## Limitations et prochaines évolutions

Les fonctions actuellement prévues mais non intégrées dans le périmètre courant sont l’agrégateur de paiement, la facturation récurrente, la notification WhatsApp, l’impression de badges et la gestion avancée de supervision temps réel des tablettes. Les formulaires multiples et les points d’accueil multi-tablettes sont désormais livrés. La forme juridique, le RCCM et l’adresse physique complète d’AKATech Studio seront ajoutés aux pages légales dès finalisation des documents de l’entreprise.

## Licence

## Mise à jour UX — septembre 2026

L’expérience recommande désormais un parcours simple : un seul formulaire est présenté au départ, puis **Paramètres > Formulaire** et **Paramètres > QR Code** proposent chacun une modale d’ajout. La modale permet de nommer le nouveau parcours, de repartir d’un modèle et de visualiser les types de champs inclus avant personnalisation. Chaque QR peut être relié à un formulaire différent et à un point d’accueil identifié.

L’onglet **Entreprise** centralise le nom et le logo de l’établissement. Seul le patron peut modifier le branding, suspendre ou supprimer l’entreprise. Les gérants et membres du staff disposent d’une action de départ volontaire qui désactive leur compte. Les connexions affichent un accueil personnalisé ; la déconnexion est confirmée dans une modale avec une formule adaptée à l’heure. Le rafraîchissement de session utilise le cookie httpOnly de renouvellement et ne déconnecte pas l’utilisateur lors d’une erreur réseau transitoire.

Le logo de référence du projet est [`frontend/public/akatech-studio-logo.webp`](frontend/public/akatech-studio-logo.webp).

La mise à jour de septembre 2026 centralise aussi la lecture des droits : l’onglet **Équipe** présente une seule icône d’information qui ouvre la matrice des permissions pour les trois rôles. Le frontend reste informatif ; le backend applique le RBAC réel, notamment la règle « Gérant → Staff » et « Patron → Gérant ou Staff ».

Projet propriétaire / SaaS conçu par AKATech Studio. Les conditions d’utilisation et de réutilisation du code doivent être définies avant toute distribution publique.


## Mise à jour sécurité et pagination serveur — 22 septembre 2026

La priorité 3 de sécurité est intégrée : Content Security Policy et headers de durcissement côté frontend, JWT d’accès limité à 10 minutes, refresh token `httpOnly` rotatif et révocable par appareil. Le backend conserve uniquement le JTI dans `RefreshSession`, jamais le token lui-même. Les connexions, déconnexions et révocations de session sont journalisées dans les événements d’audit.

Le registre utilise une pagination serveur : 20 lignes par page sur desktop et 10 sur mobile via `page` et `page_size`. Le backend renvoie le total ainsi que `next` et `previous`, sans limitation fonctionnelle à 100 visites. La taille demandée est plafonnée côté API.


## Mise à jour fonctionnelle — 23 septembre 2026

Cette mise à jour complète la description du projet sans modifier les sections précédentes.

### Organigramme dynamique de l’équipe

La section **Paramètres > Équipe > Membres** présente désormais un organigramme hiérarchique dynamique. Le Patron est affiché au sommet, les Gérants sont reliés au Patron et les Staff sont affichés sous le Gérant qui les a invités. Chaque carte présente la photo ou l’avatar Google/Cloudinary, le nom réel, le rôle et l’état d’accès. Les Staff sans manager sont regroupés dans une zone **Staff à affecter**.

La relation hiérarchique est persistée sur `User.manager`. Lorsqu’un Gérant invite un Staff et que celui-ci accepte avec l’adresse Google invitée, le backend rattache automatiquement le nouveau compte à ce Gérant. La migration correspondante est `backend/apps/accounts/migrations/0006_user_manager.py`.

### Administration et journal d’audit

Le journal d’audit a été retiré de l’onglet Équipe. Il est maintenant disponible dans **Paramètres > Administration**, une section réservée au Patron et protégée par le backend. Les événements affichent le nom réel de l’auteur, son email comme secours, la cible éventuelle, l’action traduite et la date de l’événement.

### Images, avatars et Cloudinary

Le flux d’images accepte les avatars Google ainsi que les photos et logos envoyés vers Cloudinary. Les signatures sont générées côté backend avec des dossiers séparés `avatars` et `branding`. La CSP autorise les domaines Google Identity, `googleusercontent.com`, Cloudinary et l’API d’upload Cloudinary. Le service worker n’intercepte plus les images externes avec le cache générique, ce qui évite les erreurs `no-response` sur les avatars Google.

### Validation de la version actuelle

La version actuelle a été vérifiée avec **34 tests backend passants**, une migration Django cohérente, un type-check TypeScript réussi et un build Next.js réussi. L’archive de livraison exclut uniquement les dépendances générées `node_modules`, `.next` et les couvertures de test générées.

## Mise à jour — fusion KARN3T, phases 7 à 10 — 26 septembre 2026

Le Niveau 2 KARN3T (clients, ressources, réservations, paiements, rappels) est
fusionné dans le registre R3NS3IGN3M3NT. Cette mise à jour livre les phases 7 à
9 et démarre la phase 10 :

- **Fiche client complète** (`/dashboard/karnet/clients/<id>`) : compteurs
  calculés côté serveur, historique des passages, réservations/paiements,
  action « Créer une réservation ».
- **Parcours de réservation depuis un client existant** : sélection du client
  en première étape (préremplie depuis sa fiche), alerte de conflit de créneau
  avant envoi, création manuelle conservée comme parcours de secours.
- **Règle métier paiements** : annuler un encaissement déjà enregistré est
  désormais réservé à Patron/Gérant (API + interface Paiements) ; l’encaissement
  lui-même reste ouvert à toute l’équipe.
- **ResourceBuilder** : le formulaire de ressource simple (nom/unité/prix) est
  remplacé par un assistant par catégorie et type (hébergement, beauté, espaces
  professionnels, événementiel, stationnement, sport/loisirs), avec capacité,
  code, emplacement, équipements et mode de tarification. Le champ technique
  `unit` (jour/heure/unité), seul connu du moteur de réservation, est désormais
  **dérivé automatiquement** du mode de tarification choisi (`billing_unit`) ;
  compatibilité conservée pour un appel qui fixerait encore `unit` directement.
  Proposé à l’activation de KARN3T avec option « Plus tard ».
- **Phase 10 (recette)** : scénarios de doublons (téléphone avec tirets/espaces,
  email en casse différente) et de réactivation de KARN3T couverts par des
  tests automatisés ; le reste (multi-appareils, offline réel, tablette) est
  documenté dans `docs/phase-10-recette.md` pour une recette manuelle avant
  ouverture commerciale.

Validation : 65 tests backend passants, migration `karnet.0002` appliquée
proprement, `manage.py check` sans erreur, `tsc --noEmit` sans erreur.

## Mise à jour — correctif critique session/production, normalisation téléphone, pagination audit — 27 septembre 2026

Suite à un signalement en production (Render) montrant un dashboard bloqué sur
« Impossible de charger le registre » avec un badge « Hors ligne » trompeur :

- **Bug corrigé** : `AuthContext.restoreSession()` affichait l’utilisateur mis
  en cache comme « authentifié » même quand le rafraîchissement du token avait
  été **définitivement rejeté** par le serveur (401/403 confirmé, pas une
  panne réseau). Le garde de layout ne redirigeait donc jamais vers la
  connexion, laissant l’utilisateur sur un dashboard où chaque appel API
  échouait en boucle. Il efface désormais la session et déclare l’utilisateur
  déconnecté dans ce cas précis.
- **Bug corrigé** : `networkMonitor.ts` ciblait `http://localhost:8000` en
  production au lieu du proxy Next.js same-origin (`/api/v1`), faisant
  échouer son test de connectivité en permanence et afficher « Hors ligne »
  même quand l’API répondait normalement — brouillant le diagnostic du vrai
  problème (session expirée).
- **Normalisation téléphone Côte d’Ivoire corrigée** : un numéro local
  (`0701020304`) et sa forme internationale (`+225`/`00225` + 10 chiffres)
  sont désormais reconnus comme le même numéro pour la détection de doublon
  client — l’ancienne limitation documentée est résolue.
- **Journal d’audit paginé** : `/auth/audit/` suit désormais le même contrat
  de pagination que le registre (`page`, `page_size`, `count`, `next`,
  `previous`) au lieu d’un plafond fixe de 100 événements sans indication de
  troncature ; bouton « Charger plus » ajouté côté Administration.
- **Point à vérifier côté infrastructure, hors code** : confirmer dans le
  dashboard Render que `SECRET_KEY` est une valeur fixe et jamais régénérée
  automatiquement entre deux déploiements — une rotation invaliderait d’un
  coup tous les jetons émis avant, ce qui reproduirait la vague de 401
  observée (voir `docs/cahier-des-charges.md`, section 17).

Validation : 68 tests backend passants, `manage.py check` sans erreur,
`tsc --noEmit` sans erreur.

## Mise à jour — faille SECRET_KEY confirmée et corrigée — 27 septembre 2026

Confirmé : `SECRET_KEY` sur Render était encore le placeholder de
`backend/.env.example`, jamais remplacé. Faille de sécurité critique
(forgeabilité de JWT pour n’importe quel compte), pas seulement une cause
d’instabilité de session. `core/settings.py` refuse désormais de démarrer en
production avec un `SECRET_KEY` de placeholder connu ou trop court (< 32
caractères) — vérifié dans les trois cas (placeholder rejeté, clé courte
rejetée, clé aléatoire acceptée). **Action encore requise côté Render** :
générer une vraie clé, la définir dans les variables d’environnement,
redéployer (tout le monde sera déconnecté une fois, c’est attendu), et
vérifier `PLATFORM_ADMIN_PASSWORD` par la même occasion.
