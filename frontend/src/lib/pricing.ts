// Grille tarifaire PUBLIQUE de REKOLLECTE : source unique pour la landing, les FAQ, les CGU et le balisage JSON-LD.
// Les quotas réellement appliqués par le serveur vivent dans backend/apps/billing/plans.py : garder les deux alignés.
// Ces prix sont des hypothèses de lancement annoncées aux utilisateurs ; ils se changent ici, à un seul endroit.

export const FREE_UNTIL_ISO = "2026-12-01";
export const FREE_UNTIL_LABEL = "1er décembre 2026";
// Période de lancement : TOUT est gratuit et libre (aucune limite de plan). La landing affiche alors les prix barrés.
// Le 1er décembre, passer à `false` et republier : les prix s’affichent normalement. Ce n’est volontairement pas calculé
// d’après la date du jour : la page est générée au déploiement, et les plans ne doivent « entrer en vigueur » qu’une fois
// les Gates franchies et PLAN_ENFORCEMENT_STARTS_AT renseigné côté serveur (voir docs/PLANS_ET_ABONNEMENTS.md).
export const FREE_PERIOD_ACTIVE = true;
// Même adresse que la page « Mentions légales » : à remplacer par une adresse professionnelle dédiée.
export const CONTACT_EMAIL = "wthomasss06@gmail.com";

export interface PricePlan {
  id: "free" | "essentiel" | "plus" | "entreprise";
  name: string;
  audience: string;
  price: string;
  unit: string;
  features: string[];
  missing?: string[];
  badge?: string;
  highlight?: boolean;
  cta: { label: string; href: string };
}

export const PLANS: PricePlan[] = [
  {
    id: "free",
    name: "Gratuit",
    audience: "Pour découvrir REKOLLECTE et remplacer le cahier.",
    price: "0",
    unit: "FCFA",
    features: [
      "Registre numérique et QR code",
      "1 point d’accueil, 1 formulaire",
      "2 membres dans l’équipe",
      "Historique des 30 derniers jours",
      "Export de sortie toujours disponible",
    ],
    missing: ["Numéro de téléphone : à partir d’Essentiel"],
    cta: { label: "Créer mon espace", href: "/connexion" },
  },
  {
    id: "essentiel",
    name: "Essentiel",
    audience: "Bureaux, cabinets, restaurants, écoles.",
    price: "3\u00a0000",
    unit: "FCFA / mois",
    features: [
      "Tout le plan Gratuit",
      "3 points d’accueil, 3 formulaires",
      "5 membres dans l’équipe",
      "Historique de 12 mois et export CSV",
      "Champ téléphone",
    ],
    cta: { label: "Créer mon espace", href: "/connexion" },
  },
  {
    id: "plus",
    name: "REKOLLECTE+",
    audience: "Hôtels, résidences, salons, espaces à réserver.",
    price: "7\u00a0000",
    unit: "FCFA / mois",
    badge: "Le plus complet",
    highlight: true,
    features: [
      "Tout le plan Essentiel",
      "10 points d’accueil, 10 formulaires, 15 membres",
      "Fiches clients avec historique",
      "Ressources réservables (10 incluses)",
      "Réservations sans conflit de créneaux",
      "Suivi des paiements et des encaissements",
      "Rappels de fin de créneau avec alarme",
    ],
    cta: { label: "Essayer REKOLLECTE+", href: "/connexion" },
  },
  {
    id: "entreprise",
    name: "Entreprise",
    audience: "Groupes, multisites, grands comptes.",
    price: "Sur devis",
    unit: "",
    features: [
      "Plusieurs établissements",
      "Configuration et accompagnement",
      "Formation du personnel",
      "Support prioritaire",
      "Contrat dédié",
    ],
    cta: { label: "Demander un devis", href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Devis REKOLLECTE Entreprise")}` },
  },
];

export const PRICING_FOOTNOTES: string[] = [
  "Prix en FCFA, par établissement et par mois. Paiement annuel : 10 mois payés pour 12 (Essentiel 30\u00a0000 FCFA/an, REKOLLECTE+ 70\u00a0000 FCFA/an).",
  FREE_PERIOD_ACTIVE ? "Nouveaux comptes : 14 jours d’essai de REKOLLECTE+ après le lancement." : "Nouveaux comptes : 14 jours d’essai de REKOLLECTE+.",
  "L’enregistrement des visiteurs n’est jamais bloqué. En cas d’impayé, vous repassez au plan Gratuit : données intactes, export toujours disponible.",
];
