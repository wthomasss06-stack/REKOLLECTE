"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Carrousel auto-rotatif à fondu enchaîné (CSS opacity, pas de JS par frame :
 * performant, pas de layout-thrashing). Utilisé pour présenter Niveau 1 puis
 * Niveau 2 (REKOLLECTE+) côte à côte dans le Hero, la section Sécurité et le
 * Parcours, sans dupliquer la mécanique à chaque endroit.
 *
 * Respecte prefers-reduced-motion (pas de rotation automatique) et expose des
 * puces cliquables pour naviguer manuellement sans attendre le minuteur.
 */
export default function AutoSlide({
  slides,
  interval = 6500,
  className = "",
  showDots = true,
}: {
  slides: React.ReactNode[];
  interval?: number;
  className?: string;
  /** Masque les puces de navigation — utile quand le carrousel sert de simple
   * fond d'image (ex. section CTA) plutôt que de contenu principal. */
  showDots?: boolean;
}) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, interval);
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    restart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // restart() ferme sur `slides`/`interval` via les props du composant ; pas besoin
    // de les lister explicitement, ils ne changent pas entre deux rendus ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, interval]);

  if (slides.length <= 1) return <div className={className}>{slides[0]}</div>;

  return (
    <div className={`h-full ${className}`}>
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            aria-hidden={index !== active}
            className={
              index === active
                ? "relative h-full opacity-100 transition-opacity duration-700 ease-out"
                : "pointer-events-none absolute inset-0 h-full opacity-0 transition-opacity duration-700 ease-out"
            }
          >
            {slide}
          </div>
        ))}
      </div>
      {showDots && (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Diapositive ${index + 1} sur ${slides.length}`}
              aria-current={index === active}
              onClick={() => {
                setActive(index);
                restart();
              }}
              className={`h-1.5 rounded-full transition-all ${index === active ? "w-6 bg-mk-moss" : "w-1.5 bg-mk-ink/20 hover:bg-mk-ink/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
