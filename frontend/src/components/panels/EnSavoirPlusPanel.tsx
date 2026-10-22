"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";

const GROUPS = [
  { title: "Le service", links: [
    { href: "/a-propos", label: "À propos de REKOLLECTE" },
    { href: "/aide", label: "Aide" },
    { href: "/credits", label: "Crédits" },
  ] },
  { title: "Cadre légal", links: [
    { href: "/cgu", label: "Conditions d’utilisation" },
    { href: "/confidentialite", label: "Politique de confidentialité" },
    { href: "/mentions-legales", label: "Mentions légales" },
  ] },
] as const;

/** Paramètres > En savoir plus : accès rapide aux pages publiques (présentation, aide, crédits, textes légaux). */
export default function EnSavoirPlusPanel() {
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-[48px] items-center justify-between gap-4 px-4 text-sm text-ink transition hover:bg-canvas">
                  {link.label}
                  <CaretRight size={16} weight="bold" className="text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
