"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Rubrique ouverte dans une fenêtre, pilotée aussi par l’adresse : `?open=<id>` ouvre la fenêtre (liens profonds, anciens liens redirigés,
 * « Mon profil » du header). Le paramètre `open` est retiré dès qu’il est lu ; les autres (`client`, `new`, `auth_error`…) restent
 * pour que la rubrique les lise, et sont nettoyés à la fermeture pour ne pas filtrer la prochaine ouverture.
 * À utiliser sous une frontière <Suspense> (useSearchParams). */
export function useModalParam<T extends string>(valid: readonly T[]) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [openId, setOpenId] = useState<T | null>(null);
  const wanted = searchParams.get("open");

  useEffect(() => {
    if (!wanted || !(valid as readonly string[]).includes(wanted)) return;
    setOpenId(wanted as T);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    } catch {
      // L’adresse garde son paramètre : sans conséquence.
    }
  }, [wanted, valid]);

  const close = useCallback(() => {
    setOpenId(null);
    try { window.history.replaceState(window.history.state, "", pathname); } catch { /* ignoré */ }
  }, [pathname]);

  return { openId, open: setOpenId, close };
}
