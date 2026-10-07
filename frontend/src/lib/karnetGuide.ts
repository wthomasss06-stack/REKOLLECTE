import type { KarnetSummary } from "@/lib/karnet";

export interface GuideStep {
  key: "resources" | "clients" | "reservations" | "payments";
  title: string;
  hint: string;
  cta: string;
  href: string;
  done: boolean;
  locked: boolean;
  lockedHint?: string;
}

/**
 * Étapes du guide « Premiers pas », dans l'ordre des dépendances réelles : sans ressource ACTIVE on ne
 * peut pas réserver, sans client non plus. Fonction pure : tout vient du résumé serveur, rien n'est « coché à la main ».
 */
export function buildGuideSteps(summary: KarnetSummary | null, opts: { paymentsSeen: boolean; canManage: boolean }): GuideStep[] {
    const s = summary ?? { resources: 0, clients: 0, reservations: 0, paid_reservations: 0 };
    const hasResource = s.resources > 0;
    const hasClient = s.clients > 0;
    const hasReservation = s.reservations > 0;
    return [
      {
        key: "resources", title: "Crée ta première ressource", done: hasResource, locked: false,
        hint: "Choisis un modèle (chambre, table, salle…), fixe son prix, puis active-la : tant qu’elle n’est pas active, elle ne peut pas être réservée.",
        cta: opts.canManage ? "Ajouter une ressource" : "", href: "/dashboard/karnet/ressources?onboarding=1",
        lockedHint: opts.canManage ? undefined : "Un Patron ou un Gérant doit créer la première ressource.",
      },
      {
        key: "clients", title: "Ajoute ton premier client", done: hasClient, locked: false,
        hint: "Un visiteur enregistré à l’accueil devient client tout seul ; sinon ajoute-le à la main (nom et téléphone suffisent).",
        cta: "Ajouter un client", href: "/dashboard/karnet?new=1",
      },
      {
        key: "reservations", title: "Fais ta première réservation", done: hasReservation, locked: !hasResource || !hasClient,
        hint: "Choisis le client, la ressource et l’heure : la durée et le montant se calculent seuls.",
        cta: "Créer une réservation", href: "/dashboard/karnet/reservations",
        lockedHint: "Disponible dès que tu as une ressource et un client.",
      },
      {
        key: "payments", title: "Contrôle ton premier encaissement", done: s.paid_reservations > 0 && opts.paymentsSeen, locked: !hasReservation,
        hint: "Chaque réservation est enregistrée comme payée dès sa création : retrouve-la dans Paiements, avec l’historique.",
        cta: "Voir les paiements", href: "/dashboard/karnet/paiements",
        lockedHint: "Disponible après ta première réservation.",
      },
    ];
}
