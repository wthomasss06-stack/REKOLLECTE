"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { ArrowUpRight } from "@/components/icons";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import StaggeredMenu, { StaggeredMenuTrigger } from "@/components/marketing/StaggeredMenu";

gsap.registerPlugin(useGSAP);

const NAV_LINKS = [
  { href: "/#produit", label: "Le produit" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
];

export default function Header() {
  const navRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(footerVisible || (y > lastY && y > 100 && !menuOpen));
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [footerVisible, menuOpen]);

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("[data-footer-zone]");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(Boolean(entry?.isIntersecting)), { threshold: 0.12 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useGSAP(() => {
    gsap.from(navRef.current, { y: -18, opacity: 0, duration: 0.75, ease: "power3.out", delay: 0.2 });
  }, { scope: navRef });

  return (
    <>
      <header ref={navRef} className={`site-header ${hidden ? "site-header--hidden" : ""}`}>
        <Link href="/" className="site-header__brand" aria-label="REKOLLECTE, accueil">
          <span className="site-header__mark"><Logo size={34} /></span>
          <span className="site-header__name">REKOLLECTE</span>
        </Link>

        <nav className="site-header__nav" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <ThemeToggle />
          <Link href="/connexion" className="site-header__cta">Créer mon espace <ArrowUpRight size={14} /></Link>
        </nav>

        <div className="site-header__mobile"><StaggeredMenuTrigger open={menuOpen} onClick={() => setMenuOpen((value) => !value)} /></div>
      </header>
      <StaggeredMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={NAV_LINKS} />
    </>
  );
}
