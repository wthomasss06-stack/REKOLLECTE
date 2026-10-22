"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

import { useGooey } from "@/lib/gooey";
import { lockScroll } from "@/lib/scrollLock";

/** Fenêtre d’une rubrique (réglages, REKOLLECTE) : bloque le défilement de la page, piège le focus, se ferme avec Échap
 * ou un clic dans le fond, et rend le focus à la ligne qui l’a ouverte. Sur téléphone : feuille qui monte du bas (voir globals.css).
 * Une autre fenêtre ouverte PAR-DESSUS (confirmation, formulaire d’une rubrique) garde la main : Échap et Tab ne la concernent pas. */
/** `comfort` : champs et boutons >= 44 px sur tablette/téléphone (classe .touch-comfort de globals.css), à reporter ici car la fenêtre
 * est rendue à la racine du document (portail) et sort donc de la page qui l’a ouverte. */
export default function SettingsModal({ title, onClose, wide = false, comfort = false, children }: { title: string; onClose: () => void; wide?: boolean; comfort?: boolean; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlockScroll = lockScroll();
    closeRef.current?.focus();

    // La fenêtre la plus récente (dernière dans le document) est celle qui reçoit les touches.
    const isTopmost = () => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
      return dialogs[dialogs.length - 1] === dialogRef.current;
    };

    function onKeyDown(event: KeyboardEvent) {
      if (!isTopmost()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      unlockScroll();
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  useGooey(dialogRef); // la fenêtre sort du bouton cliqué (rangée de réglage, carte REKOLLECTE…) et s’y résorbe à la fermeture

  if (typeof document === "undefined") return null;
  // Portail : la fenêtre ne dépend ni des marges (space-y), ni des transformations, ni du défilement de la page qui l’ouvre.
  return createPortal(
    <div className={`rk-modal-backdrop${comfort ? " touch-comfort" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`rk-modal${wide ? " rk-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="rk-modal-title">
        <header className="rk-modal__header">
          <h2 id="rk-modal-title">{title}</h2>
          <button ref={closeRef} type="button" className="rk-modal__close" onClick={onClose} aria-label="Fermer la fenêtre"><X size={20} weight="bold" /></button>
        </header>
        <div className="rk-modal__body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
