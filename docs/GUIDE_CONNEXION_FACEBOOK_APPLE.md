# Connexion Facebook et Apple — procédure complète (sans doublon de compte)

> État : le code est écrit, testé et **inerte tant que tu n'as pas ajouté les clés** (un fournisseur sans clés répond 404 et ses boutons restent cachés). Il reste à : déployer, configurer Meta et Apple, activer l'affichage.
> Dernière révision : 4 octobre 2026. Les libellés des tableaux de bord Meta et Apple changent souvent : en cas d'écart, la doc officielle (section *Sources*) fait foi.

---

## 1. La règle anti-doublon (le cœur du sujet)

Un **compte** (`User`) = une personne. Une **identité** (`AuthIdentity`) = une façon de se connecter (Google, Facebook, Apple) rattachée à **un seul** compte. La clé d'une identité est l'identifiant **stable** du fournisseur (`sub` chez Google et Apple, `id` chez Facebook), **jamais l'e-mail** : l'e-mail peut changer, manquer ou être masqué.

À chaque connexion, le serveur applique **toujours le même algorithme** (`resolve_login`, dans `apps/accounts/services.py`) :

| # | Situation | Décision |
|---|-----------|----------|
| 1 | Cette identité (fournisseur + identifiant) est déjà connue | On connecte le compte auquel elle est liée. **Même si l'e-mail a changé ou n'est plus fourni.** |
| 2 | Nouvelle identité, e-mail **vérifié** qui correspond à un compte existant (casse ignorée) | On **rattache** l'identité à ce compte et on le connecte. Aucun nouveau compte. |
| 3 | Nouvelle identité, e-mail vérifié, aucun compte | Flux existant : invitation Staff si elle existe, sinon nouvel espace Patron. |
| 4 | Pas d'e-mail (Facebook inscrit par téléphone), e-mail non vérifié, ou e-mail masqué Apple | **On ne crée rien.** Message clair + voie « Comptes liés » (§ 2). |
| 5 | Utilisateur déjà connecté qui lie un fournisseur (Paramètres > Connexion) | On ajoute l'identité à **son** compte, sans passer par l'e-mail. |

### Ton exemple : « compte Facebook et e-mail, je me connecte avec Facebook aujourd'hui, avec l'e-mail demain »

- **Même adresse e-mail chez Facebook et chez Google** : reconnu automatiquement (ligne 2). Facebook aujourd'hui, Google demain = **le même compte**, un seul espace, un seul historique.
- **Adresses différentes** (Facebook a `awa@yahoo.fr`, Google a `awa@gmail.com`) : **aucun serveur ne peut deviner** que c'est la même personne, et en lier deux automatiquement serait une faille (n'importe qui pourrait prétendre posséder le compte d'un autre). La solution sûre est de lier **manuellement une fois** : se connecter avec la méthode habituelle, puis *Paramètres > Connexion > Lier Facebook*. Ensuite les deux méthodes ouvrent le même compte.
  > ⚠️ **Il faut lier AVANT de se connecter pour la première fois avec Facebook.** Si la personne se connecte d'abord avec Facebook (adresse différente), un second espace est créé : la liaison est alors **refusée** (conflit, l'identité Facebook appartient déjà à ce second espace) et la fusion de deux espaces n'est pas prise en charge (§ 6). C'est la limite incompressible de tout système de connexion sociale : seul un humain peut affirmer « ces deux adresses, c'est moi ».
