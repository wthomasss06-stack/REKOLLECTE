"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useLenis } from "@/components/marketing/SmoothScroll";

/**
 * Bande défilante en boucle (GSAP, transform uniquement). Sa vitesse réagit à la
 * vélocité de Lenis : elle accélère quand on scrolle vite et prend le sens du
 * défilement, puis revient doucement à son rythme de croisière.
 * Sans animation si l'utilisateur préfère moins de mouvement (la bande reste
 * alors défilable à la main).
 */
export default function Marquee({
  children,
  duration = 40,
  reverse = false,
  className = "",
  trackClassName = "",
}: {
  children: React.ReactNode;
  /** Durée d'un tour complet, en secondes (plus grand = plus lent). */
  duration?: number;
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const tween = gsap.fromTo(
      track,
      { xPercent: reverse ? -50 : 0 },
      { xPercent: reverse ? 0 : -50, ease: "none", duration, repeat: -1 },
    );
    tweenRef.current = tween;
    return () => {
      tween.kill();
      tweenRef.current = null;
    };
  }, [duration, reverse]);

  useEffect(() => {
    if (!lenis) return undefined;
    const onScroll = () => {
      const tween = tweenRef.current;
      if (!tween) return;
      const boost = 1 + Math.min(Math.abs(lenis.velocity) * 0.35, 5);
      const sign = lenis.direction === -1 && Math.abs(lenis.velocity) > 0.5 ? -1 : 1;
      gsap.to(tween, { timeScale: boost * sign, duration: 0.25, overwrite: true, onComplete: () => {
        gsap.to(tween, { timeScale: 1, duration: 1.2, ease: "power2.out" });
      } });
    };
    lenis.on("scroll", onScroll);
    return () => lenis.off("scroll", onScroll);
  }, [lenis]);

  return (
    <div className={`overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] ${className}`}>
      <div ref={trackRef} className={`flex w-max will-change-transform ${trackClassName}`}>
        {/* Contenu dupliqué : la boucle -50 % est invisible. La copie est masquée aux lecteurs d'écran. */}
        <div className="flex shrink-0 items-stretch gap-4 pr-4">{children}</div>
        <div className="flex shrink-0 items-stretch gap-4 pr-4" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
