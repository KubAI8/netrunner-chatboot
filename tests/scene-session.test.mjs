import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { sceneSession, reportRecording, resetSceneSession } from "../lib/scene-session.ts";

test("odkrycie, otwarcie, start i zamknięcie to osobne zdarzenia; restart unieważnia stare", () => {
  const session = sceneSession("fake-session", randomUUID());
  const report = events => reportRecording(session, { epoch: session.epoch, events });
  report(["opened", "started"]);
  assert.equal(session.presentation.opened, false);
  session.scene.recording = true;
  report(["started"]);
  assert.equal(session.presentation.started, false);
  report(["opened"]);
  assert.deepEqual(session.presentation, { opened: true, modalOpen: true, started: false, unavailable: false });
  report(["started", "unavailable", "closed"]);
  assert.deepEqual(session.presentation, { opened: true, modalOpen: false, started: true, unavailable: true });
  const oldEpoch = session.epoch;
  resetSceneSession(session);
  session.scene.recording = true;
  reportRecording(session, { epoch: oldEpoch, events: ["opened", "started"] });
  assert.equal(session.presentation.opened, false);
});
test("stan jest oddzielny dla sesji logowania i rozmowy; błędne ID odrzucane", () => {
  const id = randomUUID();
  const one = sceneSession("a", id);
  one.scene.archive = true;
  assert.equal(sceneSession("a", id).scene.archive, true);
  assert.equal(sceneSession("b", id).scene.archive, false);
  assert.equal(sceneSession("a", randomUUID()).scene.archive, false);
  for (const invalid of [undefined, {}, "", "x".repeat(129)]) assert.throws(() => sceneSession("a", invalid));
});
