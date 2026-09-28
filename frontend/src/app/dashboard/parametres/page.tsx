"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Loader from "@/components/Loader";
import { apiClient } from "@/lib/api";
import type { UserProfile } from "@/types";

export default function ParametresIndexPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiClient
      .get<UserProfile>("/auth/me/")
      .then((res) => {
        const target = res.data.role === "STAFF" ? "/dashboard/parametres/qr-code" : "/dashboard/parametres/formulaire";
        router.replace(target);
      })
      .catch(() => setFailed(true)); // sans ça, un simple timeout laissait la page bloquée sur le loader indéfiniment
  }, [router]);

  if (failed) {
    return (
      <div className="space-y-3">
        <p className="text-ink-soft">Impossible de charger les paramètres.</p>
        <button onClick={() => { setFailed(false); router.replace("/dashboard"); }} className="rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white">Retour au tableau de bord</button>
      </div>
    );
  }
  return <Loader fullScreen={false} />;
}
