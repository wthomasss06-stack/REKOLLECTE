import type { ReactNode } from "react";
import { Crown, User, UserGear } from "@phosphor-icons/react/dist/ssr";
import { Glyph, Figure, Svg, wrapText } from "./parts";

/** Rôles : trois couches emboîtées, chaque rôle inclut les droits du rôle intérieur (conditions d’utilisation, aide). */
export function RolesFigure({ caption = "Chaque rôle inclut les droits du rôle intérieur. Les droits sont contrôlés par le serveur." }: { caption?: ReactNode }) {
  const patron = wrapText("en plus : nom et logo, suppressions, REKOLLECTE+, invitation des Gérants", 54);
  const gerant = wrapText("en plus : points d’accueil, QR, motifs, export, invitation des Agents", 50);
  const agent = wrapText("consulte le registre, utilise le mode Accueil, remplit une fiche sur tablette", 46);
  return (
    <Figure label="Schéma : trois rôles emboîtés. L’Agent consulte le registre et utilise le mode Accueil. Le Gérant y ajoute les points d’accueil, les QR, les motifs, l’export et l’invitation des Agents. Le Patron y ajoute le nom et le logo, les suppressions, REKOLLECTE+ et l’invitation des Gérants." caption={caption}>
      <Svg viewBox="0 0 360 300">
        <g className="fg-pop"><rect className="fg-layer fg-layer--1" x={0} y={0} width={360} height={300} rx={22} /></g>
        <g className="fg-fade">
          <Glyph icon={Crown} size={20} x={16} y={14} />
          <text><tspan className="fg-title" x={44} y={30}>Patron</tspan>{patron.map((line, i) => <tspan key={i} className="fg-sub" x={16} y={52 + i * 15}>{line}</tspan>)}</text>
        </g>
        <g className="fg-pop"><rect className="fg-layer fg-layer--2" x={14} y={86} width={332} height={198} rx={18} /></g>
        <g className="fg-fade">
          <Glyph icon={UserGear} size={20} x={30} y={100} />
          <text><tspan className="fg-title" x={58} y={116}>Gérant</tspan>{gerant.map((line, i) => <tspan key={i} className="fg-sub" x={30} y={138 + i * 15}>{line}</tspan>)}</text>
        </g>
        <g className="fg-pop"><rect className="fg-layer fg-layer--3" x={28} y={170} width={304} height={96} rx={16} /></g>
        <g className="fg-fade">
          <Glyph icon={User} size={20} x={44} y={184} />
          <text><tspan className="fg-title" x={72} y={200}>Agent</tspan>{agent.map((line, i) => <tspan key={i} className="fg-sub" x={44} y={222 + i * 15}>{line}</tspan>)}</text>
        </g>
      </Svg>
    </Figure>
  );
}
