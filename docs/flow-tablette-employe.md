# Flow tablette / employé — REKOLLECTE

## Objectif

La tablette est un **kiosque d’accueil** appartenant à l’établissement. Elle ne sert pas à connecter l’employé à son compte personnel : elle affiche le formulaire public de l’établissement et enregistre les visiteurs, même lorsque la connexion est temporairement absente.

## Mise en place par le patron

1. Le patron ouvre **Dashboard → QR code**, télécharge ou affiche le QR avec le logo de l’établissement au centre.
2. Sur la tablette, il ouvre une première fois le lien `/v/<qr_token>` avec Internet.
3. Le formulaire, le logo et les motifs de visite sont alors mis en cache dans IndexedDB du navigateur.
4. Il ajoute la page à l’écran d’accueil ou active le mode plein écran/kiosque du navigateur.
5. Il place la tablette à l’accueil, avec le QR imprimé en solution de secours pour les téléphones des visiteurs.

## Parcours de l’employé d’accueil

1. L’employé laisse la tablette ouverte sur le formulaire visiteur ; aucun compte n’est requis sur cet appareil.
2. Il remet la tablette au visiteur ou lui indique le champ à remplir.
3. Le visiteur saisit ses informations, choisit un motif, complète le champ libre si **Autre** est sélectionné, puis signe au doigt.
4. À la validation, la fiche est écrite immédiatement sur l’appareil. Elle est transmise au serveur si le réseau est disponible, sinon elle reste en attente localement.
5. Le formulaire affiche un écran de confirmation. Sur un téléphone, la page tente de se fermer seule ; sur une tablette, elle revient au formulaire pour le visiteur suivant après remise à zéro.
6. Dès que la tablette retrouve Internet, la synchronisation est silencieuse et idempotente : une coupure ne crée pas de doublon.

## Actualisation des motifs

Le patron modifie les motifs dans **Onboarding → Établissement** ou dans les paramètres. Le bouton **Actualiser** du formulaire permet de recharger les choix lorsque l’appareil est connecté. En mode hors-ligne, la tablette conserve la dernière liste connue.

## Consultation côté dashboard

Le patron et les membres autorisés consultent **Dashboard → Registre**. Les réponses sont visibles selon les champs définis, et les signatures apparaissent sous forme d’aperçu visuel dans la colonne Signature. Le patron peut exporter le registre en CSV ; l’image de signature est représentée par son statut dans l’export.

## Sécurité et limites

Le lien public utilise un token QR opaque. La régénération du QR invalide l’ancien lien côté serveur, mais une tablette hors-ligne continuera temporairement avec son cache jusqu’à sa prochaine connexion. Pour changer d’établissement, il faut recharger le nouveau lien avec Internet et vérifier le logo et le nom avant de remettre la tablette à l’accueil.
