"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

import { ArrowUpRight, CloseIcon } from "@/components/icons";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import PwaInstallButton from "@/components/marketing/PwaInstallButton";

interface MenuItem {
  href: string;
  label: string;
}

export default function StaggeredMenu({ open, onClose, items }: { open: boolean; onClose: () => void; items: MenuItem[] }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const targets = menu.querySelectorAll<HTMLElement>("[data-stagger-item]");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      gsap.set(menu, { autoAlpha: open ? 1 : 0, clipPath: open ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" });
      gsap.set(targets, { autoAlpha: open ? 1 : 0, y: 0 });
      menu.style.pointerEvents = open ? "auto" : "none";
      return;
    }

    if (open) {
      menu.style.pointerEvents = "auto";
      gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: () => closeRef.current?.focus() })
        .set(menu, { autoAlpha: 1, clipPath: "inset(0% 0% 100% 0%)" })
        .to(menu, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.46 })
        .fromTo(targets, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.055 }, "-=0.22");
    } else {
      gsap.timeline({ defaults: { ease: "power2.in" }, onComplete: () => { menu.style.pointerEvents = "none"; } })
        .to(targets, { autoAlpha: 0, y: -8, duration: 0.16, stagger: 0.018 })
        .to(menu, { clipPath: "inset(0% 0% 100% 0%)", autoAlpha: 0, duration: 0.32 }, "-=0.06");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open, onClose]);

  return (
    <div ref={menuRef} id="qr-staggered-menu" className="qr-staggered-menu md:hidden" role="dialog" aria-modal="true" aria-label="Navigation mobile" aria-hidden={!open}>
      <div className="qr-staggered-menu__topline" data-stagger-item>
        <Link href="/" onClick={onClose} className="flex items-center gap-3" aria-label="Retour à l’accueil">
          <Logo size={36} />
          <span><strong className="block text-sm font-bold text-mk-ink">Navigation</strong><small className="block text-[11px] text-mk-ink/60">REKOLLECTE</small></span>
        </Link>
        <button ref={closeRef} type="button" onClick={onClose} className="qr-staggered-menu__close" aria-label="Fermer le menu"><CloseIcon size={20} /></button>
      </div>
      <nav className="qr-staggered-menu__nav" aria-label="Navigation mobile">
        <p className="qr-staggered-menu__eyebrow" data-stagger-item>Navigation</p>
        {items.map((item, index) => <Link key={item.href} href={item.href} onClick={onClose} data-stagger-item className="qr-staggered-menu__entry"><span className="qr-staggered-menu__index">{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span><ArrowUpRight size={18} /></Link>)}
        <div data-stagger-item className="mt-5 flex items-center justify-between gap-4 border-t border-mk-ink/10 pt-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-mk-ink">Apparence</p><p className="mt-1 text-xs text-mk-ink/60">Choisir le thème</p></div>
          <ThemeToggle />
        </div>
        {/* Ne s'affiche que si le navigateur propose l'installation (sinon rien, pas de bloc vide). */}
        <div data-stagger-item className="flex justify-center"><PwaInstallButton /></div>
        <Link href="/connexion" onClick={onClose} data-stagger-item className="qr-staggered-menu__cta">Se connecter <ArrowUpRight size={18} /></Link>
      </nav>
      <p className="qr-staggered-menu__footer" data-stagger-item>Un accueil plus simple, même quand le réseau ne suit pas.</p>
    </div>
  );
}

export function StaggeredMenuTrigger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-expanded={open} aria-controls="qr-staggered-menu" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="qr-staggered-trigger"><span className="qr-staggered-trigger__bars" aria-hidden="true"><i /><i /><i /></span><span>{open ? "Fermer" : "Menu"}</span></button>;
}
