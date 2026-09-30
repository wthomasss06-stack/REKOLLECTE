"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, Envelope, Phone, UserCircle } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { formatDateTime, formatXOF, QUANTITY_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/karnet";
import type { CheckInRecord, KarnetClientDetail, KarnetReservation, PaginatedResponse } from "@/types";

/**
 * Contenu de la fiche client (identité, compteurs, réservations & paiements,
 * historique des passages) — sans chrome de page ni bouton retour, pour être
 * rendu aussi bien dans la page dédiée (/dashboard/karnet/clients/[id]) que
 * dans le modal ouvert depuis la liste REKOLLECTE+. Charge ses propres données à
 * partir du seul `clientId` : les deux appelants n'ont rien d'autre à gérer.
 */
export default function ClientHistoryPanel({ clientId }: { clientId: string }) {
  const { organization } = useAuthContext();
  const canReserve = Boolean(organization?.capabilities?.reservations);

  const [client, setClient] = useState<KarnetClientDetail | null>(null);
  const [checkins, setCheckins] = useState<CheckInRecord[]>([]);
  const [reservations, setReservations] = useState<KarnetReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiClient.get<KarnetClientDetail>(`/karnet/clients/${clientId}/`),
      apiClient.get<PaginatedResponse<CheckInRecord>>("/checkins/", { params: { client: clientId, page_size: 50 } }),
      apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { client: clientId } }),
    ])
      .then(([c, chk, res]) => {
        if (cancelled) return;
        setClient(c.data);
        setCheckins(chk.data.results);
        setReservations(res.data);
      })
      .catch((err) => !cancelled && setError(normalizeApiError(err).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) return <Loader fullScreen={false} label="Chargement de la fiche client…" />;

  if (error || !client) {
    return <p className="rounded-xl border border-border bg-surface p-4 text-sm text-error-text">{error || "Client introuvable."}</p>;
  }

  const totalDue = reservations.filter((r) => !r.is_paid && r.status !== "annulee").reduce((sum, r) => sum + Number(r.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-canvas">
            <UserCircle size={26} weight="bold" className="text-ink-soft" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">{client.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
              {client.phone && (
                <span className="flex items-center gap-1"><Phone size={13} /> {client.phone}</span>
              )}
              {client.email && (
                <span className="flex items-center gap-1"><Envelope size={13} /> {client.email}</span>
              )}
              {!client.phone && !client.email && <span>Aucun contact renseigné</span>}
            </div>
          </div>
        </div>
        {canReserve && (
          <Link
            href={`/dashboard/karnet/reservations?client=${client.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-cta px-4 py-2 text-sm font-semibold text-white"
          >
            <CalendarPlus size={16} weight="bold" /> Créer une réservation
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Passages" value={String(client.checkins_count)} />
        <StatCard label="Réservations" value={String(client.reservations_count)} />
        <StatCard label="Dernière visite" value={client.last_visit_at ? format(new Date(client.last_visit_at), "dd/MM/yyyy", { locale: fr }) : "—"} />
        <StatCard label="Solde dû" value={formatXOF(totalDue)} highlight={totalDue > 0} />
      </div>

      {client.note && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-ink-soft">Note</p>
          <p className="mt-1 text-sm text-ink">{client.note}</p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Réservations & paiements</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {reservations.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink"><span className="text-ink-soft">#{r.number}</span> · {r.resource_name}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatDateTime(r.starts_at)} {r.ends_at ? `→ ${formatDateTime(r.ends_at)}` : ""} · {r.quantity} {QUANTITY_LABELS[r.resource_unit]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{formatXOF(r.total_amount)}</span>
                  {r.is_paid && <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">Payé</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                </div>
              </div>
            ))}
            {reservations.length === 0 && <p className="p-4 text-sm text-ink-soft">Aucune réservation pour ce client.</p>}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Historique des passages</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {checkins.map((c) => (
              <details key={c.id} className="p-4">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {format(new Date(c.created_at_client), "dd/MM/yyyy — HH:mm", { locale: fr })}
                </summary>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(c.responses).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <dt className="text-ink-soft">{key}</dt>
                      <dd className="text-ink">{value === true ? "Oui" : value === false ? "Non" : String(value ?? "—")}</dd>
                    </div>
                  ))}
                  {c.signature_blob && (
                    <div className="text-xs">
                      <dt className="text-ink-soft">Signature</dt>
                      <dd><img src={c.signature_blob} alt="Signature" className="mt-1 h-12 max-w-[140px] rounded border border-border bg-white object-contain p-1" /></dd>
                    </div>
                  )}
                </dl>
              </details>
            ))}
            {checkins.length === 0 && <p className="p-4 text-sm text-ink-soft">Aucun passage enregistré pour ce client.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-error-text" : "text-ink"}`}>{value}</p>
    </div>
  );
}
