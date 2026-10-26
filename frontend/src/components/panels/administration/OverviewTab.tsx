"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DeviceMobile, ShieldCheck, SignIn, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import { apiClient } from "@/lib/api";
import type { AuditEvent, AuditSummary, PaginatedResponse } from "@/types";
import EventRow from "./EventRow";
import { relativeFromNow } from "./auditMeta";

const PERIODS: { days: AuditSummary["days"]; label: string }[] = [{ days: 7, label: "7 jours" }, { days: 30, label: "30 jours" }, { days: 90, label: "90 jours" }];

function Kpi({ icon: Icon, label, value, hint }: { icon: Icon; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-ink-soft"><Icon size={16} weight="bold" className="text-cta" aria-hidden="true" />{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{hint}</p>
    </div>
  );
}

/** Vue d’ensemble : l’activité de l’établissement sur 7, 30 ou 90 jours, les dernières actions sensibles et les raccourcis utiles. */
export default function OverviewTab({ onOpenTab }: { onOpenTab: (tab: "activite" | "appareils") => void }) {
  const [days, setDays] = useState<AuditSummary["days"]>(7);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [recent, setRecent] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      apiClient.get<AuditSummary>("/auth/audit/summary/", { params: { days } }),
      apiClient.get<PaginatedResponse<AuditEvent>>("/auth/audit/", { params: { sensitive: 1, page_size: 5 } }),
    ])
      .then(([summaryResponse, recentResponse]) => { setSummary(summaryResponse.data); setRecent(recentResponse.data.results); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days]);
  useEffect(() => { load(); }, [load]);

  if (error) return <AutoRetry onRetry={load} label="Chargement de la vue d’ensemble…" />;
  if (loading && !summary) return <Loader fullScreen={false} label="Chargement de la vue d’ensemble…" />;
  if (!summary) return null;

  const period = `sur ${summary.days} jours`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">Activité de l’établissement</h2>
        <div role="group" aria-label="Période" className="flex gap-1">
          {PERIODS.map((item) => (
            <button key={item.days} type="button" onClick={() => setDays(item.days)} aria-pressed={days === item.days}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${days === item.days ? "border-cta bg-cta text-cta-ink" : "border-border text-ink-soft hover:bg-canvas"}`}>{item.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={SignIn} label="Connexions" value={summary.counts.connexions} hint={period} />
        <Kpi icon={ShieldCheck} label="Actions sensibles" value={summary.sensitive} hint={summary.last_sensitive_at ? `dernière : ${relativeFromNow(summary.last_sensitive_at)}` : "aucune pour l’instant"} />
        <Kpi icon={DeviceMobile} label="Appareils connectés" value={summary.active_sessions} hint={`${summary.connected_members} membre${summary.connected_members > 1 ? "s" : ""} sur ${summary.members}`} />
        <Kpi icon={UsersThree} label="Changements d’équipe" value={summary.counts.equipe} hint={period} />
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Dernières actions sensibles</h2>
          <button type="button" onClick={() => onOpenTab("activite")} className="text-sm font-semibold text-cta hover:underline">Tout le journal</button>
        </div>
        {recent.length === 0
          ? <p className="mt-3 text-sm text-ink-soft">Aucune action sensible enregistrée.</p>
          : <ul className="mt-2 divide-y divide-border">{recent.map((event) => <EventRow key={event.id} event={event} showDate />)}</ul>}
      </section>

      <div className="flex flex-wrap gap-2 text-sm font-semibold">
        <button type="button" onClick={() => onOpenTab("appareils")} className="rounded-lg border border-border px-4 py-2 text-ink hover:bg-canvas">Voir les appareils connectés</button>
        <Link href="/dashboard/parametres?open=equipe" className="rounded-lg border border-border px-4 py-2 text-ink hover:bg-canvas">Gérer l’équipe</Link>
        <Link href="/dashboard/parametres?open=donnees" className="rounded-lg border border-border px-4 py-2 text-ink hover:bg-canvas">Durées de conservation</Link>
      </div>
    </div>
  );
}
