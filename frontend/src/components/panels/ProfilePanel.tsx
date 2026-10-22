"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";

import CloudinaryImageUploader from "@/components/CloudinaryImageUploader";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { roleLabel } from "@/lib/roles";

/** Paramètres > Moi : le profil de la personne connectée (nom, prénoms, photo). Le rôle et l’e-mail se lisent seulement :
 * le rôle ne change que par invitation, et l’e-mail est celui du compte de connexion. */
export default function ProfilePanel() {
  const { user, refreshUser } = useAuthContext();
  const [name, setName] = useState(user?.full_name ?? "");
  const [avatar, setAvatar] = useState(user?.avatar_url ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  if (!user) return null;

  const cleanName = name.trim();
  const dirty = cleanName !== (user.full_name ?? "").trim() || avatar !== (user.avatar_url ?? "");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cleanName || !dirty || state === "saving") return;
    setState("saving");
    try {
      await apiClient.patch("/auth/me/", { full_name: cleanName, avatar_url: avatar });
      await refreshUser(); // le header et le reste de l’espace reprennent le nouveau nom et la nouvelle photo
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <form onSubmit={save} className="max-w-xl space-y-6">
      <p className="text-sm text-ink-soft">Votre nom et votre photo apparaissent dans l’espace de votre établissement (en haut à droite, équipe, journal).</p>
      <CloudinaryImageUploader value={avatar} onChange={(url) => { setAvatar(url); setState("idle"); }} label="Photo de profil" uploadKind="avatar" />
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-ink">Nom et prénoms</label>
        <input
          id="profile-name"
          value={name}
          onChange={(event) => { setName(event.target.value); setState("idle"); }}
          maxLength={255}
          autoComplete="name"
          placeholder="Ex. Kouassi Awa"
          className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-cta"
        />
      </div>
      <dl className="grid gap-3 rounded-xl border border-border bg-canvas p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs text-ink-soft">E-mail du compte</dt><dd className="truncate font-medium text-ink">{user.email}</dd></div>
        <div><dt className="text-xs text-ink-soft">Rôle</dt><dd className="font-medium text-ink">{roleLabel(user.role)}{user.organization_name ? ` · ${user.organization_name}` : ""}</dd></div>
      </dl>
      {state === "error" && <p role="alert" className="text-sm font-medium text-error-text">Enregistrement impossible. Réessayez dans un instant.</p>}
      {state === "saved" && <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-success-text"><Check size={16} weight="bold" /> Profil enregistré.</p>}
      <button type="submit" disabled={!cleanName || !dirty || state === "saving"} className="rounded-full bg-cta px-6 py-2.5 text-sm font-semibold text-cta-ink disabled:opacity-50">
        {state === "saving" ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
