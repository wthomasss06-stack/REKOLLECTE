import type { ReactNode } from "react";
import { Buildings, SlidersHorizontal, User } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Figure, Line, Node, Svg } from "./parts";

/** Exercer ses droits : demande à l’établissement, qui exporte ou supprime depuis Paramètres › Données (confidentialité). */
export function RightsFigure({ caption = "Les membres peuvent aussi demander la désactivation de leur compte." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : la personne concernée demande l’accès, la rectification ou la suppression de ses données à l’établissement qui les a collectées ; le Patron exporte ou supprime les données dans Paramètres, Données, en retrouvant la personne par son téléphone ou son e-mail." caption={caption}>
      <Svg viewBox="0 0 360 288">
        <Line d="M180 68 V106" /><Arrow x={180} y={112} />
        <text className="fg-label fg-fade" x={192} y={94}>s’adresse d’abord à</text>
        <Line d="M180 172 V210" /><Arrow x={180} y={216} />
        <text className="fg-label fg-fade" x={192} y={198}>le Patron, dans l’application</text>
        <Node x={50} y={0} w={260} h={64} icon={User} title="Personne concernée" sub={["demande l’accès, la rectification", "ou la suppression"]} />
        <Node x={50} y={116} w={260} h={56} icon={Buildings} title="Établissement" sub="qui a collecté les informations" />
        <Node x={30} y={220} w={300} h={68} icon={SlidersHorizontal} tone="accent" title="Paramètres › Données" sub={["exporter ou supprimer les données", "retrouvées par téléphone ou e-mail"]} />
      </Svg>
    </Figure>
  );
}
