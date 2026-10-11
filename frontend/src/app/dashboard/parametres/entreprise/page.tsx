"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CloudinaryImageUploader from "@/components/CloudinaryImageUploader";
import { useDialog } from "@/components/ui/DialogProvider";
import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import { apiClient } from "@/lib/api";
import type { Organization, UserProfile } from "@/types";

export default function EntreprisePage() {
  const router = useRouter();
  const { confirm } = useDialog();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [loadFailed, setLoadFailed] = useState(false);
  const load = useCallback(() => { setLoadFailed(false); Promise.all([apiClient.get<UserProfile>("/auth/me/"), apiClient.get<Organization>("/org/me/")]).then(([u, o]) => { setUser(u.data); setOrg(o.data); setName(o.data.name); setLogo(o.data.logo_url || ""); }).catch(() => setLoadFailed(true)); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const { data } = await apiClient.patch<Organization>("/org/me/", { name, logo_url: logo }); setOrg(data); setSaved(true); setTimeout(() => setSaved(false), 1800); }
    catch { setError("Seul le patron peut modifier le nom et le logo."); }
    finally { setBusy(false); }
  };

  // Zone sensible : confirmation, requête dans la boîte, carte d'erreur avec « Réessayer » si elle échoue.
  const lifecycle = async (action: "suspend" | "delete" | "leave") => {
    const request = async () => {
      if (action === "leave") await apiClient.post("/auth/me/deactivate/");
      else if (action === "suspend") {
        await apiClient.patch("/org/me/lifecycle/", { is_suspended: true });
        try { const { data } = await apiClient.get<Organization>("/org/me/"); setOrg(data); } catch { /* l’affichage se rafraîchira au prochain chargement */ }
      } else await apiClient.delete("/org/me/lifecycle/");
    };
    const copy = action === "leave"
      ? { tone: "danger" as const, mood: "annoyed" as const, title: "Quitter l’équipe ?", message: "À ta prochaine connexion, ton accès ne sera plus disponible.", confirmLabel: "Quitter" }
      : action === "suspend"
        ? { tone: "warning" as const, mood: undefined, title: "Suspendre l’entreprise ?", message: "Les parcours visiteurs et l’accès de l’équipe seront coupés.", confirmLabel: "Suspendre" }
        : { tone: "danger" as const, mood: undefined, title: "Supprimer l’entreprise ?", message: "Toutes les données liées à l’entreprise seront supprimées. Cette action ne peut pas être annulée.", confirmLabel: "Supprimer" };
    const ok = await confirm({ ...copy, runningLabel: "Un instant…", run: request, errorTitle: "Action impossible", successTitle: action === "suspend" ? "Entreprise suspendue" : undefined });
    if (ok && action !== "suspend") router.push("/");
  };

  if (!user || !org) return loadFailed ? <AutoRetry variant="form" onRetry={load} label="Chargement des réglages…" /> : <Loader fullScreen={false} variant="form" label="Chargement des réglages…" />;
  const boss = user.role === "BOSS";
  return <div className="max-w-2xl space-y-6"><div><h2 className="font-heading text-xl font-bold text-ink">Entreprise</h2><p className="mt-1 text-sm text-ink-soft">Identité de l’établissement et actions liées à ton compte.</p></div><form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-surface p-5"><div><label className="mb-1.5 block text-sm font-medium text-ink">Nom de l’entreprise</label><input disabled={!boss} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-ink disabled:opacity-60" /></div><CloudinaryImageUploader value={logo} onChange={setLogo} disabled={!boss} />{boss ? <button disabled={busy} className="rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saved ? "Enregistré" : busy ? "Enregistrement…" : "Enregistrer les changements"}</button> : <p className="rounded-lg bg-canvas p-3 text-xs text-ink-soft">Seul le patron peut changer le nom et le logo de l’entreprise.</p>}</form><section className="rounded-2xl border border-border bg-surface p-5"><h3 className="font-semibold text-ink">Zone sensible</h3><p className="mt-1 text-sm text-ink-soft">Ces actions sont irréversibles ou coupent l’accès de l’équipe.</p><div className="mt-4 flex flex-wrap gap-3">{boss && <><button onClick={() => void lifecycle("suspend")} className="rounded-full border border-border px-4 py-2.5 text-sm text-ink">Suspendre l’entreprise</button><button onClick={() => void lifecycle("delete")} className="rounded-full border border-error-text px-4 py-2.5 text-sm text-error-text">Supprimer l’entreprise</button></>}{!boss && <button onClick={() => void lifecycle("leave")} className="rounded-full border border-error-text px-4 py-2.5 text-sm text-error-text">Quitter et désactiver mon compte</button>}</div></section>{error && <p className="text-sm text-error-text">{error}</p>}</div>;
}
