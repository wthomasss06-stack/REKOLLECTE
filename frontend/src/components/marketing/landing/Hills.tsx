/**
 * Collines en couches (SVG) — l'équivalent maison de la colline fleurie du hero Flowa.
 * Chaque couche porte data-hill : le parallaxe de la landing les décale à des vitesses
 * différentes. Aucune image distante, aucun poids : trois paths et quelques points.
 */
const FLOWERS: [number, number, number, string][] = [
  [118, 232, 4, "#d6e7a8"], [214, 214, 3, "#eeeee2"], [336, 238, 4.5, "#d6e7a8"], [452, 206, 3, "#eeeee2"],
  [588, 224, 4, "#d6e7a8"], [706, 196, 3.5, "#eeeee2"], [838, 218, 4.5, "#d6e7a8"], [962, 204, 3, "#eeeee2"],
  [1084, 230, 4, "#d6e7a8"], [1196, 210, 3.5, "#eeeee2"], [1310, 236, 4.5, "#d6e7a8"], [1394, 218, 3, "#eeeee2"],
];

export default function Hills({ className = "", flowers = true }: { className?: string; flowers?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className={`pointer-events-none block w-full ${className}`}
    >
      <path data-hill="3" d="M0 190C160 120 330 96 520 132s330 90 520 40 290-70 400-30V320H0Z" fill="#1c6b49" opacity=".55" />
      <path data-hill="2" d="M0 236C170 170 340 160 560 196s360 60 560 8 240-38 320-14V320H0Z" fill="#14573a" />
      <path data-hill="1" d="M0 276C200 232 380 226 600 252s400 36 600 2 180-22 240-12V320H0Z" fill="#0e3f2b" />
      {flowers && (
        <g data-hill="2">
          {FLOWERS.map(([cx, cy, r, fill]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
          ))}
        </g>
      )}
    </svg>
  );
}
