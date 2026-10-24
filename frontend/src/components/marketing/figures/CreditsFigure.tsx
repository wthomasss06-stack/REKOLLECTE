import type { ReactNode } from "react";
import { Lightbulb, Megaphone, Palette, FlowArrow } from "@phosphor-icons/react/dist/ssr";
import { Figure, Line, Node, Svg } from "./parts";

/** Crédits : quatre contributions réunies par une même équipe. */
export function CreditsFigure({ caption = "De l’idée à la mise en ligne, REKOLLECTE est imaginé, conçu et réalisé par une même équipe." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : conception du produit, design et direction artistique, affiches et communication, parcours et fonctionnement du service sont réunis dans REKOLLECTE par une même équipe." caption={caption}>
      <Svg viewBox="0 0 360 214">
        <Line d="M86 64 V150" /><Line d="M274 64 V150" />
        <Line d="M86 107 H105" /><Line d="M274 107 H255" />
        <Node x={0} y={0} w={172} h={64} icon={Lightbulb} pad={44} title={["Conception", "du produit"]} />
        <Node x={188} y={0} w={172} h={64} icon={Palette} pad={44} title={["Design et", "direction", "artistique"]} />
        <Node x={0} y={150} w={172} h={64} icon={Megaphone} pad={44} title={["Affiches et", "communication"]} />
        <Node x={188} y={150} w={172} h={64} icon={FlowArrow} pad={44} title={["Parcours et", "fonctionnement"]} />
        <Node x={105} y={82} w={150} h={50} tone="accent" title="REKOLLECTE" sub="une même équipe" />
      </Svg>
    </Figure>
  );
}
