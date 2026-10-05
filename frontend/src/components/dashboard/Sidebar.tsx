"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretDoubleLeft, CaretDoubleRight, ClipboardText, GearSix, House, SignOut, SquaresFour } from "@phosphor-icons/react";
import ThemeToggle from "@/components/ThemeToggle";
import { apiClient } from "@/lib/api";
import { setAccessToken } from "@/lib/tokenStore";
import { clearSessionCache } from "@/lib/sessionStore";
import type { AccountRole, OrganizationCapabilities } from "@/types";
import { useDialog } from "@/components/ui/DialogProvider";
import { dayPartWish, firstNameOf } from "@/lib/greeting";

const SIDEBAR_COLLAPSED_KEY = "qr-register.sidebarCollapsed";

export default function Sidebar({ orgName, orgLogo = "", userName = "", role, capabilities }: { orgName: string; orgLogo?: string; userName?: string; role: AccountRole; capabilities?: OrganizationCapabilities }) {
  const [collapsed, setCollapsed] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useDialog();

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
  const links = role === "STAFF"
    ? [{ href: "/dashboard/accueil", label: "Accueil", icon: House, exact: true }, { href: "/dashboard", label: showKarnet ? "Clients" : "Registre", icon: ClipboardText, exact: true }]
    : [{ href: "/dashboard", label: showKarnet ? "Clients" : "Registre", icon: ClipboardText, exact: true }, { href: "/dashboard/accueil", label: "Mode Staff", icon: House, exact: true }, { href: "/dashboard/parametres", label: "Paramètres", icon: GearSix, exact: false }];
  // REKOLLECTE+ reste un espace séparé : la navigation globale expose un seul point
  // d'entrée vers son hub, sans dupliquer ses fonctions dans la sidebar.
  // Barre mobile : garder 3-4 pastilles maximum. REKOLLECTE+ y tient sa place via une
  // seule entree vers la vue d'ensemble, qui sert de hub vers le reste de la section.
  const mobileLinks = showKarnet ? [...links, { href: "/dashboard/karnet", label: "REKOLLECTE+", icon: SquaresFour, exact: false }] : links;
  const active = (href: string, exact: boolean) => exact ? pathname === href : pathname.startsWith(href);
  // Message d'au revoir : la déconnexion part dans la boîte (bouton en chargement), puis on quitte l'espace.
  const askLogout = async () => {
    const firstName = firstNameOf(userName);
    const ok = await confirm({
      tone: "brand",
      mood: "wink",
      title: "À bientôt !",
      message: <><strong>{dayPartWish()}{firstName ? `, ${firstName}` : ""}.</strong><br />Ta session sera fermée sur cet appareil.</>,
      confirmLabel: "Se déconnecter",
      cancelLabel: "Rester connecté",
      runningLabel: "Déconnexion…",
      run: async () => { await apiClient.post("/auth/logout/").catch(() => {}); setAccessToken(null); clearSessionCache(); },
    });
    if (ok) router.push("/");
  };
  const Brand = () => orgLogo ? <img src={orgLogo} alt={`Logo de ${orgName}`} className="h-9 w-9 shrink-0 rounded-lg object-contain" referrerPolicy="no-referrer" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cta text-xs font-bold text-white">{orgName.slice(0, 2).toUpperCase()}</div>;
  const roleLabel = role === "BOSS" ? "Patron" : role === "GERANT" ? "Gérant" : "Staff";
  return <>
    <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200 md:flex ${collapsed ? "w-[72px]" : "w-64"}`} aria-label="Navigation principale">
      <div className="flex items-center gap-3 border-b border-border p-4"><Brand /><div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}><p className="text-[10px] uppercase tracking-wide text-ink-soft">Établissement</p><p className="truncate font-heading text-sm font-semibold text-ink">{orgName}</p></div>{!collapsed && <button type="button" onClick={() => setCollapsed(true)} aria-label="Réduire la navigation" aria-expanded="true" title="Réduire la navigation" className="shrink-0 rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleLeft size={18} weight="bold" /></button>}</div>
      {collapsed && <button type="button" onClick={() => setCollapsed(false)} aria-label="Déplier la navigation" aria-expanded="false" title="Déplier la navigation" className="mx-auto mt-3 rounded-md p-2 text-ink-soft hover:bg-canvas hover:text-ink"><CaretDoubleRight size={18} weight="bold" /></button>}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} title={collapsed ? label : undefined} className={`flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium ${active(href, exact) ? "bg-cta text-white" : "text-ink-soft hover:bg-canvas"}`}><Icon size={18} weight="bold" className="shrink-0" /><span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>{label}</span></Link>)}
        {showKarnet && <Link href="/dashboard/karnet" title={collapsed ? "REKOLLECTE+" : undefined} className={`flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium ${active("/dashboard/karnet", false) ? "bg-cta text-white" : "text-ink-soft hover:bg-canvas"}`}><SquaresFour size={18} weight="bold" className="shrink-0" /><span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>REKOLLECTE+</span></Link>}
      </nav>
      <div className="border-t border-border p-3"><div className="space-y-1"><div className="flex justify-center py-1"><ThemeToggle /></div><button onClick={askLogout} title={collapsed ? "Déconnexion" : undefined} className="flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-canvas"><SignOut size={18} weight="bold" className="shrink-0" /><span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>Déconnexion</span></button></div></div>
    </aside>
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden"><div className="flex min-w-0 items-center gap-2"><Brand /><p className="truncate font-heading text-sm font-semibold text-ink">{orgName}</p></div><div className="flex shrink-0 items-center gap-2"><ThemeToggle /><button onClick={askLogout} aria-label={`Déconnexion (${roleLabel})`} className="p-2 text-ink-soft"><SignOut size={20} weight="bold" /></button></div></div>
    <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-between rounded-full bg-cta px-1.5 py-1.5 shadow-xl md:hidden">{mobileLinks.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 overflow-hidden rounded-full px-1 py-2 text-[10px] font-medium ${active(href, exact) ? "text-white" : "text-white/50"}`}><Icon size={19} weight="bold" /><span className="max-w-full truncate whitespace-nowrap">{label}</span></Link>)}</nav>
  </>;
}
