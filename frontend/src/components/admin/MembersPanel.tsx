"use client";
import { useMemo, useState } from "react";
import { Trash, UserPlus, UsersThree } from "@phosphor-icons/react";
import { EmptyState, SearchField, inputClass, primaryButton } from "@/components/admin/ui";
import type { PlatformMember, PlatformOrganization } from "@/types";

const selectClass = "h-10 w-full rounded-xl border border-border bg-canvas px-2.5 text-sm text-ink outline-none focus:border-cta";

export default function MembersPanel({ data, organizations, onCreate, onUpdate, onDelete }: {
  data: PlatformMember[];
  organizations: PlatformOrganization[];
  onCreate: (input: { email: string; organization_id: string; role: string }) => Promise<void>;
  onUpdate: (member: PlatformMember, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("STAFF");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((member) => (!roleFilter || member.role === roleFilter) && (!q || `${member.full_name} ${member.email} ${member.organization_name ?? ""}`.toLowerCase().includes(q)));
  }, [data, query, roleFilter]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !organizationId || busy) return;
    setBusy(true);
    try { await onCreate({ email: email.trim(), organization_id: organizationId, role }); setEmail(""); } catch { /* l'erreur est déjà annoncée par la page : on garde la saisie */ } finally { setBusy(false); }
  };

  const orgSelect = (member: PlatformMember) => (
    <select aria-label={`Entreprise de ${member.full_name || member.email}`} value={member.organization_id || ""} onChange={(event) => onUpdate(member, { organization_id: event.target.value || null })} className={selectClass}>
      <option value="">Sans entreprise</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
    </select>
  );
  const roleSelect = (member: PlatformMember) => (
    <select aria-label={`Rôle de ${member.full_name || member.email}`} value={member.role} onChange={(event) => onUpdate(member, { role: event.target.value })} className={selectClass}>
      <option value="BOSS">Patron</option><option value="GERANT">Gérant</option><option value="STAFF">Staff</option>
    </select>
  );
  const stateButton = (member: PlatformMember) => (
    <button type="button" onClick={() => onUpdate(member, { is_active: !member.is_active })} aria-pressed={member.is_active} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${member.is_active ? "bg-cta/10 text-cta" : "bg-error-bg text-error-text"}`}>
      <span className={`h-2 w-2 rounded-full ${member.is_active ? "bg-cta" : "bg-error-text"}`} aria-hidden="true" />{member.is_active ? "Actif" : "Désactivé"}
    </button>
  );
  const remove = (member: PlatformMember) => <button type="button" onClick={() => onDelete(member.id)} className="grid h-10 w-10 place-items-center rounded-full border border-border text-error-text transition-colors hover:border-error-text" aria-label={`Supprimer ${member.full_name || member.email}`} title="Supprimer"><Trash size={17} weight="bold" /></button>;

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_9rem_auto]">
        <label className="sm:col-span-2 lg:col-span-1"><span className="sr-only">Email du membre</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email du membre" className={inputClass} /></label>
        <label><span className="sr-only">Entreprise</span><select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={`${inputClass} pr-2`}><option value="">Entreprise</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label><span className="sr-only">Rôle</span><select value={role} onChange={(event) => setRole(event.target.value)} className={`${inputClass} pr-2`}><option value="STAFF">Staff</option><option value="GERANT">Gérant</option><option value="BOSS">Patron</option></select></label>
        <button type="submit" disabled={busy || !email.trim() || !organizationId} className={`${primaryButton} sm:col-span-2 lg:col-span-1`}><UserPlus size={16} weight="bold" aria-hidden="true" />Ajouter</button>
      </form>
      <div className="flex flex-wrap gap-2">
        <SearchField value={query} onChange={setQuery} placeholder={`Rechercher parmi ${data.length} compte${data.length > 1 ? "s" : ""}`} label="Rechercher un compte" />
        <label><span className="sr-only">Filtrer par rôle</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-11 rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none focus:border-cta"><option value="">Tous les rôles</option><option value="BOSS">Patrons</option><option value="GERANT">Gérants</option><option value="STAFF">Staff</option></select></label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={UsersThree} title={data.length ? "Aucun compte ne correspond" : "Aucun compte pour l’instant"}>{data.length ? "Change la recherche ou le filtre." : "Ajoute le premier membre avec le formulaire ci-dessus."}</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-soft"><tr><th scope="col" className="p-4 font-semibold">Nom / email</th><th scope="col" className="p-4 font-semibold">Entreprise</th><th scope="col" className="p-4 font-semibold">Rôle</th><th scope="col" className="p-4 font-semibold">État</th><th scope="col" className="p-4 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((member) => (
                  <tr key={member.id}>
                    <td className="p-4"><p className="font-medium text-ink">{member.full_name || "Sans nom"}</p><p className="text-xs text-ink-soft">{member.email}</p></td>
                    <td className="w-56 p-4">{orgSelect(member)}</td>
                    <td className="w-36 p-4">{roleSelect(member)}</td>
                    <td className="p-4">{stateButton(member)}</td>
                    <td className="p-4"><div className="flex justify-end">{remove(member)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((member) => (
              <li key={member.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-heading text-base font-bold text-ink">{member.full_name || "Sans nom"}</p><p className="truncate text-xs text-ink-soft">{member.email}</p></div>
                  {stateButton(member)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">{orgSelect(member)}{roleSelect(member)}</div>
                <div className="mt-3 flex justify-end">{remove(member)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
