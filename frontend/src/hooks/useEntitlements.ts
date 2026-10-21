"use client";

import { useAuthContext } from "@/context/AuthContext";
import type { LockableFeature, PlanId } from "@/types";

/**
 * Droits du plan, tels que calculés par le SERVEUR. L'interface ne décide jamais : elle ne fait qu'afficher le cadenas.
 * `isLocked` n'est vrai que quand les plans s'appliquent vraiment ; avant, aucune limite ne s'affiche (mode « observer »).
 */
export function useEntitlements() {
  const { organization } = useAuthContext();
  const billing = organization?.billing ?? null;
  return {
    billing,
    enforced: billing?.enforcement === "enforce",
    isLocked: (feature: LockableFeature) => Boolean(billing?.locked?.[feature]),
    requiredPlanLabel: (feature: LockableFeature) => {
      const plan: PlanId | undefined = billing?.required_plan?.[feature];
      return plan && billing ? billing.plan_labels[plan] : "un plan supérieur";
    },
  };
}
