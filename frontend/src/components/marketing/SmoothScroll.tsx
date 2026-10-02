"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll Lenis pour toute la zone marketing — repris de la référence
 * gemini-code (Lenis 1.x) :
 *  - easing exponentiel + durée 1.2 s
 *  - scrollTo avec décalage (offset) pour les ancres, sous le header fixe
 *  - durée dynamique par section via l'attribut data-lenis-duration
 *  - vitesse instantanée exposée aux composants (marquee, skew)
 * Lenis est branché sur le ticker GSAP : ScrollTrigger reste synchronisé au pixel près.
 * Désactivé si l'utilisateur demande moins de mouvement.
 */

const EXPO_OUT = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
const BASE_DURATION = 1.2;
const ANCHOR_OFFSET = -96;

const LenisContext = createContext<Lenis | null>(null);

/** Instance Lenis courante (null avant montage ou si prefers-reduced-motion). */
export function useLenis() {
  return useContext(LenisContext);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const instance = new Lenis({
      duration: BASE_DURATION,
      easing: EXPO_OUT,
      smoothWheel: true,
      wheelMultiplier: 1,
      autoRaf: false,
    });

    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    // Ancres internes (#section) : défilement fluide avec offset au lieu du saut natif.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      instance.scrollTo(target, { offset: ANCHOR_OFFSET, duration: 1.6, easing: EXPO_OUT });
      window.history.pushState(null, "", url.hash);
    };
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  // À chaque page marketing : retour en haut (ou ancre de l'URL), et observation des
  // sections qui demandent une durée de scroll propre (data-lenis-duration="2.2").
  useEffect(() => {
    if (!lenis) return undefined;

    if (window.location.hash) {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target) window.setTimeout(() => lenis.scrollTo(target, { offset: ANCHOR_OFFSET, immediate: true }), 120);
    } else {
      lenis.scrollTo(0, { immediate: true });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const custom = Number((entry.target as HTMLElement).dataset.lenisDuration);
          if (entry.isIntersecting && custom) lenis.options.duration = custom;
          else if (!entry.isIntersecting) lenis.options.duration = BASE_DURATION;
        });
      },
      { threshold: 0.5 },
    );
    document.querySelectorAll("[data-lenis-duration]").forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      lenis.options.duration = BASE_DURATION;
    };
  }, [pathname, lenis]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
