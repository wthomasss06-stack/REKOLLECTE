"use client";
import type { ElementType, ReactNode } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

/** Briques communes des panneaux d'administration (mêmes cartes, mêmes états vides, mêmes champs de recherche). */

export function Panel({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="font-heading text-base font-bold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export type StatTone = "default" | "accent" | "warn";

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; icon: ElementType; tone?: StatTone }) {
  const iconTone = tone === "accent" ? "bg-cta text-cta-ink" : tone === "warn" ? "bg-[rgb(var(--c-warn-text)/0.16)] text-[rgb(var(--c-warn-text))]" : "bg-cta/10 text-cta";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconTone}`}><Icon size={19} weight="bold" aria-hidden="true" /></span>
      <p className="mt-3 font-heading text-2xl font-bold leading-none text-ink sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-sm text-ink-soft">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft/80">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon?: ElementType; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      {Icon && <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-cta/10 text-cta"><Icon size={22} weight="bold" aria-hidden="true" /></span>}
      <p className="mt-3 font-heading text-base font-bold text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</p>}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <MagnifyingGlass size={16} weight="bold" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-full border border-border bg-surface pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink-soft/70 focus:border-cta" />
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-border bg-canvas p-1">
      {options.map((option) => (
        <button key={String(option.value)} type="button" onClick={() => onChange(option.value)} aria-pressed={option.value === value} className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${option.value === value ? "bg-cta text-cta-ink" : "text-ink-soft hover:text-ink"}`}>{option.label}</button>
      ))}
    </div>
  );
}

export const inputClass = "h-11 w-full rounded-xl border border-border bg-canvas px-3 text-sm text-ink outline-none placeholder:text-ink-soft/70 focus:border-cta";
export const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink transition-opacity hover:opacity-90 disabled:opacity-50";

/** « il y a 3 min » — assez précis pour la surveillance, sans bibliothèque de dates. */
export function ago(value: string | number | Date, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "à l’instant";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export const dateTime = (value: string) => new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
