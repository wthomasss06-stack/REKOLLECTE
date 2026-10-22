"use client";
import { useEffect, useState } from "react";
import { PencilSimple, Plus, Sparkle, Trash } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import Modal from "@/components/ui/Modal";
import { useDialog } from "@/components/ui/DialogProvider";
import FormBuilder from "@/components/FormBuilder";
import { apiClient } from "@/lib/api";
import { FORM_PRESETS } from "@/lib/formPresets";
import type { FormField, FormTemplate } from "@/types";

type ViewState = "loading" | "error" | "ready";
const fieldLabels: Record<string, string> = { text: "Texte", phone: "Téléphone", email: "Email", number: "Nombre", date: "Date", select: "Liste", checkbox: "Case", signature: "Signature" };

export default function FormulairePanel() {
  const { confirm } = useDialog();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [selected, setSelected] = useState<FormTemplate | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [presetId, setPresetId] = useState("vierge");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = () => { setState("loading"); apiClient.get<FormTemplate[]>("/form-templates/").then((res) => { setForms(res.data); setSelected((current) => res.data.find((item) => item.id === current?.id) || res.data.find((item) => item.is_default) || res.data[0] || null); setState("ready"); }).catch(() => setState("error")); };
  useEffect(load, []);

  const create = async (event: React.FormEvent) => { event.preventDefault(); const preset = FORM_PRESETS.find((item) => item.id === presetId) ?? FORM_PRESETS[0]; if (!newTitle.trim() || !preset) return; setCreating(true); setCreateError(""); try { const response = await apiClient.post<FormTemplate>("/form-templates/", { title: newTitle.trim(), fields_schema: preset.fields, is_default: forms.length === 0, is_active: true }); setForms((items) => [...items, response.data]); setSelected(response.data); setNewTitle(""); setCreateOpen(false); setEditOpen(true); } catch { setCreateError("Impossible de créer le formulaire. Réessayez."); } finally { setCreating(false); } };
  const makeDefault = async (form: FormTemplate) => { await confirm({ tone: "info", mood: "smug", title: "Définir par défaut ?", message: <>Le QR général de l’établissement ouvrira désormais « <strong>{form.title}</strong> ». L’URL du QR ne change pas.</>, confirmLabel: "Définir par défaut", runningLabel: "Application…", run: async () => { const response = await apiClient.patch<FormTemplate>(`/form-templates/${form.id}/`, { is_default: true, is_active: true }); setForms((items) => items.map((item) => ({ ...item, is_default: item.id === form.id }))); setSelected(response.data); }, successTitle: "Formulaire par défaut mis à jour", errorTitle: "Changement impossible" }); };
  const remove = async (form: FormTemplate) => { await confirm({ tone: "danger", title: "Supprimer ce formulaire ?", message: <>« <strong>{form.title}</strong> » sera supprimé définitivement. Cette action ne peut pas être annulée.</>, confirmLabel: "Supprimer", cancelLabel: "Garder", runningLabel: "Suppression…", run: async () => { await apiClient.delete(`/form-templates/${form.id}/`); if (selected?.id === form.id) { setSelected(null); setEditOpen(false); } load(); }, successTitle: "Formulaire supprimé", errorTitle: "Suppression impossible" }); };
  const openEdit = (form: FormTemplate) => { setSelected(form); setEditOpen(true); };

  if (state === "loading") return <Loader fullScreen={false} label="Chargement des formulaires…" />;
  if (state === "error") return <AutoRetry onRetry={load} label="Chargement des formulaires…" />;
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="max-w-2xl text-sm text-ink-soft">Choisissez un formulaire par défaut pour le QR général de l’établissement. Les QR dédiés à un point d’accueil gardent leur formulaire propre.</p></div><button onClick={() => { setCreateOpen(true); setCreateError(""); }} className="flex items-center gap-2 rounded-full bg-cta px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} weight="bold" /> Nouveau formulaire</button></div>
    <div className="grid gap-3 md:grid-cols-2">{forms.map((form) => <article key={form.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{form.title}</p><p className="mt-1 text-xs text-ink-soft">{form.fields_schema.length} champs · version {form.version}</p></div>{form.is_default && <span className="rounded-full bg-success-bg px-2 py-1 text-[11px] font-semibold text-success-text">Par défaut · QR général</span>}</div><div className="mt-3 flex flex-wrap gap-1.5">{form.fields_schema.slice(0, 5).map((field: FormField) => <span key={field.id} className="rounded bg-canvas px-2 py-1 text-[11px] text-ink-soft">{fieldLabels[field.type] || field.type}</span>)}</div><div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs"><button onClick={() => openEdit(form)} className="flex items-center gap-1 font-medium text-ink hover:underline"><PencilSimple size={14} /> Modifier</button>{!form.is_default && <button onClick={() => makeDefault(form)} className="font-medium text-ink-soft hover:underline">Définir par défaut</button>}<button onClick={() => remove(form)} className="flex items-center gap-1 text-error-text hover:underline"><Trash size={14} /> Supprimer</button></div></article>)}</div>
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un formulaire" description="Pars d’un modèle, puis personnalise ses champs dans l’éditeur." wide><form onSubmit={create} className="space-y-5"><div><label className="mb-1.5 block text-sm font-medium text-ink">Nom du formulaire</label><input autoFocus required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex. Visiteurs siège, Livraisons, Événements" className="w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-ink outline-none focus:border-ink" /></div><div><label className="mb-2 block text-sm font-medium text-ink">Repartir d’un modèle</label><div className="grid gap-2 sm:grid-cols-2">{FORM_PRESETS.map((preset) => <label key={preset.id} className={`cursor-pointer rounded-xl border p-3 transition ${presetId === preset.id ? "border-ink bg-canvas" : "border-border"}`}><input type="radio" name="preset" value={preset.id} checked={presetId === preset.id} onChange={() => setPresetId(preset.id)} className="sr-only" /><span className="font-medium text-ink">{preset.label}</span><span className="mt-1 block text-xs text-ink-soft">{preset.fields.length} champs · {Array.from(new Set(preset.fields.map((field) => fieldLabels[field.type] || field.type))).join(" · ")}</span></label>)}</div></div>{createError && <p className="text-sm text-error-text">{createError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-sm text-ink">Annuler</button><button disabled={creating} className="rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Création…" : "Créer et personnaliser"}</button></div></form></Modal>
    <Modal open={editOpen && Boolean(selected)} onClose={() => setEditOpen(false)} title={`Modifier « ${selected?.title || "Formulaire"} »`} description="Modifiez le nom, le modèle ou les champs, puis enregistrez les changements." wide>{selected && <><div className="mb-4 flex items-center gap-2 rounded-lg bg-canvas p-3 text-sm text-ink-soft"><Sparkle size={17} /> Les changements sont appliqués à ce formulaire.</div><FormBuilder key={selected.id} formId={selected.id} initialTitle={selected.title} initialSchema={selected.fields_schema as FormField[]} onSaved={() => { setEditOpen(false); load(); }} /></>}</Modal>
  </div>;
}
