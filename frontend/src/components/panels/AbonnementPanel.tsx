"use client";

import { useEffect, useState } from "react";
import { CheckCircle, DownloadSimple, XCircle } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { exportAllToCSV } from "@/lib/exportCsv";
import type { BillingPayment, BillingSubscription, PlanState } from "@/types";

const STATE_LABEL: Record<PlanState, string> = {
  free: "Plan Gratuit",
  trialing: "Essai en cours",
  active: "Abonnement actif",
  grace: "Paiement en retard (délai de grâce)",
  expired: "Terminé : retour au plan Gratuit",
  founder: "Compte fondateur",
};

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
const limit = (value: number) => (value >= 1000 ? "illimité" : String(value));
const money = (amount: number, currency: string) => `${amount.toLocaleString("fr-FR")} ${currency === "XOF" ? "FCFA" : currency}`;

function Flag({ included }: { included: boolean }) {
  return included
    ? <span className="inline-flex items-center gap-1 text-success-text"><CheckCircle size={16} weight="fill" aria-hidden="true" />Inclus</span>
    : <span className="inline-flex items-center gap-1 text-ink-soft"><XCircle size={16} weight="fill" aria-hidden="true" />Non inclus</span>;
}

/** Paramètres › Abonnement : plan en vigueur, échéance, limites et consommation, reçus, et export de sortie (toujours disponible). */
export default function AbonnementPanel() {
  const { organization, user } = useAuthContext();
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    apiClient.get<BillingSubscription>("/billing/subscription/").then(({ data }) => setSubscription(data)).catch(() => setFailed(true));
    if (user?.role === "BOSS") apiClient.get<BillingPayment[]>("/billing/payments/").then(({ data }) => setPayments(data)).catch(() => undefined);
  }, [user?.role]);

  if (failed) return <p role="alert" className="text-sm text-error-text">L’abonnement n’a pas pu être chargé. Réessayez dans un instant.</p>;
  if (!subscription) return <Loader fullScreen={false} label="Chargement de l’abonnement…" />;

  const ent = subscription.entitlements;
  const exitExport = async () => {
    setExporting(true); setExportError("");
    try { await exportAllToCSV(organization?.name || "etablissement", { exit: true }); } catch (error) { setExportError(normalizeApiError(error).message); } finally { setExporting(false); }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-border bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Plan en vigueur</p>
      <p className="mt-1 text-2xl font-bold text-ink">{subscription.plan_label}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {STATE_LABEL[subscription.state]}
        {subscription.state === "trialing" && subscription.trial_ends_at ? ` — jusqu’au ${date(subscription.trial_ends_at)}` : ""}
        {(subscription.state === "active" || subscription.state === "grace") && subscription.period_end ? ` — échéance le ${date(subscription.period_end)}` : ""}
        {subscription.state === "grace" && subscription.grace_until ? `, fonctions maintenues jusqu’au ${date(subscription.grace_until)}` : ""}
      </p>
      {subscription.enforcement !== "enforce" && <p className="mt-3 rounded-xl bg-surface p-3 text-sm text-ink-soft">Aucune limite n’est appliquée pour le moment : voici ce que prévoit votre plan.</p>}
    </section>

    <section aria-label="Limites du plan">
      <dl className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
        {([
          ["Points d’accueil", `${subscription.usage.access_points} / ${limit(ent.access_points)}`],
          ["Formulaires", `${subscription.usage.forms} / ${limit(ent.forms)}`],
          ["Membres de l’équipe", `${subscription.usage.members} / ${limit(ent.members)}`],
          ["Historique affiché", ent.history_days ? `${ent.history_days} jours` : "Sans limite"],
          ["Conservation des visites", `${subscription.retention_visits_days} jours (réglage séparé, voir « Données »)`],
        ] as const).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 p-4"><dt className="text-ink-soft">{label}</dt><dd className="text-right font-medium text-ink">{value}</dd></div>)}
        {([
          ["Export CSV du registre", ent.export_csv],
          ["Champ téléphone", ent.phone],
          ["REKOLLECTE+ (clients, réservations, rappels)", ent.karnet],
        ] as const).map(([label, included]) => <div key={label} className="flex items-center justify-between gap-4 p-4"><dt className="text-ink-soft">{label}</dt><dd className="text-right font-medium"><Flag included={included} /></dd></div>)}
      </dl>
      <p className="mt-2 text-xs text-ink-soft">L’historique est une fenêtre d’affichage : rien n’est supprimé en changeant de plan.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Exporter toutes mes données</h3>
      <p className="text-sm text-ink-soft">Export de sortie : tout le registre, quel que soit votre plan ou l’état de votre abonnement.</p>
      <button type="button" onClick={() => void exitExport()} disabled={exporting} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"><DownloadSimple size={18} aria-hidden="true" />{exporting ? "Préparation…" : "Exporter (CSV)"}</button>
      {exportError && <p role="alert" className="text-sm text-error-text">{exportError}</p>}
    </section>

    {user?.role === "BOSS" && <section className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Paiements et reçus</h3>
      {payments.length === 0 ? <p className="text-sm text-ink-soft">Aucun paiement enregistré pour le moment.</p> : <ul className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
        {payments.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="min-w-0"><p className="font-medium text-ink">{payment.plan_label} — {money(payment.amount, payment.currency)}</p><p className="text-xs text-ink-soft">{date(payment.period_start)} → {date(payment.period_end)} · réf. {payment.reference}</p></div>
          <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-soft">{payment.document_label}</span>
        </li>)}
      </ul>}
      <p className="text-xs text-ink-soft">Le paiement se fait pour l’instant par Wave, Orange Money ou MTN MoMo auprès d’AKATech ; l’abonnement est activé dès l’enregistrement du paiement. Un « reçu interne, non fiscal » devient une facture électronique (FNE) seulement quand sa référence FNE est renseignée.</p>
    </section>}
  </div>;
}
