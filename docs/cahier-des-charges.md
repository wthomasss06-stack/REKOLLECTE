# Cahier des charges — REKOLLECTE (nom de code de développement : `qr-register-saas`)

| | |
|---|---|
| **Porteur** | AKATech Studio. (Elvis) |
| **Statut** | V1.2 (Niveau 1 — registre) livré. **Niveau 2 — REKOLLECTE+** (clients, ressources, réservations, paiements, rappels) fusionné dans le même produit, phases 1 à 9 livrées et vérifiées (backend + frontend), phase 10 (recette complète) en cours — voir `docs/phase-10-recette.md`. |
| **Version du document** | 1.5 |

> Nom commercial retenu : **REKOLLECTE**. `qr-register-saas` reste le nom de code utilisé dans le code et les dossiers du projet. Le Niveau 2 optionnel porte le nom commercial **REKOLLECTE+**.

## 1. Contexte & problème

Les entreprises, bureaux, restaurants et établissements recevant du public gèrent encore la prise de renseignements (registre de visiteurs, fiche client, accès à une salle) avec un cahier papier et un stylo. C'est lent à consolider, non confidentiel (chaque visiteur voit les coordonnées des précédents), impossible à analyser, et vulnérable à la perte ou à la détérioration.

Les alternatives existantes ne conviennent pas aux petites structures locales :
- Les solutions de *Visitor Management* internationales (Envoy, SwipedOn) sont facturées en devises fortes, nécessitent du matériel dédié et une connexion internet stable.
- Les développements sur-mesure classiques ont un devis d'entrée trop élevé pour remplacer un simple cahier à 1 000 FCFA.

## 2. Cibles

| Rôle | Besoin |
|---|---|
| **Patron / gérant** | Configurer son propre formulaire, consulter les visiteurs à distance, sans payer un gros devis initial |
| **Agent d'accueil (staff)** | Consulter le registre au quotidien, sans pouvoir modifier le formulaire |
| **Visiteur** | Remplir ses informations en quelques secondes, sans créer de compte, sans imposer sa propre connexion internet |

Secteurs prioritaires : bureaux/cabinets, restaurants, hôtels, accès salle de réunion ou chantier.

## 3. Principe de fonctionnement — le modèle "kiosque"

Point de conception central, précisé en cours de projet : **le visiteur n'a besoin d'aucune connexion internet personnelle.** Le patron met à disposition un téléphone ou une tablette dédiée à l'accueil. Cet appareil :

1. Charge le formulaire une première fois (connexion nécessaire une seule fois, à la mise en place).
2. Fonctionne ensuite indéfiniment hors-ligne : le formulaire reste affiché et chaque visiteur peut le remplir et signer, même si l'appareil reste des jours sans réseau.
3. Synchronise automatiquement tout ce qui est en attente dès que **cet appareil** (pas le patron) retrouve une connexion — sans notification, sans action requise de personne.

```
Visiteur → scanne le QR (ou l'appareil est déjà ouvert dessus)
         → remplit le formulaire, signe du doigt
         → 💾 stocké localement sur l'appareil (IndexedDB), instantanément
         → dès que CET appareil a du réseau → envoi silencieux au serveur
         → le patron voit la donnée après synchronisation, avec rafraîchissement automatique du registre toutes les 30 secondes
```

Le patron et l'agent, eux, **ont besoin d'une connexion** pour se connecter (authentification Google) et consulter leur dashboard — comme n'importe quelle application web classique.

## 4. Périmètre fonctionnel (Scope Lock V1.0)

### Doit être livré (MUST HAVE) — ✅ fait

