"use client";

import { useCallback, useEffect, useState } from "react";
import { AppleLogo, FacebookLogo, GoogleLogo } from "@phosphor-icons/react";

import { useAuthErrorFromUrl, enabledProviders } from "@/components/auth/SocialButtons";
import { apiClient } from "@/lib/api";

type Identity = { provider: string; email: string; linked_at: string; last_login_at: string | null };

const LABELS: Record<string, { name: string; icon: React.ReactNode }> = {
  google: { name: "Google", icon: <GoogleLogo size={20} weight="bold" /> },
  facebook: { name: "Facebook", icon: <FacebookLogo size={20} weight="fill" /> },
  apple: { name: "Apple", icon: <AppleLogo size={20} weight="fill" /> },
};

/** Paramètres > Connexion : les façons de se connecter à CE compte. Lier ici est la voie sûre
 * quand Facebook ne donne pas d’e-mail ou qu’Apple le masque : aucun rapprochement par e-mail. */
export default function ConnexionSettingsPage() {
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlError = useAuthErrorFromUrl();

  const load = useCallback(() => {
    apiClient
      .get<{ identities: Identity[] }>("/auth/identities/")
      .then((res) => setIdentities(res.data.identities))
      .catch(() => setError("Impossible de charger tes méthodes de connexion."));
  }, []);
  useEffect(load, [load]);

  const link = async (provider: string) => {
    setError(null);
    try {
      const { data } = await apiClient.post<{ url: string }>(`/auth/${provider}/link/`);
      window.location.assign(data.url); // le cookie « nonce » est posé par cette réponse
    } catch {
      setError("Impossible de démarrer la liaison. Réessaie.");
    }
  };

  const unlink = async (provider: string) => {
    setError(null);
    try {
      await apiClient.delete(`/auth/identities/${provider}/`);
      load();
    } catch (requestError: unknown) {
      const message = (requestError as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
      setError(message || "Impossible de retirer cette méthode.");
    }
  };

  const linked = new Set((identities || []).map((i) => i.provider));
  const linkable = enabledProviders().filter((p) => p !== "google" && !linked.has(p));

  return (
    <section className="max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink">Méthodes de connexion</h2>
        <p className="text-sm text-ink-soft">Toutes ces méthodes ouvrent le même compte : aucun doublon, aucun nouvel espace.</p>
      </div>

      {(error || urlError) && <p className="text-sm font-medium text-error-text">{error || urlError}</p>}

      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {(identities || []).map((identity) => (
          <li key={identity.provider} className="flex items-center gap-3 p-4">
            <span className="text-ink">{LABELS[identity.provider]?.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{LABELS[identity.provider]?.name || identity.provider}</p>
              {identity.email && <p className="truncate text-xs text-ink-soft">{identity.email}</p>}
            </div>
            <button
              type="button"
              disabled={(identities || []).length <= 1}
              onClick={() => unlink(identity.provider)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              title={(identities || []).length <= 1 ? "C’est ta seule méthode de connexion" : undefined}
            >
              Retirer
            </button>
          </li>
        ))}
        {identities && identities.length === 0 && <li className="p-4 text-sm text-ink-soft">Ton compte sera relié à ta prochaine connexion.</li>}
      </ul>

      {linkable.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {linkable.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => link(provider)}
              className="inline-flex items-center gap-2 rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-cta-ink transition hover:bg-cta-hover"
            >
              {LABELS[provider]?.icon} Lier {LABELS[provider]?.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
