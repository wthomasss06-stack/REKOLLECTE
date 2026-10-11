"use client";
import { useEffect, useState } from "react";

import InviteStaff from "@/components/dashboard/InviteStaff";
import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import PermissionMatrixModal from "@/components/dashboard/PermissionMatrixModal";
import { apiClient } from "@/lib/api";
import type { UserProfile } from "@/types";

type ViewState = "loading" | "error" | "ready";

export default function EquipePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [state, setState] = useState<ViewState>("loading");

  const load = () => {
    setState("loading");
    apiClient
      .get<UserProfile>("/auth/me/")
      .then((res) => {
        setUser(res.data);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

  if (state === "loading") return <Loader fullScreen={false} variant="list" />;
  if (state === "error" || !user) return <AutoRetry variant="list" onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Équipe</h1>
          <p className="text-sm text-ink-soft">Invite un Gérant ou un Staff selon les permissions nécessaires.</p>
        </div>
        <PermissionMatrixModal />
      </div>
      <InviteStaff viewerRole={user.role === "BOSS" ? "BOSS" : "GERANT"} />
    </div>
  );
}
