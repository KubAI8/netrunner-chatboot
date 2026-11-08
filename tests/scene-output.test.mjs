import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneOutputSchema } from "../lib/scene-output.ts";

// Ten sam walidator, który /api/chat przekazuje do Output.object.
// Bez modelu, konfiguracji środowiska i sieci.
globalThis.fetch = async () => { throw new Error("Test blokuje prawdziwą sieć"); };

const validOutput = () => ({
  text: "ZERO: Archiwum jest dostępne.",
  scene: { archive: true, monitoring: false, diagnostics: false, recording: false },
});

test("sceneOutputSchema — poprawny obiekt jest akceptowany bez zmiany danych", async () => {
  const value = validOutput();
  const result = await sceneOutputSchema.validate(value);
  assert.equal(result.success, true);
  assert.deepEqual(result.value, value);
});

// Każdy przypadek zmienia wyłącznie jedną rzecz w poprawnym obiekcie.
const invalidCases = [
  ["brak pola text", value => { delete value.text; }],
  ['scene.recording jako tekst "false"', value => { value.scene.recording = "false"; }],
  ["scene jako tablica", value => { value.scene = [true, false, false, false]; }],
  ["dodatkowe pole execute_command", value => { value.execute_command = "noop"; }],
];

for (const [name, change] of invalidCases) {
  test(`sceneOutputSchema — odrzuca: ${name}`, async () => {
    const value = validOutput();
    change(value);
    const result = await sceneOutputSchema.validate(value);
    assert.equal(result.success, false);
    assert.ok(result.error instanceof Error);
  });
}
