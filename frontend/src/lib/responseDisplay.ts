/**
 * Affichage lisible des réponses d'une fiche dans le dashboard.
 * Une réponse n'est pas toujours un texte : une photo est une image en base64, une pièce scannée est un objet.
 * Sans ce traitement elles s'affichaient « [object Object] » ou comme plusieurs Mo de texte dans une cellule.
 */

/** Valeur que l'API met à la place d'une image dans la liste (même constante côté backend : checkins/serializers.py). */
export const IMAGE_PLACEHOLDER = "__image__";

const DOCUMENT_LABELS: Record<string, string> = {
  last_name: "Nom",
  first_names: "Prénoms",
  document_number: "N° du document",
  birth_date: "Naissance",
  nationality: "Nationalité",
  expiry_date: "Expiration",
};

export function isImageValue(value: unknown): boolean {
  return typeof value === "string" && (value === IMAGE_PLACEHOLDER || value.startsWith("data:image/"));
}

/** Champs extraits d'une pièce scannée, sur une ligne. Chaîne vide si rien n'a été extrait. */
export function documentSummary(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const extracted = (value as { extracted?: unknown }).extracted;
  if (!extracted || typeof extracted !== "object") return "";
  return Object.entries(extracted as Record<string, unknown>)
    .filter(([, item]) => item !== undefined && item !== null && item !== "")
    .map(([key, item]) => `${DOCUMENT_LABELS[key] ?? key} : ${String(item)}`)
    .join(" · ");
}

/** Texte à afficher pour une réponse. Chaîne vide = pas de réponse (l'appelant affiche « — »). */
export function responseText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (isImageValue(value)) return "Photo fournie";
  if (typeof value === "object") return documentSummary(value) || "Pièce jointe";
  return String(value);
}

/** Libellé lisible quand on n'a que l'identifiant du champ (ex. « nom_complet » → « Nom complet »). */
export function humanizeFieldId(id: string): string {
  const spaced = id.replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id;
}
