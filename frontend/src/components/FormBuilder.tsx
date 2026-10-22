"use client";
import { useEffect, useId, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { CaretDown, Check, DotsSixVertical, Plus, Trash } from "@phosphor-icons/react";

import { ArrowUpRight } from "@/components/icons";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { FORM_PRESETS } from "@/lib/formPresets";
import type { FieldType, FormField } from "@/types";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  host: "Qui venez-vous voir ?", text: "Texte court", phone: "Téléphone", email: "Email", number: "Nombre", date: "Date", select: "Liste déroulante", checkbox: "Case à cocher", signature: "Signature", photo: "Photo visiteur",
};
const IDENTITY_ROLE_LABELS = { full_name: "Nom du client", phone: "Téléphone du client", email: "Email du client" } as const;

let idCounter = 0;
function newFieldId(): string { idCounter += 1; return `champ_${Date.now()}_${idCounter}`; }

function keepSignaturesLast(fields: FormField[]): FormField[] {
  return [...fields.filter((field) => field.type !== "signature"), ...fields.filter((field) => field.type === "signature")];
}

export default function FormBuilder({ initialSchema, formId, initialTitle = "Registre d’accès", onSaved }: { initialSchema: FormField[]; formId?: string; initialTitle?: string; onSaved?: () => void }) {
  const { confirm } = useDialog();
  const [fields, setFields] = useState<FormField[]>(() => keepSignaturesLast(initialSchema.filter((field) => (field.type as string) !== "document_scan")));
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const pointerDragRef = useRef<{ id: string; pointerId: number } | null>(null);
  // Modèles : repliés quand le formulaire a déjà des champs (on le modifie), ouverts quand il est vide (on le crée).
  const uid = useId();
  const [presetsOpen, setPresetsOpen] = useState(() => initialSchema.length === 0);
  // Champs ajoutés depuis la dernière sauvegarde : mis en évidence pour qu’on voie qu’ils existent bien.
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fieldsSectionRef = useRef<HTMLElement>(null);
  const revealRef = useRef<string | null>(null);

  // Après un ajout (ou un modèle appliqué), amène le nouveau champ à l’écran : sur téléphone, il est sinon hors de vue.
  useEffect(() => {
    const target = revealRef.current;
    if (!target) return;
    revealRef.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    if (target === "__fields") { fieldsSectionRef.current?.scrollIntoView({ behavior, block: "start" }); return; }
    const row = rowRefs.current.get(target);
    if (!row) return;
    row.scrollIntoView({ behavior, block: "center" });
    const input = row.querySelector<HTMLInputElement>("input:not([type])");
    input?.focus({ preventScroll: true });
    input?.select();
  }, [fields]);

  const applyPreset = async (presetFields: FormField[]) => {
    if (fields.length > 0 && !(await confirm({
      tone: "info",
      mood: "smug",
      title: "Remplacer les champs ?",
      message: "Les champs actuels seront remplacés par ce modèle. Rien n’est publié tant que vous n’enregistrez pas.",
      confirmLabel: "Remplacer",
      cancelLabel: "Garder mes champs",
    }))) return;
    const next = presetFields.map((f) => ({ ...f, id: newFieldId() }));
    setFields(keepSignaturesLast(next));
    setFreshIds(new Set(next.map((f) => f.id)));
    setPresetsOpen(false);
    revealRef.current = "__fields";
    setSaved(false);
  };

  const addField = () => {
    const id = newFieldId();
    setFields((prev) => keepSignaturesLast([...prev, { id, type: "text", label: "Nouveau champ", required: false }]));
    setFreshIds((prev) => new Set(prev).add(id));
    revealRef.current = id;
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
      setSaved(true); setFreshIds(new Set()); onSaved?.();
    } catch { setSaveError("Impossible d’enregistrer. Vérifiez votre connexion et réessayez."); }
    finally { setSaving(false); }
  };

  const freshCount = fields.filter((field) => freshIds.has(field.id)).length;

  return <div className="space-y-6">
    <section>
      <label className="mb-2 block text-sm font-medium text-ink-soft">Nom du formulaire</label>
      <input value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} className="mb-5 w-full rounded-md border border-border bg-surface p-2.5 text-sm text-ink outline-none focus:border-ink" />
      <h2 className="mb-3 text-sm font-medium text-ink-soft">
        <button type="button" id={`${uid}-presets-toggle`} aria-expanded={presetsOpen} aria-controls={`${uid}-presets-panel`} onClick={() => setPresetsOpen((open) => !open)} className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 text-left transition hover:border-ink">
          <span>Repartir d’un modèle <span className="ml-1 text-xs font-normal">({FORM_PRESETS.length} modèles)</span></span>
          <CaretDown size={16} weight="bold" aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${presetsOpen ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {presetsOpen && <div id={`${uid}-presets-panel`} role="region" aria-labelledby={`${uid}-presets-toggle`} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">{FORM_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset.fields)} className="rounded-lg border border-border bg-surface p-3 text-left text-sm transition hover:border-ink"><p className="font-medium text-ink">{preset.label}</p><p className="mt-0.5 text-xs text-ink-soft">{preset.fields.length} champs</p></button>)}</div>}
    </section>

    <section ref={fieldsSectionRef} className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-heading font-semibold text-ink">Champs du formulaire</h2><button type="button" onClick={addField} className="flex items-center gap-1 text-sm font-medium text-ink transition hover:text-cta-hover"><Plus size={16} weight="bold" /> Ajouter</button></div>
      {freshCount > 0 && <p role="status" aria-live="polite" className="mb-3 rounded-lg bg-success-bg px-3 py-2 text-xs font-medium text-success-text">{freshCount === 1 ? "1 champ ajouté, en vert : il n’est pas encore enregistré." : `${freshCount} champs ajoutés, en vert : ils ne sont pas encore enregistrés.`} Appuyez sur « Enregistrer » pour les publier.</p>}
      <p className="mb-3 text-xs text-ink-soft">Sur ordinateur, fais glisser les champs par leur poignée pour changer leur ordre. La signature reste automatiquement en dernière position.</p>
      {fields.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-soft">Aucun champ pour l’instant — choisis un modèle ci-dessus ou ajoutez vos propres champs.</p> : <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {fields.map((field) => {
          const isSignature = field.type === "signature";
          const isDropTarget = dropTargetId === field.id && !isSignature;
          const isFresh = freshIds.has(field.id);
          return <div key={field.id} ref={(node) => { if (node) rowRefs.current.set(field.id, node); else rowRefs.current.delete(field.id); }} data-form-field-id={field.id} data-fresh={isFresh ? "true" : undefined} draggable={!isSignature} onDragStart={(event) => !isSignature && handleDragStart(event, field.id)} onDragOver={(event) => { if (draggedId && !isSignature) { event.preventDefault(); setDropTargetId(field.id); } }} onDragLeave={() => setDropTargetId(null)} onDrop={(event) => handleDrop(event, isSignature ? "signature" : field.id)} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }} className={`p-4 transition ${isFresh ? "border-l-4 border-success-text bg-success-bg/70" : ""} ${isDropTarget ? "border-t-2 border-cta bg-cta/5" : ""} ${draggedId === field.id ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <span title={isSignature ? "La signature est toujours en dernier" : "Glisser pour réordonner avec la souris ou le doigt"} onPointerDown={(event) => !isSignature && handlePointerDown(event, field.id)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className={`shrink-0 select-none ${isSignature ? "text-ink-soft/50" : "cursor-grab touch-none text-ink-soft active:cursor-grabbing"}`}><DotsSixVertical size={22} weight="bold" /></span>
              <input value={field.label} onChange={(e) => updateField(field.id, "label", e.target.value)} placeholder="Nom du champ" className="min-w-0 flex-1 rounded-md border border-border bg-canvas p-2.5 text-sm text-ink outline-none focus:border-ink" />
              {isFresh && <span className="shrink-0 rounded-full bg-success-text px-2 py-1 text-[11px] font-semibold text-surface">Nouveau</span>}
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
          </div>;
        })}
      </div>}
    </section>

    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={saving || fields.length === 0} className="flex items-center justify-center gap-1.5 rounded-full bg-cta px-6 py-3 font-medium text-cta-ink transition duration-200 ease-quiet hover:-translate-y-0.5 hover:bg-cta-hover active:scale-[0.98] disabled:opacity-50">{saving ? "Enregistrement..." : saved ? <><Check size={16} weight="bold" /> Enregistré</> : <>Enregistrer et déployer <ArrowUpRight size={16} /></>}</button>{saveError && <p className="text-sm text-error-text">{saveError}</p>}</div>
  </div>;
}
