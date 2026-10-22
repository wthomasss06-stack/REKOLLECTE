"use client";
import { useEffect, useState } from "react";
import { Plus, QrCode, Trash } from "@phosphor-icons/react";
import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import Modal from "@/components/ui/Modal";
import { useDialog } from "@/components/ui/DialogProvider";
import QRCodeManager from "@/components/QRCodeManager";
import { apiClient } from "@/lib/api";
import type { AccessPoint, FormTemplate, Organization } from "@/types";

type ViewState = "loading" | "error" | "ready";
export default function QrCodePanel() {
  const { confirm } = useDialog();
  const [org, setOrg] = useState<Organization | null>(null); const [points, setPoints] = useState<AccessPoint[]>([]); const [forms, setForms] = useState<FormTemplate[]>([]); const [state, setState] = useState<ViewState>("loading"); const [modalOpen, setModalOpen] = useState(false); const [name, setName] = useState(""); const [device, setDevice] = useState(""); const [formId, setFormId] = useState(""); const [error, setError] = useState(""); const [creating, setCreating] = useState(false);
  const load = () => { setState("loading"); Promise.all([apiClient.get<Organization>("/org/me/"), apiClient.get<AccessPoint[]>("/access-points/"), apiClient.get<FormTemplate[]>("/form-templates/")]).then(([organization, access, templates]) => { setOrg(organization.data); setPoints(access.data); setForms(templates.data); setFormId((current) => current || templates.data.find((item) => item.is_default)?.id || templates.data[0]?.id || ""); setState("ready"); }).catch(() => setState("error")); };
  useEffect(load, []);
  const create = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim() || !formId) return; setCreating(true); setError(""); try { await apiClient.post("/access-points/", { name: name.trim(), device_label: device.trim(), form_template: formId, is_active: true }); setName(""); setDevice(""); setModalOpen(false); load(); } catch { setError("Impossible de créer ce QR. Vérifiez le nom et réessayez."); } finally { setCreating(false); } };
  const remove = async (point: AccessPoint) => {
    await confirm({
      tone: "danger",
      title: "Supprimer ce QR ?",
      message: <>Le point d’accueil « <strong>{point.name}</strong> » sera supprimé et son QR ne fonctionnera plus.</>,
      confirmLabel: "Supprimer",
      cancelLabel: "Garder",
      runningLabel: "Suppression…",
      run: async () => { await apiClient.delete(`/access-points/${point.id}/`); load(); },
      successTitle: "QR supprimé",
      errorTitle: "Suppression impossible",
    });
  };
  if (state === "loading") return <Loader fullScreen={false} label="Chargement des points d’accueil…" />;
  if (state === "error" || !org) return <AutoRetry onRetry={load} label="Chargement des points d’accueil…" />;
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="max-w-2xl text-sm text-ink-soft">Un QR par entrée, tablette ou comptoir. Chaque QR dédié ouvre le formulaire qui lui est associé ; le QR général suit le formulaire par défaut.</p></div><button onClick={() => { setModalOpen(true); setError(""); }} className="flex items-center gap-2 rounded-full bg-cta px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} weight="bold" /> Nouveau QR</button></div>
    {points.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><QrCode size={32} className="mx-auto text-ink-soft" /><p className="mt-3 font-semibold text-ink">Aucun QR créé</p><p className="mt-1 text-sm text-ink-soft">Créez votre premier point d’accueil pour afficher un parcours visiteur.</p></div> : <div className="grid gap-5 lg:grid-cols-2">{points.map(point => <div key={point.id} className="rounded-xl border border-border bg-surface p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="font-semibold text-ink">{point.name}</h2><p className="text-xs text-ink-soft">{point.device_label || "Appareil non nommé"} · {point.form_title}</p><p suppressHydrationWarning className="mt-1 text-xs text-ink-soft">{point.last_seen_at ? `Dernière activité : ${new Date(point.last_seen_at).toLocaleString("fr-FR")}` : "Pas encore de synchronisation"}</p></div><button onClick={() => remove(point)} aria-label={`Supprimer ${point.name}`} className="rounded-full p-2 text-error-text hover:bg-error-bg"><Trash size={17} /></button></div><QRCodeManager qrToken={point.secure_token} orgName={`${org.name}-${point.name}`} logoUrl={org.logo_url} canRegenerate={false} size={240} /></div>)}</div>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Créer un QR code" description="Nommez le point d’accueil et choisissez le formulaire à ouvrir."><form onSubmit={create} className="space-y-4"><div><label className="mb-1.5 block text-sm font-medium text-ink">Nom du point d’accueil</label><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Accueil principal, Entrée visiteurs…" className="w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-ink outline-none focus:border-ink" /></div><div><label className="mb-1.5 block text-sm font-medium text-ink">Appareil <span className="font-normal text-ink-soft">(facultatif)</span></label><input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Tablette accueil 01" className="w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-ink outline-none focus:border-ink" /></div><div><label className="mb-1.5 block text-sm font-medium text-ink">Formulaire ouvert par ce QR</label><select required value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full rounded-lg border border-border bg-canvas px-3 py-3 text-sm text-ink">{forms.map(form => <option key={form.id} value={form.id}>{form.title}{form.is_default ? " · par défaut" : ""}</option>)}</select></div>{error && <p className="text-sm text-error-text">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-sm text-ink">Annuler</button><button disabled={creating} className="rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Création…" : "Créer le QR"}</button></div></form></Modal>
  </div>;
}
