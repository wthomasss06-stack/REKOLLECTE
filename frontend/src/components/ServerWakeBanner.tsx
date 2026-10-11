"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useServerWake, useWakeElapsedSeconds } from "@/hooks/useServerWake";

/** Pastille discrète, dans l'espace connecté, quand le serveur d'hébergement (formule gratuite) se réveille ou que le réseau est coupé.
 * Elle n'apparaît qu'après une demi-seconde (aucun clignotement quand tout répond vite) et disparaît seule. */
export default function ServerWakeBanner() {
  const { status } = useServerWake();
  const pathname = usePathname();
  const seconds = useWakeElapsedSeconds();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Seulement dans l'espace connecté : les pages publiques (accueil, connexion, guides) ne doivent pas être recouvertes
  // par une pastille, et la page de connexion montre déjà l'état du serveur dans sa carte.
  const inApp = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
  if (status !== "waking" || !inApp) return null;

  const message = offline
    ? "Hors ligne : reconnexion automatique dès que le réseau revient."
    : seconds < 20
      ? "Le serveur se réveille…"
      : seconds < 90
        ? "Le serveur se réveille, cela peut prendre jusqu’à une minute la première fois."
        : "Toujours en attente du serveur : on continue d’essayer automatiquement.";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[110] flex justify-center px-3">
      <p role="status" aria-live="polite" className="qr-wake-pill flex max-w-md items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-ink shadow-lg">
        <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-cta/25 border-t-cta" />
        <span>{message}</span>
      </p>
    </div>
  );
}
