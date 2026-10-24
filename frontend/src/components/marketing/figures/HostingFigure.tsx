import type { ReactNode } from "react";
import { Database, Globe, HardDrives, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { Arrow, Figure, Line, Node, Packet, Svg } from "./parts";

/** Hébergement (mentions légales) : frontend, backend, base de données, images. */
export function HostingFigure({ caption = "L’infrastructure de REKOLLECTE : frontend, backend, base de données et images." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : Vercel héberge le frontend, Render le backend applicatif et Neon la base de données PostgreSQL ; Cloudinary héberge les images (logos, photos de profil, visuels du site)." caption={caption}>
      <Svg viewBox="0 0 360 264">
        <path className="fg-track" data-path="stack" d="M80 66 V198" />
        <Packet name="stack" />
        <Line d="M80 68 V92" /><Arrow x={80} y={98} />
        <Line d="M80 168 V192" /><Arrow x={80} y={198} />
        <Line dashed d="M160 32 H190" /><Arrow x={200} y={32} dir="right" />
        <Node x={0} y={0} w={160} h={64} icon={Globe} pad={46} title="Vercel" sub="frontend" />
        <Node x={0} y={100} w={160} h={64} icon={HardDrives} pad={46} title="Render" sub={["backend", "applicatif"]} />
        <Node x={0} y={200} w={160} h={64} icon={Database} pad={46} title="Neon" sub={["base de données", "PostgreSQL"]} />
        <Node x={200} y={0} w={160} h={76} icon={ImageSquare} pad={46} title="Cloudinary" sub={["images : logos,", "photos de profil,", "visuels du site"]} />
      </Svg>
    </Figure>
  );
}
