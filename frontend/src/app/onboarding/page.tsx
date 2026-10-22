"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "@phosphor-icons/react";

import CloudinaryImageUploader from "@/components/CloudinaryImageUploader";
import SimpleFormSetup from "@/components/onboarding/SimpleFormSetup";
import QRCodeManager from "@/components/QRCodeManager";
import TabletSetupGuide from "@/components/dashboard/TabletSetupGuide";
import Loader from "@/components/Loader";
import { apiClient } from "@/lib/api";
import type { AccountRole, Organization, UserProfile } from "@/types";

const BOSS_STEPS = ["Profil & rôle", "Établissement", "Formulaire", "QR code"];

function roleLabel(role: AccountRole) {
  return role === "BOSS" ? "Patron / responsable" : role === "GERANT" ? "Gérant" : "Agent";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<AccountRole>("BOSS");
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const steps = useMemo(() => role === "BOSS" ? BOSS_STEPS : ["Profil & rôle"], [role]);

  useEffect(() => {
    Promise.all([apiClient.get<UserProfile>("/auth/me/"), apiClient.get<Organization>("/org/me/")])
      .then(([me, orgRes]) => {
        setUser(me.data);
        setRole(me.data.role);
        setFullName(me.data.full_name || "");
        setAvatar(me.data.avatar_url || "");
        setOrg(orgRes.data);
        setName(orgRes.data.name);
        setLogo(orgRes.data.logo_url || "");
      })
      .catch(() => setError("Impossible de charger votre espace."))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      setError("Renseignez votre nom et prénom pour continuer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.patch<UserProfile>("/auth/me/", { full_name: fullName.trim(), avatar_url: avatar });
      setUser(data);
      if (role !== "BOSS") router.push(role === "STAFF" ? "/dashboard/accueil" : "/dashboard");
      else setStep(2);
    } catch {
      setError("Impossible d’enregistrer votre profil.");
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.patch<Organization>("/org/me/", {
        name: name.trim(), logo_url: logo,
      });
      setOrg(data);
      setStep(3);
    } catch {
      setError("Impossible d’enregistrer l’établissement.");
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = () => {
    router.replace("/dashboard");
    router.refresh();
  };

  if (loading) return <Loader label="Préparation de votre espace…" />;
  if (!user || !org) return <div className="mx-auto max-w-xl p-10 text-center text-error-text">{error}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header>
        
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Bienvenue dans votre espace</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {role === "BOSS" ? "Définissons votre profil, votre établissement et votre premier parcours visiteur en quatre étapes." : "Votre invitation est confirmée. Vérifiez votre profil puis accédez à votre espace dédié."}
        </p>
      </header>

      <div className={`grid gap-2 ${steps.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-4"}`}>
        {steps.map((label, index) => <div key={label} className="space-y-2"><div className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-cta" : "bg-border"}`} /><span className="hidden text-xs text-ink-soft sm:block">{index + 1}. {label}</span></div>)}
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-subtle sm:p-8">
        {step === 1 && <div className="space-y-6">
          <div><h2 className="text-2xl font-bold text-ink">Votre identité et votre rôle</h2><p className="mt-2 text-sm text-ink-soft">Les informations viennent de votre compte Google ou Facebook. Vous pouvez modifier votre nom et remplacer votre avatar. Votre rôle est conservé depuis votre invitation ou créé en tant que patron.</p></div>
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
            <CloudinaryImageUploader value={avatar} onChange={setAvatar} label="Photo de profil" uploadKind="avatar" />
            <div className="space-y-4">
              <label className="block text-sm font-medium text-ink">Nom et prénom<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex. Awa Kouassi" className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-3 outline-none focus:border-ink" /></label>
              <p className="text-sm text-ink-soft">{user.email}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-ink-soft">Rôle</p><p className="mt-1 font-semibold text-ink">{roleLabel(role)}</p><p className="mt-1 text-sm text-ink-soft">{role === "BOSS" ? "Vous êtes responsable de la configuration de l’établissement." : "Vous avez été invité : votre accès et vos permissions sont déjà définis."}</p></div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex justify-end"><button onClick={() => void saveProfile()} disabled={saving} className="flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-medium text-white disabled:opacity-50">{saving ? "Enregistrement…" : role === "BOSS" ? "Continuer" : "Accéder à mon tableau de bord"} {!saving && (role === "BOSS" ? <ArrowRight size={16} /> : <Check size={16} />)}</button></div>
        </div>}

        {step === 2 && role === "BOSS" && <div className="space-y-6">
          <div><h2 className="text-2xl font-bold text-ink">Votre établissement</h2><p className="mt-2 text-sm text-ink-soft">Ces éléments seront visibles sur le formulaire visiteur, le QR code et votre tableau de bord.</p></div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start"><CloudinaryImageUploader value={logo} onChange={setLogo} label="Logo de l’établissement" /><label className="flex-1 text-sm font-medium text-ink">Nom de l’établissement<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-3 outline-none focus:border-ink" /></label></div>
          {error && <p className="text-sm text-error-text">{error}</p>}<div className="flex justify-between"><button onClick={() => setStep(1)} className="rounded-full border border-border px-5 py-3 text-sm">Retour</button><button onClick={() => void saveBranding()} disabled={saving || !name.trim()} className="rounded-full bg-cta px-6 py-3 font-medium text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer et continuer"}</button></div>
        </div>}

        {step === 3 && role === "BOSS" && <div className="space-y-6"><div><h2 className="text-2xl font-bold text-ink">Votre formulaire visiteur</h2><p className="mt-2 text-sm text-ink-soft">Définissez les champs utiles. Vous pouvez passer et le compléter depuis Paramètres.</p></div><SimpleFormSetup onSaved={() => setStep(4)} /><button onClick={() => setStep(4)} className="rounded-full border border-border px-5 py-3 text-sm">Passer pour l’instant</button></div>}

        {step === 4 && role === "BOSS" && <div className="space-y-6"><div><h2 className="text-2xl font-bold text-ink">La présentation de votre QR code</h2><p className="mt-2 text-sm text-ink-soft">Voici le QR code de votre établissement. Vous pourrez le télécharger ou le régénérer depuis votre tableau de bord.</p></div><div className="flex justify-center"><QRCodeManager qrToken={org.qr_secure_token} orgName={org.name} logoUrl={org.logo_url} canRegenerate /></div><div className="flex justify-center"><a href={`/v/${org.qr_secure_token}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink hover:bg-canvas">Tester le formulaire visiteur</a></div><TabletSetupGuide /><div className="flex justify-between border-t border-border pt-5"><button onClick={() => setStep(3)} className="rounded-full border border-border px-5 py-3 text-sm">Retour</button><button onClick={finishOnboarding} className="flex items-center gap-2 rounded-full bg-cta px-6 py-3 font-medium text-white"><Check size={16} /> Accéder à mon tableau de bord</button></div></div>}
      </section>
    </div>
  );
}
