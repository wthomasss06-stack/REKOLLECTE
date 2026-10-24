import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Glyph } from "./parts";

/* Illustration d'en-tête des pages d'information : une feuille dont les lignes s'écrivent, et un badge propre au document
   (parchemin = conditions d'utilisation, cadenas = confidentialité, bâtiment = mentions légales…).
   Sobre et décorative : elle ne promet rien (aucune coche de conformité, aucun bouclier). */

export function DocHero({ icon }: { icon: PhosphorIcon }) {
  return (
    <div className="legal-art" aria-hidden="true" data-figure>
      <svg className="fig__svg" viewBox="0 0 220 190" focusable="false">
        <g className="fg-pop"><rect className="fg-sheet fg-sheet--back" x="64" y="20" width="118" height="150" rx="14" transform="rotate(6 123 95)" /></g>
        <g className="fg-pop"><rect className="fg-sheet" x="38" y="10" width="124" height="156" rx="14" /></g>
        <path className="fg-doc-title fg-draw" d="M58 38 H112" pathLength={1} />
        <path className="fg-doc-line fg-draw" d="M58 62 H144" pathLength={1} />
        <path className="fg-doc-line fg-draw" d="M58 78 H130" pathLength={1} />
        <path className="fg-doc-line fg-draw" d="M58 94 H140" pathLength={1} />
        <path className="fg-doc-line fg-draw" d="M58 110 H112" pathLength={1} />
        <g className="fg-pop">
          <g className="fg-float">
            <circle className="fg-badge" cx="158" cy="138" r="30" />
            <Glyph icon={icon} size={30} x={143} y={123} />
          </g>
        </g>
      </svg>
    </div>
  );
}
