"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Info, X } from "@phosphor-icons/react";

import { GooeyPanel } from "@/lib/gooey";

/** Point info sous la grille tarifaire. Le panneau sort du bouton comme une goutte et s’y résorbe à la fermeture : même effet « gooey »
 *  que la cloche de notifications, le menu du profil et les fenêtres de l’application (moteur partagé : lib/gooey.tsx, sans réglage ici).
 *  À l’ouverture : conditions d’essai, garantie « jamais bloqué » et lien vers l’article 6 des conditions d’utilisation.
 *  Se ferme avec Échap, un clic à côté ou la croix ; le panneau flotte au-dessus de la page, il ne décale donc aucune animation de la landing. */
export default function PricingInfo({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative mx-auto mt-8 w-fit">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <Info size={18} weight="bold" className="text-cta" aria-hidden="true" />
        À savoir
      </button>

      {open && (
        <GooeyPanel
          id={panelId}
          role="dialog"
          aria-label="À savoir sur les offres"
          className="absolute left-1/2 top-full z-30 mt-3 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-surface p-5 text-left shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">À savoir sur les offres</p>
            <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Fermer" className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <ul className="space-y-3 text-[0.82rem] leading-relaxed text-ink-soft">
            {notes.map((note) => (
              <li key={note} className="flex gap-2.5">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cta" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
            <li className="flex gap-2.5">
              <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cta" aria-hidden="true" />
              <span>Détails de facturation : <Link href="/cgu" className="underline underline-offset-4 hover:text-ink">conditions d’utilisation, article 6</Link>.</span>
            </li>
          </ul>
        </GooeyPanel>
      )}
    </div>
  );
}
