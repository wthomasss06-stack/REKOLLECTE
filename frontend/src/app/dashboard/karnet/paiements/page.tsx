"use client";

import { useEffect, useState } from "react";
import { CreditCard, X } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import { useDialog } from "@/components/ui/DialogProvider";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { formatDateTime, formatXOF, notifyKarnetChanged, STATUS_LABELS, STATUS_STYLES } from "@/lib/karnet";
import type { KarnetReservation } from "@/types";

export default function KarnetPaiementsPage() {
  const { user } = useAuthContext();
  const { confirm } = useDialog();
  // Phase 9 — règle métier : encaisser reste ouvert à toute l'équipe, mais
  // annuler un encaissement déjà enregistré est réservé à Patron/Gérant
  // (l'API renvoie 403 sinon ; ce contrôle d'affichage évite juste de proposer
  // une action qui échouerait pour un Staff).
  const canUnmark = user?.role === "BOSS" || user?.role === "GERANT";
  const [reservations, setReservations] = useState<KarnetReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiClient
      .get<KarnetReservation[]>("/karnet/reservations/")
      .then((res) => setReservations(res.data.filter((r) => r.status !== "annulee")))
      .catch(() => setError("Impossible de charger les paiements."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markPaid = async (id: string) => {
    setMarkingId(id);
    setError("");
    try {
      await apiClient.patch(`/karnet/reservations/${id}/`, { is_paid: true });
      notifyKarnetChanged();
      load();
    } catch {
      setError("Impossible d’enregistrer cet encaissement. Réessaie.");
    } finally {
      setMarkingId(null);
    }
  };

  // Annuler un encaissement remet la réservation « à encaisser » : on demande confirmation (avant : un tap suffisait).
  const unmarkPaid = async (r: KarnetReservation) => {
    const done = await confirm({
      tone: "danger",
      title: "Annuler cet encaissement ?",
      message: `${r.client_name} · ${r.resource_name} (${formatXOF(r.total_amount)}) repasse dans « À encaisser ».`,
      confirmLabel: "Oui, annuler l’encaissement",
      cancelLabel: "Non, le garder",
      runningLabel: "Annulation…",
      run: () => apiClient.patch(`/karnet/reservations/${r.id}/`, { is_paid: false }),
      errorTitle: "Impossible d’annuler cet encaissement",
    });
    if (done) {
      notifyKarnetChanged();
      load();
    }
  };

  if (loading) return <Loader fullScreen={false} label="Chargement des paiements…" />;

  const unpaid = reservations.filter((r) => !r.is_paid);
  const paid = reservations.filter((r) => r.is_paid);
  const dueTotal = unpaid.reduce((sum, r) => sum + Number(r.total_amount), 0);

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-error-text">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-ink-soft">À encaisser</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatXOF(dueTotal)}</p>
          <p className="mt-1 text-xs text-ink-soft">{unpaid.length} réservation(s)</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-ink-soft">Déjà encaissé</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatXOF(paid.reduce((sum, r) => sum + Number(r.total_amount), 0))}</p>
          <p className="mt-1 text-xs text-ink-soft">{paid.length} réservation(s)</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">À encaisser</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {unpaid.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-ink">{r.client_name} · {r.resource_name}</p>
                  <p className="text-xs text-ink-soft">{formatDateTime(r.starts_at)} · <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ink">{formatXOF(r.total_amount)}</span>
                  <button onClick={() => markPaid(r.id)} disabled={markingId === r.id} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-cta px-4 text-sm font-semibold text-white disabled:opacity-60">
                    <CreditCard size={16} weight="bold" /> {markingId === r.id ? "…" : "Marquer payé"}
                  </button>
                </div>
              </div>
            ))}
            {unpaid.length === 0 && <p className="p-4 text-sm text-ink-soft">Rien à encaisser pour l’instant.</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Historique des encaissements</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {paid.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-ink">{r.client_name} · {r.resource_name}</p>
                  <p className="text-xs text-ink-soft">{r.paid_at ? `Payé le ${formatDateTime(r.paid_at)}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ink">{formatXOF(r.total_amount)}</span>
                  {canUnmark && (
                    <button
                      onClick={() => unmarkPaid(r)}
                      disabled={markingId === r.id}
                      title="Annuler cet encaissement"
                      className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-ink-soft transition hover:border-error-text hover:text-error-text disabled:opacity-60"
                    >
                      <X size={14} weight="bold" /> Annuler l’encaissement
                    </button>
                  )}
                </div>
              </div>
            ))}
            {paid.length === 0 && <p className="p-4 text-sm text-ink-soft">Aucun encaissement enregistré pour l’instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
