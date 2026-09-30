"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass, Phone, UserCircle } from "@phosphor-icons/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import Loader from "@/components/Loader";
import ClientHistoryModal from "@/components/karnet/ClientHistoryModal";
import { apiClient } from "@/lib/api";
import type { KarnetClientDetail } from "@/types";

/**
 * REKOLLECTE+ (ex "Vue d'ensemble") : les visiteurs de l'accueil devenus clients,
 * avec ce qu'ils ont fait chez toi. Un clic ouvre l'historique complet dans un
 * modal, sans quitter la liste (voir ClientHistoryModal).
 */
export default function KarnetOverviewPage() {
  const [clients, setClients] = useState<KarnetClientDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      apiClient
        .get<KarnetClientDetail[]>("/karnet/clients/", { params: search.trim() ? { search: search.trim() } : undefined })
        .then((res) => !cancelled && setClients(res.data))
        .catch(() => !cancelled && setError("Impossible de charger les clients."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0); // pas d'attente au premier chargement, un court debounce pendant la frappe
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-soft">Les visiteurs identifiés à l’accueil deviennent des fiches clients ici, avec leur historique complet.</p>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full rounded-lg border border-border bg-canvas py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-cta"
          />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-error-text">{error}</p>}

      {loading ? (
        <Loader fullScreen={false} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:bg-canvas/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas">
                    <UserCircle size={20} weight="bold" className="text-ink-soft" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{client.full_name}</p>
                    {client.phone && <p className="flex items-center gap-1 text-xs text-ink-soft"><Phone size={12} /> {client.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-soft">
                  <span>{client.checkins_count} passage{client.checkins_count > 1 ? "s" : ""}</span>
                  <span>{client.reservations_count} réservation{client.reservations_count > 1 ? "s" : ""}</span>
                  <span className="hidden sm:inline">{client.last_visit_at ? format(new Date(client.last_visit_at), "dd/MM/yyyy", { locale: fr }) : "—"}</span>
                </div>
              </button>
            ))}
            {clients.length === 0 && (
              <p className="p-6 text-center text-sm text-ink-soft">
                {search ? "Aucun client ne correspond à cette recherche." : "Aucun client pour le moment — les passages à l’accueil alimentent cette liste automatiquement."}
              </p>
            )}
          </div>
        </div>
      )}

      <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
    </div>
  );
}
