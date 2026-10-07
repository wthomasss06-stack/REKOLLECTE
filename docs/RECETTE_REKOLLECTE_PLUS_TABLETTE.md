# REKOLLECTE+ — mise en service et recette sur tablette

Ce document accompagne les corrections du parcours REKOLLECTE+ (guide Premiers pas, cibles tactiles 44 px,
annulation confirmée, doublons de clients, sonnerie des rappels).

## 1. Doublons de clients déjà en base (à faire une fois)

La normalisation empêche de **nouveaux** doublons (0701020304 et +225 07 01 02 03 04 = même fiche, aussi à la
modification d'une fiche). Les doublons **déjà créés** avant restent : la commande ci-dessous les fusionne.

```bash
cd backend
python manage.py dedupe_karnet_clients              # SIMULATION : liste ce qui serait fusionné, ne modifie rien
python manage.py dedupe_karnet_clients --apply      # fusionne pour de bon (idempotent)
python manage.py dedupe_karnet_clients --org <uuid> # limiter à un établissement
```

- Même e-mail ou même téléphone (tous formats) = même personne. La fiche conservée est la plus active, puis la plus ancienne.
- Réservations et passages des doublons sont **rattachés** à la fiche conservée : aucun historique perdu.
- Relis la simulation avant `--apply` : **deux personnes qui partagent volontairement un numéro** (ex. le standard d'une
  entreprise) seraient fusionnées, comme le fait déjà la création d'un client.
- Render gratuit n'a pas de shell : lance la commande en local avec `DATABASE_URL` de production exportée, après une sauvegarde.

## 2. Recette de la sonnerie — À FAIRE SUR LA VRAIE TABLETTE

La sonnerie ne peut pas être vérifiée sans l'appareil : les règles audio dépendent du navigateur et du système.
Le code détecte et affiche l'état réel du son, mais seul ce test confirme que ta tablette sonne.

| # | Test | Résultat attendu |
|---|------|------------------|
| 1 | Rappels > « Activer la sonnerie » | Trois bips immédiats, état « Sonnerie active ». |
| 2 | « Tester le son » | Trois bips. Sinon : message « le son est resté bloqué » (volume, mode silencieux). |
| 3 | Créer une réservation d'1 h, la raccourcir en base ou attendre la fin du créneau, rester sur **Réservations** | Bannière rouge « 1 créneau terminé à traiter » + sonnerie + titre de l'onglet `(1) Rappel à traiter`. |
| 4 | Recharger la page, ne rien toucher | État « bloqué » + bouton « Réactiver le son ». **Un premier appui n'importe où** rétablit le son. |
| 5 | Verrouiller l'écran 2 min puis le rallumer | Le rattrapage est immédiat au retour ; le son peut être « bloqué » : appuyer pour le rétablir. |
| 6 | iPhone/iPad : activer le **mode silencieux** | La sonnerie doit quand même sonner (Safari 16.4+). Sinon, baisser le commutateur. |
| 7 | Cocher « Garder l'écran allumé » | La tablette ne se met plus en veille tant que l'onglet est affiché (si le navigateur le permet). |
| 8 | Laisser un rappel non traité 2 min | La sonnerie se répète toutes les 2 minutes. |

**Limites incompressibles d'une page web** : une tablette en veille ou un onglet fermé ne sonnent pas. Pour un accueil
critique, installer l'application (PWA), laisser l'écran allumé aux heures de service, et ne pas compter sur le son seul
(la bannière et le titre de l'onglet restent les filets de sécurité).

## 3. Autres vérifications rapides

- Activer REKOLLECTE+ sur un établissement neuf : la carte « Premiers pas » propose ressource, client, réservation, encaissement, dans cet ordre, et se coche toute seule.
- Un Staff voit « Un Patron ou un Gérant doit créer la première ressource » (il ne peut pas la créer).
- Réservations : « Annuler » et « Terminée » demandent confirmation ; Paiements : « Annuler l'encaissement » aussi.
- Tablette/téléphone : champs, onglets et boutons ≥ 44 px (sur souris, la densité d'origine est conservée).
