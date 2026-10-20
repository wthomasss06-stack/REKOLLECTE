"use client";
import { useCallback, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

/**
 * Le canvas doit avoir EXACTEMENT la taille à laquelle il est affiché (× densité de pixels de l'écran). Sans cela il garde
 * sa taille HTML par défaut (300×150) étirée en CSS, et signature_pad, qui lit la position du doigt en pixels CSS, trace le
 * trait décalé par rapport au doigt — très visible sur tablette. On redimensionne donc au montage et à chaque changement
 * de largeur, en conservant le tracé déjà dessiné.
 */
export default function SignaturePad({ onSave }: { onSave: (signatureBlob: string) => void }) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const fitCanvas = useCallback(() => {
    const pad = sigCanvas.current;
    const canvas = pad?.getCanvas();
    if (!pad || !canvas || canvas.offsetWidth === 0) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.round(canvas.offsetWidth * ratio);
    const height = Math.round(canvas.offsetHeight * ratio);
    if (canvas.width === width && canvas.height === height) return;
    const strokes = pad.toData();
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.scale(ratio, ratio);
    pad.clear();
    if (strokes.length > 0) pad.fromData(strokes);
  }, []);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    sigCanvas.current?.clear();
    onSave("");
  };

  const handleEnd = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const trimmed = sigCanvas.current?.getTrimmedCanvas();
    const dataUrl = trimmed?.toDataURL("image/png");
    if (trimmed && dataUrl) {
      // Les proportions du tracé sont conservées (avant : toujours étiré en 500×180, ce qui déformait les signatures courtes).
      const { width, height } = trimmed;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><image href="${dataUrl}" width="${width}" height="${height}" /></svg>`;
      onSave(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border bg-canvas">
        <SignatureCanvas
          ref={sigCanvas}
          onEnd={handleEnd}
          penColor="#2F3437"
          canvasProps={{ className: "h-36 w-full cursor-crosshair touch-none", "aria-label": "Zone de signature" } as React.CanvasHTMLAttributes<HTMLCanvasElement>}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="flex min-h-[44px] items-center gap-1 self-end px-2 text-xs text-ink-soft transition hover:text-ink"
      >
        <ArrowCounterClockwise size={14} weight="bold" /> Effacer et recommencer
      </button>
    </div>
  );
}
