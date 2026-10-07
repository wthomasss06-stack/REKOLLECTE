/**
 * Sonnerie des rappels de fin de créneau (Web Audio, aucun fichier son).
 *
 * Les navigateurs interdisent de produire du son sans geste de l'utilisateur, et les tablettes
 * suspendent le son quand l'onglet passe en arrière-plan ou que l'écran se verrouille. Ce module
 * ne tente donc jamais de « forcer » : il (1) débloque le son sur un geste, (2) vérifie à chaque
 * sonnerie que le contexte audio tourne vraiment, (3) dit honnêtement quand il est bloqué, pour que
 * l'interface affiche un bouton de réactivation et une alerte visuelle à la place.
 */

export type SoundState = "unsupported" | "off" | "ready" | "blocked";

export const SOUND_PREF_KEY = "qr_alarm_sound_v1";

type AudioCtor = typeof AudioContext;
let context: AudioContext | null = null;

function audioConstructor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext || null;
}

export function audioSupported(): boolean {
  return audioConstructor() !== null;
}

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSoundPreference(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(SOUND_PREF_KEY, "1");
    else window.localStorage.removeItem(SOUND_PREF_KEY);
  } catch {
    /* stockage indisponible (navigation privée) : la préférence vaut pour cette session seulement */
  }
}

/** « ready » seulement si l'utilisateur a activé le son ET que le contexte audio tourne réellement. */
export function currentSoundState(): SoundState {
  if (!audioSupported()) return "unsupported";
  if (!readSoundPreference()) return "off";
  return context && context.state === "running" ? "ready" : "blocked";
}

/** Crée/réveille le contexte audio. DOIT être appelée depuis un geste (tap, clic, touche). */
export async function unlockAudio(onStateChange?: () => void): Promise<boolean> {
  const Ctor = audioConstructor();
  if (!Ctor) return false;
  try {
    // iOS Safari 16.4+ : joue même quand le commutateur « silencieux » est activé.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  } catch {
    /* non supporté : sans conséquence */
  }
  if (!context || context.state === "closed") {
    context = new Ctor();
    if (onStateChange) context.onstatechange = onStateChange;
  }
  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }
  return context.state === "running";
}

/** Trois bips. Renvoie false (sans rien casser) si le navigateur garde le son bloqué. */
export async function playAlarm(): Promise<boolean> {
  if (!context || context.state === "closed") return false;
  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }
  if (context.state !== "running") return false;
  const ctx = context;
  const beepAt = (offset: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    const start = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  };
  beepAt(0);
  beepAt(0.4);
  beepAt(0.8);
  return true;
}
