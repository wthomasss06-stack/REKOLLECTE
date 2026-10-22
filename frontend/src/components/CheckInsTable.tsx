"use client";

import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { responseText } from "@/lib/responseDisplay";
import type { CheckInRecord, FormField } from "@/types";

interface CheckInsTableProps {
  records: CheckInRecord[];
  activeSchema: FormField[];
  karnetEnabled?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Une recherche ou une période est active : le message « aucun résultat » doit le dire. */
  filtered?: boolean;
}

export default function CheckInsTable({ records, activeSchema, karnetEnabled = false, page, pageSize, totalCount, onPageChange, filtered = false }: CheckInsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstVisible = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastVisible = Math.min(currentPage * pageSize, totalCount);
  const emptyColspan = activeSchema.length + (karnetEnabled ? 2 : 1);

  return <div className="overflow-hidden rounded-xl border border-border bg-surface">
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-canvas text-ink-soft"><tr><th className="whitespace-nowrap p-3 font-medium">Heure d’arrivée</th>{karnetEnabled && <th className="whitespace-nowrap p-3 font-medium">Client</th>}{activeSchema.map((field) => <th key={field.id} className="whitespace-nowrap p-3 font-medium">{field.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{records.map((record) => <tr key={record.id} className="transition hover:bg-canvas/60"><td className="whitespace-nowrap p-3 font-medium text-ink">{format(new Date(record.created_at_client), "HH:mm — dd/MM/yyyy", { locale: fr })}</td>{karnetEnabled && <td className="p-3 text-ink-soft">{record.client_id ? <Link href={`/dashboard/karnet/clients/${record.client_id}`} className="font-medium text-cta hover:underline">{record.client_name}</Link> : <span className="text-ink-soft/60">En attente d’identité</span>}</td>}{activeSchema.map((field) => <td key={field.id} className="p-3 text-ink-soft">{renderCell(field, record)}</td>)}</tr>)}{records.length === 0 && <tr><td colSpan={emptyColspan} className="p-10 text-center text-ink-soft">{filtered ? "Aucun résultat pour cette recherche." : `Aucun ${karnetEnabled ? "client" : "visiteur"} enregistré pour le moment.`}</td></tr>}</tbody></table></div>
    {totalCount > 0 && <div className="flex flex-col gap-3 border-t border-border bg-surface px-3 py-3 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-4"><p>{karnetEnabled ? "Clients" : "Visiteurs"} {firstVisible} à {lastVisible} sur {totalCount}</p><div className="flex items-center justify-between gap-2 sm:justify-end"><button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Page précédente" className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-border px-4 font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"><CaretLeft size={14} /> Précédente</button><span aria-live="polite" className="min-w-20 text-center font-medium text-ink">Page {currentPage} / {totalPages}</span><button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} aria-label="Page suivante" className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-border px-4 font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">Suivante <CaretRight size={14} /></button></div></div>}
  </div>;
}

function renderCell(field: FormField, record: CheckInRecord) {
  if (field.type === "signature") return record.signature_blob ? <img src={record.signature_blob} alt="Signature du visiteur" className="h-12 max-w-[140px] rounded border border-border bg-white object-contain p-1" /> : <span>—</span>;
  if (field.type === "checkbox") return record.responses[field.id] ? "Oui" : "Non";
  const value = record.responses[field.id];
  // « Autre » + précision saisie par le visiteur : sans cela la précision n’apparaissait nulle part dans le registre.
  const other = field.type === "select" && value === "Autre" ? record.responses[`${field.id}_autre`] : undefined;
  const text = typeof other === "string" && other.trim() ? `Autre : ${other.trim()}` : responseText(value);
  return text ? text : <span>—</span>;
}

export { renderCell };
