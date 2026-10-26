import { Database, ListBullets, SignIn, Sparkle, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import type { AuditCategory, AuditEvent } from "@/types";

export const CATEGORIES: { id: AuditCategory; label: string }[] = [
  { id: "connexions", label: "Connexions" },
  { id: "equipe", label: "Équipe" },
  { id: "donnees", label: "Données" },
  { id: "offre", label: "Offre" },
];

export const CATEGORY_ICON: Record<AuditEvent["category"], Icon> = { connexions: SignIn, equipe: UsersThree, donnees: Database, offre: Sparkle, autres: ListBullets };

/** Précision utile d’un événement, quand le serveur l’a inscrite (appareil, nombre de lignes…). Vide sinon : on n’invente rien. */
export function eventDetail(event: AuditEvent): string {
  const meta = event.metadata;
  if (event.action === "auth.session_revoked" && typeof meta.device === "string") return `Appareil : ${meta.device}`;
  if (event.action === "auth.member_sessions_revoked" && typeof meta.count === "number") return `${meta.count} appareil${meta.count > 1 ? "s" : ""}`;
  if (event.action === "audit.exported" && typeof meta.rows === "number") return `${meta.rows} ligne${meta.rows > 1 ? "s" : ""}`;
  return "";
}

const DAY = 86_400_000;

/** « Aujourd’hui », « Hier », sinon « mardi 21 octobre » : le journal est lu par jour. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(date)) / DAY);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(diff > 300 ? { year: "numeric" } : {}) });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** « à l’instant », « il y a 5 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function relativeFromNow(iso: string | null): string {
  if (!iso) return "jamais";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  if (minutes < 60 * 24 * 30) return `il y a ${Math.round(minutes / 1440)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function actorOf(event: AuditEvent): string {
  return event.actor_name?.trim() || event.actor_email || "Utilisateur inconnu";
}

export function targetOf(event: AuditEvent): string {
  return event.target_name?.trim() || event.target_email || "";
}
