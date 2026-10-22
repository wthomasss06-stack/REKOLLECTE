"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";

import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";

const FIELD = "w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-cta";

/** Paramètres > Votre avis : le formulaire de retour (avant : bouton flottant, qui gênait dans l’app). Même route que sur le site public. */
export default function FeedbackPanel() {
  const { user } = useAuthContext();
  const [category, setCategory] = useState("observation");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 3 || state === "sending") return;
    setState("sending");
    try {
      await apiClient.post("/feedback/", { category, message: message.trim(), contact_email: contactEmail.trim(), page_url: `${window.location.origin}${window.location.pathname}` });
      setMessage("");
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="max-w-xl space-y-4">
        <div className="rounded-xl bg-success-bg p-5 text-sm text-success-text"><Check className="mb-2" size={22} weight="bold" />Merci, votre avis a bien été envoyé. Il nous aide à améliorer REKOLLECTE.</div>
        <button type="button" onClick={() => setState("idle")} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Envoyer un autre avis</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <p className="text-sm text-ink-soft">Une idée, une erreur, une remarque ? Dites-nous ce que vous en pensez.</p>
      <div>
        <label htmlFor="feedback-category" className="mb-1.5 block text-sm font-medium text-ink">Type de retour</label>
        <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value)} className={FIELD}>
          <option value="observation">Observation</option>
          <option value="improvement">Suggestion d’amélioration</option>
          <option value="bug">Signaler une erreur</option>
          <option value="other">Autre</option>
        </select>
      </div>
      <div>
        <label htmlFor="feedback-message" className="mb-1.5 block text-sm font-medium text-ink">Votre message</label>
        <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} required minLength={3} rows={5} placeholder="Décrivez votre retour…" className={`${FIELD} resize-none`} />
      </div>
      <div>
        <label htmlFor="feedback-email" className="mb-1.5 block text-sm font-medium text-ink">E-mail pour vous répondre <span className="font-normal text-ink-soft">(facultatif)</span></label>
        <input id="feedback-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Laissez vide pour rester anonyme" className={FIELD} />
      </div>
      {state === "error" && <p role="alert" className="text-sm font-medium text-error-text">Envoi impossible. Réessayez dans un instant.</p>}
      <button type="submit" disabled={state === "sending" || message.trim().length < 3} className="rounded-full bg-cta px-6 py-2.5 text-sm font-semibold text-cta-ink disabled:opacity-50">
        {state === "sending" ? "Envoi…" : "Envoyer mon avis"}
      </button>
    </form>
  );
}
