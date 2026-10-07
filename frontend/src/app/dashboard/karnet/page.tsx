"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Phone, Plus, UserCircle } from "@phosphor-icons/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import Loader from "@/components/Loader";
import ClientFormModal from "@/components/karnet/ClientFormModal";
import ClientHistoryModal from "@/components/karnet/ClientHistoryModal";
import { useGuide } from "@/components/karnet/GettingStarted";
import { useAuthContext } from "@/context/AuthContext";
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
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();
  const { summary } = useGuide();
  const { user } = useAuthContext();
  const canManage = user?.role === "BOSS" || user?.role === "GERANT";

  // Le guide « Premiers pas » renvoie ici avec ?new=1 : on ouvre directement le formulaire.
  // (lecture directe de l'URL : useSearchParams imposerait une frontière Suspense à toute la page)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setFormOpen(true);
      router.replace("/dashboard/karnet");
    }
  }, [router]);

  const onClientSaved = useCallback((client: { id: string; full_name: string }, alreadyExisted: boolean) => {
    setFormOpen(false);
    setNotice(alreadyExisted ? `${client.full_name} existe déjà (même téléphone ou e-mail) : voici sa fiche.` : `${client.full_name} a été ajouté.`);
    setReloadKey((key) => key + 1);
    if (alreadyExisted) setSelectedClientId(client.id);
  }, []);

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
  }, [search, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-soft">Les visiteurs identifiés à l’accueil deviennent des fiches clients ici, avec leur historique complet.</p>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, téléphone ou e-mail…"
              aria-label="Rechercher un client"
              className="min-h-[44px] w-full rounded-lg border border-border bg-canvas pl-8 pr-3 text-sm text-ink outline-none focus:border-cta"
            />
          </div>
          <button type="button" onClick={() => setFormOpen(true)} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-cta px-4 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover">
            <Plus size={16} weight="bold" /> <span>Ajouter</span><span className="sr-only"> un client</span>
          </button>
        </div>
      </div>

      {notice && <p role="status" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink">{notice}</p>}

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
              <div className="p-6 text-center">
                {search ? (
                  <p className="text-sm text-ink-soft">Aucun client ne correspond à cette recherche.</p>
                ) : summary && summary.resources === 0 ? (
                  // L'étape qui bloque vraiment est la ressource, pas le client : on le dit et on y emmène.
                  <>
                    <p className="font-semibold text-ink">Commence par créer ta première ressource</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">Une chambre, une table, une salle… C’est ce que tes clients réservent. Une fois qu’elle existe, tu pourras ajouter un client puis faire ta première réservation.</p>
                    {canManage ? (
                      <Link href="/dashboard/karnet/ressources?onboarding=1" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-cta px-6 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover">Créer une ressource</Link>
                    ) : (
                      <p className="mt-3 text-sm text-ink-soft">Un Patron ou un Gérant doit la créer.</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">Aucun client pour le moment : les passages à l’accueil alimentent cette liste, ou ajoute-en un à la main.</p>
                    <button type="button" onClick={() => setFormOpen(true)} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-cta px-6 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover"><Plus size={16} weight="bold" /> Ajouter un client</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ClientFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={onClientSaved} />
      <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
    </div>
  );
}
