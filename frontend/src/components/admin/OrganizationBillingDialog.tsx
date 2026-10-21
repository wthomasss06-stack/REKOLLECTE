"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { inputClass, primaryButton } from "@/components/admin/ui";
import Loader from "@/components/Loader";
import SettingsModal from "@/components/ui/SettingsModal";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import type { BillingPayment, OrganizationBilling, PlanId } from "@/types";

interface AdminSubscription { plan: PlanId; status: "trialing" | "active" | "founder" | "canceled"; trial_ends_at: string | null; current_period_end: string | null; grace_days: number; founder_notice_sent_at: string | null; founder_limits_from: string | null }
interface AdminBilling extends OrganizationBilling { subscription: AdminSubscription | null; payments: BillingPayment[]; usage: { access_points: number; forms: number; members: number } }

const PLANS: { value: PlanId; label: string }[] = [{ value: "free", label: "Gratuit" }, { value: "essentiel", label: "Essentiel" }, { value: "plus", label: "REKOLLECTE+" }, { value: "entreprise", label: "Entreprise" }];
const METHODS = [["wave", "Wave"], ["orange_money", "Orange Money"], ["mtn_momo", "MTN MoMo"], ["moov_money", "Moov Money"], ["bank_transfer", "Virement"], ["cash", "Espèces"], ["other", "Autre"]] as const;
const label = "block space-y-1 text-xs font-semibold text-ink-soft";
const toLocalInput = (value: string | null) => (value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/** Administration plateforme : abonnement d'un établissement et bouton « Enregistrer un paiement » (idempotent sur la référence). */
export default function OrganizationBillingDialog({ organization, onClose }: { organization: { id: string; name: string }; onClose: () => void }) {
  const base = `/admin/billing/organizations/${organization.id}/`;
  const [data, setData] = useState<AdminBilling | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sub, setSub] = useState<AdminSubscription | null>(null);
  const [pay, setPay] = useState({ plan: "essentiel", amount: "", method: "wave", reference: "", months: "1", fne_reference: "", note: "" });

  const load = useCallback(async () => {
    try { const { data: fresh } = await apiClient.get<AdminBilling>(base); setData(fresh); setSub(fresh.subscription); } catch (failure) { setError(normalizeApiError(failure).message); }
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const saveSubscription = async (event: FormEvent) => {
    event.preventDefault(); if (!sub) return;
    setError(""); setMessage("");
    try { await apiClient.patch(base, sub); setMessage("Abonnement mis à jour."); await load(); } catch (failure) { setError(normalizeApiError(failure).message); }
  };
  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const { data: result } = await apiClient.post<BillingPayment & { already_recorded: boolean }>(`${base}payments/`, { ...pay, amount: Number(pay.amount), months: Number(pay.months) });
      setMessage(result.already_recorded ? "Cette référence était déjà enregistrée : rien n’a été ajouté." : `Paiement enregistré : ${result.document_label}.`);
      if (!result.already_recorded) setPay({ ...pay, reference: "", amount: "", fne_reference: "", note: "" });
      await load();
    } catch (failure) { setError(normalizeApiError(failure).message); }
  };

  return <SettingsModal title={`Abonnement — ${organization.name}`} wide onClose={onClose}>
    {!data || !sub ? (error ? <p role="alert" className="text-sm text-error-text">{error}</p> : <Loader fullScreen={false} label="Chargement…" />) : <div className="space-y-8 text-sm">
      <p className="rounded-xl bg-canvas p-4 text-ink">Plan en vigueur : <strong>{data.plan_label}</strong> ({data.state}) · mode d’application : <strong>{data.enforcement}</strong> · membres {data.usage.members}, formulaires {data.usage.forms}, points d’accueil {data.usage.access_points}</p>
      {message && <p role="status" className="text-success-text">{message}</p>}
      {error && <p role="alert" className="text-error-text">{error}</p>}

      <form onSubmit={recordPayment} className="space-y-3">
        <h3 className="font-semibold text-ink">Enregistrer un paiement</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>Plan<select className={inputClass} value={pay.plan} onChange={(e) => setPay({ ...pay, plan: e.target.value })}>{PLANS.filter((p) => p.value !== "free").map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <label className={label}>Montant (FCFA)<input className={inputClass} type="number" min={1} required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
          <label className={label}>Mois couverts<input className={inputClass} type="number" min={1} max={36} required value={pay.months} onChange={(e) => setPay({ ...pay, months: e.target.value })} /></label>
          <label className={label}>Moyen de paiement<select className={inputClass} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{METHODS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
          <label className={`${label} sm:col-span-2`}>Référence (opérateur ou virement) — unique<input className={inputClass} required value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="ex. WAVE-…" /></label>
          <label className={label}>Référence FNE (si facture émise)<input className={inputClass} value={pay.fne_reference} onChange={(e) => setPay({ ...pay, fne_reference: e.target.value })} /></label>
          <label className={`${label} sm:col-span-2`}>Note<input className={inputClass} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></label>
        </div>
        <button type="submit" className={primaryButton}>Enregistrer le paiement</button>
        <p className="text-xs text-ink-soft">Rejouer la même référence n’ajoute rien. Sans référence FNE, le document est un « reçu interne, non fiscal ».</p>
      </form>

      <form onSubmit={saveSubscription} className="space-y-3 border-t border-border pt-6">
        <h3 className="font-semibold text-ink">Abonnement</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>Plan<select className={inputClass} value={sub.plan} onChange={(e) => setSub({ ...sub, plan: e.target.value as PlanId })}>{PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <label className={label}>Statut<select className={inputClass} value={sub.status} onChange={(e) => setSub({ ...sub, status: e.target.value as AdminSubscription["status"] })}><option value="trialing">Essai</option><option value="active">Actif</option><option value="founder">Fondateur</option><option value="canceled">Résilié</option></select></label>
          <label className={label}>Délai de grâce (jours)<input className={inputClass} type="number" min={0} max={90} value={sub.grace_days} onChange={(e) => setSub({ ...sub, grace_days: Number(e.target.value) })} /></label>
          <label className={label}>Fin d’essai<input className={inputClass} type="datetime-local" value={toLocalInput(sub.trial_ends_at)} onChange={(e) => setSub({ ...sub, trial_ends_at: fromLocalInput(e.target.value) })} /></label>
          <label className={label}>Fin de période payée<input className={inputClass} type="datetime-local" value={toLocalInput(sub.current_period_end)} onChange={(e) => setSub({ ...sub, current_period_end: fromLocalInput(e.target.value) })} /></label>
          <label className={label}>Fondateur : préavis envoyé le<input className={inputClass} type="datetime-local" value={toLocalInput(sub.founder_notice_sent_at)} onChange={(e) => setSub({ ...sub, founder_notice_sent_at: fromLocalInput(e.target.value) })} /></label>
          <label className={label}>Fondateur : limites à partir du<input className={inputClass} type="datetime-local" value={toLocalInput(sub.founder_limits_from)} onChange={(e) => setSub({ ...sub, founder_limits_from: fromLocalInput(e.target.value) })} /></label>
        </div>
        <button type="submit" className={primaryButton}>Enregistrer l’abonnement</button>
        <p className="text-xs text-ink-soft">Ne renseignez « limites à partir du » qu’après l’envoi du préavis écrit par e-mail.</p>
      </form>

      <section className="space-y-2 border-t border-border pt-6">
        <h3 className="font-semibold text-ink">Paiements enregistrés</h3>
        {data.payments.length === 0 ? <p className="text-ink-soft">Aucun.</p> : <ul className="divide-y divide-border rounded-xl border border-border">{data.payments.map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 p-3"><span>{p.plan_label} · {p.amount.toLocaleString("fr-FR")} FCFA · {p.reference}</span><span className="text-ink-soft">{p.document_label}</span></li>)}</ul>}
      </section>
    </div>}
  </SettingsModal>;
}
