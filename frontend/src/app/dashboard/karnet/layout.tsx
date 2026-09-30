"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";

const TABS = [
  { href: "/dashboard/karnet", label: "REKOLLECTE+", exact: true },
  { href: "/dashboard/karnet/ressources", label: "Ressources", exact: false },
  { href: "/dashboard/karnet/reservations", label: "Réservations", exact: false },
  { href: "/dashboard/karnet/paiements", label: "Paiements", exact: false },
  { href: "/dashboard/karnet/rappels", label: "Rappels", exact: false },
];

export default function KarnetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, organization, isAuthenticated } = useAuthContext();
  const karnetEnabled = Boolean(organization?.capabilities?.karnet);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    // L'activation est decidee cote serveur uniquement : si l'etablissement revient
    // au Niveau 1, un lien direct ne doit plus donner acces a ces pages.
    if (!karnetEnabled) router.replace("/dashboard");
  }, [loading, isAuthenticated, karnetEnabled, router]);

  if (loading || !karnetEnabled) return <Loader fullScreen={false} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">REKOLLECTE+</h1>
        <p className="mt-1 text-sm text-ink-soft">Les ressources, réservations, paiements et rappels de ton établissement.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)) ? "border-cta text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
        {/* Le journal reste unique et deja construit dans Administration : on y renvoie
            plutot que de dupliquer un second historique specifique a REKOLLECTE+. */}
        <Link href="/dashboard/parametres/administration" className="whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink">
          Audit
        </Link>
      </div>
      {children}
    </div>
  );
}
