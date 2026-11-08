import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_SCENE, getSceneState, parseSceneState } from "../lib/scene-state.ts";
import { zeroOpeningMessage } from "../lib/zero-opening.ts";

const archive = { ...EMPTY_SCENE, archive: true };
const discovered = { ...archive, monitoring: true, recording: true };
const user = text => ({ id: "u", role: "user", parts: [{ type: "text", text }] });
const reply = sceneState => ({ id: "a", role: "assistant", parts: [{ type: "text", text: "ZERO: Odpowiedź." }], metadata: { sceneState } });

test("liczba wymian, stare flagi i wzmianki o filmie nie odblokowują zasobów", () => {
  const history = [zeroOpeningMessage, ...Array.from({ length: 10 }, () => ({ ...reply(undefined), metadata: { recordingUnlocked: true, introDialogueCompleted: true } })), user("Odtwórz nagranie M-17")];
  assert.deepEqual(getSceneState(history), EMPTY_SCENE);
});

test("archiwum i nagranie mają niezależne, jawne stany; najnowszy stan może zamknąć zasób", () => {
  const history = [reply(archive)];
  assert.deepEqual(getSceneState(history), archive);
  history.push(reply(discovered));
  assert.equal(getSceneState(history).recording, true);
  history.push(reply(archive));
  assert.equal(getSceneState(history).recording, false);
});

test("restart i zakończenie nie przenoszą dostępów poprzedniej sceny", () => {
  for (const command of ["restart", " NOWA SESJA! ", "koniec gry"]) {
    assert.deepEqual(getSceneState([reply(discovered), user(command)]), EMPTY_SCENE);
  }
  assert.deepEqual(getSceneState([{ ...user("test"), metadata: { sceneState: discovered } }]), EMPTY_SCENE);
});

test("walidacja przyjmuje tylko komplet czterech wartości logicznych", () => {
  assert.deepEqual(parseSceneState(archive), archive);
  for (const invalid of [null, [], { archive: true }, { ...archive, recording: "true" }, { ...archive, command: "wyślij" }]) {
    assert.equal(parseSceneState(invalid), null);
  }
});
