import type { ReactNode } from "react";
import { Buildings, HardDrives, User } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Chip, Figure, Line, Node, Svg } from "./parts";

/** Parcours d’une donnée visiteur (politique de confidentialité : destinataires et infrastructure). */
export function DataFlowFigure({ caption = "Les données sont accessibles aux membres autorisés de l’établissement, selon leur rôle." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : le visiteur remplit le formulaire ; la visite est enregistrée chez l’établissement, responsable du traitement, et hébergée par des prestataires techniques : Vercel, Render, Neon et Cloudinary pour les images. Aucun service publicitaire. Les prestataires peuvent être situés hors de Côte d’Ivoire." caption={caption}>
      <Svg viewBox="0 0 360 358">
        <Line d="M180 60 V92" /><Arrow x={180} y={98} />
        <text className="fg-label fg-fade" x={192} y={82}>visite enregistrée</text>
        <Line d="M180 168 V200" /><Arrow x={180} y={206} />
        <text className="fg-label fg-fade" x={192} y={190}>hébergée chez</text>
        <Node x={65} y={0} w={230} h={56} icon={User} title="Visiteur" sub="remplit le formulaire" />
        <Node x={50} y={100} w={260} h={64} icon={Buildings} tone="accent" title="Établissement" sub={["responsable du traitement,", "accès selon le rôle"]} />
        <Node x={50} y={208} w={260} h={72} icon={HardDrives} title="Prestataires techniques" sub={["Vercel, Render, Neon", "images : Cloudinary"]} />
        <Chip x={40} y={296} w={280} h={28} tone="ghost" text="Aucun service publicitaire" />
        <Chip x={20} y={330} w={320} h={28} tone="ghost" text="Prestataires parfois hors de Côte d’Ivoire" />
      </Svg>
    </Figure>
  );
}
