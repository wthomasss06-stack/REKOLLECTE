# Les six flows et permissions — REKOLLECTE

## Les six flows

| Flow | Parcours | Résultat |
|---|---|---|
| 1 | Onboarding | Connexion Google, détection invitation, rôle, établissement, formulaire, QR et invitation |
| 2 | Visiteur QR | Scan d’un QR de point d’accueil, chargement du formulaire associé, saisie, signature et confirmation |
| 3 | Employé / tablette kiosque | Préparation d’une tablette, cache offline, accueil du visiteur, remise à zéro et synchronisation silencieuse |
| 4 | Patron | Contrôle complet de l’établissement, des formulaires, des points d’accueil, de l’équipe et des actions sensibles |
| 5 | Gérant | Gestion opérationnelle déléguée des formulaires, QR de points d’accueil, tablettes, registre et export |
| 6 | Staff | Accueil quotidien, consultation du registre, mode Staff et utilisation des tablettes sans configuration SaaS |

## Matrice de permissions

| Action | Patron | Gérant | Staff |
|---|:---:|:---:|:---:|
| Consulter le registre | Oui | Oui | Oui |
| Voir réponses, signatures et statistiques | Oui | Oui | Oui |
| Exporter le registre CSV | Oui | Oui | Non |
| Créer un formulaire | Oui | Oui | Non |
| Modifier/renommer un formulaire | Oui | Oui | Non |
| Activer/désactiver un formulaire | Oui | Oui | Non |
| Définir le formulaire par défaut | Oui | Oui | Non |
| Supprimer un formulaire | Oui | Non | Non |
| Créer un point d’accueil/tablette | Oui | Oui | Non |
| Modifier le nom, l’appareil ou le formulaire d’un point | Oui | Oui | Non |
| Afficher/télécharger le QR d’un point | Oui | Oui | Non |
| Désactiver un point d’accueil | Oui | Oui | Non |
| Supprimer un point d’accueil | Oui | Non | Non |
| Régénérer le QR principal historique | Oui | Non | Non |
| Modifier le nom/logo de l’établissement | Oui | Non | Non |
| Modifier les motifs de visite | Oui | Oui | Non |
| Inviter un Gérant | Oui | Non | Non |
| Inviter un Staff | Oui | Oui | Non |
| Utiliser le mode Accueil / Staff | Oui | Oui | Oui |
| Remplir une fiche visiteur sur tablette | Indirectement | Indirectement | Oui au quotidien |

## Règle de sécurité

La matrice frontend sert à afficher ou masquer les actions. La sécurité réelle est appliquée côté API :

- **Patron** : rôle `BOSS`, accès aux actions sensibles ;
- **Gérant** : rôle `GERANT`, accès aux opérations courantes ;
- **Staff** : rôle `STAFF`, consultation et accueil uniquement ;
- **Visiteur** : aucun compte, accès uniquement au formulaire public via un QR actif.

Un Staff ne peut pas contourner l’interface pour modifier un formulaire ou créer un point d’accueil. Un Gérant peut gérer les formulaires et les points d’accueil, inviter un Staff, mais ne peut pas supprimer ces ressources, inviter un Gérant, renommer l’établissement ou régénérer le QR principal.

## Correspondance avec les SVG

Les six diagrammes SVG existants correspondent à cette séquence :

1. `01-flow-onboarding.svg`
2. `02-flow-visiteur-qr.svg`
3. `03-flow-tablette-employe.svg`
4. `04-role-patron-permissions.svg`
5. `05-role-gerant-permissions.svg`
6. `06-role-staff-permissions.svg`

Les trois premiers représentent les parcours produit. Les trois derniers représentent les parcours d’accès et les permissions par rôle. Dans l’interface, ces droits sont consultables depuis l’unique icône **i** de l’onglet **Équipe**, qui ouvre la matrice complète pour les trois rôles.
