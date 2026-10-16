"use client";

import { useId } from "react";

export type SceneStatus = "idle" | "busy" | "error";

/* QR code décoratif : 21×21 modules, trois repères d'angle et des modules pseudo-aléatoires. La graine est fixe, donc le tracé
   est identique côté serveur et côté navigateur (aucune hydratation décalée). Ce n'est pas un vrai QR : il n'encode rien. */
const GRID = 21;
const MODULE = 4.4;

function qrPath(): string {
  const finder = (x: number, y: number) => (cx: number, cy: number) => {
    const dx = cx - x, dy = cy - y;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
    const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
    return ring || core;
  };
  const finders = [finder(0, 0), finder(GRID - 7, 0), finder(0, GRID - 7)];
  let seed = 20261014;
  const next = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  let d = "";
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      let on: boolean | null = null;
      for (const f of finders) { const v = f(x, y); if (v !== null) { on = v; break; } }
      if (on === null) {
        const nearFinder = (x < 8 && y < 8) || (x > GRID - 9 && y < 8) || (x < 8 && y > GRID - 9);
        on = nearFinder ? false : next() > 0.52;
      }
      if (on) d += `M${(x * MODULE).toFixed(2)} ${(y * MODULE).toFixed(2)}h${MODULE}v${MODULE}h-${MODULE}z`;
    }
  }
  return d;
}
const QR = qrPath();
const SPARKS = [[-62, -30], [-38, -54], [0, -62], [40, -52], [66, -26], [70, 12]] as const;

/** Scène de bienvenue (SVG animé, sans image ni script) : un visiteur scanne le QR, remplit sa fiche, signe, et reçoit « Bienvenue ».
 * Le mouvement est une boucle CSS de 10 s ; sans animation (prefers-reduced-motion) la scène reste sur l'image finale.
 * `status` la fait réagir : « busy » accélère le scan, « error » secoue le téléphone. Styles : auth-stage.css. */
export function WelcomeScene({ status = "idle", className = "" }: { status?: SceneStatus; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `sc-${name}-${uid}`;
  return (
    <svg className={`sc ${className}`.trim()} data-status={status} viewBox="0 0 400 320" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id("scan")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-stop" stopOpacity="0" />
          <stop offset="0.55" className="sc-stop" stopOpacity="0.95" />
          <stop offset="1" className="sc-stop" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id("screen")}><rect x="0" y="0" width="124" height="226" rx="18" /></clipPath>
        <clipPath id={id("qr")}><rect x="0" y="0" width="92.4" height="92.4" rx="3" /></clipPath>
      </defs>

      <ellipse className="sc-shadow" cx="200" cy="304" rx="128" ry="9" />
      <circle className="sc-dot sc-dot--1" cx="364" cy="214" r="5" />
      <circle className="sc-dot sc-dot--2" cx="28" cy="96" r="4" />
      <circle className="sc-dot sc-dot--3" cx="338" cy="292" r="3" />

      <g className="sc-float">
        {/* Téléphone du visiteur : la fiche se remplit, puis la signature se trace. */}
        <g transform="translate(46 24)">
          <g className="sc-par-a"><g className="sc-phone">
            <rect className="sc-bezel" x="0" y="0" width="142" height="244" rx="26" />
            <g transform="translate(9 9)">
              <rect className="sc-screen" width="124" height="226" rx="18" />
              <g clipPath={`url(#${id("screen")})`}>
                <rect className="sc-notch" x="44" y="7" width="36" height="8" rx="4" />
                <circle className="sc-lime" cx="22" cy="36" r="7" />
                <rect className="sc-bar" x="35" y="32" width="58" height="8" rx="4" />
                {[52, 82, 112].map((y, index) => (
                  <g key={y}>
                    <rect className="sc-field" x="12" y={y} width="100" height="24" rx="9" />
                    <rect className={`sc-fill sc-fill--${index + 1}`} x="19" y={y + 9} width={[64, 44, 72][index]} height="6" rx="3" />
                  </g>
                ))}
                <rect className="sc-field" x="12" y="144" width="100" height="44" rx="10" />
                <path className="sc-sign" pathLength="100" d="M22 174 C28 154 34 154 32 172 S44 188 52 170 S62 160 66 174 S80 186 100 160" />
                <rect className="sc-btn" x="12" y="196" width="100" height="24" rx="12" />
                <path className="sc-check" pathLength="100" d="M54 208 L60 214 L71 202" />
              </g>
            </g>
          </g></g>
        </g>

        {/* Chevalet QR de l'accueil : le trait de scan le balaie, les repères pulsent. */}
        <g transform="translate(226 118)">
          <g className="sc-par-b"><g className="sc-qr">
            <g transform="rotate(5 58 58)">
              <rect className="sc-card" width="116" height="116" rx="16" />
              <g transform="translate(11.8 11.8)">
                <path className="sc-qr-ink" d={QR} />
                <g clipPath={`url(#${id("qr")})`}><rect className="sc-scan" x="-2" y="-16" width="96.4" height="18" fill={`url(#${id("scan")})`} /></g>
              </g>
              <g className="sc-brackets">
                <path d="M-8 10 V-8 H10" /><path d="M106 -8 H124 V10" /><path d="M124 106 V124 H106" /><path d="M10 124 H-8 V106" />
              </g>
            </g>
          </g></g>
        </g>

        {/* « Bienvenue » : apparaît quand la fiche est signée. */}
        <g transform="translate(228 54)">
          <g className="sc-badge">
            <rect className="sc-badge-bg" width="136" height="42" rx="21" />
            <circle className="sc-badge-dot" cx="21" cy="21" r="12" />
            <path className="sc-badge-check" d="M15 21.5 L19.5 26 L28 17" />
            <text className="sc-badge-text" x="42" y="26.5">Bienvenue</text>
          </g>
        </g>
        <g transform="translate(296 75)">
          {SPARKS.map(([dx, dy], index) => (
            <circle key={index} className="sc-spark" r={index % 2 ? 2.4 : 3.2} style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties} />
          ))}
        </g>
      </g>
    </svg>
  );
}
