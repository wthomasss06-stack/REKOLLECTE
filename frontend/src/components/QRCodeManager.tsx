"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowsClockwise, DownloadSimple } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api";
import { useDialog } from "@/components/ui/DialogProvider";

export default function QRCodeManager({ qrToken, orgName, logoUrl = "", canRegenerate = true, size = 220 }: { qrToken: string; orgName: string; logoUrl?: string; canRegenerate?: boolean; size?: number }) {
  const { confirm } = useDialog();
  const [token, setToken] = useState(qrToken);
  const [qrLogo, setQrLogo] = useState(logoUrl);
  const [origin, setOrigin] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const publicUrl = `${origin}/v/${token}`;

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    setQrLogo(logoUrl);
    if (!logoUrl || logoUrl.startsWith("data:")) return () => { cancelled = true; };
    fetch(logoUrl, { mode: "cors" })
      .then((response) => { if (!response.ok) throw new Error("logo inaccessible"); return response.blob(); })
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then((dataUrl) => { if (!cancelled) setQrLogo(dataUrl); })
      .catch(() => { /* Le QR reste utilisable sans logo si le CDN refuse le CORS. */ });
    return () => { cancelled = true; };
  }, [logoUrl]);

  const download = () => {
    const visibleCanvas = containerRef.current?.querySelector<HTMLCanvasElement>("canvas:not([data-download-qr])");
    const canvas = visibleCanvas || containerRef.current?.querySelector<HTMLCanvasElement>("[data-download-qr]");
    if (!canvas) return;
    const saveBlob = (blob: Blob | null) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${orgName.trim().replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    try {
      canvas.toBlob(saveBlob, "image/png");
    } catch {
      const fallback = containerRef.current?.querySelector<HTMLCanvasElement>("[data-download-qr]");
      fallback?.toBlob(saveBlob, "image/png");
    }
  };
  const regenerate = async () => {
    await confirm({
      tone: "warning",
      title: "Régénérer le QR ?",
      message: "L’ancien QR cessera immédiatement de fonctionner. Pense à remplacer ceux déjà affichés ou imprimés.",
      confirmLabel: "Régénérer",
      runningLabel: "Génération…",
      run: async () => { const { data } = await apiClient.post("/org/me/regenerate-qr/"); setToken(data.qr_secure_token); },
      successTitle: "Nouveau QR prêt",
      successMessage: "Télécharge-le et remplace l’ancien partout où il est affiché.",
      errorTitle: "Régénération impossible",
    });
  };
  return <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
    <div ref={containerRef} className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-white p-3 sm:p-4" style={{ maxWidth: size + 34 }}><QRCodeCanvas value={publicUrl} size={size} level="H" includeMargin className="block" style={{ width: "100%", height: "100%" }} imageSettings={qrLogo ? { src: qrLogo, height: Math.round(size * 0.2), width: Math.round(size * 0.2), excavate: true } : undefined} /><div className="sr-only" aria-hidden="true"><QRCodeCanvas data-download-qr value={publicUrl} size={size} level="H" includeMargin /></div></div>
    <p className="text-center text-sm text-ink-soft">Affiche ce QR à l’accueil ou sur la tablette.</p>
    <div className="flex flex-wrap justify-center gap-3"><button onClick={download} className="flex items-center gap-2 rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-white"><DownloadSimple size={16} weight="bold" /> Télécharger</button>{canRegenerate && <button onClick={regenerate} className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink"><ArrowsClockwise size={16} weight="bold" /> Régénérer</button>}</div>
  </div>;
}
