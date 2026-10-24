import type { ReactNode } from "react";
import { Buildings, GearSix, Users } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Figure, Line, Node, Svg } from "./parts";

/** Qui est responsable de quoi (conditions d’utilisation §7). */
export function ResponsibilityFigure({ caption = "L’éditeur fournit l’outil ; l’établissement reste responsable de ses formulaires, de ses visiteurs et de ses données." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : l’établissement est responsable de ses obligations légales, de ses formulaires, de ses visiteurs et de la conservation des données. Il informe ses visiteurs et utilise l’outil fourni par l’éditeur, qui héberge les données." caption={caption}>
      <Svg viewBox="0 0 360 246">
        <Line d="M110 80 V146" /><Arrow x={110} y={152} />
        <text className="fg-label fg-fade" x={122} y={118}>informe</text>
        <Line d="M250 80 V146" /><Arrow x={250} y={152} />
        <text className="fg-label fg-fade" x={262} y={118}>utilise l’outil</text>
        <Node x={40} y={0} w={280} h={76} icon={Buildings} tone="accent" title="Établissement" sub={["obligations légales, formulaires,", "visiteurs et conservation des données"]} />
        <Node x={0} y={158} w={172} h={88} icon={Users} pad={44} title="Visiteurs" sub={["informés par", "l’établissement"]} />
        <Node x={188} y={158} w={172} h={88} icon={GearSix} pad={44} title="Éditeur" sub={["fournit l’outil", "technique et", "héberge les données"]} />
      </Svg>
    </Figure>
  );
}
