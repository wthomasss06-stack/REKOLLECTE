"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import Loader from "@/components/Loader";

// Délai croissant entre deux relances automatiques d'une même page (3 s, 5 s, 8 s… plafonné à 20 s).
// La mémoire survit au démontage : la page repasse par son chargement entre deux essais.
const history = new Map<string, { attempt: number; at: number }>();

function nextDelay(key: string): number {
  const now = Date.now();
  const previous = history.get(key);
  const attempt = previous && now - previous.at < 120_000 ? previous.attempt + 1 : 0;
  history.set(key, { attempt, at: now });
  return Math.min(Math.round(3_000 * 1.6 ** attempt), 20_000);
}

/** Remplace l'écran d'erreur « Impossible de charger… [Réessayer] » : la page reste sur le chargement de marque et se relance
 * toute seule (délai croissant, et tout de suite au retour du réseau ou de l'onglet). Aucun bouton à taper, aucun message technique
 * (« le serveur se réveille… ») : seul le chargement REKOLLECTE reste affiché. */
export default function AutoRetry({ onRetry, label = "Chargement…" }: { onRetry: () => void; label?: string }) {
  const pathname = usePathname();
  const retryRef = useRef(onRetry);
  retryRef.current = onRetry;
  const [delay] = useState(() => nextDelay(pathname));

  useEffect(() => {
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      retryRef.current();
    };
    const timer = window.setTimeout(fire, delay);
    const onVisible = () => { if (document.visibilityState === "visible") fire(); };
    window.addEventListener("online", fire);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", fire);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [delay]);

  return <Loader fullScreen={false} label={label} />;
}
