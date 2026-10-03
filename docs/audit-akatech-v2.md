# Audit AKATech v2 — QR Register SaaS

**Date :** 21 septembre 2026  
**Périmètre :** backend Django/DRF, frontend Next.js/PWA, sécurité, équipe, API, résilience et release gate.  
**Skills utilisés :** `akatech-backend-architect`, `akatech-frontend-architect`, `akatech-qa-release-gate`, `akatech-documentation-expert`, `akatech-readme`.

## Verdict

### Statut : PASS AVEC RÉSERVES — P0 applicatif traité, validation staging encore nécessaire

Le projet compile et les tests fonctionnels passent. Les garde-fous de suspension, la chaîne PWA, les contrôles de configuration production, la révocation d’équipe, le journal d’audit, le contrat OpenAPI, les tests E2E et la mesure Web Vitals ont été ajoutés. L’audit npm ne remonte plus de vulnérabilité de production modérée, élevée ou critique ; les alertes restantes concernent Playwright, dépendance de test uniquement. La recette staging réelle et la restauration PostgreSQL restent à exécuter avec les secrets et domaines de l’environnement cible.

## Vérifications exécutées

| Domaine | Résultat | Preuve |
| --- | --- | --- |
| Migrations Django | Pass | `python manage.py makemigrations --check` |
| Backend | Pass | **26 tests passants** après ajout des tests de révocation |
| Frontend TypeScript | Pass | `npm run type-check` |
| Build Next.js + Serwist | Pass | 22 routes générées et service worker compilé |
| E2E desktop/mobile | Pass | 4 scénarios publics passants ; 4 scénarios authentifiés correctement skip sans `E2E_AUTH_TOKEN` |
| Skills AKATech | Pass | 16 skills installés et validés par `quick_validate.py` |
| Secret réel dans le code | Aucun trouvé | Les valeurs repérées sont des exemples/documentation |
| RBAC organisation suspendue | Corrigé | Permission serveur, QR public et sync offline couverts par test |
| Dépendances de production | Pass avec réserve dev | 0 vulnérabilité prod high/critical ; alertes Playwright limitées aux tests |
| Configuration production | Implémentée | `backend/scripts/verify_production.py` |
| Accès équipe | Implémenté | Révocation invitation/membre, message au login et journal d’audit |
| Contrat API | Implémenté | `docs/openapi.yaml`, `/api/schema/`, `/api/docs/` |
| Résilience | Implémentée | NetworkMonitor, logs corrélés, scripts backup/restore et Web Vitals |

## Blocants avant production

### 1. Recette sécurité et navigateur staging

Les tests backend couvrent le RBAC et l’IDOR, et Playwright couvre les smoke tests publics. Il faut encore exécuter la recette authentifiée avec `E2E_AUTH_TOKEN` sur staging : connexion Google, refresh, multi-onglet, expiration, formulaires, QR, suspension et viewport mobile. Il faut aussi vérifier qu’un service worker ancien ne sert pas un formulaire après suspension.

### 2. Vérification des secrets et de l’infrastructure cible

Les variables Render/Vercel/Neon ne sont pas accessibles depuis l’archive. Depuis l’environnement staging, lancer `python scripts/verify_production.py`, `python manage.py migrate`, `python manage.py collectstatic --noinput`, les tests, puis vérifier HTTPS, cookies Secure/SameSite, CORS/CSRF, HSTS, backups et restauration sur une base temporaire.

### 3. Documentation juridique et upload logo

Le champ logo actuel accepte une URL. Si le besoin commercial exige un upload direct, il faut encore brancher un stockage validé avec contrôle MIME, taille et droits. Les mentions légales doivent encore recevoir les informations juridiques définitives d’AKATech Studio..

## Corrections réalisées

- Une entreprise suspendue ne peut plus résoudre son QR public ni recevoir une fiche offline.
- `IsOrgMember` et `IsBossOrGerant` tiennent compte de la suspension.
- Le Patron peut révoquer une invitation ou un membre avec raison ; l’action est journalisée.
- Un utilisateur révoqué reçoit `code=access_revoked` et un message explicite à sa prochaine connexion.
- Le journal d’audit expose les événements d’équipe aux rôles autorisés.
- Les frontmatters des 16 skills AKATech sont valides.
- `next-pwa`/Workbox a été remplacé par Serwist ; Next.js, PostCSS, Browserslist et UUID ont été mis à niveau.
- Les garde-fous production refusent clé courte, `DEBUG=True`, `ALLOWED_HOSTS=*`, CORS générique et CSRF non HTTPS.
- Le schéma OpenAPI est généré et versionné.
- Les erreurs API sont normalisées côté frontend avec message, code, statut et indicateur retryable.
- Un NetworkMonitor vérifie la disponibilité réelle de l’API au lieu de dépendre uniquement de `navigator.onLine`.
- Les requêtes backend incluent `X-Request-ID`, durée, route et statut sans journaliser de secrets.
- Les scripts de sauvegarde/restauration PostgreSQL et le runbook d’exploitation sont livrés.
- Les Core Web Vitals CLS, INP, LCP, FCP et TTFB peuvent être envoyés à un endpoint first-party configuré.
- Les images `fill` de la page de connexion déclarent maintenant `sizes` pour limiter le téléchargement inutile.

