"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRinging, CalendarCheck, CreditCard, Cube, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { useDialog } from "@/components/ui/DialogProvider";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { FREE_PERIOD_ACTIVE } from "@/lib/pricing";
import type { OrganizationCapabilities } from "@/types";

const TOOLS: { icon: Icon; label: string }[] = [
  { icon: UsersThree, label: "Fiches clients" },
  { icon: Cube, label: "Ressources" },
  { icon: CalendarCheck, label: "Réservations" },
  { icon: CreditCard, label: "Encaissements" },
  { icon: BellRinging, label: "Rappels de fin de créneau" },
];

const CAPABILITY_LABELS: { key: keyof OrganizationCapabilities; label: string }[] = [
  { key: "reservations", label: "Réservations" },
  { key: "payments", label: "Paiements" },
  { key: "rappels", label: "Rappels" },
];

/** Activation et désactivation de REKOLLECTE+ : réservées au Patron, dans la page REKOLLECTE (la rubrique n’est montrée qu’à lui).
 *  L’action passe par une confirmation ; après une activation, on propose de créer les premières ressources tout de suite. */
export default function PlusActivationPanel({ onDone }: { onDone: () => void }) {
  const { organization, refreshUser } = useAuthContext();
  const { confirm } = useDialog();
  const router = useRouter();
  const active = Boolean(organization?.karnet_enabled);

  const toggle = async () => {
    const enabling = !active;
    const done = await confirm({
      tone: "brand",
      title: enabling ? "Activer REKOLLECTE+ ?" : "Désactiver REKOLLECTE+ ?",
      message: enabling
        ? "Le registre devient l’espace Clients et REKOLLECTE+ ajoute ressources, réservations, paiements et rappels."
        : "Les rubriques REKOLLECTE+ disparaissent de la barre latérale. Rien n’est supprimé : vous pourrez réactiver plus tard.",
      confirmLabel: enabling ? "Activer" : "Désactiver",
      cancelLabel: "Annuler",
      runningLabel: enabling ? "Activation…" : "Désactivation…",
      successTitle: enabling ? "REKOLLECTE+ est activé !" : "REKOLLECTE+ est désactivé.",
      successMessage: enabling ? "La barre latérale et le titre d’onglet sont déjà à jour. Rien d’autre à faire." : "L’établissement repasse à REKOLLECTE seul.",
      run: async () => {
        await apiClient.patch("/org/me/karnet/", { karnet_enabled: enabling });
        await refreshUser();
      },
    });
    if (!done) return;
    // Juste après l’activation, on propose de configurer les ressources (le constructeur laisse « Plus tard »).
    if (enabling) router.push("/dashboard/rekollecte?open=ressources&onboarding=1");
    else onDone();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        {active
          ? "REKOLLECTE+ est actif : les visiteurs alimentent l’espace Clients, et les ressources, réservations, paiements et rappels sont disponibles."
          : "Ajoutez clients, ressources, réservations, paiements et rappels autour de votre registre."}
      </p>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">{active ? "REKOLLECTE+ est activé" : "REKOLLECTE+ est désactivé"}</h2>
            <p className="mt-1 text-xs text-ink-soft">{active ? "La désactivation ne supprime rien." : "L’activation est réversible à tout moment."}</p>
          </div>
          <button type="button" onClick={toggle} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${active ? "border border-border text-ink-soft hover:bg-canvas" : "bg-cta text-cta-ink"}`}>
            {active ? "Désactiver REKOLLECTE+" : "Activer REKOLLECTE+"}
          </button>
        </div>
        {active && (
          <div className="mt-4 flex flex-wrap gap-2">
            {CAPABILITY_LABELS.map(({ key, label }) => {
              const on = Boolean(organization?.capabilities?.[key]);
              return <span key={key} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-cta/10 text-cta" : "bg-canvas text-ink-soft"}`}>{label} · {on ? "actif" : "en préparation"}</span>;
            })}
          </div>
        )}
      </section>

      {!active && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Ce que REKOLLECTE+ ajoute">
          {TOOLS.map(({ icon: ToolIcon, label }) => (
            <li key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-ink">
              <ToolIcon size={18} weight="bold" className="text-cta" aria-hidden="true" />{label}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-soft">
        {FREE_PERIOD_ACTIVE ? "Gratuit pendant le lancement ; ensuite, REKOLLECTE+ fait partie du plan REKOLLECTE+." : "REKOLLECTE+ fait partie du plan REKOLLECTE+."}{" "}
        <Link href="/dashboard/parametres?open=abonnement" className="font-semibold text-cta hover:underline">Voir mon abonnement</Link>
      </p>
    </div>
  );
}
