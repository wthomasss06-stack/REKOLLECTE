"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { ArrowUpRight } from "@/components/icons";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import StaggeredMenu, { StaggeredMenuTrigger } from "@/components/marketing/StaggeredMenu";

gsap.registerPlugin(useGSAP);

// `id` = section de la landing surveillée pour surligner le lien actif (pilule blanche
// façon Flowa) ; les liens sans id sont actifs selon l'URL (ex. /aide).
const NAV_LINKS = [
  { href: "/#accueil", label: "Accueil", id: "accueil" },
  { href: "/#fonctionnalites", label: "Fonctionnalités", id: "fonctionnalites" },
  { href: "/#comment-ca-marche", label: "Comment ça marche", id: "comment-ca-marche" },
  { href: "/aide", label: "Aide" },
];
const SECTION_IDS = NAV_LINKS.flatMap((link) => (link.id ? [link.id] : []));

export default function Header() {
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("accueil");

  // Se cache en descendant, revient en remontant.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > 80 && !menuOpen);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  // Lien actif sur la landing : la section qui croise le milieu de l'écran.
  useEffect(() => {
    if (pathname !== "/") return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActiveId(entry.target.id); }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTION_IDS.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [pathname]);

  useGSAP(
    () => {
      gsap.from(navRef.current, { y: -30, opacity: 0, duration: 0.8, ease: "power3.out" });
    },
    { scope: navRef }
  );

  const isActive = (link: (typeof NAV_LINKS)[number]) => (link.id ? pathname === "/" && activeId === link.id : pathname === link.href);

  return (
    <>
      <header
        ref={navRef}
        className={`fixed inset-x-0 top-0 z-30 grid h-[84px] grid-cols-[1fr_auto_1fr] items-center px-4 transition-transform duration-300 sm:px-8 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <Link href="/#accueil" className="flex items-center justify-self-start" aria-label="REKOLLECTE, accueil">
          <Logo size={56} />
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-border bg-canvas/70 p-1 shadow-subtle backdrop-blur-xl md:flex"
          aria-label="Navigation principale"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link) ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[12px] font-bold transition-all duration-300 ${
                isActive(link) ? "bg-surface text-ink shadow-subtle ring-1 ring-border" : "text-ink-soft hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 justify-self-end md:flex">
          <ThemeToggle />
          <Link
            href="/connexion"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-[18px] py-3 text-[12px] font-bold text-ink shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-cta"
          >
            Se connecter <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="col-start-3 justify-self-end md:hidden"><StaggeredMenuTrigger open={menuOpen} onClick={() => setMenuOpen((v) => !v)} /></div>
      </header>
      <StaggeredMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={NAV_LINKS} />
    </>
  );
}
