"use client";

import Modal from "@/components/ui/Modal";
import ClientHistoryPanel from "./ClientHistoryPanel";

/**
 * Historique complet d'un client, ouvert en un clic depuis la liste REKOLLECTE+ —
 * sans quitter la liste. `clientId` nul ferme le modal (Modal.open devient
 * false), ce qui évite de garder un second état "open" à synchroniser.
 */
export default function ClientHistoryModal({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  return (
    <Modal open={clientId !== null} onClose={onClose} title="Historique client" wide>
      {clientId && <ClientHistoryPanel clientId={clientId} />}
    </Modal>
  );
}
