"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, WarningCircle } from "@phosphor-icons/react";

import { useAuthContext } from "@/context/AuthContext";
import { useEntitlements } from "@/hooks/useEntitlements";
import { apiClient } from "@/lib/api";

const fmt = (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

/** Bandeaux du dashboard : état du plan (seulement quand les plans s'appliquent, et seulement pour ceux qui peuvent agir) et conditions d'utilisation. */
export default function PlanBanner() {
  const { user, refreshUser } = useAuthContext();
  const { billing, enforced } = useEntitlements();
  const [accepting, setAccepting] = useState(false);
  if (!user) return null;

  const manager = user.role === "BOSS" || user.role === "GERANT";
  const termsPending = Boolean(user.terms_current_version) && user.terms_version !== user.terms_current_version;
  const accept = async () => {
    setAccepting(true);
    try { await apiClient.post("/auth/accept-terms/", { version: user.terms_current_version }); await refreshUser(); } finally { setAccepting(false); }
  };

  let plan: { tone: "info" | "warn"; text: string } | null = null;
  if (enforced && manager && billing) {
    if (billing.state === "trialing" && (billing.trial_days_left ?? 99) <= 7) plan = { tone: "info", text: `Essai de REKOLLECTE+ : ${billing.trial_days_left} jour${(billing.trial_days_left ?? 0) > 1 ? "s" : ""} restant${(billing.trial_days_left ?? 0) > 1 ? "s" : ""}. Ensuite, retour au plan Gratuit ; vos données restent conservées.` };
    else if (billing.state === "grace") plan = { tone: "warn", text: `Paiement en retard : vos fonctions restent actives jusqu’au ${fmt(billing.grace_until)}.` };
    else if (billing.state === "expired") plan = { tone: "warn", text: "Votre essai ou abonnement est terminé : vous êtes au plan Gratuit. Vos données sont conservées et le registre continue de fonctionner." };
  }
  if (!plan && !termsPending) return null;

  const tones = { info: "border-border bg-canvas text-ink", warn: "border-error-text/30 bg-error-bg text-error-text" };
  return <div className="mb-6 space-y-3">
    {plan && <div role="status" className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm ${tones[plan.tone]}`}>
      {plan.tone === "warn" ? <WarningCircle size={20} weight="bold" aria-hidden="true" /> : <Info size={20} weight="bold" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{plan.text}</span>
      <Link href="/dashboard/parametres?open=abonnement" className="inline-flex min-h-[44px] items-center font-semibold underline">Mon abonnement</Link>
    </div>}
    {termsPending && <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-canvas p-4 text-sm text-ink">
      <Info size={20} weight="bold" aria-hidden="true" />
      <span className="min-w-0 flex-1">Merci d’accepter les <a href="/cgu" target="_blank" rel="noopener noreferrer" className="font-semibold underline">conditions d’utilisation</a> de REKOLLECTE.</span>
      <button type="button" onClick={() => void accept()} disabled={accepting} className="inline-flex min-h-[44px] items-center rounded-full bg-cta px-5 font-semibold text-white disabled:opacity-60">J’accepte</button>
    </div>}
  </div>;
}
