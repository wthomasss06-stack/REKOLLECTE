"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LockSimple } from "@phosphor-icons/react";

import { useEntitlements } from "@/hooks/useEntitlements";
import type { LockableFeature } from "@/types";

/** Affiche `children` si la fonction est incluse dans le plan ; sinon un cadenas et un lien vers l'abonnement. */
export default function LockedFeature({ feature, title, children }: { feature: LockableFeature; title: string; children: ReactNode }) {
  const { isLocked, requiredPlanLabel } = useEntitlements();
  if (!isLocked(feature)) return <>{children}</>;
  return <div role="note" className="flex items-start gap-3 rounded-2xl border border-border bg-canvas p-4 text-sm">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-ink-soft"><LockSimple size={20} weight="bold" aria-hidden="true" /></span>
    <div className="min-w-0">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-ink-soft">Disponible à partir du plan {requiredPlanLabel(feature)}. Vos données restent conservées.</p>
      <Link href="/dashboard/parametres?open=abonnement" className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-ink underline">Voir mon abonnement</Link>
    </div>
  </div>;
}
