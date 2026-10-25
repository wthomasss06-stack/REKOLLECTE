"use client";

import { usePathname } from "next/navigation";
import { GearSix, House, QrCode, SignOut, SquaresFour, UserCircle, UsersThree } from "@phosphor-icons/react";

import ThemeToggle from "@/components/ThemeToggle";
import { AppSidebar, type SidebarAccount, type SidebarItem, type SidebarMenuItem } from "@/components/shell/AppSidebar";
import { useAuthContext } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import type { AccountRole, OrganizationCapabilities } from "@/types";
import { useLogout } from "./useLogout";

/** Navigation de l’espace d’un établissement : la barre latérale partagée (components/shell), alimentée en données.
 *  Le logo est toujours le R de REKOLLECTE, quel que soit le niveau ; le niveau ne change que le nom écrit à côté. */
export default function Sidebar({ orgName, orgLogo = "", userName = "", capabilities, collapsed, onToggle }: {
  orgName: string; orgLogo?: string; userName?: string; role: AccountRole; capabilities?: OrganizationCapabilities; collapsed: boolean; onToggle: () => void;
}) {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const askLogout = useLogout(userName);
  const showKarnet = Boolean(capabilities?.karnet);
  const product = showKarnet ? "REKOLLECTE+" : "REKOLLECTE";

  // Quatre entrées, dans cet ordre, pour tous les rôles. La quatrième est REKOLLECTE ; avec REKOLLECTE+, elle prend exactement sa place (même route,
  // mêmes premières lignes, plus les outils) : rien ne bouge pour la personne qui l’utilise. Ce que chaque rôle voit DANS Paramètres et REKOLLECTE
  // est filtré dans ces pages, pas ici.
  const nav = [
    { id: "visiteurs", href: "/dashboard", long: "Visiteurs", icon: UsersThree, exact: true },
    { id: "accueil", href: "/dashboard/accueil", long: "Accueil", icon: House, exact: true },
    { id: "rekollecte", href: "/dashboard/rekollecte", long: product, icon: showKarnet ? SquaresFour : QrCode, also: ["/dashboard/karnet"] },
    { id: "parametres", href: "/dashboard/parametres", long: "Paramètres", icon: GearSix },
  ];
  const items: SidebarItem[] = nav.map((entry) => ({
    id: entry.id, href: entry.href, long: entry.long, icon: entry.icon,
    active: (entry.exact ? pathname === entry.href : pathname.startsWith(entry.href)) || (entry.also ?? []).some((prefix) => pathname.startsWith(prefix)),
  }));

  const name = user?.full_name || user?.email || userName;
  const account: SidebarAccount | null = user
    ? { name, email: user.email, detail: `${roleLabel(user.role)}${orgName ? ` · ${orgName}` : ""}`, initials: (name || "?").trim().slice(0, 1).toUpperCase(), avatarUrl: user.avatar_url, orgName, orgLogo }
    : null;
  const menu: SidebarMenuItem[] = [
    { id: "profil", label: "Mon profil", icon: UserCircle, href: "/dashboard/parametres?open=moi" },
    { id: "apparence", node: <><span>Apparence</span><ThemeToggle /></> },
    { id: "deconnexion", label: "Se déconnecter", icon: SignOut, tone: "danger", onSelect: () => void askLogout() },
  ];

  return <AppSidebar ariaLabel="Navigation principale" brand={{ href: "/dashboard", title: product, subtitle: orgName }} items={items} account={account} menu={menu} collapsed={collapsed} onToggle={onToggle} />;
}
