"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowClockwise, CloudCheck, CloudSlash, DeviceMobile, WarningCircle } from "@phosphor-icons/react";
import { ArrowUpRight } from "@/components/icons";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import type { SyncController } from "@/hooks/useBackgroundSync";
import type { FormField } from "@/types";
import SignaturePad from "./SignaturePad";
import DocumentScanner, { type DocumentScanResult } from "./DocumentScanner";

type ResponseValue = string | boolean | DocumentScanResult;

export default function VisitorForm({ schema, qrToken, orgName, logoUrl = "", visitReasons = [], syncState }: { schema: FormField[]; qrToken: string; orgName: string; logoUrl?: string; visitReasons?: string[]; syncState: SyncController }) {
  const [formData, setFormData] = useState<Record<string, ResponseValue>>({});
  const [signature, setSignature] = useState("");
  const [reasons, setReasons] = useState(visitReasons);
  const [logoFailed, setLogoFailed] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { submitForm, status } = useSubmitForm(qrToken);
  const setValue = (id: string, value: ResponseValue) => setFormData((prev) => ({ ...prev, [id]: value }));
  useEffect(() => { setReasons(visitReasons); }, [visitReasons]);
  useEffect(() => {
    if (status !== "synced" && status !== "saved_offline") return;
    const timer = window.setTimeout(() => {
      if (window.innerWidth < 640) window.close();
      else { setFormData({}); setSignature(""); location.reload(); }
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "saved_offline") return <StatusScreen icon={<DeviceMobile size={40} className="text-ink-soft" />} title="Enregistré sur cet appareil" message={`Merci. Tes informations seront transmises à ${orgName} dès que le réseau sera disponible.`} />;
  if (status === "synced") return <StatusScreen icon={<CloudCheck size={40} className="text-success-text" />} title="Merci, c’est enregistré" message={`Tu peux fermer cette page. Bienvenue chez ${orgName}.`} />;

  const handleSubmit = async (e: FormEvent) => { e.preventDefault(); const missing = schema.find((field) => field.required && (field.type === "signature" ? !signature : formData[field.id] === undefined || formData[field.id] === "")); if (missing) { setValidationError(`Le champ « ${missing.label} » est obligatoire.`); return; } setValidationError(""); await submitForm(formData, signature); };
  const hasNetwork = syncState.network.browserOnline && syncState.network.apiReachable;
  const hasQueue = syncState.pendingCount > 0 || syncState.failedCount > 0;

  return <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
    <header className="mb-2 flex items-center gap-3">{logoUrl && !logoFailed ? <img src={logoUrl} alt={`Logo de ${orgName}`} className="h-12 w-12 rounded-xl object-contain" referrerPolicy="no-referrer" onError={() => setLogoFailed(true)} /> : logoUrl ? <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-sm font-bold text-ink">{orgName.slice(0, 2).toUpperCase()}</div> : null}<div><h1 className="text-2xl font-bold text-ink">{orgName}</h1><p className="text-sm text-ink-soft">Merci de remplir ce registre d&apos;accès</p></div></header>
    <SyncBanner hasNetwork={hasNetwork} pendingCount={syncState.pendingCount} failedCount={syncState.failedCount} syncing={syncState.syncing} lastSyncedAt={syncState.lastSyncedAt} lastError={syncState.lastError} retryNow={syncState.retryNow} />
    {schema.map((field) => { const requiredMark = field.required && <span className="text-error-text">*</span>; if (field.type === "checkbox") return <label key={field.id} className="flex items-start gap-2.5 text-sm text-ink"><input type="checkbox" required={field.required} className="mt-0.5 h-4 w-4 accent-cta" onChange={(e) => setValue(field.id, e.target.checked)} /><span>{field.label} {requiredMark}</span></label>;
      return <div key={field.id} className="flex flex-col gap-1.5"><label className="text-sm font-medium text-ink">{field.label} {requiredMark}</label>{field.type === "select" ? <><select required={field.required} className="rounded-lg border border-border bg-surface p-3 text-ink outline-none focus:border-ink" onChange={(e) => setValue(field.id, e.target.value)}><option value="">Sélectionne une option</option>{(field.options?.length ? field.options : reasons).map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>{(field.options || reasons).includes("Autre") && formData[field.id] === "Autre" && <input required type="text" placeholder="Précise le motif" className="rounded-lg border border-border bg-surface p-3 text-ink outline-none focus:border-ink" onChange={(e) => setValue(`${field.id}_autre`, e.target.value)} />}</> : field.type === "signature" ? <SignaturePad onSave={setSignature} /> : field.type === "document_scan" ? <DocumentScanner qrToken={qrToken} documentType={field.document_type} extractFields={field.extract_fields} required={field.required} requiresAgentValidation={field.requires_agent_validation !== false} retainDocumentImage={field.retain_document_image === true} onChange={(value) => { if (value) setValue(field.id, value); else setFormData((prev) => { const next = { ...prev }; delete next[field.id]; return next; }); }} /> : field.type === "photo" ? <PhotoCapture required={field.required} onChange={(value) => setValue(field.id, value)} /> : <input type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} inputMode={field.type === "number" ? "numeric" : undefined} required={field.required} className="rounded-lg border border-border bg-surface p-3 text-ink outline-none focus:border-ink" onChange={(e) => setValue(field.id, e.target.value)} />}</div>; })}
    {reasons.length > 0 && <button type="button" onClick={() => setReasons([...reasons])} className="flex items-center gap-1 text-xs text-ink-soft underline"><ArrowClockwise size={14} /> Actualiser les motifs</button>}
    {validationError && <p className="text-sm text-error-text">{validationError}</p>}<button type="submit" disabled={status === "saving"} className="flex w-full items-center justify-center gap-2 rounded-full bg-cta py-3.5 font-medium text-white disabled:opacity-50">{status === "saving" ? "Enregistrement…" : <>Valider mon entrée <ArrowUpRight size={16} /></>}</button>
  </form>;
}

function SyncBanner({ hasNetwork, pendingCount, failedCount, syncing, lastSyncedAt, lastError, retryNow }: { hasNetwork: boolean; pendingCount: number; failedCount: number; syncing: boolean; lastSyncedAt: string | null; lastError: string | null; retryNow: () => void }) {
  if (!hasNetwork) return <div className="flex items-start gap-2 rounded-xl border border-border bg-canvas p-3 text-xs text-ink-soft"><CloudSlash size={18} className="mt-0.5 shrink-0" /><span>Mode hors ligne : ta fiche sera enregistrée sur cet appareil et synchronisée automatiquement au retour du réseau.</span></div>;
  if (failedCount > 0) return <div className="flex items-start gap-2 rounded-xl border border-error-text/30 bg-error-bg p-3 text-xs text-error-text"><WarningCircle size={18} className="mt-0.5 shrink-0" /><span className="flex-1">{failedCount} fiche{failedCount > 1 ? "s" : ""} nécessite{failedCount > 1 ? "nt" : ""} une nouvelle tentative. {lastError || "Vérifie la connexion puis réessaie."}<button type="button" onClick={retryNow} className="mt-2 inline-flex items-center gap-1 font-semibold underline">Réessayer <ArrowClockwise size={13} /></button></span></div>;
  if (pendingCount > 0 || syncing) return <div className="flex items-start gap-2 rounded-xl border border-border bg-canvas p-3 text-xs text-ink-soft"><CloudCheck size={18} className="mt-0.5 shrink-0" /><span>{syncing ? "Synchronisation en cours…" : `${pendingCount} fiche${pendingCount > 1 ? "s" : ""} en attente de synchronisation.`}</span></div>;
  if (lastSyncedAt) return <div className="flex items-center gap-2 text-[11px] text-ink-soft"><CloudCheck size={15} className="text-success-text" /> Dernière synchronisation : {new Date(lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>;
  return null;
}

function StatusScreen({ icon, title, message }: { icon: ReactNode; title: string; message: string }) { return <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">{icon}<h2 className="text-2xl font-bold text-ink">{title}</h2><p className="max-w-sm text-ink-soft">{message}</p></div>; }

function PhotoCapture({ required, onChange }: { required: boolean; onChange: (value: string) => void }) { const [preview, setPreview] = useState(""); return <div className="space-y-2"><input type="file" accept="image/*" capture="user" required={required && !preview} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ""); setPreview(value); onChange(value); }; reader.readAsDataURL(file); }} className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-ink" />{preview && <img src={preview} alt="Aperçu du visiteur" className="h-24 w-24 rounded-lg object-cover" />}</div>; }
