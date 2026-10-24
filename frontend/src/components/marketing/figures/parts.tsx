import type { ReactNode } from "react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

/* Briques communes des schémas animés des pages d'information (légales, à propos, aide, crédits).
   Règles : couleurs = variables du thème (clair et sombre) ; texte du schéma = texte réel de la page (jamais d'information qui n'est pas
   écrite ailleurs) ; le schéma est décoratif pour les lecteurs d'écran, qui reçoivent un résumé (`label`) et la légende.
   Les classes « fg-… » sont animées par FigureMotion.tsx ; sans JavaScript ou avec mouvement réduit, l'état final est affiché. */

/** Coupe un texte en lignes d'au plus `max` caractères (les tspans SVG ne reviennent pas à la ligne tout seuls). */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** `label` : résumé lu à voix haute. `caption` : légende visible, lue normalement (hors du rôle « img »). */
export function Figure({ label, caption, className = "", children }: { label: string; caption?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <figure className={`fig ${className}`.trim()} data-figure>
      <div className="fig__art not-prose" role="img" aria-label={label}>{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function Svg({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return <svg className="fig__svg" viewBox={viewBox} focusable="false" aria-hidden="true">{children}</svg>;
}

export type Tone = "plain" | "soft" | "accent" | "ghost";

/** Pictogramme (Phosphor, rendu serveur) posé à la position (x, y) du schéma. */
export function Glyph({ icon: Icon, x, y, size = 22 }: { icon: PhosphorIcon; x: number; y: number; size?: number }) {
  return <Icon className="fg-icon" size={size} x={x} y={y} weight="duotone" aria-hidden="true" />;
}

/** Carte du schéma : pictogramme facultatif à gauche, titre en gras, précision(s) en dessous. Titre et précision peuvent être des lignes déjà coupées.
    `pad` : début du texte à partir du bord gauche (réduit pour les cartes étroites). */
export function Node({ x, y, w, h, title, sub, tone = "plain", icon, pad = 52 }: { x: number; y: number; w: number; h: number; title: string | string[]; sub?: string | string[]; tone?: Tone; icon?: PhosphorIcon; pad?: number }) {
  const titles = Array.isArray(title) ? title : [title];
  const subs = sub === undefined ? [] : Array.isArray(sub) ? sub : [sub];
  const total = titles.length * 17 + subs.length * 15;
  const top = y + (h - total) / 2 + 13;
  const left = icon ? x + pad : x + w / 2;
  return (
    <g className={`fg-pop fg-tone--${tone}`}>
      <rect className="fg-node" x={x} y={y} width={w} height={h} rx={16} />
      {icon && <Glyph icon={icon} size={22} x={x + (pad >= 48 ? 17 : 12)} y={y + (h - 22) / 2} />}
      <text textAnchor={icon ? "start" : "middle"}>
        {titles.map((line, index) => <tspan key={`t${index}`} className="fg-title" x={left} y={top + index * 17}>{line}</tspan>)}
        {subs.map((line, index) => <tspan key={`s${index}`} className="fg-sub" x={left} y={top + titles.length * 17 + index * 15 - 2}>{line}</tspan>)}
      </text>
    </g>
  );
}

/** Pastille (une seule ligne) : coche, pictogramme ou rien à gauche. */
export function Chip({ x, y, w, h = 30, text, icon, check = false, tone = "plain" }: { x: number; y: number; w: number; h?: number; text: string; icon?: PhosphorIcon; check?: boolean; tone?: Tone }) {
  const hasLead = Boolean(icon) || check;
  return (
    <g className={`fg-pop fg-chip fg-tone--${tone}`}>
      <rect className="fg-node" x={x} y={y} width={w} height={h} rx={h / 2} />
      {icon && <Glyph icon={icon} size={16} x={x + 11} y={y + (h - 16) / 2} />}
      {check && <path className="fg-check" d={`M${x + 12} ${y + h / 2} l4 4 l8 -9`} />}
      <text className="fg-sub fg-sub--ink" x={hasLead ? x + 34 : x + w / 2} y={y + h / 2 + 4} textAnchor={hasLead ? "start" : "middle"}>{text}</text>
    </g>
  );
}

/** Pointe de flèche dont la pointe est exactement en (x, y). */
export function Arrow({ x, y, dir = "down" }: { x: number; y: number; dir?: "down" | "up" | "right" }) {
  const d = dir === "down" ? `M${x - 5} ${y - 7} L${x} ${y} L${x + 5} ${y - 7}` : dir === "up" ? `M${x - 5} ${y + 7} L${x} ${y} L${x + 5} ${y + 7}` : `M${x - 7} ${y - 5} L${x} ${y} L${x - 7} ${y + 5}`;
  return <path className="fg-arrow fg-pop" d={d} />;
}

/** Trait qui se dessine. `pathLength={1}` permet à l'animation de tracer n'importe quelle longueur. */
export function Line({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return dashed
    ? <path className="fg-line fg-line--dash fg-fade" d={d} />
    : <path className="fg-line fg-draw" d={d} pathLength={1} />;
}

/** Point lumineux qui parcourt le tracé `data-path` du même nom, en boucle (voir FigureMotion). À placer AVANT les cartes pour passer dessous. */
export function Packet({ name, reverse = false }: { name: string; reverse?: boolean }) {
  return <circle className="fg-dot" r={4.5} cx={-20} cy={-20} data-travel={name} data-reverse={reverse ? "" : undefined} />;
}
