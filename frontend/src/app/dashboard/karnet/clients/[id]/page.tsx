"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

import ClientHistoryPanel from "@/components/karnet/ClientHistoryPanel";

/** Lien direct/partageable vers une fiche client — même contenu que le modal
 * ouvert depuis Karn3t (voir ClientHistoryPanel), avec un bouton retour en plus. */
export default function KarnetClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Retour
      </button>
      <ClientHistoryPanel clientId={params.id} />
    </div>
  );
}
