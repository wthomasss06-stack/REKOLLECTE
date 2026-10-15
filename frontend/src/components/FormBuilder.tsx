"use client";
import { useRef, useState, type DragEvent, type PointerEvent } from "react";
import { Check, DotsSixVertical, Plus, Trash } from "@phosphor-icons/react";

import { ArrowUpRight } from "@/components/icons";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { FORM_PRESETS } from "@/lib/formPresets";
import type { FieldType, FormField } from "@/types";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  host: "Qui venez-vous voir ?", text: "Texte court", phone: "Téléphone", email: "Email", number: "Nombre", date: "Date", select: "Liste déroulante", checkbox: "Case à cocher", signature: "Signature", photo: "Photo visiteur", document_scan: "Scanner une pièce d’identité",
};
const DOCUMENT_FIELD_OPTIONS = [["last_name", "Nom"], ["first_names", "Prénoms"], ["document_number", "Numéro du document"], ["birth_date", "Date de naissance"], ["nationality", "Nationalité"], ["expiry_date", "Date d’expiration"]] as const;
const IDENTITY_ROLE_LABELS = { full_name: "Nom du client", phone: "Téléphone du client", email: "Email du client" } as const;

let idCounter = 0;
function newFieldId(): string { idCounter += 1; return `champ_${Date.now()}_${idCounter}`; }

function keepSignaturesLast(fields: FormField[]): FormField[] {
  return [...fields.filter((field) => field.type !== "signature"), ...fields.filter((field) => field.type === "signature")];
}

