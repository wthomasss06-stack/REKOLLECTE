"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Plus, UserCircle } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { formatDateTime, formatXOF, QUANTITY_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/karnet";
import type { KarnetClient, KarnetReservation, KarnetReservationStatus, KarnetResource } from "@/types";

const NEW_CLIENT = "__new__";

export default function KarnetReservationsPage() {
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client") || "";

  const [reservations, setReservations] = useState<KarnetReservation[]>([]);
  const [resources, setResources] = useState<KarnetResource[]>([]);
  const [clients, setClients] = useState<KarnetClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Phase 8 — parcours de réservation depuis Clients : sélectionner un client
  // existant est l'étape principale (préremplie quand on arrive depuis sa
  // fiche) ; "+ Nouveau client" reste disponible comme parcours de secours.
  const [clientChoice, setClientChoice] = useState(preselectedClientId || NEW_CLIENT);
  const [newClientName, setNewClientName] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { status: "en_cours" } }),
      apiClient.get<KarnetResource[]>("/karnet/resources/", { params: { is_active: "true" } }),
      apiClient.get<KarnetClient[]>("/karnet/clients/"),
    ])
      .then(([r, res, c]) => {
        setReservations(r.data);
        setResources(res.data);
        setClients(c.data);
        if (!resourceId && res.data[0]) setResourceId(res.data[0].id);
      })
      .catch(() => setError("Impossible de charger les réservations."))
      .finally(() => setLoading(false));
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<KarnetReservation[]>("/karnet/reservations/"),
      apiClient.get<KarnetResource[]>("/karnet/resources/", { params: { is_active: "true" } }),
      apiClient.get<KarnetClient[]>("/karnet/clients/"),
    ])
      .then(([r, res, c]) => {
        setReservations(r.data);
        setResources(res.data);
        setClients(c.data);
        if (!resourceId && res.data[0]) setResourceId(res.data[0].id);
      })
      .catch(() => setError("Impossible de charger les réservations."))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const preselectedClient = useMemo(
    () => clients.find((c) => c.id === preselectedClientId),
    [clients, preselectedClientId]
  );
  const selectedResource = useMemo(() => resources.find((r) => r.id === resourceId), [resources, resourceId]);
  const estimatedTotal = selectedResource ? Number(selectedResource.price) * quantity : 0;

  // Contrôle du créneau côté UX : le serveur bloque déjà le conflit à 409, mais
  // on prévient avant l'envoi pour une ressource à créneau (chambre, table à
  // l'heure) déjà occupée par une réservation en cours.
  const activeConflict = useMemo(() => {
    if (!selectedResource || selectedResource.unit === "unite") return null;
    const occupying = reservations.find((r) => r.resource === selectedResource.id && r.status === "en_cours");
    return occupying || null;
  }, [reservations, selectedResource]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resourceId || saving) return;
    if (clientChoice === NEW_CLIENT && !newClientName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.post("/karnet/reservations/", {
        resource: resourceId,
        quantity,
        ...(clientChoice === NEW_CLIENT ? { client_name: newClientName.trim() } : { client: clientChoice }),
      });
      setNewClientName("");
      setQuantity(1);
      loadAll();
    } catch (err) {
      setError(normalizeApiError(err).message || "Impossible de créer cette réservation.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: KarnetReservationStatus) => {
    await apiClient.patch(`/karnet/reservations/${id}/`, { status });
    loadAll();
  };

  if (loading) return <Loader fullScreen={false} label="Chargement des réservations…" />;

  return (
    <div className="space-y-6">
      {resources.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">Ajoute d’abord une ressource (onglet Ressources) avant de créer une réservation.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-surface p-4">
          {preselectedClient && (
            <div className="flex items-center gap-2 rounded-lg bg-cta/10 px-3 py-2 text-xs font-medium text-cta">
              <UserCircle size={16} weight="bold" />
              Réservation pour {preselectedClient.full_name} — préremplie depuis sa fiche.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-ink-soft">Client</label>
              <select value={clientChoice} onChange={(e) => setClientChoice(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
                <option value={NEW_CLIENT}>+ Nouveau client (parcours de secours)</option>
              </select>
            </div>
            {clientChoice === NEW_CLIENT && (
              <div>
                <label className="text-xs font-medium text-ink-soft">Nom du client</label>
                <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required placeholder="David Kouassi" className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-ink-soft">Ressource</label>
              <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {formatXOF(r.price)}/{(r.billing_unit_display || r.unit_display).replace("Par ", "")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">{selectedResource ? QUANTITY_LABELS[selectedResource.unit] : "Quantité"}</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink" />
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <label className="text-xs font-medium text-ink-soft">Total estimé</label>
                <p className="mt-1 py-2 text-sm font-semibold text-ink">{formatXOF(estimatedTotal)}</p>
              </div>
              <button type="submit" disabled={saving || Boolean(activeConflict)} className="flex items-center justify-center gap-1.5 rounded-lg bg-cta px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Plus size={16} weight="bold" /> {saving ? "Création…" : "Réserver"}
              </button>
            </div>
          </div>
          {activeConflict && (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-xs font-medium text-error-text">
              {selectedResource?.name} est déjà occupée par {activeConflict.client_name}
              {activeConflict.ends_at ? ` jusqu’au ${formatDateTime(activeConflict.ends_at)}` : ""}. Termine ou annule cette réservation avant d’en créer une nouvelle sur ce créneau.
            </p>
          )}
        </form>
      )}

      {error && <p className="text-sm text-error-text">{error}</p>}

      <div className="rounded-xl border border-border bg-surface">
        <div className="divide-y divide-border">
          {reservations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={16} className="shrink-0 text-ink-soft" />
                  <p className="truncate font-medium text-ink">
                    <span className="text-ink-soft">#{r.number}</span> · {r.resource_name} · <Link href={`/dashboard/karnet/clients/${r.client}`} className="text-cta hover:underline">{r.client_name}</Link>
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {formatDateTime(r.starts_at)} {r.ends_at ? `→ ${formatDateTime(r.ends_at)}` : ""} · {r.quantity} {QUANTITY_LABELS[r.resource_unit]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{formatXOF(r.total_amount)}</span>
                {r.is_paid && <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">Payé</span>}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                {r.status === "en_cours" && (
                  <select onChange={(e) => e.target.value && updateStatus(r.id, e.target.value as KarnetReservationStatus)} defaultValue="" className="rounded-lg border border-border bg-canvas px-2 py-1 text-xs text-ink">
                    <option value="" disabled>Modifier…</option>
                    <option value="terminee">Marquer terminée</option>
                    <option value="annulee">Annuler</option>
                  </select>
                )}
              </div>
            </div>
          ))}
          {reservations.length === 0 && <p className="p-4 text-sm text-ink-soft">Aucune réservation pour l’instant.</p>}
        </div>
      </div>
    </div>
  );
}
