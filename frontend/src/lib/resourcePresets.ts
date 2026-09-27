import type { KarnetResourceBillingUnit, KarnetResourceCategory } from "@/types";

export interface ResourcePreset {
  id: string;
  label: string;
  category: KarnetResourceCategory;
  resource_type: string;
  billing_unit: KarnetResourceBillingUnit;
  capacity?: number;
  equipment?: string;
  description?: string;
}

export interface ResourceCategoryMeta {
  id: KarnetResourceCategory;
  label: string;
  description: string;
}

// Un point de départ par métier, comme les modèles de formulaire : le Patron
// ou le Gérant peut tout modifier ensuite (nom, prix, capacité...). "Autre"
// couvre le cas où rien ne correspond — la ressource reste personnalisable à
// 100% dans les deux cas, ceci n'est qu'un point de départ.
export const RESOURCE_CATEGORIES: ResourceCategoryMeta[] = [
  { id: "accommodation", label: "Hébergement", description: "Hôtels, auberges, résidences et locations" },
  { id: "beauty", label: "Beauté et soins", description: "Salons, instituts et spas" },
  { id: "workspace", label: "Espaces professionnels", description: "Bureaux, coworking et salles" },
  { id: "events", label: "Événementiel et restauration", description: "Salles, tables et espaces à privatiser" },
  { id: "parking", label: "Stationnement", description: "Places, garages et emplacements" },
  { id: "leisure", label: "Sport et loisirs", description: "Installations sportives et loisirs" },
  { id: "other", label: "Autre", description: "Ressource personnalisée, aucun modèle imposé" },
];

