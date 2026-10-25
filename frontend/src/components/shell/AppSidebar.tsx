"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ElementType, type KeyboardEvent, type ReactNode } from "react";
import { CaretRight, SidebarSimple } from "@phosphor-icons/react";

import { GooeyPanel } from "@/lib/gooey";
import { BrandMark } from "./BrandMark";
import "./sidebar.css";

/* Barre latérale de l'espace connecté, même structure que celle d'E-Carnet : en-tête (logo + bouton de repli), navigation en lignes arrondies,
   compte en bas qui ouvre un menu. Sur téléphone, la même navigation devient une barre basse flottante dont la pastille active est une goutte
   « gooey » qui glisse d'un onglet à l'autre. Repliable en rail d'icônes sur ordinateur. Le composant ne reçoit que des données. */

export type SidebarItem = {
  id: string;
  /** Libellé complet : texte de la ligne (ordinateur), nom accessible et bulle du rail. */
  long: string;
  icon: ElementType;
  href: string;
  active: boolean;
  badge?: number;
  /** Titre de groupe affiché au-dessus de l'entrée (ordinateur) ; remplacé par un filet quand la barre est repliée. */
  heading?: string;
};

export type SidebarMenuItem = {
  id: string;
  label?: string;
  icon?: ElementType;
  href?: string;
  onSelect?: () => void;
  tone?: "danger";
  /** Ligne libre (ex. interrupteur d'apparence) à la place d'une commande. */
  node?: ReactNode;
};

export type SidebarAccount = { name: string; email?: string; detail?: string; initials: string; avatarUrl?: string; orgName?: string; orgLogo?: string };

export function SidebarAvatar({ account }: { account: SidebarAccount }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [account.avatarUrl]);
  // eslint-disable-next-line @next/next/no-img-element -- avatar externe (Cloudinary, Google, Facebook)
  return account.avatarUrl && !failed ? <img className="sb__avatar" src={account.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span className="sb__avatar" aria-hidden="true">{account.initials}</span>;
}

/* Barre basse mobile : la pastille de l'onglet actif est une goutte (filtre gooey) qui glisse d'un onglet à l'autre. Deux gouttes : la première
   arrive vite, la seconde la rattrape en rebondissant, et le filtre les fond en une seule matière. Seules `--x`, `--y` et `--size` sont écrites ici ;
   les transitions (supprimées en mouvement réduit) sont dans sidebar.css. */
function useGooeyIndicator(activeId: string | undefined, count: number) {
  const scroll = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  const place = useCallback((animate: boolean) => {
    const host = scroll.current;
    const active = host?.querySelector<HTMLElement>(".sb__item.is-active");
    const goo = host?.querySelector<HTMLElement>(".sb__goo");
    if (!host) return;
    // Sur ordinateur la barre est verticale et la goutte masquée : la ligne active garde alors son propre fond.
    if (!active || !goo || goo.offsetParent === null) { host.removeAttribute("data-goo"); return; }
    if (!animate) goo.dataset.still = "true";
    const a = active.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const size = Math.min(a.width, a.height);
    goo.style.setProperty("--size", `${size}px`);
    goo.style.setProperty("--x", `${a.left - h.left + (a.width - size) / 2}px`);
    goo.style.setProperty("--y", `${a.top - h.top + (a.height - size) / 2}px`);
    host.dataset.goo = "on";
    if (!animate) { void goo.offsetWidth; requestAnimationFrame(() => { delete goo.dataset.still; }); }
  }, []);

  // Premier placement et changement d'onglet : seul le changement d'onglet est animé.
  useEffect(() => { place(placed.current); placed.current = true; }, [activeId, count, place]);
  // Rotation, redimensionnement, polices qui s'installent : la goutte se repositionne sans animation.
  useEffect(() => {
    const host = scroll.current;
    if (!host) return undefined;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    observer?.observe(host);
    return () => { window.removeEventListener("resize", onResize); observer?.disconnect(); };
  }, [place]);
  return scroll;
}

function NavItem({ item }: { item: SidebarItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`sb__item${item.active ? " is-active" : ""}`} aria-current={item.active ? "page" : undefined} aria-label={item.long} data-tip={item.long}>
      <Icon className="sb__icon" size={20} weight="bold" aria-hidden="true" />
      <span className="sb__long">{item.long}</span>
      {item.badge ? <span className="sb__badge" aria-hidden="true">{item.badge > 99 ? "99+" : item.badge}</span> : null}
    </Link>
  );
}

