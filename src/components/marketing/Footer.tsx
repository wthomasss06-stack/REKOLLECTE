"use client";

import Link from "next/link";
import { ArrowUp } from "@/components/icons";
import Logo from "@/components/Logo";
import PwaInstallButton from "./PwaInstallButton";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Produit", links: [["Le produit", "/#produit"], ["Fonctionnalités", "/#fonctionnalites"], ["Comment ça marche", "/#comment-ca-marche"], ["Créer mon espace", "/connexion"]] },
  { title: "Ressources", links: [["Aide", "/aide"], ["Crédits", "/credits"], ["CGU", "/cgu"], ["Confidentialité", "/confidentialite"], ["Mentions légales", "/mentions-legales"]] },
];

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer data-footer-zone="true" className="landing-footer">
      <div className="landing-footer__orb landing-footer__orb--one" />
      <div className="landing-footer__orb landing-footer__orb--two" />
      <div className="landing-footer__inner">
        <div className="landing-footer__topline"><span>REKOLLECTE / 2026</span><span>Conçu pour le terrain à Abidjan</span></div>
        <div className="landing-footer__headline">
          <div>
            <div className="landing-footer__brand"><span className="landing-footer__mark"><Logo size={40} /></span><span>REKOLLECTE</span></div>
            <p>Le registre d&apos;accueil qui reste fiable quand le réseau ne suit pas.</p>
            <PwaInstallButton />
          </div>
          <div className="landing-footer__cta-copy"><span className="eyebrow eyebrow--light">La prochaine visite commence ici</span><Link href="/connexion" className="footer-action">Créer mon espace <ArrowUp size={16} /></Link></div>
        </div>
        <div className="landing-footer__grid">
          {COLUMNS.map((column) => <div key={column.title}><h3>{column.title}</h3><nav aria-label={column.title}>{column.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav></div>)}
          <div><h3>Promesse</h3><p className="landing-footer__note">Un scan à l&apos;accueil. Un registre propre derrière. Même hors-ligne.</p></div>
        </div>
        <div className="landing-footer__bottom"><span>© 2026 REKOLLECTE — AKATech Studio.</span><button onClick={scrollTop}>Retour en haut <ArrowUp size={13} /></button></div>
      </div>
    </footer>
  );
}
