"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Loader from "@/components/Loader";

/**
 * Phase 7 — ancienne route d'onglet interne "Visiteurs" (pré-fusion). La liste
 * des clients vit désormais dans le tableau de bord global (/dashboard, qui
 * s'affiche comme "Clients" une fois REKOLLECTE+ actif — voir phase 5/6) et chaque
 * client a sa propre fiche sous /dashboard/karnet/clients/[id]. Cette route
 * n'est plus liée dans la navigation ; elle redirige pour tout lien externe
 * ou favori existant plutôt que d'afficher une page vide.
 */
export default function KarnetVisiteursRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <Loader fullScreen={false} />;
}
