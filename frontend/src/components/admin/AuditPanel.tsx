"use client";
import { useMemo, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { EmptyState, SearchField } from "@/components/admin/ui";
import type { PlatformAuditEvent } from "@/types";

export default function AuditPanel({ data }: { data: PlatformAuditEvent[] }) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const events = q ? data.filter((event) => `${event.action} ${event.actor_name ?? ""} ${event.actor_email ?? ""} ${event.target_name ?? ""} ${event.target_email ?? ""} ${event.organization_name}`.toLowerCase().includes(q)) : data;
    return events.reduce<Record<string, PlatformAuditEvent[]>>((groups, event) => { (groups[event.organization_name] ||= []).push(event); return groups; }, {});
  }, [data, query]);
  const names = Object.keys(grouped);

  return (
    <div className="space-y-5">
      <SearchField value={query} onChange={setQuery} placeholder="Rechercher une action, une personne, une entreprise" label="Rechercher dans le journal" />
      {names.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={data.length ? "Aucun événement ne correspond" : "Aucun événement d’audit"}>{data.length ? "Change la recherche." : "Les connexions, invitations et changements de rôle seront listés ici."}</EmptyState>
      ) : (
        <div className="space-y-3">
          {names.map((organization) => (
            <details key={organization} open={Boolean(query) || names.length <= 3} className="group rounded-2xl border border-border bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-heading font-bold text-ink sm:px-5"><span className="min-w-0 truncate">{organization}</span><span className="shrink-0 text-xs font-normal text-ink-soft">{grouped[organization]!.length} événement{grouped[organization]!.length > 1 ? "s" : ""}</span></summary>
              <ul className="divide-y divide-border border-t border-border px-4 sm:px-5">
                {grouped[organization]!.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                    <div className="min-w-0"><p className="font-medium text-ink">{event.action}</p><p className="break-words text-ink-soft">{event.actor_name || event.actor_email || "Système"} · <span className="font-medium">{event.actor_role || "—"}</span>{event.target_name || event.target_email ? ` → ${event.target_name || event.target_email}` : ""}</p></div>
                    <time dateTime={event.created_at} className="shrink-0 text-xs text-ink-soft">{new Date(event.created_at).toLocaleString("fr-FR")}</time>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
