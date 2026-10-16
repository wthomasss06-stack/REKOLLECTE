"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDoubleLeft, CaretDoubleRight, GearSix, House, QrCode, SignOut, SquaresFour, UsersThree } from "@phosphor-icons/react";
import ThemeToggle from "@/components/ThemeToggle";
import type { AccountRole, OrganizationCapabilities } from "@/types";
import { useLogout } from "./useLogout";

const SIDEBAR_COLLAPSED_KEY = "qr-register.sidebarCollapsed";

export default function Sidebar({ orgName, orgLogo = "", userName = "", role, capabilities }: { orgName: string; orgLogo?: string; userName?: string; role: AccountRole; capabilities?: OrganizationCapabilities }) {
  const [collapsed, setCollapsed] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const pathname = usePathname();
  const askLogout = useLogout(userName);

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

  const showKarnet = Boolean(capabilities?.karnet);
  // Quatre entrées, dans cet ordre, pour tous les rôles. La quatrième est REKOLLECTE au Niveau 1 ; au Niveau 2, REKOLLECTE+ prend
  // exactement sa place (même route, mêmes premières lignes, plus les outils) : rien ne bouge pour la personne qui l'utilise.
  // Ce que chaque rôle voit DANS Paramètres et REKOLLECTE est filtré dans ces pages, pas ici.
  const links = [
    { href: "/dashboard", label: "Visiteurs", icon: UsersThree, exact: true, also: [] as string[] },
    { href: "/dashboard/accueil", label: role === "STAFF" ? "Accueil" : "Mode Staff", icon: House, exact: true, also: [] as string[] },
    { href: "/dashboard/rekollecte", label: showKarnet ? "REKOLLECTE+" : "REKOLLECTE", icon: showKarnet ? SquaresFour : QrCode, exact: false, also: ["/dashboard/karnet"] },
    { href: "/dashboard/parametres", label: "Paramètres", icon: GearSix, exact: false, also: [] as string[] },
  ];
  const active = (href: string, exact: boolean, also: string[]) => (exact ? pathname === href : pathname.startsWith(href)) || also.some((prefix) => pathname.startsWith(prefix));
  const Brand = () => orgLogo ? <img src={orgLogo} alt={`Logo de ${orgName}`} className="h-9 w-9 shrink-0 rounded-lg object-contain" referrerPolicy="no-referrer" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cta text-xs font-bold text-white">{orgName.slice(0, 2).toUpperCase()}</div>;
  return <>
    <aside className={`fixed bottom-0 left-0 top-14 z-40 hidden flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200 md:flex ${collapsed ? "w-[72px]" : "w-64"}`} aria-label="Navigation principale">
      <div className="flex items-center gap-3 border-b border-border p-4"><Brand /><div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}><p className="text-[10px] uppercase tracking-wide text-ink-soft">Établissement</p><p className="truncate font-heading text-sm font-semibold text-ink">{orgName}</p></div>{!collapsed && <button type="button" onClick={() => setCollapsed(true)} aria-label="Réduire la navigation" aria-expanded="true" title="Réduire la navigation" className="shrink-0 rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleLeft size={18} weight="bold" /></button>}</div>
      {collapsed && <button type="button" onClick={() => setCollapsed(false)} aria-label="Déplier la navigation" aria-expanded="false" title="Déplier la navigation" className="mx-auto mt-3 rounded-md p-2 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleRight size={18} weight="bold" /></button>}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ href, label, icon: Icon, exact, also }) => <Link key={href} href={href} title={collapsed ? label : undefined} aria-current={active(href, exact, also) ? "page" : undefined} className={`flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium ${active(href, exact, also) ? "bg-cta text-cta-ink" : "text-ink-soft hover:bg-canvas"}`}><Icon size={18} weight="bold" className="shrink-0" /><span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>{label}</span></Link>)}
      </nav>
      <div className="border-t border-border p-3"><div className="space-y-1"><div className="flex justify-center py-1"><ThemeToggle /></div><button onClick={askLogout} title={collapsed ? "Déconnexion" : undefined} className="flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas"><SignOut size={18} weight="bold" className="shrink-0" /><span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>Déconnexion</span></button></div></div>
    </aside>
    <nav aria-label="Navigation principale" className="fixed inset-x-3 bottom-3 z-20 flex justify-between rounded-full bg-cta px-1.5 py-1.5 shadow-xl md:hidden">{links.map(({ href, label, icon: Icon, exact, also }) => <Link key={href} href={href} aria-current={active(href, exact, also) ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 overflow-hidden rounded-full px-1 py-2 text-[10px] font-medium ${active(href, exact, also) ? "text-cta-ink" : "text-cta-ink/55"}`}><Icon size={19} weight="bold" /><span className="max-w-full truncate whitespace-nowrap">{label}</span></Link>)}</nav>
  </>;
}
