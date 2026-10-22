"use client";

import { GuideProvider } from "@/components/karnet/GettingStarted";
import { useAuthContext } from "@/context/AuthContext";

/** Au Niveau 2 seulement : le guide « Premiers pas » entoure la page REKOLLECTE+. Les rappels de fin de créneau (sondage + sonnerie)
 * sont montés plus haut, dans app/dashboard/layout.tsx, pour sonner sur toutes les pages du tableau de bord et non sur celle-ci seulement.
 * Au Niveau 1 il n’y a rien de tout cela : aucun appel inutile vers des routes qui n’existent pas pour l’établissement. */
export default function RekollecteLayout({ children }: { children: React.ReactNode }) {
  const { organization } = useAuthContext();
  if (!organization?.capabilities?.karnet) return <>{children}</>;
  return <GuideProvider>{children}</GuideProvider>;
}
