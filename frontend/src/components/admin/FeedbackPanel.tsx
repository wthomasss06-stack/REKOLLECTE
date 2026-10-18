"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChatCircleDots } from "@phosphor-icons/react";
import { EmptyState, SearchField } from "@/components/admin/ui";
import type { PlatformFeedback } from "@/types";

const STATUSES: { value: string; label: string }[] = [
  { value: "new", label: "Nouveau" },
  { value: "reviewing", label: "En cours" },
  { value: "done", label: "Traité" },
  { value: "archived", label: "Archivé" },
];

/** Adresse de la page d'où vient le retour, ramenée à son chemin (jamais de paramètres) pour l'affichage. */
function pathOf(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return ""; }
}

export default function FeedbackPanel({ data, onStatus }: { data: PlatformFeedback[]; onStatus: (item: PlatformFeedback, status: string) => void }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => data.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {}), [data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((item) => (filter === "all" || item.status === filter) && (!q || `${item.message} ${item.user_email ?? ""} ${item.contact_email} ${item.organization_name ?? ""}`.toLowerCase().includes(q)));
  }, [data, filter, query]);

  const chip = (value: string, label: string, count: number) => (
    <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${filter === value ? "border-cta bg-cta text-cta-ink" : "border-border bg-surface text-ink-soft hover:border-cta hover:text-ink"}`}>
      {label}<span className={`rounded-full px-1.5 text-xs ${filter === value ? "bg-cta-ink/20" : "bg-ink/10"}`}>{count}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrer par statut">
        {chip("all", "Tous", data.length)}{STATUSES.map((status) => chip(status.value, status.label, counts[status.value] ?? 0))}
      </div>
      <SearchField value={query} onChange={setQuery} placeholder="Rechercher dans les messages" label="Rechercher un feedback" />

      {rows.length === 0 ? (
        <EmptyState icon={ChatCircleDots} title={data.length ? "Aucun feedback ne correspond" : "Aucun feedback"}>{data.length ? "Change le statut ou la recherche." : "Les retours envoyés depuis le site et l’application apparaîtront ici."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((item) => {
            const path = pathOf(item.page_url);
            return (
              <li key={item.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft">{item.category_label}</span>
                    {item.status === "new" && <span className="rounded-full bg-cta px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cta-ink">Nouveau</span>}
                  </div>
                  <label className="shrink-0"><span className="sr-only">Statut du feedback</span><select value={item.status} onChange={(event) => onStatus(item, event.target.value)} className="h-10 rounded-xl border border-border bg-canvas px-2.5 text-sm text-ink outline-none focus:border-cta">{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{item.message}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  <span>{item.user_email || item.contact_email || "Anonyme"}</span><span aria-hidden="true">·</span><span>{item.organization_name || "Visiteur public"}</span><span aria-hidden="true">·</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("fr-FR")}</time>
                  {path && <><span aria-hidden="true">·</span><span className="inline-flex items-center gap-0.5" title={item.page_url}>depuis {path}<ArrowUpRight size={11} weight="bold" aria-hidden="true" /></span></>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
