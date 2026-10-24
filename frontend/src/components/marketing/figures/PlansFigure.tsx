import type { ReactNode } from "react";
import { CalendarCheck, CreditCard, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Chip, Figure, Line, Node, Svg } from "./parts";

/** Tarification : lancement gratuit, offres payantes, retour au plan Gratuit sans perte (conditions d’utilisation §6). */
export function PlansFigure({ caption = "Même après une fin d’essai ou un impayé, l’enregistrement des visiteurs n’est jamais bloqué." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : pendant le lancement, aucun paiement et aucune limite de plan ; ensuite, les offres payantes. En cas de fin d’essai ou d’impayé, l’espace repasse au plan Gratuit : données conservées, enregistrement des visiteurs jamais bloqué, export de sortie disponible." caption={caption}>
      <Svg viewBox="0 0 360 396">
        <Line d="M180 68 V102" /><Arrow x={180} y={108} />
        <text className="fg-label fg-fade" x={192} y={92}>ensuite</text>
        <Line d="M180 176 V210" /><Arrow x={180} y={216} />
        <text className="fg-label fg-fade" x={192} y={200}>fin d’essai ou impayé</text>
        <Node x={55} y={0} w={250} h={64} icon={CalendarCheck} title="Lancement" sub={["aucun paiement,", "aucune limite de plan"]} />
        <Node x={55} y={108} w={250} h={64} icon={CreditCard} title="Offres payantes" sub={["Essentiel, REKOLLECTE+,", "Entreprise sur devis"]} />
        <Node x={55} y={216} w={250} h={64} icon={ShieldCheck} tone="accent" title="Plan Gratuit" sub="l’espace repasse à ce plan" />
        <Chip x={40} y={296} w={280} check text="données conservées" />
        <Chip x={30} y={330} w={300} check text="enregistrement des visiteurs jamais bloqué" />
        <Chip x={40} y={364} w={280} check text="export de sortie disponible" />
      </Svg>
    </Figure>
  );
}
