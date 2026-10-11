"use client";

import { CloudCheck, CloudSlash, WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";

export default function SyncStatusBadge() {
  const { network, pendingCount, failedCount, syncing, lastSyncedAt, retryNow } = useBackgroundSync();
  const online = network.browserOnline && network.apiReachable;

  if (!online) {
    // Appareil connecté mais serveur muet : c'est le plus souvent l'hébergeur gratuit qui se réveille, pas une coupure de réseau.
    const serverOnly = network.browserOnline && !network.apiReachable;
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs text-ink-soft">
        {serverOnly ? <ArrowsClockwise size={15} className="animate-spin" /> : <CloudSlash size={15} />}
        {serverOnly ? "Connexion au serveur…" : "Hors ligne"}{pendingCount > 0 ? ` · ${pendingCount} en attente` : ""}
      </div>
    );
  }
  if (failedCount > 0) return <button type="button" onClick={retryNow} className="inline-flex items-center gap-2 rounded-full border border-error-text/30 bg-error-bg px-3 py-1.5 text-xs font-medium text-error-text"><WarningCircle size={15} /> {failedCount} à réessayer <ArrowsClockwise size={14} /></button>;
  if (syncing || pendingCount > 0) return <div className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs text-ink-soft"><ArrowsClockwise size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Synchronisation…" : `${pendingCount} en attente`}</div>;
  if (lastSyncedAt) return <div className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs text-ink-soft"><CloudCheck size={15} className="text-success-text" /> Synchronisé à {new Date(lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>;
  return null;
}
