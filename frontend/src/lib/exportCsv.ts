import { apiClient } from "@/lib/api";

/** `exit` : export de SORTIE (toutes les données, jamais verrouillé par un plan) ; sinon export récurrent, selon le plan. */
export async function exportAllToCSV(orgName: string, options: { exit?: boolean } = {}): Promise<void> {
  const response = await apiClient.get<Blob>("/checkins/export/", { responseType: "blob", params: options.exit ? { purpose: "exit" } : undefined });
  const disposition = String(response.headers["content-disposition"] || "");
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || `registre_${orgName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
