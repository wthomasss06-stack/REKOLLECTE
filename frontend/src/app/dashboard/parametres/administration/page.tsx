"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Loader from "@/components/Loader";
import { useDialog } from "@/components/ui/DialogProvider";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import type { AuditEvent, OrganizationCapabilities, PaginatedResponse, UserProfile } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.logout": "Déconnexion",
  "invitation.revoked": "Invitation révoquée",
  "member.revoked": "Membre révoqué",
  "organization.karnet_enabled": "REKOLLECTE+ activé",
  "organization.karnet_disabled": "REKOLLECTE+ désactivé",
  "organization.karnet_capability_updated": "Capacité REKOLLECTE+ mise à jour",
};

const CAPABILITY_LABELS: { key: keyof OrganizationCapabilities; label: string }[] = [
  { key: "reservations", label: "Réservations" },
  { key: "payments", label: "Paiements" },
  { key: "rappels", label: "Rappels" },
];

export default function AdministrationPage() {
  const { organization, refreshUser } = useAuthContext();
  const { confirm } = useDialog();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [hasMoreEvents, setHasMoreEvents] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const askToggleKarnet = async () => {
    const enabling = !organization?.karnet_enabled;
    const activated = await confirm({
      tone: "brand",
      title: enabling ? "Activer REKOLLECTE+ ?" : "Désactiver REKOLLECTE+ ?",
      message: enabling
        ? "Ton établissement passe au Niveau 2 : le registre devient l’espace Clients et REKOLLECTE+ ajoute les ressources, réservations, paiements et rappels."
        : "Les sections REKOLLECTE+ disparaissent de la barre latérale. Rien n’est supprimé, tu pourras réactiver plus tard.",
      confirmLabel: enabling ? "Activer" : "Désactiver",
      cancelLabel: "Annuler",
      runningLabel: enabling ? "Activation…" : "Désactivation…",
      successTitle: enabling ? "REKOLLECTE+ est activé !" : "REKOLLECTE+ est désactivé.",
      successMessage: enabling
        ? "La barre latérale, le titre d’onglet et le favicon reflètent déjà le Niveau 2 — rien d’autre à faire."
        : "L’établissement repasse à l’identité Renseignement seule.",
      run: async () => {
        await apiClient.patch("/org/me/karnet/", { karnet_enabled: enabling });
        await refreshUser();
      },
    });
    // Onboarding : juste après l'activation, on propose de configurer les
    // ressources tout de suite (chambres, fauteuils, bureaux…) — le builder
    // laisse "Plus tard" pour qui préfère le faire ensuite depuis l'onglet Ressources.
    if (activated && enabling) router.push("/dashboard/karnet/ressources?onboarding=1");
  };

  useEffect(() => {
    Promise.all([apiClient.get<UserProfile>("/auth/me/"), apiClient.get<PaginatedResponse<AuditEvent>>("/auth/audit/")])
      .then(([me, audit]) => {
        setUser(me.data);
        setEvents(audit.data.results);
        setHasMoreEvents(Boolean(audit.data.next));
      })
      .catch(() => setError("Impossible de charger le journal d’administration."))
      .finally(() => setLoading(false));
  }, []);

  const loadMoreEvents = async () => {
    if (!hasMoreEvents || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = auditPage + 1;
      // On redemande par numéro de page (comme le registre) plutôt que de
      // suivre l'URL absolue `next` renvoyée par l'API : celle-ci pointe vers
      // le domaine Render lui-même, hors du proxy Next.js same-origin.
      const response = await apiClient.get<PaginatedResponse<AuditEvent>>("/auth/audit/", { params: { page: nextPage } });
      setEvents((current) => [...current, ...response.data.results]);
      setAuditPage(nextPage);
      setHasMoreEvents(Boolean(response.data.next));
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <Loader fullScreen={false} />;
  if (error || !user) return <p className="text-sm text-error-text">{error || "Accès refusé."}</p>;
  if (user.role !== "BOSS") return <p className="text-sm text-error-text">Cette section est réservée au patron.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Administration</h1>
        <p className="mt-1 text-sm text-ink-soft">Historique des connexions et des actions sensibles de ton établissement.</p>
      </div>
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Niveau 2 — REKOLLECTE+</h2>
            <p className="mt-1 max-w-md text-sm text-ink-soft">
              {organization?.karnet_enabled
                ? "REKOLLECTE+ est actif : les visiteurs enregistrés alimentent l’espace Clients, tandis que les opérations restent regroupées dans REKOLLECTE+."
                : "Ajoute les fonctions de gestion hôtelière autour de ton registre : clients, ressources, réservations, paiements et rappels."}
            </p>
          </div>
          <button
            onClick={askToggleKarnet}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${
              organization?.karnet_enabled ? "border border-border text-ink-soft hover:bg-canvas" : "bg-cta text-white"
            }`}
          >
            {organization?.karnet_enabled ? "Désactiver REKOLLECTE+" : "Activer REKOLLECTE+"}
          </button>
        </div>
        {organization?.karnet_enabled && (
          <div className="mt-4 flex flex-wrap gap-2">
            {CAPABILITY_LABELS.map(({ key, label }) => {
              const active = Boolean(organization?.capabilities?.[key]);
              return (
                <span key={key} className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-cta/10 text-cta" : "bg-canvas text-ink-soft"}`}>
                  {label} · {active ? "actif" : "en préparation"}
                </span>
              );
            })}
          </div>
        )}
      </section>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-ink">Journal d’audit</h2>
        <div className="mt-4 divide-y divide-border">
          {events.map((event) => {
            const actor = event.actor_name?.trim() || event.actor_email || "Utilisateur inconnu";
            const target = event.target_name?.trim() || event.target_email || "";
            return (
              <div key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{ACTION_LABELS[event.action] || event.action}</p>
                  <p className="text-ink-soft">Par <span className="font-medium text-ink">{actor}</span>{target ? ` · cible : ${target}` : ""}</p>
                </div>
                <time className="shrink-0 text-xs text-ink-soft" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("fr-FR")}</time>
              </div>
            );
          })}
          {events.length === 0 && <p className="py-3 text-sm text-ink-soft">Aucun événement d’administration.</p>}
        </div>
        {hasMoreEvents && (
          <button
            type="button"
            onClick={loadMoreEvents}
            disabled={loadingMore}
            className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-ink-soft hover:bg-canvas disabled:opacity-60"
          >
            {loadingMore ? "Chargement…" : "Charger plus"}
          </button>
        )}
      </section>
    </div>
  );
}
