import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
// Kompilator jest już zależnością Next.js; bez instalowania narzędzi testowych.
const swc = require("next/dist/build/swc");
await swc.loadBindings();
Module._extensions[".tsx"] = (module, filename) => {
  const { code } = swc.transformSync(readFileSync(filename, "utf8"), {
    filename, jsc: { target: "es2022", parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" },
  });
  module._compile(code, filename);
};
const Transmission = require("../app/transmission.tsx").default;
const Resources = require("../app/scene-resources.tsx").default;
const Modal = require("../app/recording-modal.tsx").default;
const { recording } = require("../lib/recording.ts");
const { EMPTY_SCENE } = require("../lib/scene-state.ts");
const { parseTransmission } = require("../lib/transmission.ts");
const { visibleNarrative } = require("../lib/scene-protocol.ts");

test("modelowy HTML pozostaje bezpiecznym tekstem, podstawowy Markdown jest renderowany", () => {
  const text = visibleNarrative('ZERO: &#x4E;&#x20;**dowód** i _zapis_ &lt;img src=x onerror=alert(1)&gt;').text;
  const html = renderToStaticMarkup(React.createElement(Transmission, { blocks: parseTransmission(text) }));
  assert.ok(html.includes('N <strong>dowód</strong>'));
  assert.ok(html.includes('<em>zapis</em>'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('&#x4E;'));
});
test("nagranie nie renderuje się przed odkryciem; sam modal nie ładuje ani nie odtwarza filmu", () => {
  const props = { disabled: false, epoch: "test", onCommand() {}, onRecordingEvent() {} };
  assert.equal(renderToStaticMarkup(React.createElement(Resources, { ...props, state: EMPTY_SCENE })), "");
  const html = renderToStaticMarkup(React.createElement(Resources, { ...props, state: { ...EMPTY_SCENE, recording: true } }));
  assert.ok(html.includes("Odtwórz nagranie"));
  assert.ok(html.includes("LENA:"));
  assert.ok(html.includes("Fikcyjny materiał"));
  assert.ok(!html.includes("<video")); // odtwarzacz montowany dopiero po świadomym kliknięciu
  assert.ok(!html.includes("autoplay"));
});
test("brak źródła filmu nie ukrywa transkrypcji", () => {
  const source = recording.source;
  try {
    recording.source = null;
    const html = renderToStaticMarkup(React.createElement(Modal, { disabled: false, onEvent() {} }));
    assert.ok(html.includes("Nagranie wideo jeszcze niedostępne"));
    assert.ok(html.includes("LENA:"));
    assert.ok(html.includes("Zamknij"));
  } finally { recording.source = source; }
});

test("prefiks ZERO skopiowany z raportu jest dialogiem bez gwiazdek i encji", () => {
  const blocks = parseTransmission(visibleNarrative("**ZERO /&#x20;**&#x4A;eśli mnie słyszysz.").text);
  assert.equal(blocks[0].kind, "zero");
  const html = renderToStaticMarkup(React.createElement(Transmission, { blocks }));
  assert.ok(html.includes("zero-prefix")); assert.ok(html.includes("Jeśli mnie słyszysz."));
  assert.ok(!html.includes("**")); assert.ok(!html.includes("&#x"));
});

const PacedTransmission = require("../app/paced-transmission.tsx").default;
const entityFixture = "**ZERO /&#x20;**&#x50;otwierdzone.";
function renderPaced(text, streaming = false, normalized = false) {
  return renderToStaticMarkup(React.createElement(PacedTransmission, {
    id: "entity-fixture", text, streaming, normalized, animate: false, skip: false,
    onPlaying() {}, onProgress() {}, onCommand() {}, commandsDisabled: true,
  }));
}
test("pełny fragment użytkownika przechodzi przez rzeczywisty PacedTransmission", () => {
  const html = renderPaced(entityFixture);
  assert.equal(html.replace(/<[^>]*>/g, ""), "ZERO / Potwierdzone.");
});
test("każdy częściowy prefiks fragmentu nie pokazuje encji ani gwiazdek podczas streamingu", () => {
  for (let end = 0; end <= entityFixture.length; end++) {
    const html = renderPaced(entityFixture.slice(0, end), true);
    assert.ok(!html.includes("*"), `gwiazdka przy podziale ${end}: ${html}`);
    assert.ok(!html.includes("&#x") && !html.includes("&amp;#"), `encja przy podziale ${end}: ${html}`);
  }
});

test("POST /api/chat → SSE → PacedTransmission: encja przecięta w każdym miejscu", { timeout: 20000 }, async () => {
  const { POST } = await import("../app/api/chat/route.ts");
  const { cookieName, createSession } = await import("../lib/auth.ts");
  const { randomUUID } = await import("node:crypto");
  process.env.NODE_ENV = "development";
  process.env.CHAT_PASSWORD = "test-workshop-password";
  process.env.SESSION_SECRET = "local-test-session-secret-32-characters-minimum";
  process.env.OPENROUTER_API_KEY = "local-test-key";
  process.env.OPENROUTER_MODEL = "test/model";
  const encoder = new TextEncoder();
  const raw = JSON.stringify({ text: entityFixture, scene: EMPTY_SCENE });
  const frame = (content, finish = null) => encoder.encode(`data: ${JSON.stringify({ id: "fixture", object: "chat.completion.chunk", created: 1, model: "test/model", choices: [{ index: 0, delta: finish ? {} : { role: "assistant", content }, finish_reason: finish }] })}\n\n`);
  const dataParts = output => output.split("\n").filter(line => line.startsWith("data: {")).map(line => JSON.parse(line.slice(6)));
  for (const entity of ["&#x20;", "&#x50;"]) for (let offset = 1; offset < entity.length; offset++) {
    const split = raw.indexOf(entity) + offset;
    let upstream;
    globalThis.fetch = async (url) => {
      assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
      return new Response(new ReadableStream({ start(controller) {
        upstream = controller; controller.enqueue(frame(raw.slice(0, split)));
      } }), { headers: { "Content-Type": "text/event-stream" } });
    };
    try {
      const response = await POST(new Request("http://localhost/api/chat", {
        method: "POST", headers: { Origin: "http://localhost", "Content-Type": "application/json", Cookie: `${cookieName()}=${createSession()}` },
        body: JSON.stringify({ id: randomUUID(), messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Test lokalny" }] }] }),
      }));
      assert.equal(response.status, 200);
      const reader = response.body.getReader(); let output = "";
      while (!output.includes('"type":"text-delta"')) {
        const item = await reader.read(); assert.equal(item.done, false);
        output += new TextDecoder().decode(item.value);
      }
      const check = (all, complete = false) => {
        let text = "";
        assert.equal(all.find(part => part.type === "start").messageMetadata.narrativeNormalized, true);
        for (const part of all) if (part.type === "text-delta") {
          text += part.delta;
          const html = renderPaced(text, true, true);
          assert.ok(!html.includes("*") && !html.includes("&#x") && !html.includes("&amp;#"), `${entity}/${offset}: ${html}`);
        }
        if (complete) assert.equal(renderPaced(text, false, true).replace(/<[^>]*>/g, ""), "ZERO / Potwierdzone.");
      };
      check(dataParts(output)); // prawdziwa pauza upstream przed końcem encji
      upstream.enqueue(frame(raw.slice(split))); upstream.enqueue(frame("", "stop"));
      upstream.enqueue(encoder.encode("data: [DONE]\n\n")); upstream.close();
      for (;;) { const item = await reader.read(); if (item.done) break; output += new TextDecoder().decode(item.value); }
      check(dataParts(output), true);
    } finally {
      globalThis.fetch = async () => { throw new Error("Test blokuje prawdziwą sieć"); };
    }
  }
});
