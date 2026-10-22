"use client";

import { CaretDown, DeviceTablet } from "@phosphor-icons/react";

const STEPS = [
  "Ouvrez « Mode formulaire » une première fois, la tablette étant connectée à Internet : le formulaire et les motifs de visite sont alors enregistrés sur la tablette.",
  "Ajoutez la page à l’écran d’accueil (Safari : Partager › Sur l’écran d’accueil ; Chrome : ⋮ › Installer l’application). Elle s’ouvrira ensuite en plein écran, sans barre d’adresse.",
  "Dans les réglages de la tablette, mets la mise en veille sur « Jamais » et laisse-la branchée au chargeur.",
  "Faites une fausse visite pour tester. Le formulaire se remet à zéro tout seul après chaque visiteur ; sans Internet, les fiches partent dès le retour du réseau.",
  "Téléchargez et imprimez le QR code (Mode QR) pour les visiteurs qui préfèrent remplir le formulaire sur leur téléphone.",
];

/** Mise en place de la tablette d’accueil : ce guide n’existait que dans la documentation, jamais dans l’application. */
export default function TabletSetupGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return <details open={defaultOpen} className="group rounded-2xl border border-border bg-surface p-5">
    <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cta/10 text-cta"><DeviceTablet size={22} weight="bold" /></span>
      <span className="flex-1">Installer la tablette d’accueil</span>
      <CaretDown size={16} weight="bold" className="text-ink-soft transition group-open:rotate-180" />
    </summary>
    <ol className="mt-4 list-decimal space-y-3 pl-6 text-sm leading-relaxed text-ink-soft marker:font-semibold marker:text-ink">
      {STEPS.map((step) => <li key={step}>{step}</li>)}
    </ol>
  </details>;
}
