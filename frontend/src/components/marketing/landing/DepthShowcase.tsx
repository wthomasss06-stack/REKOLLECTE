"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CheckCircle } from "@phosphor-icons/react";

import LevelTabs from "@/components/marketing/landing/LevelTabs";
import { CloudImage } from "@/components/marketing/landing/Media";
import { SHOTS } from "@/lib/landingData";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CARDS = [
  { title: "REKOLLECTE", text: "Le registre visiteurs, enfin simple." },
  { title: "REKOLLECTE+", text: "Fini le surbooking. Des réservations claires." },
];

/**
 * « Effet Profondeur » (réf. gemini-code-1791015137629) : la section s'épingle, l'affiche
 * grandit au scroll (cadre arrondi -> pleine hauteur), le mot géant en arrière-plan monte et
 * la carte flottante s'efface. Scrub lissé, branché sur Lenis via ScrollTrigger.
 * Adaptation : les affiches sont carrées et portent du texte jusqu'aux bords, donc le zoom
 * garde leur ratio (carré) au lieu de recadrer en plein écran 100vw x 100vh.
 */
export default function DepthShowcase() {
  const root = useRef<HTMLElement>(null);
  const [shot, setShot] = useState<0 | 1>(0);

  // Alternance automatique entre les deux niveaux ; un clic remet le compteur à zéro.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setShot((v) => (v === 0 ? 1 : 0)), 6500);
    return () => window.clearInterval(timer);
  }, [shot]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const vw = () => window.innerWidth;
        const vh = () => window.innerHeight;
        const startSide = () => Math.round(Math.min(vw() * (vw() < 768 ? 0.62 : 0.4), vh() * 0.5));
        const endSide = () => Math.round(Math.min(vw(), vh() - 112)); // 112 px libres pour la bascule

        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top top", end: "+=150%", scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
          })
          .fromTo(
            ".lp-depth-box",
            { width: startSide, height: startSide, borderRadius: 28 },
            { width: endSide, height: endSide, borderRadius: () => (endSide() >= vw() ? 0 : 20), ease: "none" },
            0,
          )
          .to(".lp-depth-text", { y: -200, ease: "none" }, 0)
          .to(".lp-depth-card", { y: -150, opacity: 0, ease: "none" }, 0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const card = CARDS[shot]!;

  return (
    <section
      ref={root}
      aria-label="Aperçu du produit"
      className="lp-depth relative flex h-[100svh] items-center justify-center overflow-hidden motion-reduce:h-auto motion-reduce:py-24"
    >
      <div aria-hidden="true" className="lp-depth-text pointer-events-none absolute inset-0 z-[1] grid select-none place-items-center">
        <span className="whitespace-nowrap text-[clamp(3.5rem,15vw,15rem)] font-bold leading-none tracking-[-0.04em] text-ink/[0.07]">REKOLLECTE</span>
      </div>

      <div className="lp-depth-box relative z-[2] aspect-square w-[min(92vw,34rem)] overflow-hidden rounded-[1.75rem] bg-surface shadow-[0_30px_80px_rgba(0,0,0,0.35)] will-change-[width,height]">
        {SHOTS.map((img, i) => (
          <CloudImage
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width: 767px) 100vw, 900px"
            aria-hidden={shot !== i}
            className={`object-cover transition-opacity duration-700 ease-out ${shot === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      <div className="lp-depth-card absolute bottom-[16%] right-4 z-[3] flex max-w-[15rem] items-start gap-3 rounded-2xl border border-white/40 bg-surface/70 px-5 py-4 shadow-xl backdrop-blur-xl md:bottom-[15%] md:right-[10%] md:max-w-[17rem]">
        <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-cta" />
        <div>
          <p className="text-sm font-bold leading-tight text-ink">{card.title}</p>
          <p className="mt-1 text-xs leading-snug text-ink-soft">{card.text}</p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 z-[4] flex justify-center">
        <LevelTabs value={shot} onChange={setShot} />
      </div>
    </section>
  );
}
