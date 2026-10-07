"use client";

import { useState } from "react";

import Modal from "@/components/ui/Modal";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { notifyKarnetChanged } from "@/lib/karnet";
import type { KarnetClientDetail } from "@/types";

const field = "min-h-[44px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink outline-none focus:border-cta";

/**
 * Ajout manuel d'un client. Le serveur retrouve une fiche existante par e-mail ou par téléphone
 * (0701020304 = +225 07 01 02 03 04) : dans ce cas on ouvre la fiche existante au lieu d'en créer une 2e.
 */
export default function ClientFormModal({ open, onClose, onSaved }: {
  open: boolean;
  onClose: () => void;
  onSaved: (client: KarnetClientDetail, alreadyExisted: boolean) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setFullName(""); setPhone(""); setEmail(""); setError(""); };
  const close = () => { reset(); onClose(); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) { setError("Le nom du client est obligatoire."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await apiClient.post<KarnetClientDetail>("/karnet/clients/", { full_name: fullName.trim(), phone: phone.trim(), email: email.trim() });
      notifyKarnetChanged();
      reset();
      onSaved(res.data, res.status === 200);
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Ajouter un client" description="Le téléphone permet de le retrouver ensuite : le même numéro n’ouvre jamais deux fiches.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-ink">Nom complet *
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus autoComplete="off" className={`mt-1.5 ${field}`} />
        </label>
        <label className="block text-sm font-medium text-ink">Téléphone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" placeholder="07 01 02 03 04" className={`mt-1.5 ${field}`} />
        </label>
        <label className="block text-sm font-medium text-ink">E-mail
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="off" className={`mt-1.5 ${field}`} />
        </label>
        {error && <p role="alert" className="text-sm font-medium text-error-text">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button type="button" onClick={close} className="min-h-[44px] rounded-full border border-border px-5 text-sm font-medium text-ink-soft hover:text-ink">Annuler</button>
          <button type="submit" disabled={saving} className="min-h-[44px] rounded-full bg-cta px-6 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </Modal>
  );
}
