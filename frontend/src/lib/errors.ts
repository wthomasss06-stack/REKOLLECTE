import axios from "axios";

export type AppError = { message: string; code: string; retryable: boolean; status: number | null };

export function normalizeApiError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) return { message: "Une erreur inattendue est survenue.", code: "unknown", retryable: false, status: null };
  const status = error.response?.status ?? null;
  const payload = error.response?.data?.error;
  const transientRefreshFailure = (error as typeof error & { transient?: boolean }).transient === true;
  const code = transientRefreshFailure
    ? "network"
    : status === 401
      ? "auth"
      : status === 403
        ? "permission"
        : status === null
    ? error.code === "ECONNABORTED" ? "timeout" : "network"
    : payload?.code || `http_${status}`;
  return {
    message: payload?.message || (transientRefreshFailure
      ? "La connexion au serveur est temporairement indisponible. Ta session n’a pas pu être vérifiée ; vérifie le réseau puis réessaie."
      : status === 401
      ? "La session a expiré. Reconnecte-toi pour continuer."
      : status === 403
        ? "Tu n’as pas l’autorisation d’effectuer cette action."
        : code === "timeout"
          ? "Le serveur met trop de temps à répondre. Vérifie ta connexion puis réessaie."
          : code === "network"
            ? "Le serveur est injoignable. Vérifie ta connexion Internet puis réessaie."
            : status !== null && status >= 500
              ? "Le service est temporairement indisponible. Réessaie dans quelques instants."
              : "La requête n’a pas pu être traitée."),
    code,
    retryable: payload?.retryable ?? (transientRefreshFailure || status === null || Boolean(status && status >= 500)),
    status,
  };
}
