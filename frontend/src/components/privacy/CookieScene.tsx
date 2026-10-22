"use client";

import { useId } from "react";

/** Biscuit du modal cookies (SVG animé, sans image ni script) : un cookie croqué qui cligne des yeux, avec un bouclier « coché » qui se
 * dessine — le message du modal : on ne mesure que si tu es d’accord. Styles : cookie-consent.css (`ck-*`). Sans animation
 * (prefers-reduced-motion), l’image reste fixe. `calm` coupe le mouvement continu (panneau « Personnaliser »). */
export function CookieScene({ className = "", calm = false }: { className?: string; calm?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `ck-${name}-${uid}`;
  return (
    <svg className={`ck ${calm ? "ck--calm" : ""} ${className}`.trim()} viewBox="0 0 220 160" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id("body")}><circle cx="104" cy="88" r="56" /></clipPath>
        <mask id={id("bite")} maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="160">
          <rect width="220" height="160" fill="#fff" />
          <circle cx="147" cy="45" r="17" fill="#000" />
          <circle cx="163" cy="69" r="11" fill="#000" />
          <circle cx="128" cy="33" r="8" fill="#000" />
        </mask>
      </defs>

      <ellipse className="ck-shadow" cx="104" cy="152" rx="62" ry="6" />

      <g className="ck-sparkles">
        <path className="ck-spark ck-spark--1" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" transform="translate(30 46)" />
        <path className="ck-spark ck-spark--2" d="M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9Z" transform="translate(190 108)" />
        <path className="ck-spark ck-spark--3" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z" transform="translate(182 24)" />
      </g>

      <g className="ck-crumbs">
        <circle className="ck-crumb ck-crumb--1" cx="150" cy="66" r="3.4" />
        <circle className="ck-crumb ck-crumb--2" cx="164" cy="82" r="2.6" />
        <circle className="ck-crumb ck-crumb--3" cx="140" cy="62" r="2.2" />
      </g>

      <g className="ck-bob">
        {/* Pâte : le masque retire les trois morsures, les arcs dessinés ensuite les redessinent au trait. */}
        <g mask={`url(#${id("bite")})`}>
          <circle className="ck-dough" cx="104" cy="88" r="56" />
          <path className="ck-shade" d="M60 112 C70 138 112 150 140 128 C122 140 82 138 60 112Z" />
        </g>
        <g clipPath={`url(#${id("body")})`} className="ck-bites">
          <circle cx="147" cy="45" r="17" />
          <circle cx="163" cy="69" r="11" />
          <circle cx="128" cy="33" r="8" />
        </g>

        <g className="ck-chips">
          <ellipse cx="70" cy="68" rx="6.5" ry="5" transform="rotate(-24 70 68)" />
          <ellipse cx="92" cy="50" rx="5.5" ry="4.2" transform="rotate(18 92 50)" />
          <ellipse cx="66" cy="104" rx="6" ry="4.6" transform="rotate(30 66 104)" />
          <ellipse cx="112" cy="128" rx="6.4" ry="4.8" transform="rotate(-12 112 128)" />
          <ellipse cx="138" cy="102" rx="5.6" ry="4.4" transform="rotate(40 138 102)" />
          <ellipse cx="128" cy="68" rx="4.6" ry="3.6" transform="rotate(-30 128 68)" />
        </g>

        <g className="ck-face">
          <ellipse className="ck-blush" cx="82" cy="98" rx="8" ry="5" />
          <ellipse className="ck-blush" cx="124" cy="98" rx="8" ry="5" />
          <g className="ck-eyes">
            <ellipse className="ck-eye" cx="90" cy="86" rx="3.6" ry="5.2" />
            <ellipse className="ck-eye" cx="116" cy="86" rx="3.6" ry="5.2" />
          </g>
          <path className="ck-mouth" d="M93 101 Q103 112 113 101" />
        </g>

        <g className="ck-badge">
          <path className="ck-shield" d="M156 101 L180 109 V126 C180 141 170 151 156 157 C142 151 132 141 132 126 V109 Z" />
          <path className="ck-tick" d="M145 128 L153 136 L168 119" pathLength="100" />
        </g>
      </g>
    </svg>
  );
}
