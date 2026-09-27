"use client";

import { useSearchParams } from "next/navigation";

import ResourceBuilder from "@/components/karnet/ResourceBuilder";

export default function KarnetRessourcesPage() {
  const searchParams = useSearchParams();
  // Arrivée juste après l'activation de KARN3T (voir paramètres/administration) :
  // le modal "Ajouter une ressource" se déclenche directement pour que Patron/
  // Gérant configure tout de suite ou ferme le modal ("Annuler") pour plus tard.
  const onboarding = searchParams.get("onboarding") === "1";

  return <ResourceBuilder autoOpenCreate={onboarding} />;
}
