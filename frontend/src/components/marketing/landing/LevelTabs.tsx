"use client";

/** Bascule REKOLLECTE / REKOLLECTE+ (aperçu produit et parcours). */
export default function LevelTabs({ value, onChange }: { value: 0 | 1; onChange: (next: 0 | 1) => void }) {
  return (
    <div role="tablist" aria-label="Niveau" className="inline-flex rounded-full border border-border bg-surface p-1 shadow-subtle">
      {(["REKOLLECTE", "REKOLLECTE+"] as const).map((name, i) => (
        <button
          key={name}
          role="tab"
          type="button"
          aria-selected={value === i}
          onClick={() => onChange(i as 0 | 1)}
          className={`rounded-full px-5 py-2.5 text-xs font-bold transition-colors duration-300 ${value === i ? "bg-cta text-cta-ink" : "text-ink-soft hover:text-ink"}`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
