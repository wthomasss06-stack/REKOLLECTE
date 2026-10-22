"use client";
import { useState } from "react";
import { ChatCircleDots, Check, X } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api";
import { GooeyPanel } from "@/lib/gooey";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("observation");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 3) return;
    setState("sending");
    try {
      await apiClient.post("/feedback/", { category, message: message.trim(), contact_email: contactEmail.trim(), page_url: window.location.href });
      setMessage(""); setContactEmail(""); setState("sent");
    } catch { setState("error"); }
  };
  return <div className="fixed bottom-5 right-5 z-40">
    {open && <GooeyPanel className="mb-3 w-[min(350px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Votre retour compte</p><h2 className="mt-1 font-heading text-lg font-bold text-ink">Une idée, une erreur ?</h2></div><button onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-1 text-ink-soft hover:bg-canvas"><X size={18} /></button></div>{state === "sent" ? <div className="rounded-xl bg-success-bg p-4 text-sm text-success-text"><Check className="mb-2" size={22} weight="bold" />Merci, votre retour a bien été envoyé.</div> : <form onSubmit={submit} className="space-y-3"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink"><option value="observation">Observation</option><option value="improvement">Suggestion d’amélioration</option><option value="bug">Signaler une erreur</option><option value="other">Autre</option></select><textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={3} rows={4} placeholder="Décrivez votre retour…" className="w-full resize-none rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" /><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email pour être recontacté (facultatif)" className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />{state === "error" && <p className="text-xs text-error-text">Envoi impossible. Réessayez dans un instant.</p>}<button disabled={state === "sending"} className="w-full rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{state === "sending" ? "Envoi…" : "Envoyer le retour"}</button></form>}</GooeyPanel>}
    <button onClick={() => { setOpen((value) => !value); setState("idle"); }} className="grid h-12 w-12 place-items-center rounded-full bg-cta text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-cta-hover" aria-label="Donner mon avis" title="Donner mon avis"><ChatCircleDots size={21} weight="bold" /></button>
  </div>;
}
