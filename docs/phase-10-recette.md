# Phase 10 — Plan de recette complète (fusion REKOLLECTE + REKOLLECTE+)

Date : 26 septembre 2026

Ce document complète les tests automatisés (`backend/apps/*/tests/`, 65 tests
backend passants) avec les scénarios de la Phase 10 qui demandent un vrai
appareil, un vrai réseau, ou plusieurs postes en parallèle — donc non
automatisables dans une suite `pytest`/`playwright` classique. À dérouler avant
toute ouverture commerciale, sur l'environnement de recette (pas en local).

## Couverture déjà automatisée (ne pas rejouer manuellement)

| Scénario Phase 10 | Test automatisé |
|---|---|
| Doublons avec téléphone (espaces, tirets) | `test_sync_reuses_existing_client_on_second_visit`, `test_sync_matches_same_client_with_dashes_or_country_code_variants` |
| Doublons téléphone local / +225 en création manuelle et réservation | `test_client_create_matches_local_and_international_phone_formats`, `test_reservation_reuses_client_by_normalized_phone` |
| Doublons avec email (casse différente) | `test_sync_matches_same_client_with_case_insensitive_email` |
| Retour d'un client existant | `test_sync_reuses_existing_client_on_second_visit` |
| Désactivation/réactivation de REKOLLECTE+ | `test_reactivating_karnet_restores_capabilities_and_keeps_existing_data` |
| Synchronisation idempotente (rejeu après coupure) | `test_sync_is_idempotent_on_replay` |
| Permissions par rôle (API) | `test_boss_and_gerant_can_create_resource_staff_cannot`, `test_unmarking_a_payment_requires_boss_or_gerant`, etc. |

**Correctif du 5 octobre 2026 :** le rapprochement local / +225 s'applique
maintenant aux trois parcours de création (synchronisation du registre, création
manuelle d'un client et nouveau client créé depuis une réservation). La note
historique ci-dessus concernait un parcours qui a depuis été corrigé ; les tests
automatisés correspondants sont listés dans le tableau. Les fiches déjà
dupliquées en base ne sont pas fusionnées automatiquement.

## À dérouler manuellement

### 1. Parcours hôtelier complet (desktop + mobile)

- [ ] Activer REKOLLECTE+ depuis Paramètres > Administration (compte Patron) sur desktop.
- [ ] Suivre la proposition d'onboarding : créer une chambre via ResourceBuilder (catégorie Hébergement, type Chambre double, tarif « Par nuit »).
- [ ] Scanner le QR depuis un téléphone, remplir le formulaire, vérifier que le visiteur devient un client REKOLLECTE+.
- [ ] Depuis la fiche client (`/dashboard/karnet/clients/<id>`), créer une réservation sur la chambre créée.
- [ ] Marquer la réservation payée, puis terminée ; vérifier le solde et l'historique sur la fiche client.
- [ ] Refaire les mêmes étapes de lecture (fiche client, réservations, paiements) sur mobile (largeur < 400px) : vérifier qu'aucun tableau ne déborde et que les boutons restent atteignables au pouce.

### 2. QR avec plusieurs téléphones

- [ ] Scanner le même QR depuis 2 téléphones différents (iOS + Android si possible) en même temps.
- [ ] Vérifier que les deux soumissions arrivent sans collision d'`idempotency_key` (chaque appareil génère la sienne côté client).
- [ ] Vérifier qu'aucune des deux fiches n'écrase l'autre dans le registre.

### 3. Mode tablette, visiteur sans téléphone

- [ ] Ouvrir `/v/<qr_token>` sur une tablette dédiée, l'ajouter à l'écran d'accueil.
- [ ] Faire remplir le formulaire directement sur la tablette par un visiteur sans téléphone (mode kiosque).
- [ ] Vérifier la remise à zéro du formulaire après soumission, prête pour le visiteur suivant.

### 4. Offline réel

- [ ] Charger `/v/<qr_token>` une première fois avec réseau.
- [ ] Couper le Wi-Fi/données de l'appareil (pas juste `navigator.onLine` — un vrai coupe-réseau).
- [ ] Remplir et soumettre 2-3 fiches hors-ligne ; vérifier qu'elles s'affichent en attente (IndexedDB) sans erreur visible.
- [ ] Fermer complètement l'onglet/l'app, la rouvrir toujours hors-ligne : les fiches en attente doivent être toujours là.
- [ ] Rétablir le réseau : vérifier la synchronisation automatique silencieuse, puis la présence des fiches dans le dashboard (avec rafraîchissement).

### 5. Synchronisation de plusieurs fiches

- [ ] Accumuler 5+ fiches hors-ligne sur un même appareil avant de reconnecter.
- [ ] Vérifier qu'elles arrivent toutes, dans l'ordre, sans doublon ni perte.

### 6. Désactivation puis réactivation de REKOLLECTE+ (contrôle visuel, en plus du test API)

- [ ] Désactiver REKOLLECTE+ depuis un compte Patron pendant que des fiches clients/réservations existent.
- [ ] Vérifier que la sidebar repasse en « Registre » et que les onglets REKOLLECTE+ disparaissent pour tous les rôles.
- [ ] Réactiver : vérifier que les fiches clients et réservations créées avant la coupure sont toujours là, et que les sous-capacités (Paiements/Rappels) retrouvent leur état précédent.

### 7. Doublons — vérification visuelle en plus des tests API

- [ ] Tester un numéro local puis sa forme internationale (`0701020304` vs `+2250701020304`) via le formulaire visiteur, la création manuelle d'un client et la création d'une réservation : vérifier qu'une seule fiche est utilisée.
- [ ] Faire remplir avec un email en majuscules puis minuscules : vérifier une seule fiche.
- [ ] Vérifier manuellement les fiches historiques déjà créées en double : elles ne sont pas fusionnées automatiquement par le correctif.

## Environnements à couvrir

- [ ] Chrome desktop + Safari desktop
- [ ] Chrome Android + Safari iOS
- [ ] Une tablette Android bas de gamme (représentative d'un accueil réel)

## À l'issue de la recette

Consigner chaque écart dans un ticket avec : étape reproduite, appareil/navigateur,
résultat attendu vs observé, capture d'écran. Ne pas ouvrir commercialement avant
d'avoir traité au minimum les écarts bloquants (perte de données, doublon
facturé deux fois, impossibilité de payer).
