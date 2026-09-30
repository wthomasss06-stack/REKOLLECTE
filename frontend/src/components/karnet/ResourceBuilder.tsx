"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bed, Briefcase, Calendar, Car, Barbell, Cube, Scissors,
  CaretDown, Clock, Hash, MagnifyingGlass, MapPin, Money, Plus, Trash, Users,
} from "@phosphor-icons/react";

import Modal from "@/components/ui/Modal";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { RESOURCE_CATEGORIES, RESOURCE_PRESETS, type ResourcePreset } from "@/lib/resourcePresets";
import type { KarnetResource, KarnetResourceBillingUnit, KarnetResourceCategory } from "@/types";

type Props = { autoOpenCreate?: boolean };

const CATEGORY_ICONS: Record<KarnetResourceCategory, typeof Bed> = {
  accommodation: Bed, beauty: Scissors, workspace: Briefcase, events: Calendar,
  parking: Car, leisure: Barbell, other: Cube,
};
const BILLING_LABELS: Record<KarnetResourceBillingUnit, string> = {
  hour: "Par heure", session: "Par séance", day: "Par jour", night: "Par nuit", month: "Par mois", fixed: "Forfait fixe",
};
const inputClass = "w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/70 focus:border-cta focus:ring-2 focus:ring-cta/10";

type EditDraft = {
  name: string; code: string; category: KarnetResourceCategory; resource_type: string;
  description: string; capacity: string; price: string; billing_unit: KarnetResourceBillingUnit;
  location: string; equipment: string; duration_label: string; is_active: boolean;
};

function toEditDraft(r: KarnetResource): EditDraft {
  return {
    name: r.name, code: r.code, category: r.category, resource_type: r.resource_type,
    description: r.description, capacity: r.capacity != null ? String(r.capacity) : "", price: r.price,
    billing_unit: (r.billing_unit || "fixed") as KarnetResourceBillingUnit,
    location: r.location, equipment: r.equipment, duration_label: r.duration_label, is_active: r.is_active,
  };
}

/**
 * Créateur/éditeur de ressources REKOLLECTE+ — même expérience que la création de
 * formulaire (voir /dashboard/parametres/formulaire) : un petit modal "Nom +
 * Repartir d'un modèle" pour démarrer vite depuis un catalogue qui couvre
 * plusieurs métiers (pas figé sur l'hôtellerie), puis un modal plus large pour
 * peaufiner (capacité, code, emplacement...). Le Staff voit la même grille de
 * ressources, en lecture seule ; créer/modifier/supprimer reste réservé à
 * Patron/Gérant (règle vérifiée côté API, pas seulement ici).
 */
