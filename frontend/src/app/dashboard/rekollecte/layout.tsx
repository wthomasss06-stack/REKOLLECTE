"use client";

import { GuideProvider } from "@/components/karnet/GettingStarted";
import { ReminderProvider } from "@/components/karnet/ReminderAlarm";
import { useAuthContext } from "@/context/AuthContext";

/** Au Niveau 2 seulement : le guide « Premiers pas » et les rappels de fin de créneau (sondage + sonnerie) entourent la page REKOLLECTE+.
 * Au Niveau 1 il n'y a rien de tout cela : aucun appel inutile vers des routes qui n'existent pas pour l'établissement. */
export default function RekollecteLayout({ children }: { children: React.ReactNode }) {
  const { organization } = useAuthContext();
  if (!organization?.capabilities?.karnet) return <>{children}</>;
  return <GuideProvider><ReminderProvider>{children}</ReminderProvider></GuideProvider>;
}
