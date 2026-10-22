// Verrou de défilement PARTAGÉ par toutes les fenêtres (réglages, dialogues, menu, bandeau cookies).
//
// Avant : chaque fenêtre mémorisait « l’overflow précédent » puis le rétablissait à sa fermeture. Dès que deux fenêtres se
// chevauchaient et se fermaient dans un autre ordre que celui de leur ouverture (ex. une confirmation ouverte depuis un
// réglage), la dernière « restaurait » la valeur « hidden » : la page restait figée, surtout sur mobile (Paramètres, REKOLLECTE+).
// Ici, un compteur : le défilement n’est rétabli que lorsque la DERNIÈRE fenêtre se ferme, quel que soit l’ordre.

let locks = 0;
let originalOverflow = "";

/** Fige le défilement de la page. Retourne la fonction qui libère CE verrou (sans danger si elle est appelée deux fois). */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  if (locks === 0) originalOverflow = document.body.style.overflow;
  locks += 1;
  document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.style.overflow = originalOverflow;
  };
}

/** Filet de sécurité : sans aucune fenêtre ouverte, le défilement ne doit jamais rester figé (page changée, onglet restauré). */
export function releaseStaleScrollLock(): void {
  if (typeof document === "undefined" || locks > 0) return;
  if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
}
