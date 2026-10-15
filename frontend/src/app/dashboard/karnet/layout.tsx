"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Loader from "@/components/Loader";
import { GuideProvider } from "@/components/karnet/GettingStarted";
import { ReminderProvider } from "@/components/karnet/ReminderAlarm";
import { useAuthContext } from "@/context/AuthContext";

/** Ne reste ici que la fiche d'un client (/dashboard/karnet/clients/[id], lien partageable). Les autres rubriques de REKOLLECTE+
 * vivent dans la page /dashboard/rekollecte (fenêtres) ; leurs anciennes adresses y sont redirigées (next.config). */
export default function KarnetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, organization, isAuthenticated } = useAuthContext();
  const karnetEnabled = Boolean(organization?.capabilities?.karnet);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    // L'activation est décidée côté serveur uniquement : si l'établissement revient au Niveau 1, un lien direct ne donne plus accès.
    if (!karnetEnabled) router.replace("/dashboard/rekollecte");
  }, [loading, isAuthenticated, karnetEnabled, router]);

  if (loading || !karnetEnabled) return <Loader fullScreen={false} />;

  return (
    <GuideProvider>
      <ReminderProvider>
        <div className="touch-comfort space-y-6">{children}</div>
      </ReminderProvider>
    </GuideProvider>
  );
}
