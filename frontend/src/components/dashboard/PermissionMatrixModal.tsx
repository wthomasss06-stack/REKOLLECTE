"use client";

import { Info } from "@phosphor-icons/react";
import { useState } from "react";

import Modal from "@/components/ui/Modal";
import { PERMISSION_MATRIX } from "@/lib/roles";

const columns = [
  { key: "boss" as const, label: "Patron" },
  { key: "gerant" as const, label: "Gérant" },
  { key: "staff" as const, label: "Agent" },
];

export default function PermissionMatrixModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Afficher la matrice des permissions de l’équipe"
        title="Voir la matrice des permissions"
        className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-ink-soft transition hover:border-ink hover:bg-canvas hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
      >
        <Info size={17} weight="bold" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Matrice des permissions"
        description="Les accès de chaque rôle dans l’établissement. Cette vue est informative ; les droits réels sont contrôlés par l’API."
        wide
      >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[680px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas">
                <th scope="col" className="p-3 font-semibold text-ink">Action</th>
                {columns.map((column) => (
                  <th scope="col" key={column.key} className="p-3 text-center font-semibold text-ink">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th scope="row" className="p-3 font-normal text-ink-soft">{row.label}</th>
                  {columns.map((column) => {
                    const allowed = row[column.key];
                    return (
                      <td key={column.key} className="p-3 text-center">
                        <span className={allowed ? "font-semibold text-success-text" : "text-ink-soft/45"} aria-label={allowed ? "Autorisé" : "Non autorisé"}>
                          {allowed ? "Oui" : "Non"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          Le Patron contrôle les actions sensibles. Le Gérant gère les opérations courantes et peut inviter un Agent. L’Agent consulte le registre et assure l’accueil sans configurer l’établissement.
        </p>
      </Modal>
    </>
  );
}
