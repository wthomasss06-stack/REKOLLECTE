"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartLineUp, Clock, MagnifyingGlass, TrendUp, UsersThree } from "@phosphor-icons/react";
import { format, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import CheckInsTable from "@/components/CheckInsTable";
import { apiClient } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { exportAllToCSV } from "@/lib/exportCsv";
import type { CheckInRecord, CheckInStats, FormField, Organization, PaginatedResponse, UserProfile } from "@/types";

type ViewState = "loading" | "error" | "ready";
interface FormTemplateResponse { fields_schema: FormField[]; }

type Period = "all" | "today" | "7d" | "30d";
const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "today", label: "Aujourd’hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
];

/** Début de la période choisie, au format AAAA-MM-JJ attendu par l'API (`from`). Undefined = pas de borne. */
function periodStart(period: Period): string | undefined {
  const now = new Date();
  if (period === "today") return format(now, "yyyy-MM-dd");
  if (period === "7d") return format(subDays(now, 6), "yyyy-MM-dd");
  if (period === "30d") return format(subDays(now, 29), "yyyy-MM-dd");
  return undefined;
}

const tooltipStyle = { backgroundColor: "#fffdf8", border: "1px solid #e6e0d5", borderRadius: 12, color: "#1c1b19", fontSize: 12 };

