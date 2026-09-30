import type { AccountRole } from "@/types";

export interface PermissionRow {
  label: string;
  boss: boolean;
  gerant: boolean;
  staff: boolean;
}

/** Matrice d’affichage des droits. La sécurité réelle reste appliquée par l’API. */
export const PERMISSION_MATRIX: PermissionRow[] = [
  { label: "Consulter le registre", boss: true, gerant: true, staff: true },
  { label: "Voir réponses, signatures et statistiques", boss: true, gerant: true, staff: true },
  { label: "Exporter le registre CSV", boss: true, gerant: true, staff: false },
  { label: "Créer un formulaire", boss: true, gerant: true, staff: false },
  { label: "Modifier/renommer un formulaire", boss: true, gerant: true, staff: false },
  { label: "Activer/désactiver un formulaire", boss: true, gerant: true, staff: false },
  { label: "Définir le formulaire par défaut", boss: true, gerant: true, staff: false },
  { label: "Supprimer un formulaire", boss: true, gerant: false, staff: false },
  { label: "Créer un point d’accueil/tablette", boss: true, gerant: true, staff: false },
  { label: "Modifier le nom, l’appareil ou le formulaire d’un point", boss: true, gerant: true, staff: false },
  { label: "Afficher/télécharger le QR d’un point", boss: true, gerant: true, staff: false },
  { label: "Désactiver un point d’accueil", boss: true, gerant: true, staff: false },
  { label: "Supprimer un point d’accueil", boss: true, gerant: false, staff: false },
  { label: "Régénérer le QR principal historique", boss: true, gerant: false, staff: false },
  { label: "Modifier le nom/logo de l’établissement", boss: true, gerant: false, staff: false },
  { label: "Modifier les motifs de visite", boss: true, gerant: true, staff: false },
  { label: "Activer/désactiver le Niveau 2 REKOLLECTE+", boss: true, gerant: false, staff: false },
  { label: "Créer une réservation / encaisser (REKOLLECTE+)", boss: true, gerant: true, staff: true },
  { label: "Ajouter ou tarifer une ressource (REKOLLECTE+)", boss: true, gerant: true, staff: false },
  { label: "Inviter un Gérant", boss: true, gerant: false, staff: false },
  { label: "Inviter un Staff", boss: true, gerant: true, staff: false },
  { label: "Utiliser le mode Accueil / Staff", boss: true, gerant: true, staff: true },
  { label: "Remplir une fiche visiteur sur tablette", boss: true, gerant: true, staff: true },
];

export function permissionsForRole(role: AccountRole): string[] {
  const key = role === "BOSS" ? "boss" : role === "GERANT" ? "gerant" : "staff";
  return PERMISSION_MATRIX.filter((row) => row[key]).map((row) => row.label);
}

export function roleLabel(role: AccountRole): string {
  return role === "BOSS" ? "Patron" : role === "GERANT" ? "Gérant" : "Staff";
}
