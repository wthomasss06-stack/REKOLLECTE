import Image from "next/image";

/** Chargement de marque REKOLLECTE : une pastille avec le logo qui respire, entourée d’un anneau qui tourne.
 * - `fullScreen` (défaut) : écran plein cadre (ouverture de l’espace, retour de connexion, pages sans mise en page).
 * - `fullScreen={false}` : dans l’espace connecté, le même visuel plus compact, centré dans la zone de contenu.
 * Rend le même visuel quel que soit le motif de l’attente (session qui se rétablit, serveur qui se réveille, simple chargement) :
 * on ne montre plus de message technique, seulement la marque et un libellé court. */
export default function Loader({ label = "Chargement…", fullScreen = true }: { label?: string; fullScreen?: boolean }) {
  return (
    <div className={`rk-loader ${fullScreen ? "rk-loader--screen" : "rk-loader--inline"}`} role="status" aria-live="polite" aria-label={label}>
      <div className="rk-loader__orb">
        <span className="rk-loader__ring" aria-hidden="true" />
        <Image src="/brand/logo-mark.png" alt="" width={44} height={44} priority className="rk-loader__mark" />
      </div>
      {fullScreen && <strong className="rk-loader__name">REKOLLECTE</strong>}
      <p className="rk-loader__label">{label}</p>
    </div>
  );
}
