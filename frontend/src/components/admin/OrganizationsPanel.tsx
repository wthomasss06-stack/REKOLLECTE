"use client";
import { useMemo, useState } from "react";
import { Buildings, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { EmptyState, SearchField, inputClass, primaryButton } from "@/components/admin/ui";
import type { PlatformOrganization } from "@/types";

const iconAction = "grid h-10 w-10 place-items-center rounded-full border border-border text-ink-soft transition-colors hover:border-cta hover:text-ink";

export default function OrganizationsPanel({ data, onCreate, onEdit, onDelete }: { data: PlatformOrganization[]; onCreate: (name: string) => Promise<void>; onEdit: (org: PlatformOrganization) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data.filter((org) => org.name.toLowerCase().includes(q)) : data;
  }, [data, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try { await onCreate(name.trim()); setName(""); } catch { /* l'erreur est déjà annoncée par la page : on garde la saisie */ } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex gap-2">
        <label className="min-w-0 flex-1"><span className="sr-only">Nom de la nouvelle entreprise</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom de la nouvelle entreprise" className={inputClass} /></label>
        <button type="submit" disabled={!name.trim() || busy} className={primaryButton}><Plus size={16} weight="bold" aria-hidden="true" />Créer</button>
      </form>
      <SearchField value={query} onChange={setQuery} placeholder={`Rechercher parmi ${data.length} entreprise${data.length > 1 ? "s" : ""}`} label="Rechercher une entreprise" />

      {rows.length === 0 ? (
        <EmptyState icon={Buildings} title={data.length ? "Aucune entreprise ne correspond" : "Aucune entreprise pour l’instant"}>{data.length ? "Essaie un autre nom." : "Crée la première avec le champ ci-dessus."}</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-soft"><tr><th scope="col" className="p-4 font-semibold">Entreprise</th><th scope="col" className="p-4 font-semibold">Personnel</th><th scope="col" className="p-4 font-semibold">Visites</th><th scope="col" className="p-4 font-semibold">Feedbacks</th><th scope="col" className="p-4 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((org) => (
                  <tr key={org.id}>
                    <td className="p-4 font-medium text-ink">{org.name}</td>
                    <td className="p-4 tabular-nums text-ink-soft">{org.member_count}</td>
                    <td className="p-4 tabular-nums text-ink-soft">{org.checkin_count}</td>
                    <td className="p-4 tabular-nums text-ink-soft">{org.feedback_count}</td>
                    <td className="p-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEdit(org)} className={iconAction} aria-label={`Renommer ${org.name}`} title="Renommer"><PencilSimple size={17} weight="bold" /></button><button type="button" onClick={() => onDelete(org.id)} className={`${iconAction} hover:!border-error-text hover:!text-error-text`} aria-label={`Supprimer ${org.name}`} title="Supprimer"><Trash size={17} weight="bold" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((org) => (
              <li key={org.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-heading text-base font-bold text-ink">{org.name}</p>
                  <div className="flex shrink-0 gap-2"><button type="button" onClick={() => onEdit(org)} className={iconAction} aria-label={`Renommer ${org.name}`}><PencilSimple size={17} weight="bold" /></button><button type="button" onClick={() => onDelete(org.id)} className={`${iconAction} text-error-text`} aria-label={`Supprimer ${org.name}`}><Trash size={17} weight="bold" /></button></div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[["Personnel", org.member_count], ["Visites", org.checkin_count], ["Feedbacks", org.feedback_count]].map(([label, value]) => <div key={label} className="rounded-xl bg-canvas px-2 py-2"><dd className="font-heading text-lg font-bold leading-none text-ink">{value}</dd><dt className="mt-1 text-[11px] text-ink-soft">{label}</dt></div>)}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
