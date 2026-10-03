"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "@/components/icons";
import Logo from "@/components/Logo";
import { useLenis } from "@/components/marketing/SmoothScroll";
import PwaInstallButton from "./PwaInstallButton";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Produit", links: [["Fonctionnalités", "/#fonctionnalites"], ["Comment ça marche", "/#comment-ca-marche"], ["Se connecter", "/connexion"]] },
  { title: "Ressources", links: [["Aide", "/aide"], ["Crédits", "/credits"]] },
];

const LEGAL: [string, string][] = [["Confidentialité", "/confidentialite"], ["CGU", "/cgu"], ["Mentions légales", "/mentions-legales"]];

export default function Footer() {
  const lenis = useLenis();
  const scrollTop = () => (lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: "smooth" }));
  return (
    <footer data-footer-zone="true" className="relative isolate max-w-full overflow-hidden px-3 pt-10 sm:px-5">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-t-[2.5rem] border border-b-0 border-border bg-surface px-6 pb-8 pt-12 sm:px-12 sm:pt-16">
        <div className="relative z-10 flex flex-col justify-between gap-12 lg:flex-row">
          <div className="max-w-xs">
            <Link href="/" className="flex w-fit items-center" aria-label="REKOLLECTE, accueil"><Logo size={64} /></Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">Le registre d&apos;accueil qui remplace le cahier — sans compte pour le visiteur, même hors-ligne.</p>
            <PwaInstallButton />
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-bold text-ink">{column.title}</h3>
                <nav className="mt-4 flex flex-col gap-3 text-[0.82rem] text-ink-soft" aria-label={column.title}>
                  {column.links.map(([label, href]) => <Link key={href} href={href} className="w-fit transition-colors hover:text-ink">{label}</Link>)}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Filigrane géant, coupé en bas comme sur la maquette. */}
        <div aria-hidden="true" className="pointer-events-none relative z-0 -mb-[3.2vw] mt-10 select-none overflow-hidden whitespace-nowrap text-center text-[clamp(3rem,15.5vw,14rem)] font-bold leading-[0.8] tracking-[-0.06em] text-cta/[0.07] [mask-image:linear-gradient(#000_45%,transparent)]">
          REKOLLECTE
        </div>

        <div className="relative z-10 mt-6 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-[11px] text-ink-soft sm:flex-row sm:items-center">
          <span>© 2026 REKOLLECTE</span>
          <Link href="/credits" className="group relative transition-colors hover:text-ink">
            <span className="underline decoration-ink/20 underline-offset-4">Conçu par AKATech Studio.</span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-4 w-44 -translate-x-1/2 translate-y-2 rounded-xl border border-border bg-canvas p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
              <Image src="/akatech-studio-logo.webp" alt="Logo AKATech Studio." width={176} height={72} className="h-auto w-full rounded-lg object-contain" />
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Légal">
            {LEGAL.map(([label, href]) => <Link key={href} href={href} className="transition-colors hover:text-ink">{label}</Link>)}
            <button onClick={scrollTop} className="flex items-center gap-1.5 font-bold text-ink transition-opacity hover:opacity-70">Retour en haut <ArrowUp size={13} /></button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
