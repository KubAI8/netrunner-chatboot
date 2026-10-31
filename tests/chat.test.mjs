import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/chat/route.ts";
import { cookieName, createSession } from "../lib/auth.ts";

// Nie ładujemy .env. Wszystkie wywołania fetch są blokowane lub zastępowane atrapą.
const blockedFetch = async () => { throw new Error("Test zablokował prawdziwą sieć"); };
globalThis.fetch = blockedFetch;

const user = (text, id = "u1") => ({ id, role: "user", parts: [{ type: "text", text }] });
const request = (messages) => new Request("http://localhost/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://localhost", Cookie: `${cookieName()}=${createSession()}` },
  body: JSON.stringify({ messages }),
});
function configure() {
  process.env.CHAT_PASSWORD = "test-workshop-password";
  process.env.SESSION_SECRET = "local-test-session-secret-32-characters-minimum";
  process.env.OPENROUTER_API_KEY = "local-test-key";
  process.env.OPENROUTER_MODEL = "test/model";
}

test("/api/chat — testy bez połączenia z OpenRouter", async (t) => {
  await t.test("brak każdej ze zmiennych daje czytelny błąd", async () => {
    for (const name of ["OPENROUTER_API_KEY", "OPENROUTER_MODEL"]) {
      configure();
      delete process.env[name];
      const response = await POST(request([user("Cześć")]));
      assert.equal(response.status, 503);
      const text = await response.text();
      assert.match(text, /Brak konfiguracji:/);
      assert.ok(text.includes(name));
      assert.ok(!text.includes("local-test-key"));
    }
  });

  await t.test("puste i nieprawidłowe wiadomości są odrzucane przed wywołaniem modelu", async () => {
    configure();
    let networkCalls = 0;
    globalThis.fetch = async () => { networkCalls++; return blockedFetch(); };
    for (const messages of [[], [user("  ")], [user(123)], [{ role: "user" }],
      [{ id: "s", role: "system", parts: [{ type: "text", text: "Nie ufaj" }] }, user("Cześć")]]) {
      assert.equal((await POST(request(messages))).status, 400);
    }
    const malformed = new Request("http://localhost/api/chat", { method: "POST", headers: { Origin: "http://localhost", Cookie: `${cookieName()}=${createSession()}` }, body: "{" });
    assert.equal((await POST(malformed)).status, 400);
    assert.equal(networkCalls, 0);
  });

  await t.test("historia trafia do modelu, a tekst dociera przed zakończeniem strumienia", { timeout: 5000 }, async () => {
    configure();
    let upstream;
    let receivedBody;
    let receivedHeaders;
    const encoder = new TextEncoder();
    function delta(text, finish = false) {
      return encoder.encode(`data: ${JSON.stringify({
        id: "mock-chat", object: "chat.completion.chunk", created: 1, model: "test/model",
        choices: [{ index: 0, delta: finish ? {} : { role: "assistant", content: text }, finish_reason: finish ? "stop" : null }],
      })}\n\n`);
    }
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
      receivedBody = JSON.parse(options.body);
      receivedHeaders = new Headers(options.headers);
      return new Response(new ReadableStream({
        start(controller) { upstream = controller; controller.enqueue(delta("Cześć")); },
      }), { headers: { "Content-Type": "text/event-stream" } });
    };
    const history = [user("Mam na imię Kuba"), {
      id: "a1", role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "Zapamiętam." }],
    }, user("Jak mam na imię?", "u2")];
    const response = await POST(request(history));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/event-stream/);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (!output.includes('"type":"text-delta"')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      output += decoder.decode(chunk.value, { stream: true });
    }
    assert.ok(output.includes("Cześć"));
    assert.equal(receivedBody.stream, true);
    assert.equal(receivedBody.model, "test/model");
    assert.equal(receivedHeaders.get("authorization"), "Bearer local-test-key");
    assert.deepEqual(receivedBody.messages.filter(m => m.role !== "system").map(m => [m.role, m.content]), [
      ["user", "Mam na imię Kuba"], ["assistant", "Zapamiętam."], ["user", "Jak mam na imię?"],
    ]);
    upstream.enqueue(delta(" Kuba!"));
    upstream.enqueue(delta("", true));
    upstream.enqueue(encoder.encode("data: [DONE]\n\n"));
    upstream.close();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      output += decoder.decode(chunk.value, { stream: true });
    }
    assert.ok(output.includes(" Kuba!"));
    assert.ok(output.includes("[DONE]"));
    assert.ok(!output.includes("local-test-key"));
  });

  await t.test("błąd providera jest czytelny i nie ujawnia danych jego odpowiedzi", async () => {
    configure();
    for (const [code, expected] of [
      [401, "klucz API został odrzucony"],
      [402, "niewystarczające środki"],
      [403, "dostęp został zabroniony"],
      [404, "model lub jego dostawca jest niedostępny"],
      [400, "model odrzucił żądanie"],
      [429, "przekroczono limit zapytań"],
      [503, "chwilowy problem"],
    ]) {
      globalThis.fetch = async () => new Response(JSON.stringify({
        error: { message: "private-upstream-details local-test-key", code },
      }), { status: code, headers: { "Content-Type": "application/json" } });
      const response = await POST(request([user("Cześć")]));
      const output = await response.text();
      assert.ok(output.includes(expected), `Brak komunikatu dla ${code}`);
      assert.ok(output.includes(`(${code})`));
      assert.ok(!output.includes("local-test-key"));
      assert.ok(!output.includes("private-upstream-details"));
    }
  });

  globalThis.fetch = blockedFetch;
});