- [x] Authentification Google uniquement (patron et agent), aucun mot de passe
- [x] Création automatique de l'espace (organisation + QR sécurisé) à la première connexion du patron
- [x] Formulaire dynamique configurable par le patron : texte, téléphone, email, nombre, date, liste déroulante, case à cocher, photo, signature et identification OCR
- [x] **5 modèles de formulaire suggérés** (Bureau/Cabinet, Restaurant, Hôtel, Accès salle/Chantier, Vierge) — le patron part d'un modèle ou construit en freestyle, et peut tout modifier ensuite
- [x] Page visiteur "kiosque" : fonctionne hors-ligne indéfiniment après un premier chargement, signature au doigt
- [x] Synchronisation automatique et idempotente (aucun doublon même en cas de coupure réseau)
- [x] Invitations par email : le Patron peut inviter un Gérant ou un Staff ; le Gérant peut inviter un Staff (rattachement automatique à la connexion Google de l'invité)
- [x] Dashboard : registre, export CSV, régénération du QR
- [x] Pagination responsive du registre : 20 visiteurs par page sur ordinateur et 10 sur mobile
- [x] Onboarding simplifié : connexion, rôle/profil, établissement et formulaire initial ; les ajouts de formulaires, QR et invitations se font ensuite depuis les paramètres
- [x] Marque établissement : nom, logo, motifs de visite et avatar utilisateur
- [x] QR personnalisé avec logo centré
- [x] Mode Accueil / Mode staff : QR grand format et ouverture directe du formulaire visiteur
- [x] Signatures visiteur enregistrées en data URI SVG et visibles dans le registre
- [x] Rafraîchissement automatique du registre sans rechargement de page (polling toutes les 30 secondes)
- [x] Statistiques : volume total, volume du jour, heures de pointe et motifs fréquents
- [x] Plusieurs formulaires par établissement, avec formulaire par défaut et suppression protégée du dernier formulaire
- [x] Plusieurs points d’accueil par établissement, chacun relié à un formulaire et à un QR opaque dédié
- [x] Identification facultative de la tablette/appareil et date de dernière activité du point d’accueil
- [x] Synchronisation offline résolue par le QR du point d’accueil, avec conservation du formulaire et de l’appareil d’origine
- [x] Bloc `document_scan` optionnel : caméra arrière, CNI/passeport/document libre, OCR configurable et préremplissage du même formulaire
- [x] Vérification humaine des données extraites avant validation ; conservation de l’image désactivée par défaut

### Prévu ensuite (SHOULD HAVE — V1.1/V1.2)

- [ ] Notification WhatsApp au patron à chaque nouvelle arrivée (temps réel)
- [x] Rafraîchissement automatique (polling) du registre pendant qu'il est ouvert
- [ ] Impression de badge visiteur
- [x] Statistiques (heures de pointe, motifs fréquents, volume de visites)
- [x] Renommer/gérer plusieurs formulaires par établissement
- [x] Gérer plusieurs tablettes et points d’accueil par établissement

### Hors périmètre (OUT OF SCOPE)

- Application mobile native (la PWA suffit ; le natif reste une option future une fois le web éprouvé, comme demandé)
- Reconnaissance faciale ou biométrie
- Facturation / paiement intégré

## 5. Architecture technique

```
[ Visiteur ] --scan/ouvre--> [ Page /v/[qr_token] (client-side) ]
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                     [ IndexedDB local ]   [ tente le réseau ]
                     (formulaire + files)          │
                              │            ┌────────┴────────┐
                              │            ▼ succès           ▼ échec réseau
                              │     [ cache mis à jour ] [ repli sur cache local ]
                              │
                    [ soumissions en attente ]
                              │
                    dès que l'appareil a du réseau
                              ▼
                    [ API Django REST (JWT) ]
                              │
                    [ PostgreSQL — Neon, isolation par organization_id ]
                              ▲
                              │ (connexion Google requise)
                    [ Dashboard Next.js — patron / agent ]
```

| Couche | Choix | Raison |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS, PWA | SEO pour une éventuelle vitrine, rendu hybride, écosystème React |
| Offline (visiteur) | Dexie.js (IndexedDB) | Le formulaire lui-même *et* les soumissions sont mis en cache côté client — pas seulement les soumissions |
| Backend | Django REST Framework | Admin intégrée, RBAC natif, rapide à sécuriser correctement |
| Base de données | PostgreSQL (Neon, serverless) | Colonnes JSON natives pour les formulaires dynamiques |
| Authentification | Google OAuth + JWT (SimpleJWT) | Zéro mot de passe à gérer ; refresh token en cookie httpOnly (jamais en localStorage) |
| Hébergement prévu | Vercel (front) + Render/Railway (back + DB) | Coût de démarrage quasi nul |

## 6. Modèle de données

| Entité | Champs clés | Notes |
|---|---|---|
| `Organization` | `qr_secure_token` (unique), `logo_url`, `visit_reasons` | Le token est *opaque* : jamais d'ID de base de données exposé au client public ; la marque et les motifs sont propagés au formulaire public |
| `User` | `email`, `role` (BOSS/GERANT/STAFF), `organization` | Auth Google uniquement (`set_unusable_password`) |
| `StaffInvitation` | `email`, `token`, `accepted_at` | Rattachement réel par correspondance d'email à la connexion Google, pas par le token seul |
| `FormTemplate` | `organization`, `fields_schema` (JSON), `version`, `is_default` | Plusieurs schémas JSON par organisation ; un formulaire par défaut ; versionné à chaque modification |
| `AccessPoint` | `organization`, `form_template`, `secure_token`, `name`, `device_label`, `last_seen_at` | Un QR opaque et un appareil/lieu par point d’accueil ; le point choisit le formulaire servi |
| `CheckIn` | `organization`, `form_template`, `access_point`, `idempotency_key`, `responses` (JSON), `signature_blob` | La fiche conserve le formulaire et le point d’origine ; la clé d'idempotence est générée côté client |

## 7. Sécurité — corrections apportées en cours de conception

Ces points ont été identifiés et corrigés avant la mise en production, pas après :

1. **QR Code sans IDOR** : le visiteur n'envoie jamais d'`organization_id`. Seul le `qr_token` opaque est transmis ; le serveur résout l'organisation lui-même.
2. **Refresh token en cookie httpOnly** : jamais en `localStorage` (accessible en JS = volable par un script malveillant). Distinction erreur transitoire (cold start serveur) / vraie déconnexion, pour ne jamais déconnecter quelqu'un à tort.
3. **Validation serveur systématique** : les champs obligatoires du formulaire sont revérifiés côté serveur (un visiteur malveillant pourrait contourner la validation du navigateur).
4. **Rate limiting** sur les routes publiques (60 req/min anonyme).
5. **RBAC vérifié côté serveur** (`IsBoss`, `IsOrgMember`) — testé automatiquement : un agent (STAFF) ne peut pas modifier le formulaire même en trafiquant le frontend.
6. **Régénération du QR** : si un lien fuite ou qu'un appareil est volé, le patron invalide l'ancien QR en un clic.

**Limite connue et acceptée** : si un QR est régénéré pendant qu'un kiosque reste hors-ligne, cet appareil continuera d'utiliser l'ancien token jusqu'à sa prochaine connexion réseau — compromis nécessaire du modèle "hors-ligne par défaut".

## 8. Design system

| | |
|---|---|
| **Titres** | Plus Jakarta Sans (600–800) |
| **Texte courant** | Geist Sans — auto-hébergée, zéro dépendance réseau externe au build |
| **Fond** | `#FBFBFA` (blanc chaud) / cartes `#FFFFFF` |
| **Texte** | `#2F3437` (jamais noir pur) / secondaire `#787774` |
| **Accent d'action (CTA)** | `#171717`, hover `#333333` |
| **États** | succès `#EDF3EC`/`#346538` · erreur `#FDEBEC`/`#9F2F2D` |
| **Rayons** | 10–12px (cartes), 6px (boutons) — jamais de `rounded-full` sur un gros élément |
| **Icônes** | Phosphor Icons (Bold) |

Direction volontairement sobre plutôt que le style neo-brutaliste/sombre habituel d'AKATech : ce produit est un outil utilitaire consulté par des agents d'accueil peu à l'aise avec la technologie, sur un écran de kiosque potentiellement en plein jour — la lisibilité et la vitesse de chargement priment sur l'effet visuel. Cette direction peut être révisée à la demande (variables CSS centralisées, pas de changement structurel).

## 9. Contrat API (résumé)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/api/v1/auth/google/` | Public | Connexion/inscription, pose le cookie de refresh |
| POST | `/api/v1/auth/token/refresh/` | Public (cookie) | Renouvelle l'access token |
| POST | `/api/v1/auth/invite/` | BOSS/GERANT selon le rôle demandé | Le Patron invite un Gérant ou un Staff ; le Gérant invite uniquement un Staff |
| `GET/PUT` | `/api/v1/form-template/` | BOSS/STAFF | Consulter/modifier le formulaire actif |
| `GET/POST` | `/api/v1/form-templates/` | BOSS/GERANT | Lister ou créer un formulaire |
| `PATCH/DELETE` | `/api/v1/form-templates/<id>/` | BOSS/GERANT ou BOSS | Modifier, activer, définir par défaut ou supprimer un formulaire |
| `GET/POST` | `/api/v1/access-points/` | BOSS/GERANT | Lister ou créer un point d’accueil/tablette |
| `PATCH/DELETE` | `/api/v1/access-points/<id>/` | BOSS/GERANT ou BOSS | Modifier, désactiver ou supprimer un point d’accueil |
| GET | `/api/v1/public/forms/<qr_token>/` | Public | Formulaire à afficher au scan |
| POST | `/api/v1/checkins/sync/` | Public | Envoi (groupé, idempotent) des fiches visiteurs |
| GET | `/api/v1/checkins/` | BOSS/STAFF | Registre paginé côté serveur (`page`, `page_size`, `count`, `next`, `previous`) |
| GET | `/api/v1/checkins/stats/` | BOSS/GERANT/STAFF | Volume, volume du jour, heures de pointe et motifs fréquents |
| GET | `/api/v1/checkins/export/` | BOSS | Export CSV |
| POST | `/api/v1/org/me/regenerate-qr/` | BOSS | Invalide l'ancien QR |
| GET | `/api/v1/health/` | Public | Sonde de disponibilité |

## 10. Tests automatisés

Les tests d'intégration couvrent les flows critiques (voir `backend/apps/`) : idempotence anti-doublon, rejet d'un champ obligatoire manquant, non-exploitation d'un `organization_id` fourni par le client, RBAC, pagination serveur au-delà de 100 visites, rotation des sessions refresh, agrégation des statistiques, feedback et administration. La migration multi-formulaires et les tests frontend passent en environnement local. La couverture n'est pas exhaustive : l'auth Google réelle, les navigateurs mobiles, plusieurs tablettes offline et la recette production restent des contrôles complémentaires.

## 12. Site vitrine & pages légales (livrés)

- Landing page (`/`) : palette et polices reprises d'une référence fournie (Playfair Display, Manrope, DM Mono ; vert forêt/crème), animée en GSAP (entrée hero, révélations au scroll, orbite continue).
- Header + footer partagés sur les pages publiques, avec bouton d'installation PWA natif (`beforeinstallprompt`) dans le footer.
- Connexion déplacée sur `/connexion` (la racine est maintenant la vitrine).
- Pages légales : `/aide`, `/cgu`, `/confidentialite`, `/mentions-legales` — rédigées à partir de l'implémentation réelle, avec les formulaires multiples, les points d’accueil et les tablettes. La forme juridique, le RCCM et l’adresse physique complète d’AKATech Studio. restent à ajouter dès formalisation.

**Validation juridique recommandée avant mise en ligne commerciale**, en particulier sur les CGU (tarification, disponibilité) et la confidentialité (déclaration éventuelle auprès de l'ARTCI pour la collecte de données visiteurs).

## 13. Livrables de cette phase

- Backend Django complet (`/backend`)
- Frontend Next.js complet (`/frontend`) — flow visiteur + dashboard patron/agent
- Ce cahier des charges
- `README.md` — installation et déploiement

## 14. Simplification UX livrée — septembre 2026

La création d’un formulaire ou d’un QR code ne s’impose plus dans le parcours initial. L’utilisateur commence avec un formulaire simple, puis déclenche **Nouveau formulaire** ou **Nouveau QR** depuis les paramètres. Une modale demande le nom, propose un modèle de champs pour le formulaire ou le formulaire cible pour le QR, puis laisse l’utilisateur personnaliser avant déploiement. Le même principe s’applique à chaque ajout successif.

Un onglet **Entreprise** est désormais disponible dans les paramètres. Le patron peut modifier le nom et le logo de l’entreprise, suspendre l’espace ou le supprimer après confirmation. Le gérant et le staff peuvent quitter volontairement leur espace et désactiver leur compte. La suppression d’un membre ou d’une invitation doit rester une action contrôlée par le patron, avec un message d’accès retiré lors d’une prochaine connexion si le compte est désactivé.

Les états de connexion et de déconnexion sont présentés dans des modales contextualisées : bienvenue pour une première connexion, bon retour pour une connexion existante, et formule de départ adaptée à l’heure. La session repose sur le cookie httpOnly de renouvellement et une erreur réseau transitoire ne provoque pas de déconnexion artificielle après actualisation.

Sur mobile, le feedback est accessible par une icône ronde flottante afin de préserver l’espace de navigation. Le registre du dashboard affiche 10 visiteurs par page sur mobile et 20 par page sur ordinateur ; la navigation de page reste accessible au clavier et s’adapte au changement de largeur d’écran. L’administration plateforme reste séparée du dashboard établissement et n’est pas affichée dans sa sidebar.

## 15. Matrice de permissions et onglet Équipe — septembre 2026

L’onglet **Paramètres > Équipe** utilise un seul bouton d’information placé à côté du titre. Ce bouton ouvre une modale large qui présente la matrice complète des permissions des rôles **Patron**, **Gérant** et **Staff** ; le Patron peut donc consulter ses propres permissions au même endroit que celles des autres rôles. Les panneaux individuels affichés à côté des boutons de choix de rôle dans l’invitation ont été supprimés pour éviter la duplication et les divergences de contenu.

La matrice reflète le RBAC réellement appliqué par l’API : le Patron conserve les actions sensibles, le Gérant gère les opérations courantes et peut inviter un Staff, tandis que seul le Patron peut inviter un Gérant. La matrice reste une aide de compréhension et ne remplace pas les contrôles serveur. Les six flows et leurs diagrammes SVG ont été réalignés sur ce parcours, sur l’onboarding simplifié, sur l’onglet Entreprise, sur les formulaires/QR ajoutés depuis les paramètres et sur le mode offline de la tablette.


## Mise à jour — priorité 3 sécurité et pagination serveur — 22 septembre 2026

La sécurité de session est renforcée par une Content Security Policy frontend, des headers de durcissement, un JWT d’accès de courte durée et une rotation contrôlée des refresh tokens. Chaque refresh est associé à une session par appareil ; son JTI est conservé côté serveur pour permettre la révocation ciblée sans déconnecter les autres appareils. Les connexions et révocations sensibles sont ajoutées au journal d’audit.

Le registre n’est plus limité à un lot fixe de 100 visites. Le backend expose une pagination serveur avec `page`, `page_size`, `count`, `next` et `previous`. Le dashboard demande 20 enregistrements par page sur ordinateur et 10 sur mobile. La taille maximale d’une page est contrôlée côté API.

## 16. Niveau 2 — REKOLLECTE+ (hébergement, beauté, coworking, événementiel…) — septembre 2026

REKOLLECTE reste utilisable seul (Niveau 1 — registre de visiteurs). REKOLLECTE+ est un
Niveau 2 optionnel, activable/désactivable à tout moment par le Patron
(`Paramètres > Administration`), qui transforme le registre en gestion clients
complète pour un établissement qui vend des créneaux ou des séjours : hôtel,
salon de beauté, coworking, restaurant/événementiel, parking, sport et loisirs.

### 16.1 Principe

```
Visiteur → formulaire QR → CheckIn → Client REKOLLECTE+ → Réservation → Paiement
```

Le visiteur remplit le même formulaire qu'au Niveau 1. Si REKOLLECTE+ est actif, sa
visite crée ou retrouve automatiquement une fiche client (identifiée par email
puis téléphone, normalisés), sans ressaisie. Rien n'est perdu si REKOLLECTE+ est
désactivé puis réactivé plus tard : les fiches et réservations restent en base,
seule leur interface disparaît temporairement.

### 16.2 Modèle de données REKOLLECTE+

| Entité | Champs clés | Notes |
|---|---|---|
| `Client` | `full_name`, `phone`, `email`, `note` | Rattaché à un `CheckIn` via une relation nullable ; jamais supprimé par la désactivation de REKOLLECTE+ |
| `Resource` | `category`, `resource_type`, `billing_unit`, `unit`, `price`, `capacity`, `code`, `location`, `duration_label`, `equipment` | `billing_unit` (par heure/séance/jour/nuit/mois/forfait) est ce que Patron/Gérant choisissent dans **ResourceBuilder** ; `unit` (jour/heure/unité) en est **dérivé automatiquement côté serveur** et reste seul consulté par le moteur de réservation (calcul de `ends_at`, détection de conflit) |
| `Reservation` | `client`, `resource`, `quantity`, `unit_price`, `total_amount` (figé à la création), `starts_at`, `ends_at`, `status`, `is_paid`, `reminder_acknowledged` | Le montant facturé à la création n'est jamais recalculé si le tarif change ensuite |

Catégories de ressources disponibles dans ResourceBuilder : Hébergement, Beauté
et soins, Espaces professionnels, Événementiel et restauration, Stationnement,
Sport et loisirs, Autre ressource (type libre). Chaque catégorie propose des
types prêts à l'emploi (ex. Hébergement → Chambre simple/double/familiale,
Suite, Studio, Appartement, Villa) et peut être complétée manuellement.

### 16.3 Capacités activables

Au-delà de l'interrupteur principal `karnet_enabled`, trois sous-capacités sont
réglables indépendamment par le Patron : **Réservations**, **Paiements**,
**Rappels**. Elles sont actives par défaut dès l'activation de REKOLLECTE+, mais
peuvent être désactivées une à une (ex. un établissement qui veut le carnet de
clients sans le suivi des paiements). L'état de chaque sous-capacité est
conservé même quand REKOLLECTE+ entier est désactivé, pour être restauré tel quel à
la réactivation.

### 16.4 Rôles et permissions (vérifiées côté API, pas seulement affichées)

| Action | Patron | Gérant | Staff |
|---|---|---|---|
| Activer/désactiver REKOLLECTE+ et ses sous-capacités | ✅ | ❌ | ❌ |
| Créer/modifier/supprimer une ressource (ResourceBuilder) | ✅ | ✅ | ❌ (lecture seule) |
| Créer un client, créer une réservation | ✅ | ✅ | ✅ (si la capacité est active) |
| Encaisser un paiement | ✅ | ✅ | ✅ |
| **Annuler un encaissement déjà enregistré** | ✅ | ✅ | ❌ — évite qu'un Staff masque une recette par erreur |
| Acquitter un rappel de fin de créneau | ✅ | ✅ | ✅ |

### 16.5 Onboarding ResourceBuilder

À l'activation de REKOLLECTE+, le Patron est redirigé vers un assistant de création
de ressources (catégorie → type → personnalisation → tarif → enregistrement),
avec une option explicite « Plus tard » : la configuration des ressources n'est
jamais bloquante pour continuer à utiliser le registre. Chaque ressource créée
ou modifiée est enregistrée immédiatement (pas de brouillon local perdu si
l'onglet se ferme).

### 16.6 Fiche client complète

Chaque client dispose d'une fiche (`/dashboard/karnet/clients/<id>`) qui
regroupe : coordonnées, compteurs (nombre de passages, de réservations,
dernière visite), solde dû, historique détaillé des passages (réponses du
formulaire d'origine) et l'ensemble de ses réservations/paiements, avec une
action directe « Créer une réservation » qui préremplit le client.

### 16.7 État des livraisons (phases de fusion registre + REKOLLECTE+)

| Phase | Contenu | État |
|---|---|---|
| 1-2 | Modèle métier et backend : `CheckIn` lié à `Client`, formulaire configurable par rôle d'identité | ✅ livré |
| 3 | Conversion visiteur → client automatique, idempotente | ✅ livré |
| 4 | Champs d'identité configurables dans le FormBuilder | ✅ livré |
| 5-6 | Dashboard Clients et navigation fusionnée | ✅ livré |
| 7 | Fiche client complète, action « Créer une réservation » | ✅ livré |
| 8 | Parcours de réservation depuis un client existant, préremplissage, contrôle de créneau | ✅ livré |
| 9 | Permissions finales par rôle, règle métier paiements | ✅ livré |
| 10 | Recette complète (desktop/mobile, offline réel, multi-tablettes) | 🟡 tests automatisés livrés, recette manuelle documentée dans `docs/phase-10-recette.md`, à dérouler avant ouverture commerciale |

Voir `rapport-fusion-REKOLLECTE-karnet.md` pour le détail livraison par
livraison, et `docs/phase-10-recette.md` pour la checklist de recette manuelle.

### 16.8 Normalisation téléphone Côte d'Ivoire — corrigée

La limite documentée plus haut (un numéro local et sa forme internationale
créaient deux fiches) est **corrigée** : `normalize_phone()` reconnaît
désormais un numéro ivoirien local à 10 chiffres (`0701020304`) et sa forme
internationale (`+225`/`00225` suivi des 10 chiffres) comme un seul et même
numéro, quel que soit le format de saisie (espaces, tirets, indicatif).
Vérifié par `test_sync_matches_same_client_with_dashes_or_country_code_variants`
et `test_normalize_phone_leaves_non_ivorian_numbers_untouched` (les numéros
hors Côte d'Ivoire ne sont pas réinterprétés).

## 17. Correctif critique de production — session expirée non détectée — 27 septembre 2026

Signalé en production (Render) : après un redéploiement, les utilisateurs déjà
connectés se retrouvaient bloqués sur un dashboard affichant « Impossible de
charger le registre » avec un badge « Hors ligne » trompeur, alors que le
serveur répondait normalement (confirmé par les logs Render : chaque requête,
y compris `/auth/me/` et `/auth/token/refresh/`, recevait un `401` cohérent et
explicite — pas une panne réseau).

### Cause räcine (deux bugs distincts, cumulatifs)

1. **`AuthContext.restoreSession()` masquait une session réellement morte.**
   Quand le rafraîchissement du token échouait **définitivement** (401/403
   confirmé par le serveur — pas un incident réseau, déjà filtré en amont dans
   `lib/authClient.ts`), le code affichait quand même l'utilisateur mis en
   cache localement et le déclarait « authentifié ». Le garde de layout
   (`if (!isAuthenticated) router.push("/")`) ne se déclenchait donc jamais,
   et l'utilisateur restait sur un dashboard fantôme où chaque appel API
   échouait en boucle avec 401, sans jamais proposer de se reconnecter.
2. **`networkMonitor.ts` ciblait `http://localhost:8000` en production**,
   au lieu de passer par le proxy Next.js same-origin (`/api/v1`) comme le
   reste de l'application. Ce test de connectivité échouait donc à chaque
   fois en production (hôte injoignable depuis le navigateur), faisant
   afficher un badge « Hors ligne » en permanence — y compris quand l'API
   répondait correctement — brouillant complètement le diagnostic du
   problème réel (une session expirée, pas une coupure réseau).

### Correctifs appliqués

- `AuthContext.restoreSession()` efface désormais le cache local et déclare
  l'utilisateur déconnecté sur un rejet définitif du refresh, au lieu de
  masquer l'expiration — l'utilisateur est renvoyé proprement vers la
  connexion au lieu de rester bloqué.
- `networkMonitor.ts` utilise le même proxy same-origin (`/api/v1`) que le
  reste de l'application pour son test de connectivité.
- Journal d'audit (`/auth/audit/`) : l'ancien plafond fixe `[:100]` (sans
  pagination, sans indication qu'il tronquait l'historique) est remplacé par
  la même pagination serveur que le registre (`page`, `page_size`, `count`,
  `next`, `previous`), avec un bouton « Charger plus » côté interface.

### Point de vigilance qui reste à vérifier côté infrastructure (hors code)

~~Le code ne peut pas exclure une autre cause possible...~~ **Confirmé** : la
variable `SECRET_KEY` sur Render était littéralement égale au placeholder de
`backend/.env.example` (`change-moi-en-production...`), jamais remplacée par
une vraie valeur. C'est une faille de sécurité critique, pas seulement une
cause d'instabilité de session : quiconque connaît ou devine ce placeholder
(visible dans le dépôt) peut forger un JWT valide pour **n'importe quel
compte, y compris Patron**, sur n'importe quel établissement.

**Correctif appliqué en plus** : `core/settings.py` refuse désormais de
démarrer en production (`DEBUG=False`) si `SECRET_KEY` correspond à une valeur
de placeholder connue ou fait moins de 32 caractères — défense en profondeur
pour qu'une erreur de configuration de ce type ne puisse plus jamais tourner
silencieusement. Testé manuellement (placeholder rejeté, clé courte rejetée,
clé aléatoire acceptée).

**Action encore requise côté Render, à faire immédiatement :**
1. Générer une vraie clé aléatoire (`python -c "import secrets; print(secrets.token_urlsafe(64))"`).
2. La définir comme `SECRET_KEY` dans les variables d'environnement Render (jamais dans Git).
3. Redéployer — tous les jetons existants seront invalidés d'un coup (attendu et voulu : tout le monde doit se reconnecter une fois).
4. Vérifier au passage `PLATFORM_ADMIN_PASSWORD` sur Render : même risque si le placeholder `.env.example` y a aussi été copié tel quel.
5. Rotation du secret Cloudinary (déjà notée plus haut) : à faire dans la même passe d'hygiène des secrets.

## 18. OCR pièce d'identité déplacé côté serveur — 27 septembre 2026

**Problème** : le scan de CNI/passeport tournait entièrement dans le navigateur
(`tesseract.js`, moteur WASM). Sur un téléphone d'entrée de gamme en 4G, le
téléchargement du moteur + des données de langue puis l'inférence sur le CPU du
visiteur dépassaient régulièrement le délai de 35 secondes — le visiteur
retombait sur une saisie manuelle après une longue attente, sans champ prérempli.

**Solution** : la lecture se fait désormais sur le serveur avec Tesseract natif
(`pytesseract`), via `POST /api/v1/public/forms/<qr_token>/ocr/`.
- Extraction ciblée CNI ivoirienne (Nom, Prénoms, numéro `CI…`, dates), avec
  repli générique pour les autres documents.
- Throttle dédié `ocr: 6/min` (chaque appel coûte du CPU, plus strict que les
  60/min des autres endpoints publics).
- L'image n'est jamais écrite sur disque ni en base : décodée en mémoire, jetée
  avec la réponse (durée de conservation des documents encore à trancher).
- Dégradation propre : si Tesseract est absent, `available: false` et le
  formulaire retombe sur la saisie manuelle, jamais sur une erreur 500.
- `tesseract.js` retiré des dépendances frontend.

**Contrainte d'infrastructure importante** : le runtime Python natif de Render
ne permet pas d'installer de paquet système (`apt-get`). Le binaire
`tesseract-ocr` n'y est donc pas disponible. Un `backend/Dockerfile` est fourni
(installe `tesseract-ocr` + `tesseract-ocr-fra`) ; **le service Render doit être
basculé en runtime Docker** (Settings > Runtime > Docker) pour que l'OCR serveur
fonctionne en production. Tant que ce n'est pas fait, l'endpoint répond
`available: false` et le formulaire reste utilisable en saisie manuelle.
