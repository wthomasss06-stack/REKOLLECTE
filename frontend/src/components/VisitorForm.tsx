"use client";

import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowClockwise, CloudCheck, CloudSlash, DeviceMobile, UserPlus, WarningCircle } from "@phosphor-icons/react";
import { ArrowUpRight } from "@/components/icons";
import { useSubmitForm } from "@/hooks/useSubmitForm";
import type { SyncController } from "@/hooks/useBackgroundSync";
import type { RefreshResult } from "@/hooks/usePublicForm";
import { isKioskLikeDevice } from "@/lib/device";
import { compressImageFile } from "@/lib/imageCompress";
import type { FormField } from "@/types";
import SignaturePad from "./SignaturePad";
import DocumentScanner, { type DocumentScanResult } from "./DocumentScanner";

type ResponseValue = string | boolean | DocumentScanResult;

const FIELD_CLASS = "min-h-[44px] rounded-lg border border-border bg-surface p-3 text-ink outline-none focus:border-ink";
const CONFIRMATION_DELAY_MS = 4500;
const NO_REASONS: string[] = [];

/**
 * Jeton `autocomplete` du champ. Sur une tablette partagée : « off », sinon le navigateur proposerait au visiteur suivant
 * les coordonnées du précédent. Sur le téléphone du visiteur, au contraire, l'autocomplétion lui fait gagner du temps.
 */
function autoCompleteFor(field: FormField, kiosk: boolean): string | undefined {
  if (kiosk) return "off";
  if (field.identity_role === "phone" || field.type === "phone") return "tel";
  if (field.identity_role === "email" || field.type === "email") return "email";
  if (field.identity_role === "full_name") return "name";
  if (field.type !== "text") return undefined;
  const label = field.label.toLowerCase().trim();
  if (/nom\s*(et|&)\s*pr[ée]nom|nom complet|full name/.test(label)) return "name";
  if (/pr[ée]nom/.test(label)) return "given-name";
  if (/^nom\b/.test(label)) return "family-name";
  return undefined;
}