function MenuEntry({ entry, onDone }: { entry: SidebarMenuItem; onDone: () => void }) {
  if (entry.node) return <div className="sb__menu-row" role="none">{entry.node}</div>;
  const Icon = entry.icon;
  const className = `sb__menu-item${entry.tone === "danger" ? " sb__menu-item--danger" : ""}`;
  const body = <>{Icon && <Icon className="sb__icon" size={18} weight="bold" aria-hidden="true" />}<span>{entry.label}</span></>;
  if (entry.href) return <Link role="menuitem" className={className} href={entry.href} onClick={onDone}>{body}</Link>;
  return <button type="button" role="menuitem" className={className} onClick={() => { onDone(); entry.onSelect?.(); }}>{body}</button>;
}

function AccountMenu({ account, menu }: { account: SidebarAccount; menu: SidebarMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open]);

  const close = (returnFocus = false) => { setOpen(false); if (returnFocus) trigger.current?.focus(); };

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(true); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const entries = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
    if (entries.length === 0) return;
    const current = entries.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (event.key === "ArrowDown") next = (current + 1) % entries.length;
    else if (event.key === "ArrowUp") next = (current - 1 + entries.length) % entries.length;
    else if (event.key === "End") next = entries.length - 1;
    event.preventDefault();
    entries[next]?.focus();
  }

  const plain = menu.filter((entry) => entry.tone !== "danger");
  const danger = menu.filter((entry) => entry.tone === "danger");
  return (
    <div className="sb__foot" ref={root}>
      {open && (
        <GooeyPanel id={menuId} className="sb__menu" role="menu" aria-label={`Compte de ${account.name}`} onKeyDown={onMenuKeyDown}>
          {account.email && <p className="sb__menu-email">{account.email}</p>}
          {account.orgName && (
            <p className="sb__menu-org">
              {account.orgLogo
                // eslint-disable-next-line @next/next/no-img-element -- logo d'établissement (Cloudinary)
                ? <img src={account.orgLogo} alt="" referrerPolicy="no-referrer" />
                : <span aria-hidden="true">{account.orgName.slice(0, 2).toUpperCase()}</span>}
              <span>{account.orgName}</span>
            </p>
          )}
          {plain.map((entry) => <MenuEntry key={entry.id} entry={entry} onDone={() => close()} />)}
          {danger.length > 0 && <div className="sb__menu-sep" role="separator" />}
          {danger.map((entry) => <MenuEntry key={entry.id} entry={entry} onDone={() => close()} />)}
        </GooeyPanel>
      )}
      <button ref={trigger} type="button" className={`sb__account${open ? " is-open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={`Compte de ${account.name}`} data-tip={account.name} onClick={() => setOpen((value) => !value)}>
        <SidebarAvatar account={account} />
        <span className="sb__account-copy"><strong>{account.name}</strong>{account.detail && <small>{account.detail}</small>}</span>
        <CaretRight className="sb__chevron" size={16} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppSidebar({ ariaLabel, brand, items, account, menu, tools, collapsed, onToggle }: {
  ariaLabel: string;
  brand: { href: string; title: string; subtitle?: string };
  items: SidebarItem[];
  account: SidebarAccount | null;
  menu: SidebarMenuItem[];
  tools?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const scroll = useGooeyIndicator(items.find((item) => item.active)?.id, items.length);
  return (
    <nav className={`sb${collapsed ? " is-collapsed" : ""}`} aria-label={ariaLabel}>
      {/* Filtre « gooey » de la barre basse : défini ici, jamais affiché. */}
      <svg className="sb__defs" aria-hidden="true" focusable="false" width="0" height="0">
        <defs>
          <filter id="rk-sb-goo" x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="sb__head">
        <Link className="sb__brand" href={brand.href} aria-label={`${brand.title} : retour à l’accueil`}>
          <BrandMark />
          <span className="sb__brand-text"><strong>{brand.title}</strong>{brand.subtitle && <small>{brand.subtitle}</small>}</span>
        </Link>
        <button type="button" className="sb__toggle" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? "Déplier la navigation" : "Replier la navigation"} data-tip={collapsed ? "Déplier" : "Replier"}>
          <SidebarSimple size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="sb__scroll" ref={scroll}>
        <span className="sb__goo" aria-hidden="true"><i className="sb__blob sb__blob--lead" /><i className="sb__blob sb__blob--trail" /></span>
        <ul className="sb__list">
          {items.map((item) => (
            <li key={item.id} className="sb__row">
              {item.heading && <span className="sb__heading" aria-hidden="true">{item.heading}</span>}
              <NavItem item={item} />
            </li>
          ))}
        </ul>
      </div>

      <div className="sb__tools">{tools}</div>

      {account && <AccountMenu account={account} menu={menu} />}
    </nav>
  );
}
