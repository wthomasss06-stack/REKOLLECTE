import type { ReactNode } from "react";
import { DeviceTablet, Notebook, WifiHigh, WifiSlash } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Chip, Figure, Glyph, Line, Node, Packet, Svg } from "./parts";

/** Hors ligne : les visites attendent sur l’appareil, puis partent seules (aide, à propos). */
export function OfflineFigure({ caption = "Sans réseau, les visites restent sur l’appareil. Elles partent seules vers le registre au retour de la connexion." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : sans réseau, la tablette d’accueil garde les visites sur l’appareil ; quand la connexion revient, elles sont envoyées automatiquement au registre." caption={caption}>
      <Svg viewBox="0 0 360 312">
        <path className="fg-track" data-path="sync" d="M180 166 V244" />
        <Packet name="sync" />
        <Line dashed d="M180 70 V122" />
        <g className="fg-fade"><Glyph icon={WifiSlash} size={18} x={192} y={82} /><text className="fg-label" x={216} y={96}>Sans réseau</text></g>
        <Chip x={105} y={126} w={150} h={34} icon={WifiHigh} tone="soft" text="Réseau revenu" />
        <Line d="M180 164 V236" /><Arrow x={180} y={242} />
        <text className="fg-label fg-fade" x={192} y={208}>envoi automatique</text>
        <Node x={65} y={0} w={230} h={64} icon={DeviceTablet} title="Tablette d’accueil" sub={["sans réseau : les visites", "restent sur l’appareil"]} />
        <Node x={65} y={248} w={230} h={64} icon={Notebook} tone="accent" title="Registre" sub={["reçoit les visites", "dès le retour du réseau"]} />
      </Svg>
    </Figure>
  );
}
