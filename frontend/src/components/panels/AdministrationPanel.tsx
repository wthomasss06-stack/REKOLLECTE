"use client";

import { useState, type KeyboardEvent } from "react";

import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import ActivityTab from "./administration/ActivityTab";
import DevicesTab from "./administration/DevicesTab";
import OverviewTab from "./administration/OverviewTab";

type TabId = "apercu" | "activite" | "appareils";
const TABS: { id: TabId; label: string }[] = [{ id: "apercu", label: "Vue d’ensemble" }, { id: "activite", label: "Activité" }, { id: "appareils", label: "Appareils" }];

/** Administration (Patron) : vue d’ensemble, journal d’activité filtrable et exportable, appareils connectés.
 *  L’activation de REKOLLECTE+ n’est plus ici : elle se fait dans la page REKOLLECTE (rubrique REKOLLECTE+). */
export default function AdministrationPanel() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TabId>("apercu");

  if (!user) return <Loader fullScreen={false} label="Chargement de l’administration…" />;
  if (user.role !== "BOSS") return <p className="text-sm text-error-text">Cette section est réservée au patron.</p>;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    const target = TABS[next];
    if (target) { setTab(target.id); document.getElementById(`admin-tab-${target.id}`)?.focus(); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">Connexions, actions sensibles et appareils de votre établissement.</p>
      <div role="tablist" aria-label="Administration" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-canvas p-1">
        {TABS.map((item) => (
          <button key={item.id} id={`admin-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls="admin-tabpanel" tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)}
            className={`rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${tab === item.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>{item.label}</button>
        ))}
      </div>
      <div id="admin-tabpanel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        {tab === "apercu" && <OverviewTab onOpenTab={setTab} />}
        {tab === "activite" && <ActivityTab />}
        {tab === "appareils" && <DevicesTab />}
      </div>
    </div>
  );
}
