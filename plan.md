# Refonte landing REKOLLECTE — plan approuvé

## Direction design
- **Mouvement** : SaaS éditorial premium, entre landing CRM contemporaine et signalétique terrain. La référence Flowa sert de repère de rythme : hero immersif, cartes produit, preuves, blocs alternés, conversion finale — sans reprise de sa composition ni de ses visuels.
- **Principes** : 1) lisibilité immédiate, 2) démonstration par le produit, 3) contraste fort entre une surface ivoire et un bleu signal, 4) respiration généreuse avec des cartes très arrondies.
- **Couleurs** : ivoire chaud pour humaniser un outil opérationnel, bleu cobalt comme couleur de confiance et d’action, vert acide comme signal d’état/offline, encre bleu nuit pour la profondeur.
- **Paradigme de layout** : une page en “storyboard” vertical avec container flottant, hero à grande scène produit, ruban de preuves, sections alternées image/texte, grandes respirations et footer sombre. Les visuels sortent du rythme par parallaxe et recadrages généreux.
- **Éléments signature** : pastilles de statut type “LIVE / OFFLINE”, halo radial cobalt, cadres dashboard en verre clair, gros mot-motif REKOLLECTE en filigrane.
- **Interaction** : les CTA restent évidents et tactiles ; les cartes réagissent légèrement au survol ; le menu mobile reste fonctionnel ; l’accordéon FAQ est contrôlé au clavier.
- **Animation** : Lenis fournit le scroll inertiel ; GSAP anime les reveals, le déplacement vertical des halos et les images à vitesse différenciée via `data-speed`. Les animations sont désactivées ou réduites avec `prefers-reduced-motion`.
- **Typographie** : Chelsea Market est conservée pour la continuité de marque et les accents éditoriaux ; hiérarchie très large, interlignage serré pour les titres, microcopy monospace simulée par capitales espacées.
- **Essence** : “Le registre visiteurs qui reste fiable quand le terrain ne l’est pas.” Personnalité : directe, rassurante, débrouillarde.
- **Voix** : phrases courtes, concrètes, sans jargon. Exemples : “Le cahier papier avait une mission. Donne-lui une meilleure suite.” / “Un scan à l’accueil. Un registre propre derrière.”
- **Logo** : conserver le mark PNG officiel, agrandi dans un cartouche blanc ; ne pas recréer le wordmark en texte.
- **Couleur propriétaire** : le cobalt `#2E63FF`, utilisé comme signal de conversion et de précision produit.

## Structure technique
- `src/app/(marketing)/page.tsx` : nouvelle landing complète en français, données de contenu centralisées, JSON-LD conservé.
- `src/components/marketing/SmoothScroll.tsx` : intégration client de Lenis avec boucle RAF et arrêt propre.
- `src/components/marketing/Header.tsx` et `Footer.tsx` : navigation cohérente avec la nouvelle palette, routes et CTA conservés.
- `src/app/globals.css` : tokens visuels landing, surfaces, halos, transitions et styles Lenis/reduced-motion ; les styles transverses de l’application restent compatibles.
- `public/manus-routes.json` : route publique `/` déclarée pour Preview/serving.
- `package.json` : ajout de la dépendance `lenis`.

## Contraintes conservées
- CTA principal vers `/connexion`.
- Routes marketing existantes et liens d’aide/légal conservés.
- Assets produits déjà présents dans `public/landing-images` réutilisés, sans nouvelle image générique.
- Landing responsive, mobile-first et compatible avec le thème existant.
