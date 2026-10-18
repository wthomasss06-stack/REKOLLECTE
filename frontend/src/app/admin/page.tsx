"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell, { ADMIN_TABS, type AdminTab } from "@/components/admin/AdminShell";
import AuditPanel from "@/components/admin/AuditPanel";
import FeedbackPanel from "@/components/admin/FeedbackPanel";
import MembersPanel from "@/components/admin/MembersPanel";
import OrganizationsPanel from "@/components/admin/OrganizationsPanel";
import OverviewPanel from "@/components/admin/OverviewPanel";
import TrafficPanel from "@/components/admin/TrafficPanel";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { API_BASE as API_URL } from "@/lib/apiBase";
import { normalizeApiError } from "@/lib/errors";
import { setAccessToken } from "@/lib/tokenStore";
import { dayPartWish } from "@/lib/greeting";
import type { PlatformAuditEvent, PlatformFeedback, PlatformMember, PlatformOrganization, PlatformOverview, PlatformTraffic } from "@/types";

const ADMIN_SESSION_KEY = "platform_admin_session";
const ROLE_LABELS: Record<string, string> = { BOSS: "Patron", GERANT: "Gérant", STAFF: "Staff" };
/** Le trafic se rafraîchit seul tant que l'onglet est ouvert et visible : on voit la surveillance du site « vivre ». */
const TRAFFIC_REFRESH_MS = 30_000;

