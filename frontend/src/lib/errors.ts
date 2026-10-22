import axios from "axios";

export type AppError = { message: string; code: string; retryable: boolean; status: number | null; feature?: string; requiredPlan?: string };

export function normalizeApiError(error: unknown): AppError {
  if (!axios.isAxiosError(error)) return { message: "Une erreur inattendue est survenue.", code: "unknown", retryable: false, status: null };
  const status = error.response?.status ?? null;
  const payload = error.response?.data?.error;
  // Erreur de plan : { code: "plan_required", feature, required_plan } (voir backend apps/billing/exceptions.py).
  const planRequired = error.response?.data?.code === "plan_required";
  const transientRefreshFailure = (error as typeof error & { transient?: boolean }).transient === true;
  const code = planRequired
    ? "plan_required"
    : transientRefreshFailure
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
      ? "La connexion au serveur est temporairement indisponible. Votre session n’a pas pu être vérifiée ; vérifiez le réseau puis réessayez."
      : status === 401
      ? "La session a expiré. Reconnectez-vous pour continuer."
      : status === 403
        ? "Vous n’avez pas l’autorisation d’effectuer cette action."
        : code === "timeout"
          ? "Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez."
          : code === "network"
            ? "Le serveur est injoignable. Vérifiez votre connexion Internet puis réessayez."
            : status !== null && status >= 500
              ? "Le service est temporairement indisponible. Réessayez dans quelques instants."
              : "La requête n’a pas pu être traitée."),
    code,
    retryable: payload?.retryable ?? (transientRefreshFailure || status === null || Boolean(status && status >= 500)),
    status,
    ...(planRequired ? { feature: error.response?.data?.feature, requiredPlan: error.response?.data?.required_plan } : {}),
  };
}
