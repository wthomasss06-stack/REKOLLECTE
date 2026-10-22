"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { CONSENT_EVENT, actionForTarget, readConsent, trackAction, trackPage, type ConsentChoice } from "@/lib/analytics";

/** Relie le site à la mesure d’audience : une page vue à chaque changement de page publique, et les clics d’action (connexion, contact).
 * Tout est conditionné au consentement (voir lib/analytics.ts) ; sans accord ce composant ne fait rien et ne rend rien. */
export default function SiteAnalytics() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTracked.current === pathname || !readConsent()?.analytics) return;
    lastTracked.current = pathname;
    trackPage(pathname);
  }, [pathname]);

  useEffect(() => {
    // Le choix vient d’être fait : une acceptation compte la page en cours, un refus ou un retrait remet le compteur à zéro.
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<ConsentChoice>).detail;
      if (detail?.analytics) { lastTracked.current = window.location.pathname; trackPage(window.location.pathname); }
      else lastTracked.current = null;
    };
    const onClick = (event: MouseEvent) => {
      const action = actionForTarget(event.target);
      if (action) trackAction(action);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener(CONSENT_EVENT, onConsent); document.removeEventListener("click", onClick, true); };
  }, []);

  return null;
}
