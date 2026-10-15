"use client";

import { CloudCheck, CloudSlash, WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";

const PILL = "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs";

/** Pastille de synchronisation du header : l'icône seule sur téléphone, avec son libellé dès que la place le permet.
 * Elle ne parle JAMAIS du serveur qui se réveille : un serveur muet alors que l'appareil est en ligne est géré par le chargement REKOLLECTE
 * des pages, pas par un message. Seuls restent : hors ligne, envois en attente, envois à réessayer, synchronisation faite. */
export default function SyncStatusBadge() {
  const { network, pendingCount, failedCount, syncing, lastSyncedAt, retryNow } = useBackgroundSync();
  const online = network.browserOnline && network.apiReachable;
  const text = (value: string) => <span className="hidden lg:inline">{value}</span>;

  if (!online) {
    if (!network.browserOnline) return <div role="status" aria-label="Hors ligne" className={`${PILL} border-border bg-canvas text-ink-soft`}><CloudSlash size={15} />{text(`Hors ligne${pendingCount > 0 ? ` · ${pendingCount} en attente` : ""}`)}{pendingCount > 0 && <span className="lg:hidden">{pendingCount}</span>}</div>;
    if (pendingCount > 0) return <div role="status" aria-label={`${pendingCount} en attente d’envoi`} className={`${PILL} border-border bg-canvas text-ink-soft`}><ArrowsClockwise size={15} />{text(`${pendingCount} en attente`)}<span className="lg:hidden">{pendingCount}</span></div>;
    return null;
  }
  if (failedCount > 0) return <button type="button" onClick={retryNow} aria-label={`${failedCount} envoi à réessayer`} className={`${PILL} border-error-text/30 bg-error-bg font-medium text-error-text`}><WarningCircle size={15} />{text(`${failedCount} à réessayer`)}<span className="lg:hidden">{failedCount}</span></button>;
  if (syncing || pendingCount > 0) return <div role="status" aria-label={syncing ? "Synchronisation en cours" : `${pendingCount} en attente`} className={`${PILL} border-border bg-canvas text-ink-soft`}><ArrowsClockwise size={15} className={syncing ? "animate-spin" : ""} />{text(syncing ? "Synchronisation…" : `${pendingCount} en attente`)}</div>;
  if (lastSyncedAt) return <div role="status" aria-label="Synchronisé" className={`${PILL} border-border bg-canvas text-ink-soft`}><CloudCheck size={15} className="text-success-text" />{text(`Synchronisé à ${new Date(lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`)}</div>;
  return null;
}
