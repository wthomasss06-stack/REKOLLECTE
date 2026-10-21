"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DownloadSimple, Trash } from "@phosphor-icons/react";

import { useDialog } from "@/components/ui/DialogProvider";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";

const RETENTION_CHOICES = [30, 90, 180, 365, 730, 1095];
const field = "min-h-[44px] w-full rounded-xl border border-border bg-canvas px-3 text-sm text-ink outline-none focus:border-ink";

interface Policy { visits_days: number; visits_default_days: number; clients_days: number; audit_days: number; payments_years: number }

/** Paramètres › Données et confidentialité (patron) : durée de conservation, minimisation, droits des personnes. */
export default function DonneesPanel() {
  const { organization, refreshUser } = useAuthContext();
  const { confirm } = useDialog();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [retention, setRetention] = useState("");
  const [restrict, setRestrict] = useState(false);
  const [storeNumber, setStoreNumber] = useState(false);
  const [contact, setContact] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subjectError, setSubjectError] = useState("");

  useEffect(() => { apiClient.get<Policy>("/privacy/retention/").then(({ data }) => setPolicy(data)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!organization) return;
    setRetention(organization.retention_visits_days ? String(organization.retention_visits_days) : "");
    setRestrict(Boolean(organization.restrict_visit_reasons));
    setStoreNumber(Boolean(organization.store_document_number));
    setContact(organization.privacy_contact || "");
  }, [organization]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSaved(false);
    try {
      await apiClient.patch("/org/me/", { retention_visits_days: retention ? Number(retention) : null, restrict_visit_reasons: restrict, store_document_number: storeNumber, privacy_contact: contact });
      await refreshUser();
      apiClient.get<Policy>("/privacy/retention/").then(({ data }) => setPolicy(data)).catch(() => undefined);
      setSaved(true);
    } catch (failure) { setError(normalizeApiError(failure).message); }
  };

  const identity = () => ({ phone: phone.trim(), email: email.trim() });
  const exportSubject = async () => {
    setSubjectError("");
    try {
      const { data } = await apiClient.post("/privacy/subject/export/", identity());
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      link.download = "donnees_personne.json";
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
    } catch (failure) { setSubjectError(normalizeApiError(failure).message); }
  };
  const deleteSubject = async () => {
    setSubjectError("");
    if (!phone.trim() && !email.trim()) { setSubjectError("Indiquez un numéro de téléphone ou une adresse e-mail."); return; }
    await confirm({
      tone: "danger", title: "Supprimer les données de cette personne ?",
      message: "Toutes ses visites sont supprimées définitivement. Sa fiche client est supprimée, ou anonymisée si des réservations y sont rattachées. Cette action est irréversible.",
      confirmLabel: "Supprimer définitivement", runningLabel: "Suppression…", successTitle: "Données supprimées", errorTitle: "Suppression impossible",
      run: () => apiClient.post("/privacy/subject/delete/", { ...identity(), confirm: true }),
    });
  };

  return <div className="space-y-8">
    <form onSubmit={save} className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Durée de conservation des visites</h3>
        <select value={retention} onChange={(event) => setRetention(event.target.value)} className={field} aria-label="Durée de conservation des visites">
          <option value="">Par défaut ({policy?.visits_default_days ?? 365} jours)</option>
          {RETENTION_CHOICES.map((days) => <option key={days} value={days}>{days} jours</option>)}
        </select>
        <p className="text-xs text-ink-soft">Au-delà, les visites sont supprimées automatiquement. Cette durée est distincte de l’historique affiché par votre plan. Les paiements sont conservés {policy?.payments_years ?? 10} ans, à part.</p>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Minimiser les données collectées</h3>
        <label className="flex min-h-[44px] items-start gap-3 text-sm text-ink"><input type="checkbox" checked={restrict} onChange={(event) => setRestrict(event.target.checked)} className="mt-0.5 h-5 w-5 accent-cta" /><span>Motifs de visite prédéfinis uniquement <span className="block text-xs text-ink-soft">Retire « Autre » (texte libre) : un visiteur pourrait y écrire une information sensible, par exemple de santé.</span></span></label>
        <label className="flex min-h-[44px] items-start gap-3 text-sm text-ink"><input type="checkbox" checked={storeNumber} onChange={(event) => setStoreNumber(event.target.checked)} className="mt-0.5 h-5 w-5 accent-cta" /><span>Conserver le numéro complet de la pièce d’identité <span className="block text-xs text-ink-soft">Déconseillé : par défaut, seuls les 3 derniers caractères sont gardés. À activer seulement sur besoin démontré.</span></span></label>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Contact pour les droits des personnes</h3>
        <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="ex. confidentialite@votre-etablissement.ci" className={field} aria-label="Contact pour les droits des personnes" />
        <p className="text-xs text-ink-soft">Affiché sous le formulaire visiteur. Vide : « adressez-vous à l’accueil ».</p>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="inline-flex min-h-[44px] items-center rounded-full bg-cta px-6 text-sm font-semibold text-white">Enregistrer</button>
        {saved && <span role="status" className="text-sm text-success-text">Enregistré.</span>}
        {error && <span role="alert" className="text-sm text-error-text">{error}</span>}
      </div>
    </form>

    <section className="space-y-3 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-ink">Droits d’une personne : accès et suppression</h3>
      <p className="text-xs text-ink-soft">La personne est retrouvée par son téléphone ou son e-mail exacts, jamais par son nom (on ne supprime pas les homonymes).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Téléphone" inputMode="tel" autoComplete="off" className={field} aria-label="Téléphone de la personne" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" type="email" autoComplete="off" className={field} aria-label="E-mail de la personne" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void exportSubject()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink hover:bg-canvas"><DownloadSimple size={18} aria-hidden="true" />Exporter ses données</button>
        <button type="button" onClick={() => void deleteSubject()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-error-text/40 px-5 text-sm font-medium text-error-text hover:bg-error-bg"><Trash size={18} aria-hidden="true" />Supprimer ses données</button>
      </div>
      {subjectError && <p role="alert" className="text-sm text-error-text">{subjectError}</p>}
    </section>
  </div>;
}
