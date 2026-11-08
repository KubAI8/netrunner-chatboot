import assert from "node:assert/strict";
import { test } from "node:test";
import { visibleNarrative } from "../lib/scene-protocol.ts";

for (const [open, close] of [["<SCENE_STATE>", "</SCENE_STATE>"], ["[SCENE_STATE]", "[/SCENE_STATE]"]]) {
  test(`stary znacznik ${open} nie miga przy żadnym podziale strumienia`, () => {
    const source = `ZERO: Kontakt. ${open}{"recording":true}${close} Dalej.`;
    for (let split = 0; split <= source.length; split++) {
      const partial = visibleNarrative(source.slice(0, split), false);
      const final = visibleNarrative(source);
      assert.ok(final.text.startsWith(partial.text), `${split}: ${partial.text}`);
      assert.ok(!partial.text.includes("SCENE"));
      assert.ok(!partial.text.includes("recording"));
      assert.equal(final.text, "ZERO: Kontakt.  Dalej.");
      assert.equal(final.technicalNotice, true);
    }
  });
}
test("prawidłowe nawiasy i JSON pozostają tekstem, nie stanem", () => {
  const source = '[ARCHIWUM]\n{"wynik":42}\nZERO: [niepewne]';
  assert.deepEqual(visibleNarrative(source), { text: source, technicalNotice: false });
});
test("encje liczbowe i nazwane są dekodowane do bezpiecznego tekstu, częściowe czekają", () => {
  assert.equal(visibleNarrative('&#x4E;&#101;&#x20;&lt;script&gt;&amp;').text, 'Ne <script>&');
  for (const token of ['&#x20;', '&#x4E;', '&amp;', '&lt;']) {
    for (let split = 1; split < token.length; split++) assert.equal(visibleNarrative('ZERO: ' + token.slice(0, split), false).text, 'ZERO: ');
  }
  assert.equal(visibleNarrative('x & y').text, 'x & y');
  assert.equal(visibleNarrative('&#xD800;').text, '\ufffd');
  assert.equal(visibleNarrative('&amp;#x20;').text, '&#x20;');
});
test("urwany protokół jest ukryty z ostrzeżeniem zamiast fabularnego wyjaśnienia", () => {
  for (const source of ['[SCENE_STATE]{', '<SCENE_ST', '[SCENE_STATE]' + 'x'.repeat(6000)]) {
    assert.deepEqual(visibleNarrative(source), { text: '', technicalNotice: true });
  }
});
