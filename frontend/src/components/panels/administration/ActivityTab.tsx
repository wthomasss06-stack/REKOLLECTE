"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import type { AuditCategory, AuditEvent, PaginatedResponse } from "@/types";
import EventRow from "./EventRow";
import { CATEGORIES, dayLabel } from "./auditMeta";

const PERIODS = [{ id: "all", label: "Tout", days: 0 }, { id: "7", label: "7 jours", days: 7 }, { id: "30", label: "30 jours", days: 30 }, { id: "90", label: "90 jours", days: 90 }];

function sinceOf(days: number): string | undefined {
  if (!days) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const chip = (active: boolean) => `rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-cta bg-cta text-cta-ink" : "border-border text-ink-soft hover:bg-canvas"}`;

/** Journal filtrable : catégorie, actions sensibles seulement, période, recherche par nom ou e-mail. Lu par jour, exportable en CSV (l’export est journalisé). */
export default function ActivityTab() {
  const { alert } = useDialog();
  const [category, setCategory] = useState<AuditCategory | "">("");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [periodId, setPeriodId] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef(0);

  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(timer); }, [query]);

  const params = useMemo(() => {
    const days = PERIODS.find((period) => period.id === periodId)?.days ?? 0;
    return { category: category || undefined, sensitive: sensitiveOnly ? 1 : undefined, since: sinceOf(days), q: search || undefined };
  }, [category, sensitiveOnly, periodId, search]);

  const load = useCallback(() => {
    const request = ++latest.current;
    setLoading(true);
    setError(false);
    apiClient.get<PaginatedResponse<AuditEvent>>("/auth/audit/", { params })
      .then((response) => {
        if (request !== latest.current) return; // une réponse plus récente a pris la place
        setEvents(response.data.results);
        setCount(response.data.count);
        setHasMore(Boolean(response.data.next));
        setPage(1);
      })
      .catch(() => { if (request === latest.current) setError(true); })
      .finally(() => { if (request === latest.current) setLoading(false); });
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      // Par numéro de page, comme le registre : l’URL absolue `next` pointe hors du proxy same-origin.
      const response = await apiClient.get<PaginatedResponse<AuditEvent>>("/auth/audit/", { params: { ...params, page: page + 1 } });
      setEvents((current) => [...current, ...response.data.results]);
      setPage((current) => current + 1);
      setHasMore(Boolean(response.data.next));
    } finally {
      setLoadingMore(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await apiClient.get<Blob>("/auth/audit/export/", { params, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      await alert({ tone: "danger", title: "Export impossible", message: "Le journal n’a pas pu être exporté. Réessayez dans un instant." });
    } finally {
      setExporting(false);
    }
  };

  const days = useMemo(() => {
    const groups: { label: string; events: AuditEvent[] }[] = [];
    for (const event of events) {
      const label = dayLabel(event.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.events.push(event);
      else groups.push({ label, events: [event] });
    }
    return groups;
  }, [events]);

  const filtered = Boolean(category || sensitiveOnly || periodId !== "all" || search);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">Journal d’activité</h2>
        <button type="button" onClick={exportCsv} disabled={exporting || count === 0} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50">
          <DownloadSimple size={16} weight="bold" aria-hidden="true" />{exporting ? "Export…" : "Exporter (CSV)"}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <label className="relative block">
          <span className="sr-only">Rechercher une personne</span>
          <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou e-mail d’une personne" className="w-full rounded-lg border border-border bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft" />
        </label>
        <div role="group" aria-label="Catégorie" className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setCategory("")} aria-pressed={category === ""} className={chip(category === "")}>Tout</button>
          {CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={chip(category === item.id)}>{item.label}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Période" className="flex flex-wrap gap-1.5">
            {PERIODS.map((item) => <button key={item.id} type="button" onClick={() => setPeriodId(item.id)} aria-pressed={periodId === item.id} className={chip(periodId === item.id)}>{item.label}</button>)}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <input type="checkbox" checked={sensitiveOnly} onChange={(event) => setSensitiveOnly(event.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-cta))]" />
            Actions sensibles seulement
          </label>
        </div>
      </div>

      {error ? <AutoRetry onRetry={load} label="Chargement du journal…" />
        : loading && events.length === 0 ? <Loader fullScreen={false} label="Chargement du journal…" />
        : (
          <section aria-live="polite">
            <p className="text-xs text-ink-soft">{count} événement{count > 1 ? "s" : ""}{filtered ? " pour ces filtres" : ""}</p>
            {days.map((group) => (
              <div key={group.label} className="mt-4 rounded-xl border border-border bg-surface px-5 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft first-letter:uppercase">{group.label}</h3>
                <ul className="divide-y divide-border">{group.events.map((event) => <EventRow key={event.id} event={event} />)}</ul>
              </div>
            ))}
            {events.length === 0 && <p className="mt-4 rounded-xl border border-border bg-surface p-5 text-sm text-ink-soft">{filtered ? "Aucun événement ne correspond à ces filtres." : "Aucun événement d’administration."}</p>}
            {hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-ink-soft hover:bg-canvas disabled:opacity-60">{loadingMore ? "Chargement…" : "Charger plus"}</button>}
          </section>
        )}
    </div>
  );
}