export default function RegistrePage() {
  const [schema, setSchema] = useState<FormField[]>([]);
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [karnetEnabled, setKarnetEnabled] = useState(false);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [loadError, setLoadError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [listBusy, setListBusy] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const firstLoad = useRef(true);
  const listRequest = useRef(0);
  const filtered = debouncedQuery !== "" || period !== "all";

  // Ce qui ne bouge presque jamais (formulaire, établissement, profil) n'est chargé qu'à l'ouverture et au retour sur l'onglet ;
  // seules la liste et les statistiques sont rafraîchies toutes les 30 s (avant : 5 requêtes à chaque cycle).
  const loadStatic = useCallback(async () => {
    const [tpl, org, me] = await Promise.all([
      apiClient.get<FormTemplateResponse>("/form-template/"),
      apiClient.get<Organization>("/org/me/"),
      apiClient.get<UserProfile>("/auth/me/"),
    ]);
    setSchema(tpl.data.fields_schema); setOrgName(org.data.name); setKarnetEnabled(Boolean(org.data.capabilities?.karnet)); setUser(me.data);
  }, []);

  const loadStats = useCallback(async () => {
    const summary = await apiClient.get<CheckInStats>("/checkins/stats/");
    setStats(summary.data);
  }, []);

  const loadList = useCallback(async () => {
    const requestId = ++listRequest.current;
    setListBusy(true);
    try {
      const chk = await apiClient.get<PaginatedResponse<CheckInRecord>>("/checkins/", {
        params: { page, page_size: pageSize, q: debouncedQuery || undefined, from: periodStart(period) },
      });
      // Une réponse plus ancienne que la dernière demande (frappe rapide dans la recherche) est ignorée.
      if (requestId !== listRequest.current) return;
      setRecords(chk.data.results); setTotalCount(chk.data.count);
    } finally {
      if (requestId === listRequest.current) setListBusy(false);
    }
  }, [page, pageSize, debouncedQuery, period]);

  const load = useCallback(async (initial = false, withStatic = false) => {
    if (initial) setState("loading");
    try {
      await Promise.all([loadList(), loadStats(), ...(initial || withStatic ? [loadStatic()] : [])]);
      setLastUpdated(new Date()); setLiveError(false); setState("ready");
    } catch (error) {
      if (!initial) { setLiveError(true); return; }
      const normalized = normalizeApiError(error);
      setLoadError(normalized.message);
      setSessionExpired(normalized.code === "auth");
      setState("error");
    }
  }, [loadList, loadStats, loadStatic]);

  // Recherche : on attend la fin de la frappe, puis on repart de la page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const resetFilters = () => { setQuery(""); setDebouncedQuery(""); setPeriod("all"); setPage(1); };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePageSize = () => setPageSize(mediaQuery.matches ? 10 : 20);
    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    const initial = firstLoad.current;
    firstLoad.current = false;
    void load(initial);
    // Pas de requêtes dans le vide : l'onglet masqué (tablette en veille, autre application) ne sollicite pas le serveur.
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(false); }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(false, true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const hourlyData = useMemo(() => Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}h`, hour, visites: stats?.hourly.find((entry) => entry.hour === hour)?.count ?? 0 })), [stats]);
  const reasonsData = useMemo(() => (stats?.frequent_reasons ?? []).slice(0, 6).map((item) => ({ label: item.label.length > 18 ? `${item.label.slice(0, 18)}…` : item.label, visites: item.count })), [stats]);
  const canExport = user?.role === "BOSS" || user?.role === "GERANT";
  const handleExport = async () => {
    if (!canExport || exporting || totalCount === 0) return;
    setExporting(true);
    try { await exportAllToCSV(orgName); } finally { setExporting(false); }
  };

  if (state === "loading") return <Loader fullScreen={false} label="Chargement des visiteurs…" />;
  // Session réellement morte : on explique et on renvoie vers la connexion. Toute autre panne (serveur qui dort, réseau,
  // erreur passagère) : la page reste en squelette et se relance toute seule, sans bouton « Réessayer ».
  if (state === "error" && sessionExpired) return <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-border bg-surface p-5"><h1 className="font-semibold text-ink">Ta session a expiré</h1><p className="text-sm text-ink-soft">{loadError}</p><a href="/connexion" className="rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white">Retour à la connexion</a></div>;
  if (state === "error") return <AutoRetry onRetry={() => { firstLoad.current = true; void load(true); }} />;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ink">Visiteurs</h1><p className="text-sm text-ink-soft">{stats?.total ?? totalCount} visiteur{(stats?.total ?? totalCount) > 1 ? "s" : ""} · {karnetEnabled ? "les passages alimentent automatiquement les fiches clients" : "actualisation automatique toutes les 30 secondes"}{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p></div><div className="flex flex-wrap items-center justify-end gap-3">{canExport && <button onClick={() => void handleExport()} disabled={totalCount === 0 || exporting} className="rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{exporting ? "Export en cours…" : "Exporter en CSV"}</button>}</div></div>
    {stats && <section className="grid gap-4 sm:grid-cols-3"><StatCard icon={<UsersThree size={21} />} label="Volume total" value={String(stats.total)} detail={`${stats.today} aujourd’hui`} /><StatCard icon={<Clock size={21} />} label="Heure de pointe" value={stats.peak_hour || "—"} detail="sur l’ensemble des visites" /><StatCard icon={<TrendUp size={21} />} label="Motif principal" value={stats.frequent_reasons[0]?.label || "—"} detail={stats.frequent_reasons[0] ? `${stats.frequent_reasons[0].count} visite${stats.frequent_reasons[0].count > 1 ? "s" : ""}` : "Aucune donnée"} /></section>}
    {stats && <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><ChartLineUp size={20} className="text-ink" /><h2 className="font-heading font-semibold text-ink">Visites par heure</h2></div><div className="mt-5 h-56 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#eee8dc" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" interval={2} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} width={32} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#817d75" }} /><Line type="monotone" dataKey="visites" name="Visites" stroke="#bd5b3f" strokeWidth={3} dot={{ r: 3, fill: "#bd5b3f", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></div><div className="rounded-xl border border-border bg-surface p-5"><h2 className="font-heading font-semibold text-ink">Motifs fréquents</h2><div className="mt-4 h-56 w-full">{reasonsData.length === 0 ? <p className="pt-10 text-sm text-ink-soft">Les motifs apparaîtront après les premières visites.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={reasonsData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#eee8dc" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="label" width={105} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="visites" name="Visites" fill="#bd5b3f" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ResponsiveContainer>}</div></div></section>}
    {liveError && <p role="status" className="text-xs text-error-text">Actualisation impossible pour le moment : nouvelle tentative automatique.</p>}
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Rechercher dans le registre</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom, un téléphone, un motif…" autoComplete="off" className="min-h-[44px] w-full rounded-full border border-border bg-surface py-2.5 pl-11 pr-4 text-sm text-ink outline-none focus:border-ink" />
        </label>
        <div role="group" aria-label="Période" className="flex gap-2 overflow-x-auto">
          {PERIODS.map((item) => <button key={item.key} type="button" aria-pressed={period === item.key} onClick={() => { setPeriod(item.key); setPage(1); }} className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm font-medium transition ${period === item.key ? "border-cta bg-cta text-white" : "border-border bg-surface text-ink hover:bg-canvas"}`}>{item.label}</button>)}
        </div>
      </div>
      {filtered && <p role="status" className="text-xs text-ink-soft">{totalCount} résultat{totalCount > 1 ? "s" : ""}<button type="button" onClick={resetFilters} className="ml-3 inline-flex min-h-[44px] items-center font-medium text-ink underline">Réinitialiser</button></p>}
    </div>
    <div className={`transition-opacity ${listBusy ? "opacity-60" : ""}`}>
      <CheckInsTable records={records} activeSchema={schema} karnetEnabled={karnetEnabled} page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} filtered={filtered} />
    </div>
  </div>;
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-ink-soft">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div><p className="mt-3 truncate text-2xl font-bold text-ink" title={value}>{value}</p><p className="mt-1 text-xs text-ink-soft">{detail}</p></div>; }