- **Apple « Masquer mon e-mail »** : Apple fournit une adresse relais (`…@privaterelay.appleid.com`) qui ne correspond à rien d'autre. Même traitement : liaison manuelle, ou refaire l'autorisation en partageant le vrai e-mail (message affiché à l'utilisateur).

### Pourquoi on ne rapproche jamais sur un e-mail non vérifié

Si un fournisseur laissait quelqu'un déclarer l'e-mail de sa victime sans le prouver, rapprocher « par e-mail » reviendrait à lui donner accès à son compte. C'est pourquoi le serveur n'accepte le rapprochement que si le fournisseur garantit l'e-mail. Même précaution dans la doc de django-allauth : le rapprochement automatique n'est sûr que pour des fournisseurs dont l'e-mail est vérifié.

- **Google** : le jeton contient `email_verified` (désormais exigé).
- **Apple** : le jeton contient `email_verified` et `is_private_email`.
- **Facebook** : Meta ne fournit **aucun** champ `email_verified`. Constat communautaire : l'e-mail n'est renvoyé que s'il est confirmé, et absent pour les comptes sans e-mail. Le code le traite donc comme vérifié **s'il est présent**. Pour être plus strict, mets `FACEBOOK_EMAIL_TRUSTED=false` : plus aucun rapprochement automatique avec Facebook, uniquement la liaison manuelle.

### Les invitations Staff continuent de marcher

Le patron invite un collaborateur **par e-mail**. Si ce collaborateur se connecte plus tard avec Facebook ou Apple, l'invitation est appliquée **seulement si l'e-mail est vérifié et identique** (même règle). Si son e-mail Facebook/Apple est différent ou masqué, il ne rejoint pas l'équipe par accident : il doit se connecter avec l'e-mail invité, ou le patron l'invite avec l'adresse que le fournisseur renvoie.

### Comptes existants (tous créés avec Google)

Aucune migration de données : à leur **prochaine connexion Google**, l'identité est enregistrée automatiquement (leur `sub` n'était pas stocké jusqu'ici). Aucun doublon, aucune action.

---

## 2. Ce que le code fait

| Élément | Rôle |
|---|---|
| `AuthIdentity` + migration `0008` | Table des identités. Contraintes d'unicité : (fournisseur, identifiant) **et** (compte, fournisseur). La base refuse un doublon même si deux connexions arrivent en même temps. |
| `resolve_login()` | L'algorithme du § 1, utilisé par **Google, Facebook et Apple**. Relit une fois en cas de course. |
| `apps/accounts/oauth.py` | Échange du code, lecture du profil. Facebook : `debug_token` (jeton émis pour notre app et le bon utilisateur). Apple : signature du jeton vérifiée via les clés publiques d'Apple, `iss`, `aud`, `exp`, `nonce`. |
| `apps/accounts/oauth_views.py` | `start`, `callback`, `link` (lier), liste et retrait des identités. |
| `/connexion` | Boutons Facebook et Apple (selon `NEXT_PUBLIC_AUTH_PROVIDERS`) et messages d'erreur lisibles. |
| `/connexion/callback` | Page d'arrivée : reprend la session par le cookie de refresh, comme après un rechargement. |
| Paramètres > **Connexion** | Liste des méthodes, **Lier Facebook/Apple**, **Retirer** (jamais la dernière). Visible par tous les rôles. |

**Flux (côté serveur, pas de SDK dans le navigateur)** : bouton → `/api/v1/auth/<fournisseur>/start/` → fournisseur → `/api/v1/auth/<fournisseur>/callback` → le serveur échange le code, résout le compte, pose le cookie de session → `/connexion/callback` → `/dashboard` (ou `/onboarding` pour un nouvel espace).

**Sécurité intégrée** : `state` signé (10 min) + cookie `qr_oauth_state` à usage unique (anti « login CSRF »), nonce Apple lié au jeton, `state` valable pour un seul fournisseur, limitation de débit, journal d'audit lors d'une liaison, impossibilité de retirer la dernière méthode, un seul compte Facebook et un seul compte Apple par espace.

**Codes d'erreur renvoyés** (`/connexion?auth_error=…`) : `state` (expiré), `cancelled`, `provider` (fournisseur injoignable), `session`, `conflict` (déjà utilisé par un autre espace), `access_revoked`, `email_missing`, `email_unverified`, `email_private_relay`.

> **Changement de comportement côté Google** : la connexion Google passe maintenant par `resolve_login` et **refuse un e-mail Google non vérifié** (auparavant non contrôlé). Les jetons Google réels portent `email_verified: true`, donc aucun utilisateur normal n'est impacté.

---

## 3. Mise en service, dans cet ordre

### Étape 1 — Déployer le code (rien ne change pour les utilisateurs)
1. Appliquer le zip, puis `pip install -r backend/requirements.txt` (ajoute `PyJWT` et `cryptography`).
2. Pousser. Render lance `migrate` au démarrage (migration `0008`).
3. **Vérifier que la connexion Google marche toujours** et que *Paramètres > Connexion* affiche « Google ».

### Étape 2 — Facebook (Meta for Developers)
1. Créer une app **Business** (ou « Consumer » selon l'écran proposé) ; ajouter le produit/cas d'usage **Facebook Login** (« S'authentifier et demander des données aux utilisateurs avec Facebook Login »).
2. Permissions : `public_profile` et `email` suffisent (accès standard, **sans revue Meta**).
3. *Facebook Login > Paramètres* : activer le **login OAuth client web** et renseigner **URI de redirection OAuth valides** :
   `https://rekollecte-ci.vercel.app/api/v1/auth/facebook/callback`
   (copie exacte, **sans slash final**, en HTTPS).
4. *Paramètres de base* : copier l'**ID de l'app** et la **Clé secrète**. Renseigner l'URL de la **politique de confidentialité** (`/confidentialite`), l'icône, la catégorie, et **l'instruction ou le rappel de suppression des données** (une page ou une section qui explique comment faire supprimer ses données, avec un contact).
5. Passer l'app en mode **Live** (en mode Développement, seuls les rôles de l'app peuvent se connecter ; utile pour tester d'abord avec un compte de test).
6. Sur **Render** : `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` (et éventuellement `FACEBOOK_GRAPH_VERSION`, défaut `v25.0`, à aligner sur la version affichée dans ton tableau de bord).

### Étape 3 — Apple
Prérequis : compte **Apple Developer Program** (payant, annuel).
1. *Certificates, Identifiers & Profiles > Identifiers* : créer un **App ID** avec la capacité **Sign in with Apple**.
2. Créer un **Services ID** (ex. `ci.rekollecte.web`) : c'est lui le `client_id`. Activer *Sign in with Apple* et *Configure* :
   - **App ID principal** : celui de l'étape 1 ;
   - **Domaines** : `rekollecte-ci.vercel.app` ;
   - **Return URLs** : `https://rekollecte-ci.vercel.app/api/v1/auth/apple/callback` (sans slash final).
   Apple refuse `localhost` et tout ce qui n'est pas en HTTPS : on teste donc sur le domaine déployé.
3. *Keys* : créer une clé avec **Sign in with Apple**, rattachée à l'App ID. **Télécharger le fichier `.p8` (une seule fois)** et noter le **Key ID**.
4. Noter le **Team ID** (*Membership*).
5. Sur **Render** :
   - `APPLE_SERVICES_ID` = l'identifiant du Services ID ;
   - `APPLE_TEAM_ID`, `APPLE_KEY_ID` ;
   - `APPLE_PRIVATE_KEY` = contenu du `.p8` **sur une seule ligne**, chaque retour à la ligne remplacé par `\n`.
   Le « secret » Apple est un jeton signé que le code **génère à la demande** (valable 5 minutes) : plus aucune échéance de 6 mois à renouveler.
6. Si le portail Apple demande une **vérification de domaine**, placer le fichier fourni dans `frontend/public/.well-known/apple-developer-domain-association.txt` (servi tel quel, sans redirection). Un **domaine personnalisé** (plutôt que `*.vercel.app`) est plus fiable et portable : voir § 6.

**Particularités Apple** : le nom (et l'e-mail) ne sont envoyés qu'à la **toute première** autorisation ; le serveur les lit à ce moment-là. Pour « repartir de zéro » en test : Réglages Apple ID > Connexion et sécurité > Se connecter avec Apple > REKOLLECTE > *Arrêter d'utiliser*.

### Étape 4 — Afficher les boutons
Sur **Vercel** : `NEXT_PUBLIC_AUTH_PROVIDERS=google,facebook,apple` (ne mettre que ceux qui sont prêts), puis **redéployer** : la variable est lue **au build**.

Variables **Render** attendues : `FRONTEND_URL` (URL publique exacte, elle sert à construire l'URL de retour), et celles des étapes 2 et 3.

---

## 4. Recette manuelle (à dérouler avant d'ouvrir au public)

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 1 | Nouveau compte via Facebook (e-mail présent) | Espace créé, `/onboarding`. |
| 2 | Déconnexion, puis Google avec **le même e-mail** | Même espace, `is_new` faux, *Paramètres > Connexion* liste 2 méthodes. |
| 3 | Facebook avec **un autre e-mail** que Google | Nouvel espace (aucun moyen de deviner). Puis, depuis le premier compte, *Lier Facebook* : *Conflit* attendu (l'identité appartient déjà au 2ᵉ espace). **Le bon ordre est de lier avant le 1ᵉʳ login Facebook.** |
| 4 | Compte Facebook sans e-mail (inscrit par téléphone) | Retour `/connexion` avec le message « aucune adresse e-mail… », **aucun compte créé**. |
| 5 | Apple en **Masquer mon e-mail** | Message `email_private_relay`, aucun compte créé. |
| 6 | Connecté avec Google, *Paramètres > Connexion > Lier Apple* (e-mail masqué) | « Apple » apparaît ; Apple seul ouvre ensuite le même compte. |
| 7 | Retirer la dernière méthode | Bouton désactivé / refus `last_identity`. |
| 8 | Annuler chez le fournisseur | Retour `/connexion` : « Connexion annulée ». |
| 9 | Invité Staff qui se connecte par Facebook avec l'e-mail invité | Il rejoint l'équipe, aucun nouvel espace Patron. |
| 10 | **iPhone Safari** : connexion Apple de bout en bout | Doit aboutir (cookie du retour Apple en `SameSite=None; Secure`). |

---

## 5. Dépannage

| Symptôme | Cause probable |
|---|---|
| Facebook : « URL non autorisée » / erreur de redirection | L'URI de redirection n'est pas **identique au caractère près** (slash final, `http`/`https`, domaine). |
| Facebook : seul le propriétaire de l'app peut se connecter | App encore en mode Développement. |
| Apple : `invalid_client` ou `invalid_grant` | `APPLE_SERVICES_ID` ≠ Services ID, mauvais `Key ID`/`Team ID`, clé `.p8` mal collée (retours à la ligne) ou Return URL différente. |
| Apple : retour sur `/connexion?auth_error=state` | Cookie `qr_oauth_state` absent (blocage de cookies) ou connexion démarrée il y a plus de 10 minutes. |
| Un bouton n'apparaît pas | Variable absente **au moment du build** : redéployer Vercel. |
| Un bouton mène à une page 404 | Fournisseur sans clés côté Render (volontaire : fournisseur désactivé). |

---

## 6. Recommandations hors code

- **Domaine personnalisé** (ex. `rekollecte.ci`) : pour Apple (URLs de retour, vérification de domaine) et pour la marque. Un changement de domaine impose de **mettre à jour** les URLs chez Meta et Apple, `FRONTEND_URL` et `NEXT_PUBLIC_SITE_URL`.
- **Fusion de deux comptes existants** (même personne, deux e-mails) : hors périmètre ; la liaison manuelle ne fusionne pas deux espaces. À traiter à la main (support) si le cas se présente.
- **Page de suppression de données** : exigée par Meta pour passer en Live ; une section de `/confidentialite` avec un contact suffit au départ.

---

## 7. Sources

- Meta — Facebook Login, flux manuel (code d'autorisation, `debug_token`, `/me`) : https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
- Meta — Facebook Login pour le web : https://developers.facebook.com/docs/facebook-login/web
- Apple — Sign in with Apple REST API (autorisation, `form_post`, jeton, clés publiques) : https://developer.apple.com/documentation/signinwithapplerestapi
- django-allauth — rapprochement automatique par e-mail et ses précautions : https://docs.allauth.org/en/latest/socialaccount/configuration.html
