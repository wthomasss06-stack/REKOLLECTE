"use client";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDoubleLeft, CaretDoubleRight, SignOut } from "@phosphor-icons/react";
import ThemeToggle from "@/components/ThemeToggle";

const SIDEBAR_COLLAPSED_KEY = "qr-register.sidebarCollapsed";

export interface NavItem {
  key: string;
  label: string;
  /** Libellé court de la barre du bas (téléphone) : 7 caractères au plus pour tenir sur un écran de 320 px. */
  short?: string;
  icon: ElementType;
  /** Entrée qui change de page. Sans `href`, c'est un bouton (l'appelant gère l'onglet via `onSelect`). */
  href?: string;
  exact?: boolean;
  also?: string[];
  /** Pastille (ex. nombre de retours à traiter). */
  badge?: number | null;
}

/**
 * Navigation commune de l'espace connecté ET de l'administration : barre latérale repliable sur ordinateur, barre arrondie en bas sur téléphone.
 * Les deux espaces ont ainsi exactement la même ergonomie, le même repli mémorisé et les mêmes états actifs.
 * Pages (`href`) : l'entrée active vient de l'adresse. Onglets (sans `href`) : elle vient de `activeKey`.
 */
export default function AppNav({ items, activeKey, onSelect, brand, eyebrow, title, onLogout }: {
  items: NavItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  brand: ReactNode;
  eyebrow: string;
  title: string;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // Le menu reste utilisable si le stockage local est indisponible.
    }
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Le choix reste appliqué à l'écran pour cette session.
    }
  }, [collapsed, preferenceLoaded]);

  const isActive = (item: NavItem) => {
    if (!item.href) return item.key === activeKey;
    return (item.exact ? pathname === item.href : pathname.startsWith(item.href)) || (item.also ?? []).some((prefix) => pathname.startsWith(prefix));
  };
  const fade = `whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`;
  const desktopClass = (active: boolean) => `relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-sm font-medium ${active ? "bg-cta text-cta-ink" : "text-ink-soft hover:bg-canvas"}`;
  const mobileClass = (active: boolean) => `relative flex min-w-0 flex-1 flex-col items-center gap-1 overflow-hidden rounded-full px-1 py-2 text-[10px] font-medium ${active ? "text-cta-ink" : "text-cta-ink/75"}`;

  const render = (item: NavItem, mobile: boolean) => {
    const active = isActive(item);
    const Icon = item.icon;
    const content = mobile
      ? <><Icon size={19} weight="bold" /><span className="max-w-full truncate whitespace-nowrap">{item.short ?? item.label}</span>{item.badge ? <span aria-hidden="true" className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-mk-lime ring-2 ring-cta" /> : null}</>
      : <><Icon size={18} weight="bold" className="shrink-0" /><span className={`flex-1 ${fade}`}>{item.label}</span>{item.badge ? <span className={`grid min-w-[1.25rem] place-items-center rounded-full bg-mk-lime px-1.5 text-[10px] font-bold leading-5 text-cta ${collapsed ? "absolute right-1.5 top-1.5 h-2 min-w-0 w-2 px-0 text-[0px]" : ""}`}>{collapsed ? "" : item.badge}</span> : null}</>;
    const common = {
      "aria-current": active ? ("page" as const) : undefined,
      className: mobile ? mobileClass(active) : desktopClass(active),
      title: !mobile && collapsed ? item.label : undefined,
    };
    if (item.href && !onSelect) return <Link key={item.key} href={item.href} {...common}>{content}</Link>;
    return <button key={item.key} type="button" onClick={() => (item.href ? undefined : onSelect?.(item.key))} {...common}>{content}</button>;
  };

  return <>
    <aside className={`fixed bottom-0 left-0 top-14 z-40 hidden flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200 md:flex ${collapsed ? "w-[72px]" : "w-64"}`} aria-label="Navigation principale">
      <div className="flex items-center gap-3 border-b border-border p-4">
        {brand}
        <div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">{eyebrow}</p>
          <p className="truncate font-heading text-sm font-semibold text-ink">{title}</p>
        </div>
        {!collapsed && <button type="button" onClick={() => setCollapsed(true)} aria-label="Réduire la navigation" aria-expanded="true" title="Réduire la navigation" className="shrink-0 rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleLeft size={18} weight="bold" /></button>}
      </div>
      {collapsed && <button type="button" onClick={() => setCollapsed(false)} aria-label="Déplier la navigation" aria-expanded="false" title="Déplier la navigation" className="mx-auto mt-3 rounded-md p-2 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleRight size={18} weight="bold" /></button>}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items.map((item) => render(item, false))}</nav>
      <div className="border-t border-border p-3">
        <div className="space-y-1">
          <div className="flex justify-center py-1"><ThemeToggle /></div>
          <button type="button" onClick={onLogout} title={collapsed ? "Déconnexion" : undefined} className="flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas"><SignOut size={18} weight="bold" className="shrink-0" /><span className={fade}>Déconnexion</span></button>
        </div>
      </div>
    </aside>
    <nav aria-label="Navigation principale" className="fixed inset-x-3 bottom-3 z-20 flex justify-between rounded-full bg-cta px-1.5 py-1.5 shadow-xl md:hidden">{items.map((item) => render(item, true))}</nav>
  </>;
}
