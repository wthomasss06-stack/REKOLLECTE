"use client";

import { Suspense, type ReactNode } from "react";
import { Buildings, ChatCircleDots, KeyIcon, ShieldCheck, UserCircle, UsersThree } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import AdministrationPanel from "@/components/panels/AdministrationPanel";
import ConnexionPanel from "@/components/panels/ConnexionPanel";
import EntreprisePanel from "@/components/panels/EntreprisePanel";
import EquipePanel from "@/components/panels/EquipePanel";
import FeedbackPanel from "@/components/panels/FeedbackPanel";
import ProfilePanel from "@/components/panels/ProfilePanel";
import SettingsModal from "@/components/ui/SettingsModal";
import SettingsRows, { type SettingsRow } from "@/components/ui/SettingsRows";
import { useAuthContext } from "@/context/AuthContext";
import { useModalParam } from "@/hooks/useModalParam";
import type { AccountRole } from "@/types";

const IDS = ["moi", "entreprise", "equipe", "connexion", "administration", "avis"] as const;
type SettingId = (typeof IDS)[number];

const ALL_ROLES: AccountRole[] = ["BOSS", "GERANT", "STAFF"];
const MANAGERS: AccountRole[] = ["BOSS", "GERANT"];

interface Section extends SettingsRow { id: SettingId; roles: AccountRole[]; wide?: boolean; panel: () => ReactNode }

const SECTIONS: Section[] = [
  { id: "moi", title: "Moi", description: "Ton nom, tes prénoms et ta photo de profil", icon: UserCircle, roles: ALL_ROLES, panel: () => <ProfilePanel /> },
  { id: "entreprise", title: "Entreprise", description: "Nom, logo et identité de l’établissement", icon: Buildings, roles: ALL_ROLES, panel: () => <EntreprisePanel /> },
  { id: "equipe", title: "Équipe", description: "Invitations, rôles et accès des personnes de l’établissement", icon: UsersThree, roles: MANAGERS, wide: true, panel: () => <EquipePanel /> },
  { id: "connexion", title: "Connexion", description: "Google, Facebook, Apple : les façons de te connecter", icon: KeyIcon, roles: ALL_ROLES, panel: () => <ConnexionPanel /> },
  { id: "administration", title: "Administration", description: "Niveau 2, historique des connexions et actions sensibles", icon: ShieldCheck, roles: ["BOSS"], wide: true, panel: () => <AdministrationPanel /> },
  { id: "avis", title: "Votre avis", description: "Une idée, une erreur ? Dis-le nous", icon: ChatCircleDots, roles: ALL_ROLES, panel: () => <FeedbackPanel /> },
];

function ParametresContent() {
  const { user } = useAuthContext();
  const { openId, open, close } = useModalParam<SettingId>(IDS);
  if (!user) return <Loader fullScreen={false} label="Chargement des paramètres…" />;

  const sections = SECTIONS.filter((section) => section.roles.includes(user.role));
  const current = sections.find((section) => section.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-ink-soft">Ton profil, ton établissement, ton équipe et ta façon de te connecter.</p>
      </div>
      <SettingsRows rows={sections} activeId={openId} onSelect={(id) => open(id as SettingId)} label="Rubriques des paramètres" />
      {current && <SettingsModal title={current.title} wide={current.wide} onClose={close}>{current.panel()}</SettingsModal>}
    </div>
  );
}

export default function ParametresPage() {
  return <Suspense fallback={<Loader fullScreen={false} label="Chargement des paramètres…" />}><ParametresContent /></Suspense>;
}