export default function ResourceBuilder({ autoOpenCreate = false }: Props) {
  const { user } = useAuthContext();
  const canManage = user?.role === "BOSS" || user?.role === "GERANT";

  const [resources, setResources] = useState<KarnetResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  // Accordéon : une seule catégorie dépliée à la fois, repliée par défaut.
  const [expandedCategory, setExpandedCategory] = useState<KarnetResourceCategory | null>(null);
  // Id du modèle en cours de création : désactive juste sa carte le temps de
  // l'appel, pas tout le modal (on garde la vue prête pour enchaîner un autre
  // sous-type après avoir personnalisé le premier).
  const [creatingPresetId, setCreatingPresetId] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  const [editing, setEditing] = useState<KarnetResource | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = () => {
    setLoading(true);
    apiClient
      .get<KarnetResource[]>("/karnet/resources/")
      .then((res) => setResources(res.data))
      .catch(() => setListError("Impossible de charger les ressources."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    if (autoOpenCreate && canManage) openCreate();
    // Ne se déclenche qu'au montage (arrivée depuis l'activation de REKOLLECTE+) —
    // pas à chaque changement de canManage/openCreate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCreate]);

  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();
    if (!query) return RESOURCE_PRESETS;
    return RESOURCE_PRESETS.filter((preset) => preset.label.toLowerCase().includes(query) || preset.resource_type.toLowerCase().includes(query));
  }, [presetSearch]);
  const presetsByCategory = useMemo(() => {
    const groups = new Map<KarnetResourceCategory, ResourcePreset[]>();
    for (const preset of filteredPresets) groups.set(preset.category, [...(groups.get(preset.category) || []), preset]);
    return RESOURCE_CATEGORIES.map((cat) => ({ ...cat, presets: groups.get(cat.id) || [] })).filter((cat) => cat.presets.length > 0);
  }, [filteredPresets]);

  const openCreate = () => {
    setPresetSearch(""); setExpandedCategory(null);
    setCreateError(""); setCreateOpen(true);
  };

  // Un sous-type suffit à créer la ressource : nom = celui du modèle (ex.
  // "Studio"), prix à 0 et inactive tant qu'elle n'est pas personnalisée —
  // l'éditeur qui s'ouvre juste après sert à fixer le vrai prix et l'activer
  // (voir validate() côté API : une ressource inactive peut avoir un prix nul,
  // une ressource active non). Plus besoin de ressaisir un nom au préalable.
  const createFromPreset = async (preset: ResourcePreset) => {
    setCreatingPresetId(preset.id); setCreateError("");
    try {
      const response = await apiClient.post<KarnetResource>("/karnet/resources/", {
        name: preset.label, price: "0", is_active: false, category: preset.category, resource_type: preset.resource_type,
        billing_unit: preset.billing_unit, capacity: preset.capacity ?? null, equipment: preset.equipment || "",
      });
      setResources((current) => [...current, response.data]);
      setCreateOpen(false);
      setEditing(response.data);
      setEditDraft(toEditDraft(response.data));
    } catch (err) {
      setCreateError(normalizeApiError(err).message || "Impossible de créer cette ressource.");
    } finally {
      setCreatingPresetId(null);
    }
  };

  const openEdit = (resource: KarnetResource) => { setEditing(resource); setEditDraft(toEditDraft(resource)); setEditError(""); };
  const updateDraft = <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => {
    setEditDraft((current) => (current ? { ...current, [key]: value } : current));
    setEditError("");
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !editDraft) return;
    if (!editDraft.name.trim()) return setEditError("Donne un nom à cette ressource.");
    if (!editDraft.price || Number(editDraft.price) <= 0) return setEditError("Indique un prix supérieur à 0.");
    if (editDraft.capacity && Number(editDraft.capacity) <= 0) return setEditError("La capacité doit être supérieure à 0.");
    setSaving(true); setEditError("");
    try {
      const response = await apiClient.patch<KarnetResource>(`/karnet/resources/${editing.id}/`, {
        name: editDraft.name.trim(), code: editDraft.code.trim(), category: editDraft.category,
        resource_type: editDraft.resource_type.trim(), description: editDraft.description.trim(),
        capacity: editDraft.capacity ? Number(editDraft.capacity) : null, price: editDraft.price,
        billing_unit: editDraft.billing_unit, location: editDraft.location.trim(),
        equipment: editDraft.equipment.trim(), duration_label: editDraft.duration_label.trim(),
        is_active: editDraft.is_active,
      });
      setResources((current) => current.map((r) => (r.id === response.data.id ? response.data : r)));
      setEditing(null);
    } catch (err) {
      setEditError(normalizeApiError(err).message || "Impossible d’enregistrer cette ressource.");
    } finally {
      setSaving(false);
    }
  };

  const removeResource = async (resource: KarnetResource) => {
    setDeletingId(resource.id);
    try {
      const response = await apiClient.delete<KarnetResource | undefined>(`/karnet/resources/${resource.id}/`);
      if (response.status === 200 && response.data) {
        setResources((current) => current.map((r) => (r.id === resource.id ? response.data! : r))); // désactivée (historique protégé)
      } else {
        setResources((current) => current.filter((r) => r.id !== resource.id));
      }
    } catch {
      setListError("Impossible de supprimer cette ressource.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Configuration REKOLLECTE+</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Mes ressources</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">Crée les espaces ou équipements que tes clients pourront réserver — hôtel, salon, coworking, restaurant, parking, sport… Chaque ressource est enregistrée dès que tu la valides.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-full bg-cta px-5 py-3 text-sm font-semibold text-white hover:bg-cta-hover">
            <Plus size={18} /> Ajouter une ressource
          </button>
        )}
      </header>

      {listError && <p role="alert" className="text-sm text-error-text">{listError}</p>}

      {loading ? <p className="text-sm text-ink-soft">Chargement…</p> : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Cube size={38} className="mx-auto text-ink-soft" />
          <h2 className="mt-4 text-lg font-semibold text-ink">Aucune ressource pour le moment</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {canManage ? "Choisis un modèle, puis crée ta première ressource pour commencer à configurer les réservations." : "Patron ou Gérant n’a pas encore configuré de ressource."}
          </p>
          {canManage && <button type="button" onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-full bg-cta px-5 py-3 text-sm font-semibold text-white hover:bg-cta-hover"><Plus size={17} /> Créer ma première ressource</button>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((resource) => {
            const Icon = CATEGORY_ICONS[resource.category] ?? Cube;
            return (
              <article key={resource.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-cta/10 p-3 text-cta"><Icon size={23} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{resource.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${resource.is_active ? "bg-emerald-500/10 text-emerald-700" : "bg-canvas text-ink-soft"}`}>{resource.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{resource.resource_type || resource.category_display}{resource.code ? ` · ${resource.code}` : ""}</p>
                    <p className="mt-2 text-sm font-medium text-ink">{Number(resource.price).toLocaleString("fr-FR")} FCFA · {(resource.billing_unit_display || resource.unit_display).toLowerCase()}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <button type="button" onClick={() => openEdit(resource)} className="text-sm font-medium text-cta hover:underline">Modifier</button>
                    <button type="button" onClick={() => removeResource(resource)} disabled={deletingId === resource.id} aria-label={`Supprimer ${resource.name}`} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-error-text disabled:opacity-60">
                      <Trash size={16} /> {deletingId === resource.id ? "…" : "Supprimer"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Étape 1 : type de ressource en accordéon → un clic sur un sous-type crée
          la ressource directement (nom = sous-type), sans ressaisie. */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter une ressource" description="Choisis un type pour déplier ses sous-types, puis clique sur un sous-type : la ressource est créée aussitôt, à personnaliser dans l’éditeur." wide>
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input value={presetSearch} onChange={(e) => setPresetSearch(e.target.value)} placeholder="Rechercher un sous-type…" className="w-full rounded-lg border border-border bg-canvas py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-cta" />
          </div>
          {createError && <p role="alert" className="text-sm text-error-text">{createError}</p>}
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {presetsByCategory.map((cat) => {
              const isSearching = presetSearch.trim().length > 0;
              const isOpen = isSearching || expandedCategory === cat.id;
              const Icon = CATEGORY_ICONS[cat.id] ?? Cube;
              return (
                <div key={cat.id} className="overflow-hidden rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory((current) => (current === cat.id ? null : cat.id))}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 bg-canvas/60 px-4 py-3 text-left transition hover:bg-canvas"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={18} weight="bold" className="text-cta" />
                      <span className="text-sm font-semibold text-ink">{cat.label}</span>
                      <span className="text-xs text-ink-soft">({cat.presets.length})</span>
                    </span>
                    <CaretDown size={16} className={`shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
                      {cat.presets.map((preset) => (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => createFromPreset(preset)}
                          disabled={creatingPresetId !== null}
                          className="rounded-xl border border-border p-3 text-left transition hover:border-cta hover:bg-cta/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="block font-medium text-ink">{preset.label}</span>
                          <span className="mt-1 block text-xs text-ink-soft">
                            {creatingPresetId === preset.id ? "Création…" : `${BILLING_LABELS[preset.billing_unit]}${preset.capacity ? ` · ${preset.capacity} pers.` : ""}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {presetsByCategory.length === 0 && <p className="text-sm text-ink-soft">Aucun modèle ne correspond à cette recherche.</p>}
          </div>
        </div>
      </Modal>

      {/* Étape 2 : éditeur complet, comme le modal de modification de formulaire */}
      <Modal open={Boolean(editing && editDraft)} onClose={() => setEditing(null)} title={`Modifier « ${editing?.name || "la ressource"} »`} description="Modifie les informations puis enregistre les changements." wide>
        {editDraft && (
          <form onSubmit={submitEdit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de la ressource *"><input value={editDraft.name} onChange={(e) => updateDraft("name", e.target.value)} className={inputClass} /></Field>
              <Field label="Identifiant / référence" icon={<Hash size={16} />}><input value={editDraft.code} onChange={(e) => updateDraft("code", e.target.value)} placeholder="Ex. CH-204" className={inputClass} /></Field>
              <Field label="Catégorie">
                <div className="relative">
                  <select value={editDraft.category} onChange={(e) => updateDraft("category", e.target.value as KarnetResourceCategory)} className={`${inputClass} appearance-none pr-9`}>
                    {RESOURCE_CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                  <CaretDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                </div>
              </Field>
              <Field label="Type de ressource"><input value={editDraft.resource_type} onChange={(e) => updateDraft("resource_type", e.target.value)} placeholder="Ex. Chambre double" className={inputClass} /></Field>
              <Field label="Capacité maximale" icon={<Users size={16} />}><input type="number" min="1" value={editDraft.capacity} onChange={(e) => updateDraft("capacity", e.target.value)} placeholder="Ex. 2 personnes" className={inputClass} /></Field>
              <Field label="Prix (FCFA) *" icon={<Money size={16} />}><input type="number" min="0" value={editDraft.price} onChange={(e) => updateDraft("price", e.target.value)} className={inputClass} /></Field>
              <Field label="Mode de tarification">
                <div className="relative">
                  <select value={editDraft.billing_unit} onChange={(e) => updateDraft("billing_unit", e.target.value as KarnetResourceBillingUnit)} className={`${inputClass} appearance-none pr-9`}>
                    {(Object.keys(BILLING_LABELS) as KarnetResourceBillingUnit[]).map((unit) => <option key={unit} value={unit}>{BILLING_LABELS[unit]}</option>)}
                  </select>
                  <CaretDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                </div>
              </Field>
              <Field label="Emplacement" icon={<MapPin size={16} />}><input value={editDraft.location} onChange={(e) => updateDraft("location", e.target.value)} placeholder="Ex. 2e étage, aile B" className={inputClass} /></Field>
              <Field label="Durée habituelle" icon={<Clock size={16} />}><input value={editDraft.duration_label} onChange={(e) => updateDraft("duration_label", e.target.value)} placeholder="Ex. 60 minutes, 1 nuit" className={inputClass} /></Field>
            </div>
            <Field label="Description"><textarea value={editDraft.description} onChange={(e) => updateDraft("description", e.target.value)} rows={3} placeholder="Décris brièvement cette ressource…" className={`${inputClass} resize-y`} /></Field>
            <Field label="Équipements et caractéristiques"><input value={editDraft.equipment} onChange={(e) => updateDraft("equipment", e.target.value)} placeholder="Ex. Climatisation, Wi-Fi, télévision" className={inputClass} /></Field>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-canvas/60 p-4">
              <input type="checkbox" checked={editDraft.is_active} onChange={(e) => updateDraft("is_active", e.target.checked)} className="h-4 w-4 accent-cta" />
              <span><span className="block text-sm font-medium text-ink">Ressource active</span><span className="block text-xs text-ink-soft">Une ressource inactive ne sera pas proposée pour une nouvelle réservation.</span></span>
            </label>
            {editError && <p role="alert" className="text-sm text-error-text">{editError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2.5 text-sm text-ink">Annuler</button>
              <button disabled={saving} className="rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="flex items-center gap-2 text-sm font-medium text-ink-soft">{icon}{label}</span>{children}</label>;
}