export default function FormBuilder({ initialSchema, formId, initialTitle = "Registre d'accès", onSaved }: { initialSchema: FormField[]; formId?: string; initialTitle?: string; onSaved?: () => void }) {
  const { confirm } = useDialog();
  const [fields, setFields] = useState<FormField[]>(() => keepSignaturesLast(initialSchema));
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const pointerDragRef = useRef<{ id: string; pointerId: number } | null>(null);

  const applyPreset = async (presetFields: FormField[]) => {
    if (fields.length > 0 && !(await confirm({
      tone: "info",
      mood: "smug",
      title: "Remplacer les champs ?",
      message: "Les champs actuels seront remplacés par ce modèle. Rien n’est publié tant que tu n’enregistres pas.",
      confirmLabel: "Remplacer",
      cancelLabel: "Garder mes champs",
    }))) return;
    setFields(keepSignaturesLast(presetFields.map((f) => ({ ...f, id: newFieldId() }))));
    setSaved(false);
  };

  const addField = () => {
    setFields((prev) => keepSignaturesLast([...prev, { id: newFieldId(), type: "text", label: "Nouveau champ", required: false }]));
    setSaved(false);
  };

  function updateField<K extends keyof FormField>(id: string, key: K, value: FormField[K]) {
    setFields((prev) => keepSignaturesLast(prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))));
    setSaved(false);
  }

  const removeField = (id: string) => { setFields((prev) => prev.filter((f) => f.id !== id)); setSaved(false); };

  const moveField = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setFields((prev) => {
      const source = prev.find((field) => field.id === sourceId);
      if (!source || source.type === "signature") return prev;
      const movable = prev.filter((field) => field.type !== "signature");
      const signatures = prev.filter((field) => field.type === "signature");
      const withoutSource = movable.filter((field) => field.id !== sourceId);
      const targetIndex = targetId && targetId !== "signature" ? withoutSource.findIndex((field) => field.id === targetId) : withoutSource.length;
      const insertAt = targetIndex < 0 ? withoutSource.length : targetIndex;
      withoutSource.splice(insertAt, 0, source);
      return [...withoutSource, ...signatures];
    });
    setSaved(false);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedId;
    if (sourceId) moveField(sourceId, targetId);
    setDraggedId(null); setDropTargetId(null);
  };

  // HTML5 drag n’est pas pris en charge de façon fiable par les écrans tactiles.
  // La poignée utilise donc aussi Pointer Events : souris, doigt et stylet.
  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>, id: string) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDragRef.current = { id, pointerId: event.pointerId };
    setDraggedId(id);
    setDropTargetId(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (!pointerDragRef.current) return;
    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-form-field-id]");
    setDropTargetId(element?.dataset.formFieldId || null);
  };

  const handlePointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    const drag = pointerDragRef.current;
    if (!drag) return;
    event.preventDefault();
    const targetId = dropTargetId;
    pointerDragRef.current = null;
    if (targetId && targetId !== drag.id) moveField(drag.id, targetId);
    setDraggedId(null);
    setDropTargetId(null);
  };

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const payload = { title, fields_schema: keepSignaturesLast(fields) };
      if (formId) await apiClient.patch(`/form-templates/${formId}/`, payload);
      else await apiClient.put("/form-template/", payload);
      setSaved(true); onSaved?.();
    } catch { setSaveError("Impossible d'enregistrer. Vérifie ta connexion et réessaie."); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <section>
      <label className="mb-2 block text-sm font-medium text-ink-soft">Nom du formulaire</label>
      <input value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} className="mb-5 w-full rounded-md border border-border bg-surface p-2.5 text-sm text-ink outline-none focus:border-ink" />
      <h2 className="mb-3 text-sm font-medium text-ink-soft">Repartir d&apos;un modèle</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">{FORM_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset.fields)} className="rounded-lg border border-border bg-surface p-3 text-left text-sm transition hover:border-ink"><p className="font-medium text-ink">{preset.label}</p><p className="mt-0.5 text-xs text-ink-soft">{preset.fields.length} champs</p></button>)}</div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-heading font-semibold text-ink">Champs du formulaire</h2><button type="button" onClick={addField} className="flex items-center gap-1 text-sm font-medium text-ink transition hover:text-cta-hover"><Plus size={16} weight="bold" /> Ajouter</button></div>
      <p className="mb-3 text-xs text-ink-soft">Sur ordinateur, fais glisser les champs par leur poignée pour changer leur ordre. La signature reste automatiquement en dernière position.</p>
      {fields.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-soft">Aucun champ pour l&apos;instant — choisis un modèle ci-dessus ou ajoute tes propres champs.</p> : <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {fields.map((field) => {
          const isSignature = field.type === "signature";
          const isDropTarget = dropTargetId === field.id && !isSignature;
          return <div key={field.id} data-form-field-id={field.id} draggable={!isSignature} onDragStart={(event) => !isSignature && handleDragStart(event, field.id)} onDragOver={(event) => { if (draggedId && !isSignature) { event.preventDefault(); setDropTargetId(field.id); } }} onDragLeave={() => setDropTargetId(null)} onDrop={(event) => handleDrop(event, isSignature ? "signature" : field.id)} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }} className={`p-4 transition ${isDropTarget ? "border-t-2 border-cta bg-cta/5" : ""} ${draggedId === field.id ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <span title={isSignature ? "La signature est toujours en dernier" : "Glisser pour réordonner avec la souris ou le doigt"} onPointerDown={(event) => !isSignature && handlePointerDown(event, field.id)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className={`shrink-0 select-none ${isSignature ? "text-ink-soft/50" : "cursor-grab touch-none text-ink-soft active:cursor-grabbing"}`}><DotsSixVertical size={22} weight="bold" /></span>
              <input value={field.label} onChange={(e) => updateField(field.id, "label", e.target.value)} placeholder="Nom du champ" className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-2.5 text-sm text-ink outline-none focus:border-ink" />
              {isSignature && <span className="hidden shrink-0 rounded-full bg-canvas px-2 py-1 text-[11px] text-ink-soft sm:inline">Dernier</span>}
              <button type="button" onClick={() => removeField(field.id)} aria-label="Supprimer ce champ" className="shrink-0 p-1 text-ink-soft transition hover:text-error-text"><Trash size={18} weight="bold" /></button>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <select value={field.type} onChange={(e) => { const next = e.target.value as FieldType; updateField(field.id, "type", next); if (next === "host" && (!field.label.trim() || field.label === "Nouveau champ")) updateField(field.id, "label", "Qui venez-vous voir ?"); }} className="rounded-md border border-border bg-canvas p-2 text-sm text-ink outline-none"><option value="text">Texte court</option>{(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).filter(([value]) => value !== "text").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              {field.type !== "host" && <label className="flex items-center gap-1.5 text-sm text-ink-soft"><input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, "required", e.target.checked)} className="h-4 w-4 accent-cta" /> Obligatoire</label>}
              {field.type !== "host" && <label className="flex items-center gap-1.5 text-sm text-ink-soft">Identité<select value={field.identity_role || ""} onChange={(e) => updateField(field.id, "identity_role", (e.target.value || null) as FormField["identity_role"])} className="rounded-md border border-border bg-canvas p-2 text-sm text-ink outline-none"><option value="">Aucun rôle</option>{Object.entries(IDENTITY_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            </div>
            {field.type === "select" && <input value={field.options?.join(", ") ?? ""} onChange={(e) => updateField(field.id, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Options séparées par une virgule (ex : Rendez-vous, Livraison)" className="mt-2.5 w-full rounded-md border border-border bg-canvas p-2.5 text-sm text-ink outline-none focus:border-ink" />}
            {field.type === "host" && <p className="mt-2.5 rounded-lg border border-border bg-canvas p-3 text-xs leading-relaxed text-ink-soft">Facultatif pour le visiteur : il choisit la personne qu’il vient voir dans une liste. Cette personne reçoit une alerte sur son tableau de bord ; sans choix, le patron et les gérants sont prévenus. La liste vient de l’équipe (Paramètres › Équipe › Personnes à prévenir) ; tant que personne n’est cochée, ce champ reste caché au visiteur.</p>}
            {field.type === "document_scan" && <div className="mt-3 space-y-3 rounded-lg border border-border bg-canvas p-3"><label className="block text-xs font-medium text-ink-soft">Type de document<select value={field.document_type || "free"} onChange={(e) => updateField(field.id, "document_type", e.target.value as FormField["document_type"])} className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-ink"><option value="cni">CNI</option><option value="passport">Passeport</option><option value="free">Document libre</option></select></label><div><p className="mb-2 text-xs font-medium text-ink-soft">Données à extraire</p><div className="grid grid-cols-2 gap-2">{DOCUMENT_FIELD_OPTIONS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={(field.extract_fields || ["last_name", "first_names", "document_number", "birth_date"]).includes(value)} onChange={(e) => { const current = field.extract_fields || ["last_name", "first_names", "document_number", "birth_date"]; updateField(field.id, "extract_fields", e.target.checked ? [...current, value] : current.filter((item) => item !== value)); }} className="h-4 w-4 accent-cta" />{label}</label>)}</div></div><label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={field.requires_agent_validation !== false} onChange={(e) => updateField(field.id, "requires_agent_validation", e.target.checked)} className="h-4 w-4 accent-cta" />Vérification par un agent obligatoire</label><label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={field.retain_document_image === true} onChange={(e) => updateField(field.id, "retain_document_image", e.target.checked)} className="h-4 w-4 accent-cta" />Conserver l’image du document</label><p className="text-[11px] text-ink-soft">L’image n’est pas conservée par défaut. Les données OCR restent modifiables avant validation.</p></div>}
          </div>;
        })}
      </div>}
    </section>

    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={saving || fields.length === 0} className="flex items-center justify-center gap-1.5 rounded-full bg-cta px-6 py-3 font-medium text-cta-ink transition duration-200 ease-quiet hover:-translate-y-0.5 hover:bg-cta-hover active:scale-[0.98] disabled:opacity-50">{saving ? "Enregistrement..." : saved ? <><Check size={16} weight="bold" /> Enregistré</> : <>Enregistrer et déployer <ArrowUpRight size={16} /></>}</button>{saveError && <p className="text-sm text-error-text">{saveError}</p>}</div>
  </div>;
}
