"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "@/components/icons";
import Logo from "@/components/Logo";
import PwaInstallButton from "./PwaInstallButton";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Produit", links: [["Fonctionnalités", "/#fonctionnalites"], ["Comment ça marche", "/#comment-ca-marche"], ["Se connecter", "/connexion"]] },
  { title: "Ressources", links: [["Aide", "/aide"], ["Crédits", "/credits"], ["CGU", "/cgu"], ["Confidentialité", "/confidentialite"], ["Mentions légales", "/mentions-legales"]] },
];

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  return <footer data-footer-zone="true" className="relative isolate min-h-[100svh] max-w-full overflow-hidden bg-mk-deep px-5 pb-8 pt-20 text-deep-ink sm:px-10 lg:pt-28">
    <div className="relative z-10 mx-auto flex min-h-[calc(100svh-7rem)] max-w-[1440px] flex-col justify-between overflow-hidden">
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4">
        <div><Link href="/" className="flex items-center" aria-label="REKOLLECTE, accueil"><Logo size={68} /></Link><p className="mt-4 max-w-[220px] text-sm font-bold leading-relaxed text-mk-sage">Le registre d&apos;accueil qui remplace le cahier — sans compte pour le visiteur, même hors-ligne.</p><PwaInstallButton /></div>
        {COLUMNS.map((column) => <div key={column.title}><h3 className="font-bold text-[10px] uppercase tracking-[0.12em] text-mk-sage">{column.title}</h3><nav className="mt-4 flex flex-col gap-3 text-sm font-bold text-deep-ink" aria-label={column.title}>{column.links.map(([label, href]) => <Link key={href} href={href} className="w-fit transition-colors hover:text-mk-lime">{label}</Link>)}</nav></div>)}
        
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[-5%] bottom-[7.5rem] z-0 max-w-none select-none whitespace-nowrap text-[clamp(3rem,14vw,17rem)] font-bold leading-[0.72] tracking-[-0.09em] text-deep-ink/10">REKOLLECTE</div>
      <div className="relative z-10 mt-20 flex flex-col items-start justify-between gap-4 border-t border-deep-ink/20 pt-6 text-[10px] font-bold uppercase tracking-[0.08em] text-mk-sage sm:flex-row sm:items-center"><span>© 2026 REKOLLECTE</span><Link href="/credits" className="group relative transition-colors hover:text-deep-ink"><span className="underline decoration-deep-ink/20 underline-offset-4">Conçu par AKATech Studio</span><span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-4 w-44 -translate-x-1/2 translate-y-2 rounded-xl border border-deep-ink/10 bg-mk-paper p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"><Image src="/akatech-studio-logo.webp" alt="Logo AKATech Studio" width={176} height={72} className="h-auto w-full rounded-lg object-contain" /></span></Link><button onClick={scrollTop} className="flex items-center gap-2 transition-colors hover:text-mk-lime">Retour en haut <ArrowUp size={13} /></button></div>
    </div>
  </footer>;
}