## État fonctionnel et suite

| Sujet | État | Suite |
| --- | --- | --- |
| Formulaires multiples | Implémenté | Exécuter la recette E2E authentifiée mobile |
| QR multiples | Implémenté | Tester suppression, cache et suspension sur staging |
| Onglet Entreprise | Implémenté | Remplacer l’URL par upload validé si requis |
| Révocation membre/invitation | Implémenté | Vérifier notifications et politique de rétention d’audit |
| Message prochain login | Implémenté backend | Vérifier le rendu exact avec Google OAuth réel |
| Persistance session | Implémentée par refresh cookie | Exécuter le scénario Playwright staging |
| Admin plateforme | Implémenté | Vérifier refresh, expiration et séparation BOSS/plateforme |
| API OpenAPI | Implémenté | Faire relire les réponses API et compléter les annotations restantes |
| Observabilité | Implémentée | Brancher logs et alertes à l’hébergeur |
| Sauvegardes | Scripts livrés | Effectuer une restauration réelle sur base temporaire |
| Accessibilité | Partielle | Recette clavier, lecteur d’écran, contrastes et 320/375 px |
| Performance | Instrumentée | Collecter les métriques sur staging et fixer les seuils |

## Réserves techniques

- Les tests utilisent une clé JWT de développement courte ; la production est désormais bloquée si `SECRET_KEY` fait moins de 32 caractères.
- Django signale l’absence de `backend/staticfiles/` en test ; le pipeline doit lancer `collectstatic`.
- La génération OpenAPI fonctionne mais les APIViews historiques sans `serializer_class` produisent encore des schémas génériques ; les annotations peuvent être complétées par domaine.
- Les alertes Playwright restantes sont dev-only et ne doivent pas être incluses dans l’image de production ; maintenir cette séparation dans le pipeline.

## Fichiers modifiés dans ce cycle P0 à P2

- `frontend/package.json` et `frontend/package-lock.json`
- `frontend/next.config.mjs`, `frontend/tsconfig.json`
- `frontend/src/app/sw.ts`, `frontend/src/components/Providers.tsx`, `frontend/src/components/WebVitals.tsx`
- `frontend/src/lib/errors.ts`, `frontend/src/lib/networkMonitor.ts`, `frontend/src/lib/api.ts`
- `frontend/src/hooks/useSubmitForm.ts`, `frontend/src/hooks/useBackgroundSync.ts`
- `frontend/playwright.config.ts`, `frontend/e2e/critical.spec.ts`
- `backend/core/settings.py`, `backend/core/urls.py`, `backend/requirements.txt`
- `backend/apps/common/middleware.py`
- `backend/apps/accounts/models.py`, `serializers.py`, `services.py`, `views.py`, `urls.py`, migration et tests
- `backend/.env.example`, `backend/scripts/*`
- `.gitignore`
- `docs/openapi.yaml`, `docs/production-runbook.md`, `docs/audit-akatech-v2.md`

Le zip livré contient uniquement ces fichiers modifiés, avec leurs chemins relatifs conservés.

## Correctifs ajoutés le 21 septembre 2026 — Cloudinary et confirmations

Le champ URL du logo a été remplacé par un composant de dépôt d’image avec aperçu, glisser-déposer, limite de 5 Mo et états d’upload. Le navigateur demande une signature courte au backend ; le secret Cloudinary ne quitte jamais le serveur et l’image finale est lue depuis `secure_url` Cloudinary. Les écrans Entreprise et Onboarding utilisent le même composant.

Chaque formulaire dispose maintenant d’un bouton **Modifier** qui ouvre le constructeur dans une modale dédiée. Les suppressions de formulaires et de QR codes affichent une confirmation navigateur explicite avant l’appel API ; les suppressions d’entreprise, de membres et les actions équivalentes conservent le même garde-fou. L’espace Administration plateforme reste séparé, accessible via `/admin`, avec ses onglets desktop et mobile et les variables `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` injectées dans Render.

La validation de cette itération donne **27 tests backend passants**, un type-check et un build frontend réussis. La génération OpenAPI passe avec les erreurs de déduction déjà connues des APIViews non typées ; elles n’empêchent pas la génération et doivent être traitées séparément pour obtenir une documentation complète sans fallback.

## Correctifs du 21 septembre 2026 — Render et Recharts

Le build Render échouait pendant l’import de Django lorsque `DEBUG=False` et que `SECRET_KEY` n’était pas encore injectée dans l’environnement de build. Les validations bloquantes ont été sorties de l’import de `settings.py` et centralisées dans `scripts/verify_production.py`, qui reste le contrôle obligatoire avant staging et démarrage production. Le comportement a été reproduit avec un secret court : `django check`, migrations et tests passent désormais sans masquer le contrôle de sécurité dédié.

Le registre utilise désormais Recharts v3.10.1 pour rendre une courbe réactive des visites par heure et un histogramme horizontal des motifs fréquents. Les graphiques se recalculent automatiquement avec les données de `/checkins/stats/`, sont responsive et disposent d’un tooltip accessible visuellement. Validation finale : 27 tests backend passants, build/type-check frontend passants et 0 vulnérabilité npm.
