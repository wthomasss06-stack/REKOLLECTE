"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";

import { apiClient } from "@/lib/api";
import { FORM_PRESETS } from "@/lib/formPresets";
import type { FormField } from "@/types";

export default function SimpleFormSetup({ onSaved }: { onSaved?: () => void }) {
  const [presetId, setPresetId] = useState(FORM_PRESETS[0]?.id ?? "bureau");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = FORM_PRESETS.find((p) => p.id === presetId) ?? FORM_PRESETS[0];
  const previewFields = selectedPreset?.fields ?? [];

  const save = async () => {
    if (!selectedPreset) return;
    setSaving(true);
    setError(null);
    try {
      const fields: FormField[] = selectedPreset.fields.map((f, i) => ({
        ...f,
        id: f.id || `champ_${i}`,
      }));
      await apiClient.put("/form-template/", { fields_schema: fields });
      setSaved(true);
      onSaved?.();
    } catch {
      setError("Impossible d’enregistrer. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Choisis un modèle prêt à l’emploi — vous pourrez le personnaliser plus tard dans les paramètres.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FORM_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setPresetId(preset.id);
              setSaved(false);
            }}
            className={`rounded-xl border p-4 text-left transition ${
              presetId === preset.id
                ? "border-cta bg-cta/5 shadow-sm ring-1 ring-cta/20"
                : "border-border bg-surface hover:border-ink/40"
            }`}
          >
            <p className="font-semibold text-ink">{preset.label}</p>
            <p className="mt-1 text-xs text-ink-soft">{preset.fields.length} champs</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-canvas/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Aperçu</p>
        <ul className="mt-3 space-y-2">
          {previewFields.map((field) => (
            <li key={field.id} className="flex items-center gap-2 text-sm text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-cta" />
              {field.label}
              {field.required && <span className="text-xs text-ink-soft">(obligatoire)</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-cta px-6 py-3 text-sm font-medium text-white transition hover:bg-cta-hover disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : saved ? (
            <>
              <Check size={16} weight="bold" /> Enregistré
            </>
          ) : (
            "Utiliser ce modèle"
          )}
        </button>
        {error && <p className="text-sm text-error-text">{error}</p>}
      </div>
    </div>
  );
}
