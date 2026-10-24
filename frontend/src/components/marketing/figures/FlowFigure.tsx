import type { ReactNode } from "react";
import { QrCode, PencilSimpleLine, Notebook } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Figure, Line, Node, Packet, Svg } from "./parts";

/** Du scan au registre : parcours du visiteur (à propos, aide). */
export function FlowFigure({ caption = "Le visiteur ne crée aucun compte. Le Patron retrouve chaque visite dans son tableau de bord." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : le visiteur scanne le QR Code, remplit le formulaire d’accueil et signe à l’écran, puis la visite est enregistrée dans le registre de l’établissement." caption={caption}>
      <Svg viewBox="0 0 360 300">
        <path className="fg-track" data-path="flow" d="M180 68 V234" />
        <Packet name="flow" />
        <Line d="M180 68 V110" /><Arrow x={180} y={116} />
        <text className="fg-label fg-fade" x={192} y={96}>ouvre le formulaire</text>
        <Line d="M180 186 V228" /><Arrow x={180} y={234} />
        <text className="fg-label fg-fade" x={192} y={214}>visite enregistrée</text>
        <Node x={65} y={0} w={230} h={64} icon={QrCode} title="Visiteur" sub="scanne le QR Code" />
        <Node x={65} y={118} w={230} h={64} icon={PencilSimpleLine} title="Formulaire d’accueil" sub={["champs choisis,", "signature à l’écran"]} />
        <Node x={65} y={236} w={230} h={64} icon={Notebook} tone="accent" title="Registre" sub={["de l’établissement,", "consulté selon le rôle"]} />
      </Svg>
    </Figure>
  );
}
