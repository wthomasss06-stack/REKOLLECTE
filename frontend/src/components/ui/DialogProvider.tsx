"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react";

import FlashCard, { type FlashTone } from "@/components/ui/FlashCard";
import type { MoodName } from "@/components/ui/moods";
import { normalizeApiError } from "@/lib/errors";
import { useGooey } from "@/lib/gooey";

/**
 * Boîtes de dialogue du projet — remplacent window.confirm / window.prompt / window.alert,
 * dont le cadre affiche le nom du navigateur ou du site (« xxx.vercel.app indique… »).
 *
 *   const { confirm, prompt, alert } = useDialog();
 *   const ok = await confirm({ tone: "danger", title: "Supprimer ?", run: () => apiClient.delete(url) });
 *
 * Avec `run`, la requête part DANS la boîte (mode “ajax”) : bouton en chargement, puis
 * carte de réussite (si successTitle) ou carte d'erreur avec « Réessayer ». Le résultat vaut
 * true seulement si l'action a réellement abouti.
 */
interface BaseOptions { title: string; message?: ReactNode; tone?: FlashTone; mood?: MoodName }
interface RunOptions<Args extends unknown[]> {
  /** Requête exécutée dans la boîte ; une exception affiche la carte d'erreur. */
  run?: (...args: Args) => Promise<unknown>;
  runningLabel?: string;
  /** Si fourni, une carte de réussite s'affiche ~2 s après la requête. */
  successTitle?: string;
  successMessage?: ReactNode;
  errorTitle?: string;
}
export interface ConfirmOptions extends BaseOptions, RunOptions<[]> { confirmLabel?: string; cancelLabel?: string }
export interface PromptOptions extends BaseOptions, RunOptions<[string]> { label?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string; cancelLabel?: string }
export interface AlertOptions extends BaseOptions { okLabel?: string }

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
}

type Request =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void }
  | { id: number; kind: "alert"; options: AlertOptions; resolve: () => void };

type Phase = "ask" | "busy" | "success" | "error";

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialog doit être utilisé dans DialogProvider");
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Request | null>(null);
  const activeRef = useRef<Request | null>(null);
  const queueRef = useRef<Request[]>([]);
  const idRef = useRef(0);

  // Une seule boîte à l'écran : les demandes simultanées attendent leur tour.
  const enqueue = useCallback((request: Request) => {
    if (activeRef.current) { queueRef.current.push(request); return; }
    activeRef.current = request;
    setActive(request);
  }, []);
  const finish = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);
  }, []);

  const api = useMemo<DialogApi>(() => ({
    confirm: (options) => new Promise<boolean>((resolve) => enqueue({ id: ++idRef.current, kind: "confirm", options, resolve })),
    prompt: (options) => new Promise<string | null>((resolve) => enqueue({ id: ++idRef.current, kind: "prompt", options, resolve })),
    alert: (options) => new Promise<void>((resolve) => enqueue({ id: ++idRef.current, kind: "alert", options, resolve })),
  }), [enqueue]);

  return <DialogContext.Provider value={api}>{children}{active && <DialogView key={active.id} request={active} onDone={finish} />}</DialogContext.Provider>;
}

