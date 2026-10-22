"use client";
import { useRef } from "react";
import { X } from "@phosphor-icons/react";

import { useGooey } from "@/lib/gooey";

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return <ModalCard title={title} description={description} onClose={onClose} wide={wide}>{children}</ModalCard>;
}

/** Carte montée seulement à l’ouverture : c’est elle qui porte l’effet gooey (sortie du bouton cliqué, retour dans ce bouton à la fermeture). */
function ModalCard({ title, description, onClose, children, wide }: { title: string; description?: string; onClose: () => void; children: React.ReactNode; wide: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  useGooey(cardRef);
  return (
    <div data-goo-host className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div ref={cardRef} className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="font-heading text-xl font-bold text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}</div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-ink-soft hover:bg-canvas hover:text-ink"><X size={20} weight="bold" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
