"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartLineUp, Clock, TrendUp, UsersThree } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Loader from "@/components/Loader";
import CheckInsTable from "@/components/CheckInsTable";
import { apiClient } from "@/lib/api";
import { exportAllToCSV } from "@/lib/exportCsv";
import type { CheckInRecord, CheckInStats, FormField, Organization, PaginatedResponse, UserProfile } from "@/types";

type ViewState = "loading" | "error" | "ready";
interface FormTemplateResponse { fields_schema: FormField[]; }

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
  const [avatarFailed, setAvatarFailed] = useState(false);
  const firstLoad = useRef(true);

  const load = useCallback(async (initial = false) => {
    if (initial) setState("loading");
    try {
      const [tpl, chk, org, summary, me] = await Promise.all([
        apiClient.get<FormTemplateResponse>("/form-template/"),
        apiClient.get<PaginatedResponse<CheckInRecord>>("/checkins/", { params: { page, page_size: pageSize } }),
        apiClient.get<Organization>("/org/me/"),
        apiClient.get<CheckInStats>("/checkins/stats/"),
        apiClient.get<UserProfile>("/auth/me/"),
      ]);
      setSchema(tpl.data.fields_schema); setRecords(chk.data.results); setTotalCount(chk.data.count); setOrgName(org.data.name); setKarnetEnabled(Boolean(org.data.capabilities?.karnet)); setStats(summary.data); setUser(me.data); setAvatarFailed(false); setLastUpdated(new Date()); setState("ready");
    } catch (error) {
      if (!initial) return;
      const normalized = normalizeApiError(error);
      setLoadError(normalized.message);
      setSessionExpired(normalized.code === "auth");
      setState("error");
    }
  }, [page, pageSize]);

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
    const timer = window.setInterval(() => void load(false), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const hourlyData = useMemo(() => Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}h`, hour, visites: stats?.hourly.find((entry) => entry.hour === hour)?.count ?? 0 })), [stats]);
  const reasonsData = useMemo(() => (stats?.frequent_reasons ?? []).slice(0, 6).map((item) => ({ label: item.label.length > 18 ? `${item.label.slice(0, 18)}…` : item.label, visites: item.count })), [stats]);
  const canExport = user?.role === "BOSS" || user?.role === "GERANT";
  const handleExport = async () => {
    if (!canExport || exporting || totalCount === 0) return;
    setExporting(true);
    try { await exportAllToCSV(orgName); } finally { setExporting(false); }
  };

  if (state === "loading") return <Loader fullScreen={false} />;
  if (state === "error") return <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-border bg-surface p-5"><h1 className="font-semibold text-ink">Impossible de charger le registre</h1><p className="text-sm text-ink-soft">{loadError}</p><div className="flex flex-wrap gap-3">{sessionExpired && <a href="/" className="rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white">Retour à la connexion</a>}<button onClick={() => { firstLoad.current = true; void load(true); }} className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink">Réessayer</button></div></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ink">{karnetEnabled ? "Clients" : "Registre"}</h1><p className="text-sm text-ink-soft">{stats?.total ?? totalCount} {karnetEnabled ? "client" : "visiteur"}{(stats?.total ?? totalCount) > 1 ? "s" : ""} · {karnetEnabled ? "les passages alimentent automatiquement les fiches clients" : "actualisation automatique toutes les 30 secondes"}{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p></div><div className="flex flex-wrap items-center justify-end gap-3"><div className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2"><div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-canvas text-xs font-bold text-ink">{user?.avatar_url && !avatarFailed ? <img src={user.avatar_url} alt={`Photo de ${user.full_name || user.email}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} /> : (user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="max-w-[150px] truncate text-xs font-semibold text-ink">{user?.full_name || user?.email}</p><p className="text-[11px] text-ink-soft">{user?.role === "BOSS" ? "Patron" : user?.role === "GERANT" ? "Gérant" : "Staff"}</p></div></div>{canExport && <button onClick={() => void handleExport()} disabled={totalCount === 0 || exporting} className="rounded-full bg-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{exporting ? "Export en cours…" : "Exporter en CSV"}</button>}</div></div>
    {stats && <section className="grid gap-4 sm:grid-cols-3"><StatCard icon={<UsersThree size={21} />} label="Volume total" value={String(stats.total)} detail={`${stats.today} aujourd’hui`} /><StatCard icon={<Clock size={21} />} label="Heure de pointe" value={stats.peak_hour || "—"} detail="sur l’ensemble des visites" /><StatCard icon={<TrendUp size={21} />} label="Motif principal" value={stats.frequent_reasons[0]?.label || "—"} detail={stats.frequent_reasons[0] ? `${stats.frequent_reasons[0].count} visite${stats.frequent_reasons[0].count > 1 ? "s" : ""}` : "Aucune donnée"} /></section>}
    {stats && <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><ChartLineUp size={20} className="text-ink" /><h2 className="font-heading font-semibold text-ink">Visites par heure</h2></div><div className="mt-5 h-56 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#eee8dc" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" interval={2} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} width={32} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#817d75" }} /><Line type="monotone" dataKey="visites" name="Visites" stroke="#bd5b3f" strokeWidth={3} dot={{ r: 3, fill: "#bd5b3f", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></div><div className="rounded-xl border border-border bg-surface p-5"><h2 className="font-heading font-semibold text-ink">Motifs fréquents</h2><div className="mt-4 h-56 w-full">{reasonsData.length === 0 ? <p className="pt-10 text-sm text-ink-soft">Les motifs apparaîtront après les premières visites.</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={reasonsData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#eee8dc" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="label" width={105} tick={{ fontSize: 10, fill: "#817d75" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="visites" name="Visites" fill="#bd5b3f" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ResponsiveContainer>}</div></div></section>}
    <CheckInsTable records={records} activeSchema={schema} karnetEnabled={karnetEnabled} page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
  </div>;
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-ink-soft">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div><p className="mt-3 truncate text-2xl font-bold text-ink" title={value}>{value}</p><p className="mt-1 text-xs text-ink-soft">{detail}</p></div>; }