const tabFromHash = (hash: string): AdminTab | null => ADMIN_TABS.find((entry) => entry.hash === hash.replace(/^#/, ""))?.key ?? null;
const isAuthFailure = (error: unknown) => { const status = normalizeApiError(error).status; return status === 401 || status === 403; };

export default function AdminPage() {
  const { confirm, prompt, alert: notify } = useDialog();
  const [logged, setLogged] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [feedback, setFeedback] = useState<PlatformFeedback[]>([]);
  const [audit, setAudit] = useState<PlatformAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [traffic, setTraffic] = useState<PlatformTraffic | null>(null);
  const [trafficDays, setTrafficDays] = useState(7);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [trafficUpdatedAt, setTrafficUpdatedAt] = useState<number | null>(null);
  const trafficRequest = useRef(0);

  const endSession = useCallback(() => { setAccessToken(null); localStorage.removeItem(ADMIN_SESSION_KEY); setLogged(false); }, []);

  /** Charge tout le tableau de bord. Renvoie false si la session n'est plus valable ; les autres erreurs restent visibles dans une bannière sans vider l'écran. */
  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const [o, orgs, ms, fs, auditResponse] = await Promise.all([
        apiClient.get<PlatformOverview>("/admin/overview/"),
        apiClient.get<PlatformOrganization[]>("/admin/organizations/"),
        apiClient.get<PlatformMember[]>("/admin/members/"),
        apiClient.get<PlatformFeedback[]>("/admin/feedback/"),
        apiClient.get<PlatformAuditEvent[]>("/admin/audit/"),
      ]);
      setOverview(o.data); setOrganizations(orgs.data); setMembers(ms.data); setFeedback(fs.data); setAudit(auditResponse.data);
      setLoadError(""); setLogged(true);
      return true;
    } catch (error) {
      if (isAuthFailure(error)) { setLogged(false); return false; }
      setLoadError(normalizeApiError(error).message); setLogged(true);
      return true;
    } finally { setLoading(false); }
  }, []);

  const loadTraffic = useCallback(async (days: number, silent = false) => {
    const request = ++trafficRequest.current;
    if (!silent) setTrafficLoading(true);
    try {
      const response = await apiClient.get<PlatformTraffic>("/admin/traffic/", { params: { days } });
      if (request !== trafficRequest.current) return; // une demande plus récente a pris le relais
      setTraffic(response.data); setTrafficError(""); setTrafficUpdatedAt(Date.now());
    } catch (error) {
      if (request !== trafficRequest.current) return;
      if (isAuthFailure(error)) { endSession(); return; }
      setTrafficError(normalizeApiError(error).message);
    } finally { if (request === trafficRequest.current) setTrafficLoading(false); }
  }, [endSession]);

  // Restauration de la session au chargement.
  useEffect(() => {
    let mounted = true;
    if (localStorage.getItem(ADMIN_SESSION_KEY) !== "1") { setRestoring(false); return () => { mounted = false; }; }
    load().finally(() => { if (mounted) setRestoring(false); });
    return () => { mounted = false; };
  }, [load]);

  // L'onglet ouvert est reflété dans l'adresse (#trafic, #feedbacks…) : on peut le mettre en favori ou l'envoyer.
  useEffect(() => {
    const sync = () => { const next = tabFromHash(window.location.hash); if (next) setTab(next); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const selectTab = useCallback((next: AdminTab) => {
    setTab(next);
    const hash = ADMIN_TABS.find((entry) => entry.key === next)?.hash;
    if (hash) window.history.replaceState(null, "", `#${hash}`);
    window.scrollTo({ top: 0 });
  }, []);

  // Trafic : chargé à l'ouverture de l'onglet, puis toutes les 30 s tant que la page est visible.
  useEffect(() => {
    if (!logged || tab !== "traffic") return;
    void loadTraffic(trafficDays);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadTraffic(trafficDays, true); }, TRAFFIC_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [logged, tab, trafficDays, loadTraffic]);

  const login = async (email: string, password: string) => {
    setLoginError("");
    try {
      const response = await axios.post(`${API_URL}/admin/login/`, { email, password }, { withCredentials: true });
      setAccessToken(response.data.access);
      localStorage.setItem(ADMIN_SESSION_KEY, "1");
    } catch (error) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      setLoginError(status === 400 || status === 401 || status === 403 ? "Identifiants admin invalides." : normalizeApiError(error).message);
      return;
    }
    if (!(await load())) { localStorage.removeItem(ADMIN_SESSION_KEY); setLoginError("Connexion refusée par le serveur. Réessaie dans un instant."); }
  };

  // Au revoir : la déconnexion part dans la boîte (bouton en chargement).
  const logout = async () => {
    await confirm({
      tone: "brand", mood: "wink", title: "À bientôt !",
      message: <><strong>{dayPartWish()}.</strong><br />Ta session administrateur sera fermée sur cet appareil.</>,
      confirmLabel: "Se déconnecter", cancelLabel: "Rester connecté", runningLabel: "Déconnexion…",
      run: async () => { try { await axios.post(`${API_URL}/auth/logout/`, null, { withCredentials: true }); } catch {} endSession(); setTraffic(null); setOverview(null); },
    });
  };

  const failure = (title: string, error: unknown) => notify({ tone: "danger", title, message: normalizeApiError(error).message });

  const deleteOrg = async (id: string) => {
    const org = organizations.find((item) => item.id === id);
    await confirm({
      tone: "danger",
      title: "Supprimer cette entreprise ?",
      message: <>{org ? <><strong>{org.name}</strong> sera supprimée</> : "Cette entreprise sera supprimée"} avec toutes ses données liées. Cette action ne peut pas être annulée.</>,
      confirmLabel: "Supprimer", cancelLabel: "Garder", runningLabel: "Suppression…",
      run: async () => { await apiClient.delete(`/admin/organizations/${id}/`); void load(); },
      successTitle: "Entreprise supprimée", errorTitle: "Suppression impossible",
    });
  };
  const createOrg = async (name: string) => {
    try { await apiClient.post("/admin/organizations/", { name }); void load(); } catch (error) { await failure("Création impossible", error); throw error; }
  };
  const editOrg = async (org: PlatformOrganization) => {
    await prompt({
      tone: "info", mood: "smile", title: "Renommer l’entreprise", label: "Nom de l’entreprise", defaultValue: org.name,
      confirmLabel: "Enregistrer", runningLabel: "Enregistrement…",
      run: async (name) => { if (name !== org.name) { await apiClient.patch(`/admin/organizations/${org.id}/`, { name }); void load(); } },
      errorTitle: "Modification impossible",
    });
  };

  // Désactiver un compte, changer un rôle ou un rattachement a des effets immédiats : on confirme avant d'agir.
  const updateMember = async (member: PlatformMember, patch: Record<string, unknown>) => {
    const name = member.full_name || member.email;
    const apply = async () => { await apiClient.patch(`/admin/members/${member.id}/`, patch); void load(); };
    if (patch.is_active === false) {
      await confirm({ tone: "danger", mood: "annoyed", title: "Désactiver ce compte ?", message: <><strong>{name}</strong> ne pourra plus se connecter tant que le compte reste désactivé.</>, confirmLabel: "Désactiver", runningLabel: "Désactivation…", run: apply, successTitle: "Compte désactivé", errorTitle: "Modification impossible" });
    } else if (typeof patch.role === "string") {
      await confirm({ tone: "warning", mood: "smug", title: "Changer le rôle ?", message: <><strong>{name}</strong> passera de {ROLE_LABELS[member.role] ?? member.role} à <strong>{ROLE_LABELS[patch.role] ?? patch.role}</strong>. Ses droits changent immédiatement.</>, confirmLabel: "Changer le rôle", runningLabel: "Modification…", run: apply, successTitle: "Rôle mis à jour", errorTitle: "Modification impossible" });
    } else if ("organization_id" in patch) {
      const target = organizations.find((item) => item.id === patch.organization_id)?.name;
      await confirm({ tone: "warning", mood: "smug", title: "Changer d’entreprise ?", message: <><strong>{name}</strong> sera rattaché à {target ? <strong>{target}</strong> : "aucune entreprise"}.</>, confirmLabel: "Confirmer", runningLabel: "Modification…", run: apply, successTitle: "Rattachement mis à jour", errorTitle: "Modification impossible" });
    } else {
      try { await apply(); } catch { await notify({ tone: "danger", title: "Oups !", message: "La modification n’a pas pu être enregistrée. Réessaie dans un instant." }); }
    }
  };
  const createMember = async (input: { email: string; organization_id: string; role: string }) => {
    try { await apiClient.post("/admin/members/", input); void load(); } catch (error) { await failure("Ajout impossible", error); throw error; }
  };
  const deleteMember = async (id: string) => {
    const member = members.find((item) => item.id === id);
    await confirm({
      tone: "danger",
      title: "Supprimer ce compte ?",
      message: member ? <>Le compte de <strong>{member.full_name || member.email}</strong> sera supprimé.</> : "Ce compte sera supprimé.",
      confirmLabel: "Supprimer", cancelLabel: "Garder", runningLabel: "Suppression…",
      run: async () => { await apiClient.delete(`/admin/members/${id}/`); void load(); },
      successTitle: "Compte supprimé", errorTitle: "Suppression impossible",
    });
  };
  const updateFeedback = async (item: PlatformFeedback, status: string) => {
    try { await apiClient.patch(`/admin/feedback/${item.id}/`, { status }); void load(); } catch (error) { await failure("Modification impossible", error); }
  };

  const refresh = () => { void load(); if (tab === "traffic") void loadTraffic(trafficDays); };

  if (restoring) return <main className="grid min-h-screen place-items-center bg-canvas"><p className="text-sm text-ink-soft" role="status">Restauration de la session admin…</p></main>;
  if (!logged) return <AdminLogin onSubmit={login} error={loginError} />;

  const newFeedback = feedback.filter((item) => item.status === "new").length;
  const liveNow = traffic?.live_now ?? overview?.site_live_now ?? 0;
  const firstLoad = loading && !overview;

  return (
    <AdminShell tab={tab} onTab={selectTab} newFeedback={newFeedback} liveNow={liveNow} loading={loading || trafficLoading} onRefresh={refresh} onLogout={logout}>
      {loadError && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-error-bg px-4 py-3 text-sm text-error-text">
          <p className="flex min-w-0 items-start gap-2"><WarningCircle size={18} weight="bold" className="mt-px shrink-0" aria-hidden="true" />{loadError}</p>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-current px-4 font-semibold"><ArrowsClockwise size={15} weight="bold" aria-hidden="true" />Réessayer</button>
        </div>
      )}
      {firstLoad ? <div className="h-40 animate-pulse rounded-2xl bg-ink/5" role="status" aria-label="Chargement" />
        : tab === "overview" ? <OverviewPanel data={overview} onOpenTraffic={() => selectTab("traffic")} onOpenFeedback={() => selectTab("feedback")} />
        : tab === "traffic" ? <TrafficPanel data={traffic} days={trafficDays} onDays={setTrafficDays} loading={trafficLoading} error={trafficError} onRetry={() => void loadTraffic(trafficDays)} updatedAt={trafficUpdatedAt} />
        : tab === "organizations" ? <OrganizationsPanel data={organizations} onCreate={createOrg} onEdit={editOrg} onDelete={deleteOrg} />
        : tab === "members" ? <MembersPanel data={members} organizations={organizations} onCreate={createMember} onUpdate={updateMember} onDelete={deleteMember} />
        : tab === "feedback" ? <FeedbackPanel data={feedback} onStatus={updateFeedback} />
        : <AuditPanel data={audit} />}
    </AdminShell>
  );
}
