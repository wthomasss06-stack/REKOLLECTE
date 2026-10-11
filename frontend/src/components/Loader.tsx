import Logo from "./Logo";
import { PageSkeleton, type SkeletonVariant } from "./ui/Skeleton";

/** Chargement de marque.
 * - `fullScreen` (défaut) : écran plein cadre avec le logo — pour les pages qui n'ont pas encore de mise en page (onboarding, formulaire visiteur).
 * - `fullScreen={false}` : dans l'espace connecté, un SQUELETTE de page (la mise en page apparaît tout de suite, les données s'y glissent)
 *   à la place d'un logo qui pulse. `variant` choisit la forme du squelette. */
export default function Loader({ label = "Chargement...", fullScreen = true, variant = "default" }: { label?: string; fullScreen?: boolean; variant?: SkeletonVariant }) {
  if (!fullScreen) return <PageSkeleton variant={variant} label={label} />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Logo size={96} className="animate-pulse" />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
