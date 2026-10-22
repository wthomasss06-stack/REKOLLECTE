"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { BellRinging, CalendarCheck, Cube, ListChecks, Money, QrCode, ShieldCheck, UsersThree } from "@phosphor-icons/react";

import GettingStarted, { useGuideOptional } from "@/components/karnet/GettingStarted";
import Loader from "@/components/Loader";
import ClientsPanel from "@/components/panels/ClientsPanel";
import FormulairePanel from "@/components/panels/FormulairePanel";
import PaiementsPanel from "@/components/panels/PaiementsPanel";
import QrCodePanel from "@/components/panels/QrCodePanel";
import RappelsPanel from "@/components/panels/RappelsPanel";
import ReservationsPanel from "@/components/panels/ReservationsPanel";
import ResourcesPanel from "@/components/panels/ResourcesPanel";
import SettingsModal from "@/components/ui/SettingsModal";
import SettingsRows, { type SettingsRow } from "@/components/ui/SettingsRows";
import { useAuthContext } from "@/context/AuthContext";
import { useModalParam } from "@/hooks/useModalParam";
import type { AccountRole } from "@/types";

const IDS = ["formulaire", "qr", "clients", "ressources", "reservations", "paiements", "rappels"] as const;
type PanelId = (typeof IDS)[number];

const ALL_ROLES: AccountRole[] = ["BOSS", "GERANT", "STAFF"];
const MANAGERS: AccountRole[] = ["BOSS", "GERANT"];

interface Section extends SettingsRow { roles: AccountRole[]; level2?: boolean; panel?: () => ReactNode }

// Niveau 1 : Formulaire et QR codes. Niveau 2 (REKOLLECTE+) : les mêmes lignes, dans le même ordre, puis les outils en plus —
// la page ne change pas de place ni de forme quand l’établissement passe au Niveau 2.
const SECTIONS: Section[] = [
  { id: "formulaire", title: "Formulaire", description: "Les champs que le visiteur remplit en arrivant", icon: ListChecks, roles: MANAGERS, panel: () => <FormulairePanel /> },
  { id: "qr", title: "QR codes", description: "Points d’accueil, QR à afficher et à imprimer", icon: QrCode, roles: ALL_ROLES, panel: () => <QrCodePanel /> },
  { id: "clients", title: "Clients", description: "Les visiteurs devenus clients, avec leur historique", icon: UsersThree, roles: ALL_ROLES, level2: true, panel: () => <ClientsPanel /> },
  { id: "ressources", title: "Ressources", description: "Chambres, tables, salles… ce que vos clients réservent", icon: Cube, roles: ALL_ROLES, level2: true, panel: () => <ResourcesPanel /> },
  { id: "reservations", title: "Réservations", description: "Le planning, les créneaux et leur statut", icon: CalendarCheck, roles: ALL_ROLES, level2: true, panel: () => <ReservationsPanel /> },
  { id: "paiements", title: "Paiements", description: "Ce qui est à encaisser et l’historique des encaissements", icon: Money, roles: ALL_ROLES, level2: true, panel: () => <PaiementsPanel /> },
  { id: "rappels", title: "Rappels", description: "Les créneaux terminés à traiter, avec alarme", icon: BellRinging, roles: ALL_ROLES, level2: true, panel: () => <RappelsPanel /> },
  // Le journal reste unique : il vit dans Paramètres > Administration (réservé au Patron), on y renvoie.
  { id: "audit", title: "Audit", description: "Le journal des actions sensibles de l’établissement", icon: ShieldCheck, roles: ["BOSS"], level2: true, href: "/dashboard/parametres?open=administration" },
];

function RekollecteContent() {
  const { user, organization } = useAuthContext();
  const { openId, open, close } = useModalParam<PanelId>(IDS);
  const guide = useGuideOptional();
  const karnet = Boolean(organization?.capabilities?.karnet);
  const markPaymentsSeen = guide?.markPaymentsSeen;

  // Ouvrir Paiements = avoir « contrôlé » l’encaissement : c’est la dernière étape du guide « Premiers pas ».
  useEffect(() => { if (openId === "paiements") markPaymentsSeen?.(); }, [openId, markPaymentsSeen]);

  if (!user || !organization) return <Loader fullScreen={false} label="Chargement…" />;

  const sections = SECTIONS.filter((section) => section.roles.includes(user.role) && (karnet || !section.level2));
  const current = sections.find((section) => section.id === openId && section.panel) ?? null;
  const product = karnet ? "REKOLLECTE+" : "REKOLLECTE";

  return (
    // touch-comfort : champs et boutons >= 44 px sur tablette/téléphone (voir globals.css), comme avant dans REKOLLECTE+.
    <div className={`mx-auto max-w-2xl space-y-6 ${karnet ? "touch-comfort" : ""}`}>
      <div>
        <h1 className="text-2xl font-bold text-ink">{product}</h1>
        <p className="mt-1 text-sm text-ink-soft">{karnet ? "Le formulaire, les QR codes, les clients, les ressources, les réservations, les paiements et les rappels de votre établissement." : "Le formulaire que remplissent vos visiteurs et les QR codes pour y accéder."}</p>
      </div>
      {karnet && guide && <GettingStarted variant="compact" />}
      <SettingsRows rows={sections} activeId={openId} onSelect={(id) => open(id as PanelId)} label={`Rubriques de ${product}`} />
      {current && <SettingsModal title={current.title} wide comfort={karnet} onClose={close}>{current.panel?.()}</SettingsModal>}
    </div>
  );
}

export default function RekollectePage() {
  return <Suspense fallback={<Loader fullScreen={false} label="Chargement…" />}><RekollecteContent /></Suspense>;
}
