"use client";
import { GearSix, House, QrCode, SquaresFour, UsersThree } from "@phosphor-icons/react";
import type { AccountRole, OrganizationCapabilities } from "@/types";
import AppNav, { type NavItem } from "./AppNav";
import { useLogout } from "./useLogout";

/** Navigation de l’espace d’un établissement. La mécanique (repli, états actifs, barre du bas) vit dans AppNav, partagée avec l’administration. */
export default function Sidebar({ orgName, orgLogo = "", userName = "", capabilities }: { orgName: string; orgLogo?: string; userName?: string; role: AccountRole; capabilities?: OrganizationCapabilities }) {
  const askLogout = useLogout(userName);
  const showKarnet = Boolean(capabilities?.karnet);
  // Quatre entrées, dans cet ordre, pour tous les rôles. La quatrième est REKOLLECTE au Niveau 1 ; au Niveau 2, REKOLLECTE+ prend
  // exactement sa place (même route, mêmes premières lignes, plus les outils) : rien ne bouge pour la personne qui l’utilise.
  // Ce que chaque rôle voit DANS Paramètres et REKOLLECTE est filtré dans ces pages, pas ici.
  const items: NavItem[] = [
    { key: "visiteurs", href: "/dashboard", label: "Visiteurs", icon: UsersThree, exact: true },
    { key: "accueil", href: "/dashboard/accueil", label: "Accueil", icon: House, exact: true },
    { key: "rekollecte", href: "/dashboard/rekollecte", label: showKarnet ? "REKOLLECTE+" : "REKOLLECTE", icon: showKarnet ? SquaresFour : QrCode, also: ["/dashboard/karnet"] },
    { key: "parametres", href: "/dashboard/parametres", label: "Paramètres", icon: GearSix },
  ];
  const brand = orgLogo
    ? <img src={orgLogo} alt={`Logo de ${orgName}`} className="h-9 w-9 shrink-0 rounded-lg object-contain" referrerPolicy="no-referrer" />
    : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cta text-xs font-bold text-white">{orgName.slice(0, 2).toUpperCase()}</div>;
  return <AppNav items={items} brand={brand} eyebrow="Établissement" title={orgName} onLogout={askLogout} />;
}
