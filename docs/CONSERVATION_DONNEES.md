# Conservation des données (brief P0 — dossier ARTCI)

**Les durées ci-dessous sont des valeurs par défaut techniques, à faire valider dans le dossier ARTCI avec votre conseil.** Elles se changent sans code (variables d'environnement, ou réglage de l'établissement pour les visites).

| Catégorie | Durée par défaut | Réglage | Suppression |
|---|---|---|---|
| Visites (registre) | 365 jours | `RETENTION_VISITS_DAYS` ; l'établissement peut choisir 30 à 3650 jours (Paramètres › Données) | **Automatique** : commande `python manage.py purge_expired_visits` (à planifier chaque jour ; `--dry-run` pour simuler) + purge au fil de l'eau (2 % des synchronisations, comme analytics) |
| Fiches clients REKOLLECTE+ | 730 jours après la dernière activité | `RETENTION_CLIENTS_DAYS` | **Manuelle** à ce jour : suppression/anonymisation à la demande d'une personne (Paramètres › Données). Pas de purge automatique : une fiche peut porter des réservations. |
| Journaux d'audit | 365 jours | `RETENTION_AUDIT_DAYS` | Manuelle à ce jour (à automatiser avec la purge quotidienne si vous le souhaitez) |
| Comptes (utilisateurs) | Tant que le compte est actif | — | À la désactivation du compte |
| Paiements et factures | **10 ans** | fixe (`RETENTION_PAYMENTS_YEARS`) | **Jamais purgés avec les visites** : autre modèle ; ils survivent même à la suppression de l'établissement (copie du nom et de l'identifiant) |

Distinction à ne pas confondre : la **fenêtre d'historique** d'un plan (30 jours en Gratuit…) masque l'affichage ; la **durée de conservation** supprime.

## Minimisation
- **Numéro de pièce d'identité** lu par l'OCR : masqué par défaut (3 derniers caractères). Le texte OCR brut n'est **jamais** conservé. L'établissement peut choisir de garder le numéro complet (déconseillé).
- **Motifs prédéfinis uniquement** (option) : retire « Autre » (texte libre) où un visiteur pourrait écrire une donnée de santé.
- Aucune image (photo, scan) n'est renvoyée par la liste du registre.

## Droits des personnes
Paramètres › Données et confidentialité (patron) : export et suppression complets pour une personne, retrouvée par **téléphone ou e-mail exacts** (jamais par nom). Le journal d'audit garde un indice (3 derniers chiffres), jamais l'identifiant complet.

## À faire avant l'ouverture au public
1. Faire relire la mention d'information (`apps/checkins/privacy.py › build_privacy_notice`) et la phrase d'hébergement (`PRIVACY_TRANSFER_NOTE`).
2. Valider les durées ci-dessus.
3. Planifier la commande de purge quotidienne.
