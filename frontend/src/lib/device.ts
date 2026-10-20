/**
 * Tablette d'accueil partagée (kiosque) ou téléphone personnel d'un visiteur ?
 *
 * - Kiosque : application installée (plein écran) OU écran dont le petit côté fait au moins 600 px (tablette 7" comprise,
 *   ce que l'ancien test « largeur < 640 px » classait à tort comme un téléphone).
 * - Sur un kiosque : on remet le formulaire à zéro entre deux visiteurs et on coupe l'autocomplétion du navigateur,
 *   sinon la tablette proposerait au visiteur suivant le nom et le téléphone du précédent.
 */
export function isKioskLikeDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches) return true;
    return Math.min(window.screen.width, window.screen.height) >= 600;
  } catch {
    return false;
  }
}
