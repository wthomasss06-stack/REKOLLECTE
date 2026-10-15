"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import AppHeader from "@/components/dashboard/AppHeader";
import ProductIdentity from "@/components/dashboard/ProductIdentity";
import Sidebar from "@/components/dashboard/Sidebar";
import { useDialog } from "@/components/ui/DialogProvider";
import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { firstNameOf } from "@/lib/greeting";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, organization, isAuthenticated } = useAuthContext();
  const { alert } = useDialog();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Session morte (confirmée par le serveur) ou jamais ouverte : on envoie vers la connexion, qui explique pourquoi.
      router.replace("/connexion");
      return;
    }
    // Le message d’accueil attend la fin de l’ancien onboarding, puis s’affiche une seule fois.
    if (pathname.startsWith("/dashboard/onboarding")) return;
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
  }, [loading, isAuthenticated, router, pathname, alert]);

  // Pendant que la session se rétablit (ou que le serveur se réveille), seul le chargement REKOLLECTE est affiché.
  if (loading && !user) return <Loader label="Ouverture de ton espace…" />;
  if (!user) return null;

  const isLegacyOnboarding = pathname.startsWith("/dashboard/onboarding");
  return (
    <div className="min-h-screen bg-canvas">
      <ProductIdentity capabilities={organization?.capabilities} />
      {!isLegacyOnboarding && <AppHeader />}
      {!isLegacyOnboarding && <Sidebar orgName={organization?.name || user.organization_name} orgLogo={organization?.logo_url} userName={user.full_name || user.email} role={user.role} capabilities={organization?.capabilities} />}
      <main className={isLegacyOnboarding ? "min-h-screen p-6 md:p-10" : "px-4 pb-28 pt-20 sm:px-6 md:ml-[72px] md:p-10 md:pb-10 md:pt-24"}>
        {children}
      </main>
    </div>
  );
}
