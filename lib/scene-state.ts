import type { UIMessage } from "ai";

export type SceneState = { archive: boolean; monitoring: boolean; diagnostics: boolean; recording: boolean };
export const EMPTY_SCENE: SceneState = { archive: false, monitoring: false, diagnostics: false, recording: false };

export function parseSceneState(value: unknown): SceneState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const keys = Object.keys(EMPTY_SCENE) as (keyof SceneState)[];
  if (Object.keys(value).length !== keys.length || keys.some(key => typeof (value as Record<string, unknown>)[key] !== "boolean")) return null;
  return Object.fromEntries(keys.map(key => [key, (value as Record<string, boolean>)[key]])) as SceneState;
}

export function gameCommand(message: UIMessage | undefined): string {
  if (!message || message.role !== "user") return "";
  return message.parts.filter(part => part.type === "text").map(part => part.text)
    .join(" ").normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("pl").replace(/[.!?]+$/, "").trim();
}

export function isGameRestart(message: UIMessage): boolean {
  return ["restart", "nowa sesja"].includes(gameCommand(message));
}

// Stan prezentacji zasobów, nie uprawnienie do danych ani silnik fabuły.
export function getSceneState(messages: UIMessage[]): SceneState {
  const restart = messages.findLastIndex(message => isGameRestart(message) || gameCommand(message) === "koniec gry");
  for (let index = messages.length - 1; index > restart; index--) {
    const message = messages[index];
    if (message.role !== "assistant" || typeof message.metadata !== "object" || message.metadata === null) continue;
    if ("sceneState" in message.metadata) return parseSceneState(message.metadata.sceneState) ?? EMPTY_SCENE;
  }
  return EMPTY_SCENE;
}
