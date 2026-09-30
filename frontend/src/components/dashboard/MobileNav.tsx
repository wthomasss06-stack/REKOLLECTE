"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardText, Gear, QrCode, SquaresFour, Users } from "@phosphor-icons/react";

import type { AccountRole, OrganizationCapabilities } from "@/types";

const LINKS = [
  { href: "/dashboard", label: "Registre", activeLabel: "Clients", icon: ClipboardText },
  { href: "/dashboard/qr-code", label: "QR", icon: QrCode, allowed: ["BOSS", "GERANT"] as AccountRole[] },
  { href: "/dashboard/equipe", label: "Équipe", icon: Users, allowed: ["BOSS"] as AccountRole[] },
  { href: "/dashboard/parametres", label: "Réglages", icon: Gear, allowed: ["BOSS", "GERANT"] as AccountRole[] },
];

export default function MobileNav({ role, capabilities }: { role: AccountRole; capabilities?: OrganizationCapabilities }) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => (link.allowed ? link.allowed.includes(role) : role !== "STAFF")).map((link) => ({ ...link, label: link.activeLabel && capabilities?.karnet ? link.activeLabel : link.label }));
  if (capabilities?.karnet) visible.push({ href: "/dashboard/karnet", label: "REKOLLECTE+", activeLabel: "REKOLLECTE+", icon: SquaresFour });

  return (
    <nav className="mobile-nav-bar" aria-label="Navigation mobile">
      {visible.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium ${
              active ? "text-cta" : "text-ink-soft"
            }`}
          >
            <Icon size={20} weight={active ? "fill" : "bold"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
