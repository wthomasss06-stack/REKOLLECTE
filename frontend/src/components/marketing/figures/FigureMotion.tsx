"use client";

import { useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Mouvement des schémas des pages d'information. Ajouté par-dessus du HTML rendu côté serveur : le contenu et les schémas restent lisibles
   sans JavaScript. Réservé à prefers-reduced-motion: no-preference. Les valeurs de départ (éléments masqués) sont posées ici, jamais dans
   le CSS : si le script ne se charge pas, tout reste affiché.

   Chaque schéma `[data-figure]` apparaît à l'arrivée à l'écran, dans l'ordre où il est écrit dans le SVG : cartes et flèches (.fg-pop),
   traits qui se dessinent (.fg-draw), légendes (.fg-fade). Ensuite, tant qu'il est à l'écran : les paquets (.fg-dot[data-travel]) parcourent
   le tracé `[data-path]` du même nom, et les interrupteurs (.fg-toggle) basculent. */

const HIDE_DASH = { strokeDasharray: "1 1.1", strokeDashoffset: 1 }; // « 1 1.1 » plutôt que « 1 » : pas de point résiduel au bout du trait

export default function FigureMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      el.classList.add("pm-ready");

      el.querySelectorAll<HTMLElement>("[data-figure]").forEach((fig) => {
        const items = Array.from(fig.querySelectorAll<SVGElement>(".fg-pop, .fg-draw, .fg-fade"));
        if (items.length === 0) return;
        items.forEach((item) => {
          if (item.classList.contains("fg-draw")) gsap.set(item, HIDE_DASH);
          else gsap.set(item, item.classList.contains("fg-pop") ? { autoAlpha: 0, scale: 0.86 } : { autoAlpha: 0 });
        });

        const loops: gsap.core.Animation[] = [];
        const play = () => {
          fig.querySelectorAll<SVGElement>("[data-travel]").forEach((dot) => {
            const path = fig.querySelector<SVGGeometryElement>(`[data-path="${dot.dataset.travel}"]`);
            if (!path) return;
            const length = path.getTotalLength();
            const reverse = dot.hasAttribute("data-reverse");
            const state = { t: 0 };
            loops.push(gsap.to(state, {
              t: 1, duration: Math.max(1.6, length / 80), ease: "none", repeat: -1, repeatDelay: 1.1,
              onUpdate: () => {
                const point = path.getPointAtLength((reverse ? 1 - state.t : state.t) * length);
                dot.setAttribute("cx", String(point.x));
                dot.setAttribute("cy", String(point.y));
                dot.style.opacity = String(Math.min(1, state.t * 8, (1 - state.t) * 8));
              },
            }));
          });
          fig.querySelectorAll<SVGElement>(".fg-toggle").forEach((toggle) => {
            const knob = toggle.querySelector<SVGCircleElement>(".fg-toggle__knob");
            const track = toggle.querySelector<SVGElement>(".fg-toggle__track");
            if (!knob || !track) return;
            const from = Number(knob.getAttribute("cx"));
            const to = Number(knob.dataset.to);
            loops.push(gsap.timeline({ delay: 0.5, repeat: -1 })
              .to(knob, { attr: { cx: to }, duration: 0.35, ease: "power2.inOut" })
              .call(() => track.classList.add("is-on"), undefined, 0)
              .to(knob, { attr: { cx: from }, duration: 0.35, ease: "power2.inOut" }, "+=1.8")
              .call(() => track.classList.remove("is-on"), undefined, "<")
              .to({}, { duration: 1.2 }));
          });
        };

        const reveal = gsap.timeline({ paused: true, onComplete: play });
        items.forEach((item, index) => {
          const at = Math.min(index * 0.09, 1.5);
          if (item.classList.contains("fg-draw")) reveal.to(item, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, at);
          else if (item.classList.contains("fg-pop")) reveal.to(item, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" }, at);
          else reveal.to(item, { autoAlpha: 1, duration: 0.45, ease: "power1.out" }, at);
        });
        ScrollTrigger.create({ trigger: fig, start: "top 85%", once: true, onEnter: () => reveal.play() });
        // Les boucles ne tournent que tant que le schéma est à l'écran.
        ScrollTrigger.create({ trigger: fig, start: "top bottom", end: "bottom top", onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())) });
      });

      return () => el.classList.remove("pm-ready");
    });

    return () => mm.revert();
  }, { scope: root, dependencies: [pathname] });

  return <div ref={root}>{children}</div>;
}
