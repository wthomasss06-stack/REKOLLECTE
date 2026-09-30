import type { ElementType } from "react";

/**
 * Ecran "bientot disponible" pour une sous-section REKOLLECTE+ dont le modele metier
 * n'existe pas encore dans le produit. Volontairement honnete sur son statut plutot
 * que de simuler une fonctionnalite : `active` distingue "deja debloque pour cet
 * etablissement, interface a venir" de "pas encore debloque".
 */
export default function KarnetComingSoon({
  icon: Icon,
  title,
  description,
  active,
}: {
  icon: ElementType;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-canvas">
        <Icon size={26} weight="bold" className="text-cta" />
      </div>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p>
      <p className="mt-4 text-xs font-medium text-ink-soft">
        {active
          ? "Activé pour ton établissement — l’interface arrive très prochainement."
          : "Pas encore disponible pour ton établissement."}
      </p>
    </div>
  );
}
