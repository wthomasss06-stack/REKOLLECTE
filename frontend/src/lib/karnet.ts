import type { KarnetReservationStatus, KarnetResourceUnit } from "@/types";

/** Les montants sont en francs CFA (XOF) : pas de centimes affichés, séparateur de milliers. */
export function formatXOF(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} F`;
}

export const QUANTITY_LABELS: Record<KarnetResourceUnit, string> = {
  jour: "jours",
  heure: "heures",
  unite: "unités",
};

export const STATUS_LABELS: Record<KarnetReservationStatus, string> = {
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const STATUS_STYLES: Record<KarnetReservationStatus, string> = {
  en_cours: "bg-cta/10 text-cta",
  terminee: "bg-canvas text-ink-soft",
  annulee: "bg-error-bg text-error-text",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Compteurs du guide « Premiers pas » (GET /karnet/summary/). */
export interface KarnetSummary {
  resources: number;
  clients: number;
  reservations: number;
  paid_reservations: number;
}

const KARNET_CHANGED = "karnet:changed";

/** À appeler après toute création/modification (ressource, client, réservation, paiement) :
 * le guide « Premiers pas » et la bannière de rappels se rafraîchissent sans recharger la page. */
export function notifyKarnetChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(KARNET_CHANGED));
}

export function onKarnetChanged(handler: () => void): () => void {
  window.addEventListener(KARNET_CHANGED, handler);
  return () => window.removeEventListener(KARNET_CHANGED, handler);
}
