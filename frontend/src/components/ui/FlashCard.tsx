"use client";
import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";

import Mood, { type MoodName } from "@/components/ui/moods";

export type FlashTone = "brand" | "success" | "danger" | "warning" | "info";

/** Humeur par défaut de chaque ton — surchargeable via la prop `mood`. */
export const TONE_MOOD: Record<FlashTone, MoodName> = {
  brand: "smile",
  success: "smile",
  danger: "sceptical",
  warning: "confused",
  info: "smug",
};

/**
 * Carte de message façon “flash message” : teinte douce qui s’estompe vers la surface,
 * humeur posée sur une ligne d’horizon dessinée à la main, gros titre coloré, actions en pilule.
 * Purement visuelle : la logique (promesses, focus, clavier) vit dans DialogProvider.
 */
export default function FlashCard({
  tone,
  mood,
  title,
  titleId,
  message,
  messageId,
  onClose,
  closeDisabled = false,
  children,
}: {
  tone: FlashTone;
  mood?: MoodName;
  title: ReactNode;
  titleId?: string;
  message?: ReactNode;
  messageId?: string;
  onClose?: () => void;
  closeDisabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="qr-flash" data-tone={tone}>
      {onClose && (
        <button type="button" onClick={onClose} disabled={closeDisabled} aria-label="Fermer" className="qr-flash__close">
          <X size={18} weight="bold" />
        </button>
      )}
      <div className="qr-flash__stage" aria-hidden="true">
        <div className="qr-flash__mood"><Mood name={mood ?? TONE_MOOD[tone]} className="qr-flash__svg" /></div>
        <span className="qr-flash__shadow" />
        <svg className="qr-flash__ground" viewBox="0 0 340 6" preserveAspectRatio="none" focusable="false">
          <path d="M0 3.2 C 38 1.8, 76 4.4, 118 3 S 196 1.9, 238 3.4 S 306 2.4, 340 3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="qr-flash__body">
        <h2 id={titleId} className="qr-flash__title">{title}</h2>
        {message && <div id={messageId} className="qr-flash__message">{message}</div>}
        {children}
      </div>
    </div>
  );
}
