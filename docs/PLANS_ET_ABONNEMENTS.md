# Plans et abonnements — mode d'emploi

Implémentation du brief `Brief_implementation_plans_Rekollecte.md` (app `backend/apps/billing`). **Rien n'est verrouillé par défaut.**

## Les trois modes
| Mode | Quand | Effet |
|---|---|---|
| `observe` (défaut) | `PLAN_ENFORCEMENT_STARTS_AT` vide, `PLAN_OBSERVE_MODE=true` | Rien n'est bloqué. Chaque fonction qui *serait* refusée écrit une ligne d'audit `plan.would_block` (au plus une par heure, établissement et fonction). |
| `off` | `PLAN_OBSERVE_MODE=false` | Rien n'est bloqué, rien n'est journalisé. |
| `enforce` | `PLAN_ENFORCEMENT_STARTS_AT` dans le passé | Les limites s'appliquent. Les cadenas s'affichent dans l'interface. |

**Procédure conseillée** : laisser `observe` quelques semaines, lire les `plan.would_block` dans le journal d'administration pour savoir qui serait touché, prévenir par écrit les comptes concernés, puis renseigner `PLAN_ENFORCEMENT_STARTS_AT`.

## Règles intangibles (testées)
1. **La collecte des visiteurs n'est jamais bloquée** : `/checkins/sync/` accepte toujours la fiche, quel que soit le plan (les champs que le plan n'inclut pas — OCR, téléphone — sont simplement écartés).
2. **Export de sortie** (`/checkins/export/?purpose=exit`) toujours disponible, y compris essai terminé ou impayé.
3. **La fenêtre d'historique est une limite d'affichage** : rien n'est supprimé en changeant de plan. La conservation réelle est un réglage séparé (`docs/CONSERVATION_DONNEES.md`).
4. Le plan effectif se calcule **à la lecture** (`services.effective_plan`) : pas de tâche planifiée qui puisse rater une échéance.
5. Erreur de plan, toujours au même format (HTTP 403) : `{"code": "plan_required", "feature": "...", "required_plan": "...", "error": {"message": "..."}}`.

## Où se règlent les quotas
Un seul fichier : `backend/apps/billing/plans.py` (`PLAN_ENTITLEMENTS`). Les valeurs actuelles sont des **hypothèses de départ** à valider. Le palier « ressources » est affiché mais pas encore appliqué (« palier à tester »).

## Cycle de vie d'un établissement
- **Création** → essai de 14 jours de REKOLLECTE+ (`PLAN_TRIAL_DAYS`) automatiquement (signal).
- **Fin d'essai / impayé** → retour au plan Gratuit, données intactes. Un paiement échu garde ses droits pendant `grace_days` (7 par défaut).
- **Comptes existants** → statut `founder` (migration `0002_founders`) : aucune limitation. Pour les limiter : envoyer le préavis écrit par e-mail, puis renseigner dans l'administration « préavis envoyé le » et « limites à partir du ».

## Encaisser un paiement (manuel, avant l'agrégateur)
Administration → Entreprises → bouton carte bancaire → « Enregistrer un paiement » (plan, montant, mois couverts, moyen, **référence unique**). La même référence rejouée n'ajoute rien. Sans référence FNE, le document s'appelle « Reçu interne, non fiscal » ; avec, « Facture électronique (FNE) ». Le futur webhook de l'agrégateur appellera la même fonction `record_payment()`.

## Critères d'acceptation du brief → tests
| Critère | Test |
|---|---|
| Essai fini : données intactes, export de sortie OK | `test_trial_end_falls_back_to_free_without_touching_data`, `test_exit_export_still_works_after_trial_end_and_unpaid` |
| Impayé : la synchronisation accepte toujours | `test_sync_is_never_blocked_by_an_expired_plan_and_drops_non_included_fields`, `test_sync_accepts_fiches_for_a_suspended_billing_state_in_every_mode` |
| Gratuit : pas d'OCR dans le formulaire public, requête directe refusée `plan_required` | `test_enforced_free_plan_removes_ocr_and_phone_from_the_public_form_and_refuses_ocr` |
| Mode observer : rien n'est bloqué, `would_block` journalisé | `test_default_mode_is_observe_and_nothing_is_blocked` |
| Même référence de paiement = un seul paiement | `test_record_payment_is_idempotent_on_the_reference` |
| Sans FNE : « reçu interne, non fiscal » | `test_document_label_is_never_invoice_without_fne_reference` |
| Purge des visites sans toucher aux paiements | `test_purging_visits_never_touches_payments_and_payments_outlive_the_organization` |

## Grille publique et période gratuite
- **Tout est gratuit et libre jusqu'au 1er décembre 2026** : sur la landing page (section « Tarifs »), les prix payants sont barrés avec la mention « Usage libre jusqu'au 1er décembre 2026 ». Même date dans la FAQ, les CGU et le balisage JSON-LD. Interrupteur d'affichage : `FREE_PERIOD_ACTIVE` dans `pricing.ts`. Source unique de l'affichage : `frontend/src/lib/pricing.ts` (prix, date, notes). Source unique des quotas appliqués : `backend/apps/billing/plans.py`. Les deux doivent rester alignés.
- Grille annoncée : Gratuit 0 FCFA, Essentiel 3 000 FCFA/mois, REKOLLECTE+ 7 000 FCFA/mois, Entreprise sur devis ; annuel = 10 mois payés pour 12. Hypothèses de lancement, détail dans `Brief_implementation_plans_Rekollecte.md`.
- Tant que `PLAN_ENFORCEMENT_STARTS_AT` est vide, **rien n'est limité** : la date du 1er décembre est une annonce commerciale, pas un déclencheur technique. Ne renseigner `PLAN_ENFORCEMENT_STARTS_AT` qu'après : immatriculation, inscription FNE, contrat de service et CGU acceptées, préavis écrit aux comptes existants.
- Si ces étapes ne sont pas prêtes au 1er décembre : reporter la date dans `pricing.ts` (une seule constante) et republier. Les pages qui l'affichent suivent toutes seules.

### Checklist du 1er décembre
1. Gates franchies : immatriculation, inscription FNE, contrat de service et CGU acceptées ; autorisation ARTCI si de vraies données (téléphone, pièce d'identité) sont traitées.
2. Préavis écrit envoyé aux comptes existants, puis `PLAN_ENFORCEMENT_STARTS_AT` renseigné dans l'environnement du serveur.
3. `FREE_PERIOD_ACTIVE = false` dans `frontend/src/lib/pricing.ts`, puis republier : les prix s'affichent normalement.
4. Relire les textes qui citent la date : `lib/site.ts`, `lib/landingData.ts` (FAQ), pages « À propos » et « Logiciel de gestion des visiteurs », CGU article 6.

