"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface SettingsRow {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  /** Si renseigné, la ligne est un lien (ex. Audit → Paramètres) au lieu d’ouvrir une fenêtre. */
  href?: string;
}

/** Liste de rubriques : une ligne par rubrique (icône, titre, description, chevron). Un clic ouvre la fenêtre de la rubrique. */
export default function SettingsRows({ rows, activeId, onSelect, label }: { rows: SettingsRow[]; activeId: string | null; onSelect: (id: string) => void; label: string }) {
  return (
    <div className="rk-rows" role="group" aria-label={label}>
      {rows.map((row) => {
        const content = (
          <>
            <span className="rk-row__icon" aria-hidden="true"><row.icon size={21} weight="bold" /></span>
            <span className="rk-row__meta"><strong>{row.title}</strong><span>{row.description}</span></span>
            <CaretRight size={18} weight="bold" className="rk-row__chevron" aria-hidden="true" />
          </>
        );
        if (row.href) return <Link key={row.id} href={row.href} className="rk-row">{content}</Link>;
        return (
          <button key={row.id} type="button" className="rk-row" aria-haspopup="dialog" aria-expanded={activeId === row.id} onClick={() => onSelect(row.id)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
