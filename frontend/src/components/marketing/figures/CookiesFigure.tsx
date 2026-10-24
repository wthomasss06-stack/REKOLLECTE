import type { ReactNode } from "react";
import { Cookie, Lock } from "@phosphor-icons/react/dist/ssr";
import { Figure, Glyph, Node, Svg } from "./parts";

/** Cookies : un cookie nécessaire, une mesure d’audience soumise à consentement (confidentialité). */
export function CookiesFigure({ caption = "Vous pouvez changer d’avis à tout moment depuis « Gérer les cookies », en bas de chaque page." }: { caption?: ReactNode }) {
  return (
    <Figure label="Schéma : le cookie de connexion des membres, qr_refresh_token, dure 14 jours et est strictement nécessaire. La mesure d’audience (rk_vid, 13 mois, et rk_sid, 30 minutes d’inactivité) n’est active qu’avec votre accord, que vous pouvez modifier. Le choix est mémorisé 6 mois." caption={caption}>
      <Svg viewBox="0 0 360 264">
        <Node x={0} y={0} w={360} h={72} icon={Lock} title="Connexion des membres" sub={["qr_refresh_token · 14 jours", "strictement nécessaire, sans consentement"]} />
        <g className="fg-pop">
          <rect className="fg-node" x={0} y={92} width={360} height={96} rx={16} />
          <Glyph icon={Cookie} size={22} x={17} y={129} />
          <text><tspan className="fg-title" x={52} y={120}>Mesure d’audience</tspan><tspan className="fg-sub" x={52} y={141}>rk_vid · 13 mois</tspan><tspan className="fg-sub" x={52} y={156}>rk_sid · 30 min d’inactivité</tspan><tspan className="fg-sub" x={52} y={171}>uniquement avec votre accord</tspan></text>
          <g className="fg-toggle"><rect className="fg-toggle__track" x={296} y={120} width={44} height={24} rx={12} /><circle className="fg-toggle__knob" cx={308} cy={132} r={9} data-to={328} /></g>
          <text className="fg-label" x={318} y={164} textAnchor="middle">votre accord</text>
        </g>
        <Node x={20} y={208} w={320} h={52} tone="ghost" title="Choix mémorisé 6 mois" sub="modifiable à tout moment" />
      </Svg>
    </Figure>
  );
}
