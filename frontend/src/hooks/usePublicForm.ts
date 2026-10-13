"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { API_BASE } from "@/lib/apiBase";
import { db } from "@/lib/db";
import { waitForServer } from "@/lib/serverWake";
import type { PublicFormData } from "@/types";

const FETCH_TIMEOUT_MS = 6_000; // le kiosque ne doit jamais rester bloqué à charger
const WAKE_FETCH_TIMEOUT_MS = 15_000; // juste après le réveil, le premier appel peut encore être lent
const WAKE_ROUNDS = 3;

/**
 * - `waking` : appareil en ligne, rien en cache, serveur muet (Render dort) → on attend son réveil et on réessaie seul.
 * - `never_cached` : appareil hors ligne et formulaire jamais chargé.
 * - `unavailable` : le serveur n'a pas répondu après le réveil (bouton « Réessayer »).
 */
export type PublicFormStatus = "loading" | "waking" | "ready" | "not_found" | "never_cached" | "unavailable";

type FetchResult = { kind: "ok"; data: PublicFormData } | { kind: "not_found" } | { kind: "unavailable" };

/**
 * Seul un 404 est une réponse définitive (QR désactivé ou inconnu). Un 5xx du proxy, un 429, une page HTML d'attente
 * ou un timeout ne disent RIEN du QR Code : ce n'est jamais « QR invalide » (un visiteur qui scanne pendant que le
 * serveur dort ne doit pas lire que le QR Code est cassé).
 */
async function fetchForm(qrToken: string, timeout: number): Promise<FetchResult> {
  try {
    const res = await axios.get<PublicFormData>(`${API_BASE}/public/forms/${encodeURIComponent(qrToken)}/`, {
      timeout,
      validateStatus: () => true,
    });
    if (res.status === 404) return { kind: "not_found" };
    const body = res.data as Partial<PublicFormData> | string | null;
    if (res.status === 200 && body && typeof body === "object" && Array.isArray(body.fields_schema)) {
      return { kind: "ok", data: body as PublicFormData };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * Formulaire visiteur "kiosque" : tente le réseau avec un timeout court, puis
 * retombe sur le cache local (IndexedDB) si l'appareil est hors-ligne ou si le serveur ne répond pas.
 * Sans cache, un serveur qui dort est attendu (réveil automatique) plutôt que présenté comme une erreur.
 */
export function usePublicForm(qrToken: string) {
  const [data, setData] = useState<PublicFormData | null>(null);
  const [status, setStatus] = useState<PublicFormStatus>("loading");
  const [fromCache, setFromCache] = useState(false);
  const [round, setRound] = useState(0);

  const retry = useCallback(() => setRound((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function show(form: PublicFormData) {
      if (cancelled) return;
      setData(form);
      setFromCache(false);
      setStatus("ready");
      try {
        await db.formCache.put({
          qr_token: qrToken,
          organization_name: form.organization_name,
          organization_logo_url: form.organization_logo_url || "",
          fields_schema: form.fields_schema,
          cached_at: new Date().toISOString(),
        });
      } catch {
        // Cache local indisponible (navigation privée, quota) : le formulaire s'affiche quand même.
      }
    }

    async function load() {
      setStatus("loading");
      let result = await fetchForm(qrToken, FETCH_TIMEOUT_MS);
      if (cancelled) return;
      if (result.kind === "ok") return show(result.data);
      if (result.kind === "not_found") return setStatus("not_found");

      let cached = null;
      try {
        cached = await db.formCache.get(qrToken);
      } catch {
        cached = null;
      }
      if (cancelled) return;
      if (cached) {
        setData({
          organization_name: cached.organization_name,
          organization_logo_url: cached.organization_logo_url || "",
          visit_reasons: [],
          fields_schema: cached.fields_schema as PublicFormData["fields_schema"],
          form_id: "cached",
          form_title: "Formulaire visiteur",
          access_point_id: null,
          access_point_name: "Point d’accueil hors ligne",
        });
        setFromCache(true);
        setStatus("ready");
        return;
      }

      // Rien en cache. Appareil hors ligne : inutile d'attendre. En ligne mais serveur muet : il se réveille.
      if (typeof navigator !== "undefined" && navigator.onLine === false) return setStatus("never_cached");
      setStatus("waking");
      for (let attempt = 0; attempt < WAKE_ROUNDS; attempt += 1) {
        const alive = await waitForServer();
        if (cancelled) return;
        if (!alive) break;
        result = await fetchForm(qrToken, WAKE_FETCH_TIMEOUT_MS);
        if (cancelled) return;
        if (result.kind === "ok") return show(result.data);
        if (result.kind === "not_found") return setStatus("not_found");
      }
      setStatus("unavailable");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [qrToken, round]);

  return { data, status, fromCache, retry };
}
