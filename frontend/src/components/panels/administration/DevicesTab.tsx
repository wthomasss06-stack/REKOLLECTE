"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DeviceMobile, Laptop } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import type { OrgSession } from "@/types";
import { relativeFromNow } from "./auditMeta";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Appareils connectés, par membre : le Patron voit qui est connecté d’où, et peut fermer un appareil ou tous ceux d’un membre
 *  (ancien employé, téléphone perdu). Le renouvellement est refusé tout de suite ; l’accès déjà ouvert expire en 10 minutes au plus. */
export default function DevicesTab() {
  const { confirm } = useDialog();
  const [sessions, setSessions] = useState<OrgSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiClient.get<{ results: OrgSession[] }>("/auth/sessions/")
      .then((response) => setSessions(response.data.results))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const byUser = new Map<string, { id: string; name: string; email: string; role: OrgSession["user_role"]; sessions: OrgSession[] }>();
    for (const session of sessions) {
      const entry = byUser.get(session.user_id) ?? { id: session.user_id, name: session.user_name || session.user_email, email: session.user_email, role: session.user_role, sessions: [] };
      entry.sessions.push(session);
      byUser.set(session.user_id, entry);
    }
    return Array.from(byUser.values());
  }, [sessions]);

  const revokeOne = async (session: OrgSession, who: string) => {
    const done = await confirm({
      tone: "danger", title: "Déconnecter cet appareil ?",
      message: `${who} devra se reconnecter sur « ${session.device} ». L’accès déjà ouvert peut durer jusqu’à 10 minutes.`,
      confirmLabel: "Déconnecter", cancelLabel: "Annuler", runningLabel: "Déconnexion…", successTitle: "Appareil déconnecté.",
      run: () => apiClient.post(`/auth/sessions/${session.id}/revoke/`),
    });
    if (done) load();
  };

  const revokeMember = async (member: { id: string; name: string }, count: number) => {
    const done = await confirm({
      tone: "danger", title: `Déconnecter ${member.name} partout ?`,
      message: `${count} appareil${count > 1 ? "s seront déconnectés" : " sera déconnecté"}. La personne pourra se reconnecter, sauf si vous retirez son accès dans Équipe.`,
      confirmLabel: "Tout déconnecter", cancelLabel: "Annuler", runningLabel: "Déconnexion…", successTitle: "Appareils déconnectés.",
      run: () => apiClient.post(`/auth/team/members/${member.id}/sessions/revoke/`),
    });
    if (done) load();
  };

  if (error) return <AutoRetry onRetry={load} label="Chargement des appareils…" />;
  if (loading && sessions.length === 0) return <Loader fullScreen={false} label="Chargement des appareils…" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-ink">Appareils connectés</h2>
        <p className="mt-1 text-sm text-ink-soft">{sessions.length} appareil{sessions.length > 1 ? "s" : ""} pour {groups.length} membre{groups.length > 1 ? "s" : ""}. Une session dure 14 jours au plus.</p>
      </div>
      {groups.length === 0 && <p className="rounded-xl border border-border bg-surface p-5 text-sm text-ink-soft">Aucun appareil connecté pour l’instant.</p>}
      {groups.map((member) => {
        const others = member.sessions.filter((session) => !session.current);
        return (
          <section key={member.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{member.name}</p>
                <p className="truncate text-xs text-ink-soft">{roleLabel(member.role)} · {member.email}</p>
              </div>
              {others.length > 0 && <button type="button" onClick={() => revokeMember(member, others.length)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-error-text hover:bg-error-bg">Tout déconnecter</button>}
            </div>
            <ul className="mt-3 divide-y divide-border">
              {member.sessions.map((session) => {
                const Icon = session.device_kind === "mobile" ? DeviceMobile : Laptop;
                return (
                  <li key={session.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft" aria-hidden="true"><Icon size={17} weight="bold" /></span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex flex-wrap items-center gap-x-2 font-medium text-ink">{session.device}{session.current && <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[11px] font-semibold text-cta">Cet appareil</span>}</p>
                      <p className="text-ink-soft">Active {relativeFromNow(session.last_used_at ?? session.created_at)} · connecté le {when(session.created_at)}{session.ip_address ? ` · IP ${session.ip_address}` : ""}</p>
                    </div>
                    {!session.current && <button type="button" onClick={() => revokeOne(session, member.name)} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas">Déconnecter</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
