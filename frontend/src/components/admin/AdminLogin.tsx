"use client";
import { useState } from "react";
import Link from "next/link";
import { CircleNotch, Eye, EyeSlash, LockKey, WarningCircle } from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import { inputClass, primaryButton } from "@/components/admin/ui";

/** Porte de l'administration : un seul compte, configuré côté serveur. Le logo ramène à l'accueil du site. */
export default function AdminLogin({ onSubmit, error }: { onSubmit: (email: string, password: string) => Promise<void>; error: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try { await onSubmit(email, password); } finally { setBusy(false); }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-subtle sm:p-8" aria-busy={busy}>
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="REKOLLECTE, retour à l’accueil">
          <span aria-hidden="true"><Logo size={34} /></span>
          <span aria-hidden="true" className="font-heading text-[15px] font-bold tracking-tight text-ink">REKOLLECTE</span>
        </Link>
        <p className="mt-8 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft"><LockKey size={14} weight="bold" aria-hidden="true" />Administration plateforme</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Espace AKATech</h1>
        <p className="mt-2 text-sm text-ink-soft">Accès réservé à l’équipe qui administre la plateforme.</p>
        <div className="mt-6 space-y-3">
          <label className="block"><span className="sr-only">Email admin</span><input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email admin" className={inputClass} /></label>
          <label className="relative block"><span className="sr-only">Mot de passe admin</span>
            <input type={visible ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe admin" className={`${inputClass} pr-12`} />
            <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={visible} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink">{visible ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}</button>
          </label>
          {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-error-bg px-3 py-2.5 text-sm text-error-text"><WarningCircle size={18} weight="bold" className="mt-px shrink-0" aria-hidden="true" />{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>{busy ? <><CircleNotch size={18} weight="bold" className="animate-spin" aria-hidden="true" />Connexion…</> : "Ouvrir l’administration"}</button>
        </div>
      </form>
    </main>
  );
}
