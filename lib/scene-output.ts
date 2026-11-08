import { jsonSchema } from "ai";
import { parseSceneState, type SceneState } from "./scene-state.ts";
export type SceneOutput = { text: string; scene: SceneState };
export const sceneOutputSchema = jsonSchema<SceneOutput>({
  type: "object", additionalProperties: false,
  properties: {
    text: { type: "string", description: "Wyłącznie widoczna narracja i dialog; zwykły tekst, bez technicznych metadanych." },
    scene: { type: "object", additionalProperties: false,
      properties: { archive: { type: "boolean" }, monitoring: { type: "boolean" }, diagnostics: { type: "boolean" }, recording: { type: "boolean" } },
      required: ["archive", "monitoring", "diagnostics", "recording"] },
  }, required: ["text", "scene"],
}, { validate(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 2 && "text" in value && typeof value.text === "string" && value.text.trim() && "scene" in value) {
    const scene = parseSceneState(value.scene);
    if (scene) return { success: true, value: { text: value.text, scene } };
  }
  return { success: false, error: new Error("Nieprawidłowy format odpowiedzi") };
} });
