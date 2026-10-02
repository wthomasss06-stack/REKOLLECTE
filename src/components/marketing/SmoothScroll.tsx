"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __qrLenis?: Lenis;
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.05,
    });

    window.__qrLenis = lenis;
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
      delete window.__qrLenis;
    };
  }, []);

  return null;
}
