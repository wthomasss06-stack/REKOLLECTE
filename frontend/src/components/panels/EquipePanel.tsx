"use client";
import { useEffect, useState } from "react";

import InviteStaff from "@/components/dashboard/InviteStaff";
import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import { useDialog } from "@/components/ui/DialogProvider";
import PermissionMatrixModal from "@/components/dashboard/PermissionMatrixModal";
import OrgChart from "@/components/dashboard/OrgChart";
import { apiClient } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import type { TeamAccess, UserProfile } from "@/types";

type ViewState = "loading" | "error" | "ready";

export default function EquipePanel() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<TeamAccess | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const { confirm } = useDialog();
  const [hostBusy, setHostBusy] = useState<string | null>(null);
  const [hostError, setHostError] = useState("");

  const load = () => {
    setState("loading");
    Promise.all([apiClient.get<UserProfile>("/auth/me/"), apiClient.get<TeamAccess>("/auth/team/")])
      .then(([me, access]) => {
        setUser(me.data);
        setTeam(access.data);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  // Révocation : confirmation, requête dans la boîte, puis carte de réussite ou d’erreur (avec « Réessayer »).
  const revoke = async (path: string, label: string, kind: "member" | "invitation", subject: string) => {
    await confirm({
      tone: "danger",
      mood: "annoyed",
      title: kind === "member" ? "Révoquer cet accès ?" : "Révoquer cette invitation ?",
      message: kind === "member"
        ? <><strong>{subject}</strong> ne pourra plus se connecter à l’établissement. Cette action sera journalisée.</>
        : <>Le lien d’invitation envoyé à <strong>{subject}</strong> ne fonctionnera plus. Cette action sera journalisée.</>,
      confirmLabel: "Révoquer",
      runningLabel: "Révocation…",
      run: async () => { await apiClient.post(path, { reason: label }); load(); },
      successTitle: kind === "member" ? "Accès révoqué" : "Invitation révoquée",
      errorTitle: "Révocation impossible",
    });
  };

  // « Personnes à prévenir » : le patron choisit qui apparaît dans « Qui venez-vous voir ? » et reçoit l’alerte d’arrivée.
  const toggleHost = async (memberId: string, value: boolean) => {
    const setFlag = (flag: boolean) => setTeam((current) => current ? { ...current, members: current.members.map((member) => member.id === memberId ? { ...member, is_visit_host: flag } : member) } : current);
    setHostBusy(memberId);
    setHostError("");
    setFlag(value); // optimiste : la case répond tout de suite, même si le serveur met quelques secondes à répondre
    try {
      const { data } = await apiClient.patch<UserProfile>(`/auth/team/members/${memberId}/visit-host/`, { is_visit_host: value });
      setFlag(Boolean(data.is_visit_host));
    } catch {
      setFlag(!value);
      setHostError("Modification impossible. Réessayez dans un instant.");
    } finally {
      setHostBusy(null);
    }
  };

  if (state === "loading") return <Loader fullScreen={false} label="Chargement de l’équipe…" />;
  if (state === "error" || !user || !team) return <AutoRetry onRetry={load} label="Chargement de l’équipe…" />;

  const isBoss = user.role === "BOSS";
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4"><p className="text-sm text-ink-soft">Invite, consulte et révoque les accès de l’établissement.</p><PermissionMatrixModal /></div>
      <InviteStaff viewerRole={isBoss ? "BOSS" : "GERANT"} />

      <section className="rounded-xl border border-border bg-surface p-5">
        <div><h2 className="font-semibold text-ink">Membres</h2><p className="mt-1 text-sm text-ink-soft">Visualise la hiérarchie de votre établissement : le Patron, ses Gérants et les Agents rattachés.</p></div>
        <OrgChart members={team.members} />
        <div className="mt-4 border-t border-border pt-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Actions membres</p><div className="divide-y divide-border">{team.members.filter((member) => member.role !== "BOSS").map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-2"><p className="text-sm text-ink">{member.full_name || member.email}<span className="ml-2 text-xs text-ink-soft">{member.role === "GERANT" ? "Gérant" : "Agent"}</span></p>{isBoss && member.is_active && <button onClick={() => revoke(`/auth/team/members/${member.id}/revoke/`, `Révoquer ${member.email}`, "member", member.full_name || member.email)} className="rounded-full border border-error-text px-3 py-1.5 text-xs text-error-text">Révoquer</button>}</div>)}</div></div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-ink">Personnes à prévenir</h2>
        <p className="mt-1 text-sm text-ink-soft">Les personnes cochées apparaissent dans la liste « Qui venez-vous voir ? » du formulaire visiteur et reçoivent une alerte sur leur tableau de bord quand on les demande. Quand le visiteur ne choisit personne, le patron et les gérants sont prévenus.</p>
        {hostError && <p role="alert" className="mt-3 text-sm font-medium text-error-text">{hostError}</p>}
        <ul className="mt-3 divide-y divide-border">
          {team.members.filter((member) => member.is_active && !member.access_revoked_at).map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
              <p className="min-w-0 truncate text-sm text-ink">{member.full_name || member.email}<span className="ml-2 text-xs text-ink-soft">{roleLabel(member.role)}</span></p>
              <label className={`flex shrink-0 items-center gap-2 text-sm ${isBoss ? "cursor-pointer text-ink" : "text-ink-soft"}`}>
                <input type="checkbox" checked={Boolean(member.is_visit_host)} disabled={!isBoss || hostBusy === member.id} onChange={(event) => void toggleHost(member.id, event.target.checked)} className="h-4 w-4 accent-cta" />
                Peut être visité·e
              </label>
            </li>
          ))}
        </ul>
        {!isBoss && <p className="mt-3 text-xs text-ink-soft">Seul le patron modifie cette liste.</p>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-ink">Invitations</h2>
        <div className="mt-4 divide-y divide-border">
          {team.invitations.length === 0 && <p className="py-3 text-sm text-ink-soft">Aucune invitation.</p>}
          {team.invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-ink">{invitation.email}</p><p className="text-xs text-ink-soft">{invitation.role === "GERANT" ? "Gérant" : "Agent"} · {invitation.accepted_at ? "acceptée" : invitation.revoked_at ? "révoquée" : "en attente"}</p></div>{isBoss && !invitation.accepted_at && !invitation.revoked_at && <button onClick={() => revoke(`/auth/team/invitations/${invitation.id}/revoke/`, `Révoquer l’invitation ${invitation.email}`, "invitation", invitation.email)} className="rounded-full border border-error-text px-3 py-1.5 text-xs text-error-text">Révoquer</button>}</div>)}
        </div>
      </section>

    </div>
  );
}
