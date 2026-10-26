import type { ReactNode } from "react";
import { Bell, CalendarCheck, Cube, CreditCard, Notebook, Users } from "@phosphor-icons/react/dist/ssr";
import { Chip, Figure, Node, Svg } from "./parts";

/** REKOLLECTE + REKOLLECTE+ : ce que le complément ajoute au registre (à propos). */
export function PlusFigure({ caption = "REKOLLECTE+ complète le registre ; il s’active depuis la page REKOLLECTE." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : REKOLLECTE+ s’ajoute au registre visiteurs REKOLLECTE et apporte les fiches clients, les ressources, les réservations, les encaissements et les rappels de fin de créneau." caption={caption}>
      <Svg viewBox="0 0 360 292">
        <g className="fg-pop fg-tone--accent"><rect className="fg-node" x={0} y={0} width={360} height={200} rx={20} /></g>
        <text className="fg-fade"><tspan className="fg-title fg-title--lg" x={20} y={30}>REKOLLECTE+</tspan><tspan className="fg-sub" x={20} y={48}>s’active depuis la page REKOLLECTE</tspan></text>
        <Chip x={20} y={70} w={150} icon={Users} text="Fiches clients" />
        <Chip x={190} y={70} w={150} icon={Cube} text="Ressources" />
        <Chip x={20} y={110} w={150} icon={CalendarCheck} text="Réservations" />
        <Chip x={190} y={110} w={150} icon={CreditCard} text="Encaissements" />
        <Chip x={20} y={150} w={320} icon={Bell} text="Rappels de fin de créneau" />
        <g className="fg-pop"><circle className="fg-node" cx={180} cy={216} r={13} /><path className="fg-line" d="M174 216 H186 M180 210 V222" /></g>
        <Node x={0} y={236} w={360} h={56} icon={Notebook} title="REKOLLECTE" sub="le registre visiteurs" />
      </Svg>
    </Figure>
  );
}