export const RESOURCE_PRESETS: ResourcePreset[] = [
  // Hébergement
  { id: "chambre-simple", label: "Chambre simple", category: "accommodation", resource_type: "Chambre simple", billing_unit: "night", capacity: 1, equipment: "Climatisation, Wi-Fi" },
  { id: "chambre-double", label: "Chambre double", category: "accommodation", resource_type: "Chambre double", billing_unit: "night", capacity: 2, equipment: "Climatisation, Wi-Fi, télévision" },
  { id: "chambre-familiale", label: "Chambre familiale", category: "accommodation", resource_type: "Chambre familiale", billing_unit: "night", capacity: 4, equipment: "Climatisation, Wi-Fi, télévision" },
  { id: "suite", label: "Suite", category: "accommodation", resource_type: "Suite", billing_unit: "night", capacity: 2, equipment: "Climatisation, Wi-Fi, télévision, salon" },
  { id: "studio", label: "Studio", category: "accommodation", resource_type: "Studio", billing_unit: "night", capacity: 2, equipment: "Kitchenette, Wi-Fi" },
  { id: "appartement", label: "Appartement", category: "accommodation", resource_type: "Appartement", billing_unit: "night", capacity: 4, equipment: "Cuisine équipée, Wi-Fi" },
  { id: "villa", label: "Villa", category: "accommodation", resource_type: "Villa", billing_unit: "night", capacity: 6, equipment: "Piscine, cuisine équipée, Wi-Fi" },

  // Beauté et soins
  { id: "fauteuil-coiffure", label: "Fauteuil de coiffure", category: "beauty", resource_type: "Fauteuil de coiffure", billing_unit: "session" },
  { id: "poste-manucure", label: "Poste de manucure", category: "beauty", resource_type: "Poste de manucure", billing_unit: "session" },
  { id: "cabine-soin", label: "Cabine de soin", category: "beauty", resource_type: "Cabine de soin", billing_unit: "session" },
  { id: "salle-massage", label: "Salle de massage", category: "beauty", resource_type: "Salle de massage", billing_unit: "session" },
  { id: "fauteuil-pedicure", label: "Fauteuil de pédicure", category: "beauty", resource_type: "Fauteuil de pédicure", billing_unit: "session" },
  { id: "poste-maquillage", label: "Poste de maquillage", category: "beauty", resource_type: "Poste de maquillage", billing_unit: "session" },

  // Espaces professionnels
  { id: "bureau-individuel", label: "Bureau individuel", category: "workspace", resource_type: "Bureau individuel", billing_unit: "month", capacity: 1, equipment: "Bureau, chaise, Wi-Fi" },
  { id: "bureau-partage", label: "Bureau partagé", category: "workspace", resource_type: "Bureau partagé", billing_unit: "month", equipment: "Wi-Fi, espace commun" },
  { id: "salle-reunion", label: "Salle de réunion", category: "workspace", resource_type: "Salle de réunion", billing_unit: "hour", capacity: 8, equipment: "Écran, Wi-Fi" },
  { id: "salle-formation", label: "Salle de formation", category: "workspace", resource_type: "Salle de formation", billing_unit: "hour", capacity: 20, equipment: "Vidéoprojecteur, Wi-Fi" },
  { id: "salle-conference", label: "Salle de conférence", category: "workspace", resource_type: "Salle de conférence", billing_unit: "hour", capacity: 50, equipment: "Sonorisation, vidéoprojecteur" },
  { id: "espace-travail", label: "Espace de travail (coworking)", category: "workspace", resource_type: "Espace de travail", billing_unit: "day", equipment: "Wi-Fi, café" },

  // Événementiel et restauration
  { id: "table-restaurant", label: "Table de restaurant", category: "events", resource_type: "Table de restaurant", billing_unit: "session", capacity: 4 },
  { id: "salle-privative", label: "Salle privative", category: "events", resource_type: "Salle privative", billing_unit: "hour", capacity: 20 },
  { id: "salle-reception", label: "Salle de réception", category: "events", resource_type: "Salle de réception", billing_unit: "day", capacity: 100 },
  { id: "salle-fete", label: "Salle de fête", category: "events", resource_type: "Salle de fête", billing_unit: "day", capacity: 80 },
  { id: "espace-evenementiel", label: "Espace événementiel", category: "events", resource_type: "Espace événementiel", billing_unit: "day", capacity: 150 },
  { id: "terrasse-privatisable", label: "Terrasse privatisable", category: "events", resource_type: "Terrasse privatisable", billing_unit: "hour", capacity: 30 },

  // Stationnement
  { id: "place-parking-jour", label: "Place de parking (jour)", category: "parking", resource_type: "Place de parking", billing_unit: "day" },
  { id: "place-parking-mois", label: "Place de parking (mensuelle)", category: "parking", resource_type: "Place de parking", billing_unit: "month" },
  { id: "box-ferme", label: "Box fermé", category: "parking", resource_type: "Box fermé", billing_unit: "month" },
  { id: "emplacement-moto", label: "Emplacement moto", category: "parking", resource_type: "Emplacement moto", billing_unit: "day" },
  { id: "place-couverte", label: "Place couverte", category: "parking", resource_type: "Place couverte", billing_unit: "day" },

  // Sport et loisirs
  { id: "terrain-football", label: "Terrain de football", category: "leisure", resource_type: "Terrain de football", billing_unit: "hour", capacity: 22 },
  { id: "terrain-tennis", label: "Terrain de tennis", category: "leisure", resource_type: "Terrain de tennis", billing_unit: "hour", capacity: 4 },
  { id: "salle-sport", label: "Salle de sport", category: "leisure", resource_type: "Salle de sport", billing_unit: "session" },
  { id: "piscine-privatisable", label: "Piscine privatisable", category: "leisure", resource_type: "Piscine privatisable", billing_unit: "hour", capacity: 20 },
  { id: "terrain-multisport", label: "Terrain multisport", category: "leisure", resource_type: "Terrain multisport", billing_unit: "hour", capacity: 10 },
  { id: "espace-loisirs", label: "Espace de loisirs", category: "leisure", resource_type: "Espace de loisirs", billing_unit: "day" },

  // Autre
  { id: "ressource-personnalisee", label: "Ressource personnalisée", category: "other", resource_type: "", billing_unit: "fixed" },
];