function DialogView({ request, onDone }: { request: Request; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("ask");
  const [failure, setFailure] = useState("");
  const [value, setValue] = useState(request.kind === "prompt" ? request.options.defaultValue ?? "" : "");
  const settled = useRef(false);
  const mounted = useRef(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelHandlerRef = useRef<() => void>(() => undefined);
  const uid = useId();
  const titleId = `${uid}-title`;
  const messageId = `${uid}-message`;

  useGooey(cardRef, { selector: ".qr-flash" }); // la carte sort du bouton qui a demandé la confirmation et s'y résorbe

  const options = request.options;
  const runOptions = request.kind === "alert" ? undefined : request.options;
  const baseTone: FlashTone = options.tone ?? (request.kind === "confirm" ? "warning" : "info");
  const busy = phase === "busy";
  const isPrompt = request.kind === "prompt";

  const settle = useCallback((confirmed: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (request.kind === "confirm") request.resolve(confirmed);
    else if (request.kind === "prompt") request.resolve(confirmed ? value.trim() : null);
    else request.resolve();
    onDone();
  }, [request, value, onDone]);

  const execute = async () => {
    const run = runOptions?.run as ((input: string) => Promise<unknown>) | undefined;
    if (!run) { settle(true); return; }
    setPhase("busy");
    try {
      await run(value.trim());
    } catch (error) {
      if (!mounted.current) return;
      const info = normalizeApiError(error);
      setFailure(info.code === "http_network" ? "Impossible de joindre le serveur. Vérifie ta connexion puis réessaie." : info.message);
      setPhase("error");
      return;
    }
    if (runOptions?.successTitle && mounted.current) setPhase("success");
    else settle(true);
  };

  const cancel = () => {
    if (busy) return;
    settle(phase === "success");
  };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { cancelHandlerRef.current = cancel; });

  // Réussite : la carte se referme seule ; « Continuer » permet d'aller plus vite.
  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => settle(true), 1900);
    return () => window.clearTimeout(timer);
  }, [phase, settle]);

  // Fond figé, focus rendu à l'élément d'origine, Échap = annuler, Tab reste dans la carte.
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelHandlerRef.current(); return; }
      if (event.key !== "Tab") return;
      const card = cardRef.current;
      const focusables = Array.from(card?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? []);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      const outside = !card?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || outside)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Focus initial : champ pour un prompt, « Annuler » pour une action destructive (un Entrée
  // distrait ne supprime rien), sinon le bouton principal.
  useEffect(() => {
    if (busy) return;
    const target = phase === "ask" && isPrompt ? inputRef.current
      : phase === "ask" && request.kind === "confirm" && baseTone === "danger" ? cancelButtonRef.current
      : primaryRef.current;
    const frame = window.requestAnimationFrame(() => { target?.focus(); if (target instanceof HTMLInputElement) target.select(); });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, busy, isPrompt, request.kind, baseTone]);

  const view = phase === "success"
    ? { tone: "success" as FlashTone, mood: "smile" as MoodName, title: runOptions?.successTitle ?? "C’est fait", message: runOptions?.successMessage }
    : phase === "error"
      ? { tone: "danger" as FlashTone, mood: "tears" as MoodName, title: runOptions?.errorTitle ?? "Oups !", message: failure }
      : { tone: baseTone, mood: options.mood, title: options.title, message: options.message };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (phase === "success" || request.kind === "alert") settle(true);
    else void execute();
  };

  const confirmLabel = request.kind === "alert" ? request.options.okLabel ?? "OK" : request.options.confirmLabel ?? "Confirmer";
  const primaryLabel = phase === "success" ? "Continuer" : phase === "error" ? "Réessayer" : confirmLabel;
  const cancelLabel = phase === "error" ? "Fermer" : request.kind === "alert" ? "" : request.options.cancelLabel ?? "Annuler";
  const showSecondary = phase === "error" || ((phase === "ask" || busy) && request.kind !== "alert");

  return createPortal(
    <div className="qr-flash-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
      <div ref={cardRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={view.message ? messageId : undefined} aria-busy={busy} className="w-full max-w-[22rem]">
        <FlashCard key={busy ? "ask" : phase} tone={view.tone} mood={view.mood} title={view.title} titleId={titleId} message={view.message} messageId={messageId} onClose={cancel} closeDisabled={busy}>
          <form onSubmit={submit} noValidate>
            {request.kind === "prompt" && phase !== "success" && phase !== "error" && (
              <div className="qr-flash__field">
                {request.options.label && <label htmlFor={`${uid}-input`} className="qr-flash__label">{request.options.label}</label>}
                <input ref={inputRef} id={`${uid}-input`} value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} placeholder={request.options.placeholder} autoComplete="off" className="qr-flash__input" />
              </div>
            )}
            <div className="qr-flash__actions">
              <button ref={primaryRef} type="submit" disabled={busy || (isPrompt && phase === "ask" && !value.trim())} className="qr-flash__btn qr-flash__btn--primary">
                {busy ? <><CircleNotch size={18} weight="bold" className="animate-spin" />{runOptions?.runningLabel ?? "Un instant…"}</> : primaryLabel}
              </button>
              {showSecondary && <button ref={cancelButtonRef} type="button" onClick={cancel} disabled={busy} className="qr-flash__btn qr-flash__btn--ghost">{cancelLabel}</button>}
            </div>
          </form>
        </FlashCard>
      </div>
    </div>,
    document.body,
  );
}
