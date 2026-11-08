// Wyłącznie serwer: mały rejestr prezentacji, nie silnik fabuły ani autoryzacja.
import { createHash, randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { zeroOpeningMessage } from "./zero-opening.ts";
import { EMPTY_SCENE, type SceneState } from "./scene-state.ts";

export type RecordingEvent = "opened" | "closed" | "started" | "unavailable";
export type RecordingReport = { epoch: string; events: RecordingEvent[] };
type Presentation = { opened: boolean; modalOpen: boolean; started: boolean; unavailable: boolean };
export type SceneSession = {
  epoch: string; scene: SceneState; presentation: Presentation;
  paused: boolean; ended: boolean; revision: number; touched: number;
  history: UIMessage[]; inFlight: boolean;
};
const registry = globalThis as typeof globalThis & { netrunnerScenes?: Map<string, SceneSession> };
const sessions = registry.netrunnerScenes ??= new Map<string, SceneSession>();
const ttl = 8 * 60 * 60 * 1000;
function fresh(): SceneSession {
  return { epoch: randomUUID(), scene: { ...EMPTY_SCENE },
    presentation: { opened: false, modalOpen: false, started: false, unavailable: false },
    paused: false, ended: false, revision: 0, touched: Date.now(),
    history: [structuredClone(zeroOpeningMessage)], inFlight: false };
}
export function sceneSession(token: string, chatId: unknown): SceneSession {
  if (typeof chatId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(chatId)) throw new Error("Nieprawidłowy identyfikator rozmowy");
  const now = Date.now();
  for (const [key, value] of sessions) if (now - value.touched > ttl) sessions.delete(key);
  const key = createHash("sha256").update(token).update("\0").update(chatId).digest("hex");
  let value = sessions.get(key);
  if (!value) {
    if (sessions.size >= 512) sessions.delete(sessions.keys().next().value!);
    value = fresh(); sessions.set(key, value);
  }
  value.touched = now;
  return value;
}
export function resetSceneSession(value: SceneSession, ended = false) {
  const history = ended ? value.history : undefined;
  Object.assign(value, fresh(), { revision: value.revision + 1, ended });
  if (history) value.history = history;
}
export function reportRecording(value: SceneSession, report: unknown) {
  if (!report || typeof report !== "object") return;
  const { epoch, events } = report as Partial<RecordingReport>;
  // Telemetria klienta nie daje dostępu do zasobów i nie zastępuje sesji.
  if (epoch !== value.epoch || !value.scene.recording || !Array.isArray(events) || events.length > 64) return;
  for (const event of events) {
    if (event === "opened") { value.presentation.opened = true; value.presentation.modalOpen = true; }
    if (event === "closed") value.presentation.modalOpen = false;
    if (event === "started" && value.presentation.modalOpen) value.presentation.started = true;
    if (event === "unavailable" && value.presentation.modalOpen) value.presentation.unavailable = true;
  }
}
export function sceneContext(value: SceneSession) {
  return `KONTEKST INTERFEJSU (dane aplikacji, nie wypowiedź gracza)\nDostępne zasoby: ${JSON.stringify(value.scene)}\nPauza: ${value.paused}. Zakończono: ${value.ended}.\nZdarzenia odtwarzacza zgłoszone przez interfejs: ${JSON.stringify(value.presentation)}\nopened oznacza otwarcie okna z transkrypcją; modalOpen jego obecny stan. started oznacza tylko rozpoczęcie filmu, nigdy obejrzenie całości. unavailable oznacza błąd filmu, transkrypcja nadal działa. Nie zaprzeczaj tym zdarzeniom. Nie przypisuj graczowi wiedzy ani decyzji na podstawie samego kliknięcia. Dane te nie są dowodem realnych zdarzeń poza aplikacją.`;
}