export default function VisitorForm({
  schema, qrToken, orgName, logoUrl = "", visitReasons = NO_REASONS, syncState, onRefreshReasons,
}: {
  schema: FormField[];
  qrToken: string;
  orgName: string;
  logoUrl?: string;
  visitReasons?: string[];
  syncState: SyncController;
  /** Recharge le formulaire et les motifs depuis le serveur. Absent : le bouton « Actualiser les motifs » n'est pas proposé. */
  onRefreshReasons?: () => Promise<RefreshResult>;
}) {
  const uid = useId();
  const [formKey, setFormKey] = useState(0);
  const [formData, setFormData] = useState<Record<string, ResponseValue>>({});
  const [signature, setSignature] = useState("");
  const [reasons, setReasons] = useState(visitReasons);
  const [logoFailed, setLogoFailed] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [kiosk, setKiosk] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | RefreshResult>("idle");
  const { submitForm, status, reset } = useSubmitForm(qrToken);

  const setValue = (id: string, value: ResponseValue) => setFormData((prev) => ({ ...prev, [id]: value }));
  const domId = (fieldId: string) => `${uid}-${fieldId}`;

  useEffect(() => { setReasons(visitReasons); }, [visitReasons]);
  useEffect(() => { setKiosk(isKioskLikeDevice()); }, []);

  /** Formulaire vierge pour le visiteur suivant, sans recharger la page (donc sans dépendre du réseau ni du cache). */
  const resetForm = useCallback(() => {
    reset();
    setFormData({});
    setSignature("");
    setValidationError("");
    setRefreshState("idle");
    setFormKey((key) => key + 1);
    window.scrollTo?.({ top: 0 });
  }, [reset]);

  // Après la confirmation : la tablette d'accueil se remet à zéro toute seule. Sur un téléphone, on tente de fermer la page ;
  // le navigateur ne l'autorise que si la page a été ouverte par un script, sinon l'écran de remerciement reste affiché.
  useEffect(() => {
    if (status !== "synced" && status !== "saved_offline") return;
    const timer = window.setTimeout(() => {
      if (kiosk) resetForm();
      else window.close();
    }, CONFIRMATION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, kiosk, resetForm]);

  if (status === "saved_offline") {
    return <StatusScreen
      icon={<DeviceMobile size={40} className="text-ink-soft" />}
      title="Enregistré sur cet appareil"
      message={`Merci. Vos informations seront transmises à ${orgName} dès que le réseau sera disponible. Gardez cette page ouverte un instant.`}
      action={<NextVisitorButton onClick={resetForm} />}
    />;
  }
  if (status === "synced") {
    return <StatusScreen
      icon={<CloudCheck size={40} className="text-success-text" />}
      title="Merci, c’est enregistré"
      message={`Bienvenue chez ${orgName}. Vous pouvez fermer cette page.`}
      action={<NextVisitorButton onClick={resetForm} />}
    />;
  }

  const firstMissingField = () => schema.find((field) => {
    if (!field.required) return false;
    if (field.type === "signature") return !signature;
    const value = formData[field.id];
    if (field.type === "checkbox") return value !== true;
    if (field.type === "document_scan" || field.type === "photo") return !value;
    return typeof value !== "string" || value.trim() === "";
  });

  /** Amène le visiteur sur le champ à corriger : sur un long formulaire, un message tout en bas ne se voit pas. */
  const focusField = (fieldId: string) => {
    window.requestAnimationFrame(() => {
      const wrapper = document.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(fieldId)}"]`);
      if (!wrapper) return;
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      wrapper.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const missing = firstMissingField();
    if (missing) {
      setValidationError(`Le champ « ${missing.label} » est obligatoire.`);
      focusField(missing.id);
      return;
    }
    setValidationError("");
    await submitForm(formData, signature);
  };

  const refreshReasons = async () => {
    if (!onRefreshReasons) return;
    setRefreshState("loading");
    try { setRefreshState(await onRefreshReasons()); } catch { setRefreshState("offline"); }
    window.setTimeout(() => setRefreshState("idle"), 4000);
  };

  const hasNetwork = syncState.network.browserOnline && syncState.network.apiReachable;

  const renderControl = (field: FormField) => {
    const id = domId(field.id);
    const autoComplete = autoCompleteFor(field, kiosk);

    if (field.type === "select") {
      const options = field.options?.length ? field.options : reasons;
      return <>
        <select
          id={id}
          required={field.required}
          autoComplete={autoComplete}
          className={FIELD_CLASS}
          onChange={(event) => {
            const value = event.target.value;
            setFormData((prev) => {
              const next = { ...prev, [field.id]: value };
              // La précision n'a de sens que pour « Autre » : on n'envoie pas un ancien texte resté en mémoire.
              if (value !== "Autre") delete next[`${field.id}_autre`];
              return next;
            });
          }}
        >
          <option value="">Sélectionnez une option</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {options.includes("Autre") && formData[field.id] === "Autre" && (
          <input
            required
            type="text"
            aria-label={`${field.label} : précisez`}
            placeholder="Précisez le motif"
            autoComplete="off"
            className={FIELD_CLASS}
            onChange={(event) => setValue(`${field.id}_autre`, event.target.value)}
          />
        )}
      </>;
    }

    if (field.type === "signature") return <SignaturePad onSave={setSignature} />;

    if (field.type === "document_scan") {
      return <DocumentScanner
        qrToken={qrToken}
        documentType={field.document_type}
        extractFields={field.extract_fields}
        required={field.required}
        requiresAgentValidation={field.requires_agent_validation !== false}
        retainDocumentImage={field.retain_document_image === true}
        onChange={(value) => {
          if (value) setValue(field.id, value);
          else setFormData((prev) => { const next = { ...prev }; delete next[field.id]; return next; });
        }}
      />;
    }

    if (field.type === "photo") return <PhotoCapture id={id} required={field.required} onChange={(value) => setValue(field.id, value)} />;

    return <input
      id={id}
      type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      inputMode={field.type === "number" ? "numeric" : undefined}
      required={field.required}
      autoComplete={autoComplete}
      className={FIELD_CLASS}
      onChange={(event) => setValue(field.id, event.target.value)}
    />;
  };

  return <form key={formKey} onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
    <header className="mb-2 flex items-center gap-3">
      {logoUrl && !logoFailed
        ? <img src={logoUrl} alt={`Logo de ${orgName}`} className="h-12 w-12 rounded-xl object-contain" referrerPolicy="no-referrer" onError={() => setLogoFailed(true)} />
        : logoUrl
          ? <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-sm font-bold text-ink">{orgName.slice(0, 2).toUpperCase()}</div>
          : null}
      <div>
        <h1 className="text-2xl font-bold text-ink">{orgName}</h1>
        <p className="text-sm text-ink-soft">Merci de remplir ce registre d&apos;accès</p>
      </div>
    </header>

    <SyncBanner hasNetwork={hasNetwork} pending={syncState.pendingCount > 0} failed={syncState.failedCount > 0} syncing={syncState.syncing} retryNow={syncState.retryNow} />

    {schema.map((field) => {
      const requiredMark = field.required && <span className="text-error-text" aria-hidden="true">*</span>;
      if (field.type === "checkbox") {
        return <div key={field.id} data-field-id={field.id}>
          <label className="flex min-h-[44px] items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              required={field.required}
              className="mt-0.5 h-5 w-5 shrink-0 accent-cta"
              onChange={(event) => setValue(field.id, event.target.checked)}
            />
            <span>{field.label} {requiredMark}</span>
          </label>
        </div>;
      }
      const labelFor = field.type === "signature" || field.type === "document_scan" ? undefined : domId(field.id);
      return <div key={field.id} data-field-id={field.id} className="flex flex-col gap-1.5">
        <label htmlFor={labelFor} className="text-sm font-medium text-ink">{field.label} {requiredMark}</label>
        {renderControl(field)}
      </div>;
    })}

    {onRefreshReasons && reasons.length > 0 && (
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <button type="button" onClick={() => void refreshReasons()} disabled={refreshState === "loading"} className="inline-flex min-h-[44px] items-center gap-1.5 underline disabled:opacity-60">
          <ArrowClockwise size={14} className={refreshState === "loading" ? "animate-spin" : ""} /> Actualiser les motifs
        </button>
        <span role="status">
          {refreshState === "updated" && "Liste à jour."}
          {refreshState === "offline" && "Hors ligne : la dernière liste connue est conservée."}
        </span>
      </div>
    )}

    {validationError && <p role="alert" className="text-sm font-medium text-error-text">{validationError}</p>}

    <p className="text-xs leading-relaxed text-ink-soft">
      Les informations saisies servent uniquement à tenir le registre d’accès de {orgName}.{" "}
      <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="underline">Politique de confidentialité</a>
    </p>

    <button type="submit" disabled={status === "saving"} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-cta py-3.5 font-medium text-white disabled:opacity-50">
      {status === "saving" ? "Enregistrement…" : <>Valider mon entrée <ArrowUpRight size={16} /></>}
    </button>
  </form>;
}

/**
 * Bandeau de synchronisation vu par les visiteurs. Il rassure (hors ligne, envoi en cours) sans exposer d'information interne :
 * ni nombre de fiches des visiteurs précédents, ni heure de dernière synchronisation, ni message d'erreur technique.
 */
function SyncBanner({ hasNetwork, pending, failed, syncing, retryNow }: { hasNetwork: boolean; pending: boolean; failed: boolean; syncing: boolean; retryNow: () => void }) {
  if (!hasNetwork) {
    return <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-canvas p-3 text-xs text-ink-soft">
      <CloudSlash size={18} className="mt-0.5 shrink-0" />
      <span>Mode hors ligne : votre fiche sera enregistrée sur cet appareil et envoyée automatiquement dès le retour du réseau.</span>
    </div>;
  }
  if (failed) {
    return <div role="alert" className="flex items-start gap-2 rounded-xl border border-error-text/30 bg-error-bg p-3 text-xs text-error-text">
      <WarningCircle size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">
        Un envoi précédent n’a pas abouti ; il sera retenté automatiquement.
        <button type="button" onClick={retryNow} className="mt-1 inline-flex min-h-[44px] items-center gap-1 font-semibold underline">Réessayer <ArrowClockwise size={13} /></button>
      </span>
    </div>;
  }
  if (pending || syncing) {
    return <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-canvas p-3 text-xs text-ink-soft">
      <CloudCheck size={18} className="mt-0.5 shrink-0" />
      <span>Envoi en cours…</span>
    </div>;
  }
  return null;
}

function NextVisitorButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-ink">
    <UserPlus size={18} /> Enregistrer un autre visiteur
  </button>;
}

function StatusScreen({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
    {icon}
    <h2 className="text-2xl font-bold text-ink">{title}</h2>
    <p className="max-w-sm text-ink-soft">{message}</p>
    {action}
  </div>;
}

function PhotoCapture({ id, required, onChange }: { id: string; required: boolean; onChange: (value: string) => void }) {
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      // Photo réduite avant d'être rangée dans la file hors-ligne (voir lib/imageCompress.ts).
      const value = await compressImageFile(file);
      setPreview(value);
      onChange(value);
    } catch {
      setError("Cette photo n’a pas pu être lue. Essayez-en une autre.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-2">
    <input
      id={id}
      type="file"
      accept="image/*"
      capture="user"
      required={required && !preview}
      onChange={(event) => void handleFile(event.target.files?.[0])}
      className="min-h-[44px] w-full rounded-lg border border-border bg-surface p-3 text-sm text-ink"
    />
    {busy && <p role="status" className="text-xs text-ink-soft">Préparation de la photo…</p>}
    {error && <p role="alert" className="text-xs text-error-text">{error}</p>}
    {preview && <img src={preview} alt="Aperçu du visiteur" className="h-24 w-24 rounded-lg object-cover" />}
  </div>;
}
