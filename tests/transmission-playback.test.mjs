import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTransmission } from "../lib/transmission.ts";
import { advancePlayback, visiblePlayback, OPENING_DELAY_MS, REPLY_DELAY_MS } from "../lib/transmission-playback.ts";

test("otwarcie i kolejne odpowiedzi mają opóźnienie prezentacji", () => {
  assert.equal(OPENING_DELAY_MS, 1200);
  assert.equal(REPLY_DELAY_MS, 750);
  assert.deepEqual(visiblePlayback(parseTransmission("ZERO: Witaj."), { index: 0, characters: 0 }), []);
});

test("ZERO pojawia się znak po znaku bez przecinania znaków Unicode", () => {
  const blocks = parseTransmission("ZERO: Ż🙂");
  let cursor = { index: 0, characters: 0 };
  cursor = advancePlayback(blocks, cursor, false).cursor;
  assert.equal(visiblePlayback(blocks, cursor)[0].content, "Ż");
  cursor = advancePlayback(blocks, cursor, false).cursor;
  assert.equal(visiblePlayback(blocks, cursor)[0].content, "Ż🙂");
});

test("terminal czeka na komplet danych i pojawia się w całości bez animacji liter", () => {
  const cursor = { index: 0, characters: 0 };
  const partial = parseTransmission("[TERMINAL]\n\n> odczyt\nStan:");
  assert.deepEqual(advancePlayback(partial, cursor, true).cursor, cursor);
  assert.deepEqual(visiblePlayback(partial, cursor), []);
  const complete = parseTransmission("[TERMINAL]\n\n> odczyt\nStan: dostępny\n[KONIEC TERMINALA]\n\nZERO: Sprawdź to.");
  const next = advancePlayback(complete, cursor, true).cursor;
  assert.equal(next.index, 1);
  assert.deepEqual(visiblePlayback(complete, next), [complete[0]]);
});

test("dogonienie strumienia nie ucina późniejszych fragmentów odpowiedzi", () => {
  const cursor = { index: 0, characters: 1 };
  const partial = parseTransmission("ZERO: A");
  assert.deepEqual(advancePlayback(partial, cursor, true).cursor, cursor);
  const full = parseTransmission("ZERO: AB");
  const next = advancePlayback(full, cursor, true).cursor;
  assert.equal(visiblePlayback(full, next)[0].content, "AB");
  assert.equal(advancePlayback(full, next, false).cursor.index, 1);
});
