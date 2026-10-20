"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AppHeader from "@/components/dashboard/AppHeader";
import ProductIdentity from "@/components/dashboard/ProductIdentity";
import Sidebar from "@/components/dashboard/Sidebar";
import { ReminderProvider } from "@/components/karnet/ReminderAlarm";
import { useDialog } from "@/components/ui/DialogProvider";
import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { firstNameOf } from "@/lib/greeting";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, organization, isAuthenticated } = useAuthContext();
  const { alert } = useDialog();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Session morte (confirmée par le serveur) ou jamais ouverte : on envoie vers la connexion, qui explique pourquoi.
      router.replace("/connexion");
      return;
    }
    // Message d’accueil : affiché une seule fois (la clé de session est consommée).
    const raw = sessionStorage.getItem("qr_login_greeting");
    if (!raw) return;
    sessionStorage.removeItem("qr_login_greeting");
    try {
      const info = JSON.parse(raw) as { isNew?: boolean; name?: string };
      const firstName = firstNameOf(info.name);
      const isKarnet = Boolean(organization?.capabilities?.karnet);
      void alert(info.isNew
        ? { tone: "brand", mood: "excited", title: `Bienvenue${firstName ? `, ${firstName}` : ""} !`, message: "Ton espace est prêt. Tu peux commencer par consulter le registre ou ouvrir les paramètres.", okLabel: "Commencer" }
        : isKarnet
          ? { tone: "brand", mood: "cheeky", title: `Bon retour${firstName ? `, ${firstName}` : ""} !`, message: "Ton établissement est au Niveau 2 : les visiteurs deviennent des clients, puis REKOLLECTE+ prend le relais pour les ressources, réservations et paiements.", okLabel: "C’est parti" }
          : { tone: "brand", mood: "cheeky", title: `Bon retour${firstName ? `, ${firstName}` : ""} !`, message: "Content de te revoir. Ton registre t’attend.", okLabel: "C’est parti" });
    } catch {
      // Une donnée de session corrompue ne doit pas bloquer l’espace.
    }
  }, [loading, isAuthenticated, router, alert]);

  // Pendant que la session se rétablit (ou que le serveur se réveille), seul le chargement REKOLLECTE est affiché.
  if (loading && !user) return <Loader label="Ouverture de ton espace…" />;
  if (!user) return null;

  // Les rappels de fin de créneau (sonnerie + bannière) tournent sur TOUT le dashboard dès que REKOLLECTE+ est actif :
  // avant, ils n'existaient que sur la page REKOLLECTE+, donc un agent resté sur « Accueil » n'entendait jamais l'alarme.
  const reminders = Boolean(organization?.capabilities?.karnet);
  return (
    <div className="min-h-screen bg-canvas">
      <ProductIdentity capabilities={organization?.capabilities} />
      <AppHeader />
      <Sidebar orgName={organization?.name || user.organization_name} orgLogo={organization?.logo_url} userName={user.full_name || user.email} role={user.role} capabilities={organization?.capabilities} />
      <main className="px-4 pb-28 pt-20 sm:px-6 md:ml-[72px] md:p-10 md:pb-10 md:pt-24">
        {reminders ? <ReminderProvider>{children}</ReminderProvider> : children}
      </main>
    </div>
  );
}
