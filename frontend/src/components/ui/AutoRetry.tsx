"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { PageSkeleton, type SkeletonVariant } from "@/components/ui/Skeleton";

// Délai croissant entre deux relances automatiques d'une même page (3 s, 5 s, 8 s… plafonné à 20 s).
// La mémoire survit au démontage : la page repasse par son squelette entre deux essais.
const history = new Map<string, { attempt: number; at: number }>();

function nextDelay(key: string): number {
  const now = Date.now();
  const previous = history.get(key);
  const attempt = previous && now - previous.at < 120_000 ? previous.attempt + 1 : 0;
  history.set(key, { attempt, at: now });
  return Math.min(Math.round(3_000 * 1.6 ** attempt), 20_000);
}

/** Remplace l'écran d'erreur « Impossible de charger… [Réessayer] » : la page reste en squelette et se relance
 * toute seule (délai croissant, et tout de suite au retour du réseau ou de l'onglet). Aucun bouton à taper. */
export default function AutoRetry({ onRetry, variant = "default", label = "Reconnexion au serveur…" }: { onRetry: () => void; variant?: SkeletonVariant; label?: string }) {
  const pathname = usePathname();
  const retryRef = useRef(onRetry);
  retryRef.current = onRetry;
  const [delay] = useState(() => nextDelay(pathname));
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(delay / 1_000));

  useEffect(() => {
    const retryAt = Date.now() + delay;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      retryRef.current();
    };
    const timer = window.setTimeout(fire, delay);
    const tick = window.setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000))), 500);
    const onVisible = () => { if (document.visibilityState === "visible") fire(); };
    window.addEventListener("online", fire);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
      window.removeEventListener("online", fire);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [delay]);

  return (
    <div className="space-y-4">
      <p role="status" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-soft">
        <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-ink-soft/30 border-t-ink-soft" />
        Le serveur met un peu de temps à répondre. Nouvelle tentative automatique{secondsLeft > 0 ? ` dans ${secondsLeft} s` : "…"}
      </p>
      <PageSkeleton variant={variant} label={label} />
    </div>
  );
}
