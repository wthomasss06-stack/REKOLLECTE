"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Effet « gooey » partagé : toute fenêtre ou fenêtre volante (réglages, confirmation, formulaire, menu, cookies…) sort du bouton
 * qui l’a ouverte comme une goutte, et s’y résorbe à la fermeture.
 *
 *  - `<GooeyProvider />` (monté une fois dans Providers) retient le dernier bouton cliqué et définit le filtre SVG commun.
 *  - `useGooey(ref)` s’appelle dans le composant de la fenêtre : au montage, une goutte part du bouton vers la carte ; au démontage,
 *    un « fantôme » de la carte se résorbe dans le bouton. Rien à ajouter sur les boutons eux-mêmes.
 *
 * Mouvement réduit, navigateur sans WAAPI, ou fenêtre ouverte sans clic récent : aucune animation, la fenêtre apparaît comme avant.
 */
export const GOO_FILTER_ID = "rk-goo-shared";
const FRESH_MS = 1600;
const INTERACTIVE = 'button, a[href], [role="button"], [role="menuitem"], summary, [data-goo-origin]';
const HOST_SELECTOR = "[data-goo-host], .rk-modal-backdrop, .qr-flash-overlay";

interface Rect { left: number; top: number; width: number; height: number }
interface Origin { el: Element; rect: Rect; at: number }

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
let lastOrigin: Origin | null = null;

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height });
const centerOf = (r: Rect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Pseudo-aléatoire déterministe : les gouttes tombent toujours au même endroit (pas de scintillement d’une ouverture à l’autre). */
const noise = (i: number) => { const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return x - Math.floor(x); };

export function GooeyProvider() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
      if (!target || target.closest("[data-no-goo]")) return;
      const rect = toRect(target.getBoundingClientRect());
      if (rect.width < 2 || rect.height < 2) return;
      lastOrigin = { el: target, rect, at: performance.now() };
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id={GOO_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function freshOrigin(): Origin | null {
  if (!lastOrigin || performance.now() - lastOrigin.at > FRESH_MS) return null;
  return lastOrigin;
}

function cardColors(card: HTMLElement) {
  const style = getComputedStyle(card);
  let color = style.backgroundColor;
  if (!color || color === "transparent" || /rgba\(.*,\s*0\)$/.test(color)) {
    const surface = getComputedStyle(document.documentElement).getPropertyValue("--c-surface").trim();
    color = surface ? `rgb(${surface})` : "#fff";
  }
  return { color, radius: parseFloat(style.borderTopLeftRadius) || 20 };
}

/** Calque filtré : une grosse goutte (la carte) + de petites gouttes qui se détachent du bouton. Le filtre les « soude » entre elles. */
function buildLayer(from: Rect, to: Rect, color: string, radius: number, reverse: boolean, drops: number) {
  const PAD = 80;
  const left = Math.min(from.left, to.left) - PAD, top = Math.min(from.top, to.top) - PAD;
  const right = Math.max(from.left + from.width, to.left + to.width) + PAD, bottom = Math.max(from.top + from.height, to.top + to.height) + PAD;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.className = "rk-goo-layer";
  Object.assign(layer.style, { position: "fixed", left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px`, pointerEvents: "none", filter: `url(#${GOO_FILTER_ID})` });

  const blob = document.createElement("div");
  Object.assign(blob.style, { position: "absolute", left: `${to.left - left}px`, top: `${to.top - top}px`, width: `${to.width}px`, height: `${to.height}px`, background: color, borderRadius: `${radius}px`, transformOrigin: "50% 50%" });
  layer.appendChild(blob);

  // Le centre de la goutte file en ligne droite du bouton vers la carte (P) ; sa taille, elle, grandit plus tard (S) : on la voit
  // se détacher, voyager en petite goutte, puis gonfler en arrivant. Les gouttelettes derrière elle font le pont grâce au filtre.
  const fc = centerOf(from), tc = centerOf(to);
  const sx0 = Math.max(from.width / to.width, 0.02), sy0 = Math.max(from.height / to.height, 0.02);
  const pose = (P: number, S: number, round: string, boost = 1): Keyframe => ({
    transform: `translate(${lerp(fc.x, tc.x, P) - tc.x}px, ${lerp(fc.y, tc.y, P) - tc.y}px) scale(${lerp(sx0, 1, S) * boost}, ${lerp(sy0, 1, S) * boost})`,
    borderRadius: round,
  });
  const ease = "cubic-bezier(0.45, 0.05, 0.25, 1)";
  const frames: Keyframe[] = [
    { ...pose(0, 0, "50%"), offset: 0, easing: ease },
    { ...pose(0.1, 0.03, "50%"), offset: 0.14, easing: ease },
    { ...pose(0.42, 0.16, "46%"), offset: 0.4, easing: ease },
    { ...pose(0.86, 0.7, "34%"), offset: 0.58, easing: ease },
    { ...pose(1, 1, `${radius}px`), offset: 0.76, easing: ease },
    { ...pose(1, 1, `${radius}px`), offset: 1 },
  ];
  // À la fermeture, même trajet à l’envers ; les courbes par image sont retirées (la courbe globale de l’appelant s’applique).
  const blobFrames = reverse ? [...frames].reverse().map(({ easing: _easing, ...frame }) => ({ ...frame, offset: 1 - (frame.offset as number) })) : frames;

  const dropEls: { el: HTMLElement; frames: Keyframe[]; delay: number }[] = [];
  const vx = tc.x - fc.x, vy = tc.y - fc.y;
  const dist = Math.hypot(vx, vy) || 1;
  const nx = -vy / dist, ny = vx / dist; // perpendiculaire : les gouttes s’écartent de l’axe bouton → carte
  for (let i = 0; i < drops; i += 1) {
    const size = 13 + noise(i + 1) * 17;
    const el = document.createElement("div");
    Object.assign(el.style, { position: "absolute", left: `${fc.x - left - size / 2}px`, top: `${fc.y - top - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: color });
    layer.appendChild(el);
    const along = 0.3 + noise(i + 7) * 0.4;
    const side = (noise(i + 13) - 0.5) * 2 * Math.min(90, 28 + dist * 0.12);
    const mid = { x: vx * along + nx * side, y: vy * along + ny * side };
    const end = {
      x: lerp(vx, 0, 0.5) + (noise(i + 21) - 0.5) * to.width * 0.5,
      y: lerp(vy, 0, 0.5) + (noise(i + 29) - 0.5) * to.height * 0.5,
    };
    const out: Keyframe[] = [
      { transform: "translate(0px, 0px) scale(0.55)", offset: 0 },
      { transform: `translate(${mid.x}px, ${mid.y}px) scale(1)`, offset: 0.42 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(0.2)`, offset: 1 },
    ];
    dropEls.push({ el, frames: reverse ? [...out].reverse().map((frame, index) => ({ ...frame, offset: [0, 0.55, 1][index]! })) : out, delay: i * 26 });
  }
  return { layer, blob, blobFrames, dropEls, left, top };
}

type Kind = "dialog" | "popover";
export interface GooeyOptions {
  /** Élément stylé (fond, rayon) à l’intérieur de la ref, si la ref est un conteneur. */
  selector?: string;
  /** `dialog` : le calque se glisse derrière la carte, dans son fond. `popover` : calque au-dessus de la page, carte révélée à la fin. */
  kind?: Kind;
  /** Si la fenêtre s’ouvre sans clic récent : `bottom` la fait sortir du bas de l’écran, `none` garde l’apparition d’origine. */
  fallback?: "bottom" | "none";
  /** Ignore le dernier clic (fenêtre qui s’ouvre seule). */
  ignoreClick?: boolean;
}

/** Panneau volant (menu, bulle d’aide, mini-formulaire) : même effet que `useGooey(ref, { kind: "popover" })`, sans écrire de ref. */
export function GooeyPanel({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useGooey(ref, { kind: "popover" });
  return <div ref={ref} {...props}>{children}</div>;
}

export function useGooey(ref: RefObject<HTMLElement | null>, options: GooeyOptions = {}) {
  useIsoLayoutEffect(() => {
    const host = ref.current;
    if (!host || typeof window === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof host.animate !== "function") return undefined;
    const { selector, kind = "dialog", fallback = "none", ignoreClick = false } = options;
    const card = (selector ? host.querySelector<HTMLElement>(selector) : host) ?? host;

    const origin = ignoreClick ? null : freshOrigin();
    const from: Rect | null = origin?.rect ?? (fallback === "bottom" ? { left: window.innerWidth / 2 - 30, top: window.innerHeight - 24, width: 60, height: 24 } : null);
    if (!from) return undefined;

    // 1) Entrée ---------------------------------------------------------------------------------------------------------------------
    card.dataset.gooey = "on"; // neutralise l’animation d’apparition CSS de la carte (voir globals.css) avant de mesurer sa vraie place
    const to = toRect(card.getBoundingClientRect());
    if (to.width < 8 || to.height < 8) { delete card.dataset.gooey; return undefined; }
    const { color, radius } = cardColors(card);
    const overlay = kind === "dialog" ? card.closest<HTMLElement>(HOST_SELECTOR) : null;
    const DURATION = kind === "popover" ? 520 : 720;

    const entering = buildLayer(from, to, color, radius, false, kind === "popover" ? 4 : 6);
    if (overlay) { entering.layer.style.zIndex = "-1"; overlay.prepend(entering.layer); }
    else { entering.layer.style.zIndex = "2147483000"; document.body.appendChild(entering.layer); }

    const running: Animation[] = [];
    running.push(entering.blob.animate(entering.blobFrames, { duration: DURATION, easing: "linear", fill: "both" })); // les courbes sont dans les images clés
    entering.dropEls.forEach(({ el, frames, delay }) => running.push(el.animate(frames, { duration: DURATION * 0.92, delay, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)", fill: "both" })));
    // La carte n’apparaît que lorsque la goutte a pris sa taille : elle se fond alors dans la forme déjà en place.
    running.push(card.animate([{ opacity: 0 }, { opacity: 1 }], { delay: DURATION * 0.56, duration: DURATION * 0.36, easing: "ease-out", fill: "backwards" }));
    const fade = entering.layer.animate([{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: DURATION + 120, fill: "forwards" });
    running.push(fade);
    fade.onfinish = () => entering.layer.remove();

    // 2) Sortie : la carte (déjà retirée du document) laisse un fantôme qui se résorbe dans le bouton -----------------------------------
    let lastCard = to;
    const track = () => { if (card.isConnected) lastCard = toRect(card.getBoundingClientRect()); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(track) : null;
    observer?.observe(card);
    return () => {
      observer?.disconnect();
      track();
      running.forEach((animation) => animation.cancel());
      entering.layer.remove();
      delete card.dataset.gooey;
      const snapshot = lastCard;
      // En développement (mode strict) React démonte puis remonte aussitôt : tant que la carte est dans le document, ce n’est pas une fermeture.
      queueMicrotask(() => {
        if (card.isConnected) return;
        const target = origin && origin.el.isConnected ? toRect(origin.el.getBoundingClientRect()) : from;
        const leaving = buildLayer(target, snapshot, color, radius, true, kind === "popover" ? 3 : 4);
        leaving.layer.style.zIndex = "2147483000";
        document.body.appendChild(leaving.layer);
        const out = 380;
        leaving.blob.animate(leaving.blobFrames, { duration: out, easing: "cubic-bezier(0.55, 0.05, 0.6, 1)", fill: "both" });
        leaving.dropEls.forEach(({ el, frames, delay }) => el.animate(frames, { duration: out * 0.9, delay, easing: "ease-in", fill: "both" }));
        const done = leaving.layer.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: out + 60, fill: "forwards" });
        done.onfinish = () => leaving.layer.remove();
      });
    };
    // Les options sont lues une seule fois, à l’ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
