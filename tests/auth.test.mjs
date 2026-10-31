import assert from "node:assert/strict";
import { test } from "node:test";
import { POST as login } from "../app/api/auth/login/route.ts";
import { POST as logout } from "../app/api/auth/logout/route.ts";
import { POST as chat } from "../app/api/chat/route.ts";
import { authConfigured, cookieName, createSession, sameOrigin, SESSION_SECONDS, sessionCookie, verifySession } from "../lib/auth.ts";

// Sekrety wyłącznie testowe. Nigdy nie ładujemy prawdziwego .env.local.
process.env.NODE_ENV = "development";
process.env.CHAT_PASSWORD = "test-workshop-password";
process.env.SESSION_SECRET = "local-test-session-secret-32-characters-minimum";
process.env.OPENROUTER_API_KEY = "never-call-openrouter";
process.env.OPENROUTER_MODEL = "test/model";
delete process.env.VERCEL;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error("Sieć zablokowana w teście"); };

const makeRequest = (path, body = {}, token, origin = "http://localhost") => new Request(`http://localhost${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin,
    ...(token ? { Cookie: `${cookieName()}=${token}` } : {}),
  }, body: JSON.stringify(body),
});

test("hasło i sesja warsztatowa — bez płatnych wywołań", async (t) => {
  let token;
  await t.test("Origin odpowiada rzeczywistemu Host, także gdy Next normalizuje URL", () => {
    for (const host of ["127.0.0.1:3000", "localhost:3000"]) {
      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST", headers: { Host: host, Origin: `http://${host}` },
      });
      assert.equal(sameOrigin(request), true);
      request.headers.set("origin", "https://obca.example");
      assert.equal(sameOrigin(request), false);
      request.headers.set("x-forwarded-host", "obca.example");
      assert.equal(sameOrigin(request), false);
      request.headers.set("origin", `http://${host}`);
      request.headers.set("sec-fetch-site", "cross-site");
      assert.equal(sameOrigin(request), false);
    }
    assert.equal(sameOrigin(new Request("http://localhost/api/auth/login")), false);
  });
  await t.test("błędne hasło: 401 i brak cookie", async () => {
    const response = await login(makeRequest("/api/auth/login", { password: "błędne" }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  await t.test("poprawne hasło: podpisana sesja bez hasła i z flagami cookie", async () => {
    const response = await login(makeRequest("/api/auth/login", { password: "test-workshop-password" }));
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /Max-Age=28800/);
    token = cookie.split(";")[0].split("=")[1];
    assert.equal(verifySession(token), true);
    const payload = Buffer.from(token.split(".")[0], "base64url").toString();
    assert.ok(!payload.includes("test-workshop-password"));
    assert.ok(!payload.includes("local-test-session-secret"));
    assert.match(response.headers.get("cache-control"), /no-store/);
  });

  await t.test("sesja wygasa; zmieniony token, hasło lub sekret odrzucają sesję", () => {
    assert.equal(verifySession(token, Date.now() + (SESSION_SECONDS + 1) * 1000), false);
    assert.equal(verifySession(`${token}x`), false);
    assert.equal(verifySession("invalid.cookie"), false);
    process.env.CHAT_PASSWORD = "inne-hasło";
    assert.equal(verifySession(token), false);
    process.env.CHAT_PASSWORD = "test-workshop-password";
    process.env.SESSION_SECRET = "another-test-secret-32-characters-minimum";
    assert.equal(verifySession(token), false);
    process.env.SESSION_SECRET = "local-test-session-secret-32-characters-minimum";
  });

  await t.test("wyjście usuwa cookie; po jego usunięciu czat zwraca 401", async () => {
    const response = await logout(makeRequest("/api/auth/logout", {}, token));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
    assert.match(response.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await chat(makeRequest("/api/chat", { messages: [] }))).status, 401);
  });

  await t.test("bez sesji, z fałszywą lub wygasłą sesją API nie wywołuje OpenRouter", async () => {
    for (const value of [undefined, `${token}x`, createSession(Date.now() - (SESSION_SECONDS + 1) * 1000)]) {
      assert.equal((await chat(makeRequest("/api/chat", { messages: [] }, value))).status, 401);
    }
    assert.equal(networkCalls, 0);
  });

  await t.test("brak hasła lub słaby/brak sekretu blokują logowanie i API", async () => {
    for (const [name, value] of [["CHAT_PASSWORD", ""], ["SESSION_SECRET", ""], ["SESSION_SECRET", "short"]]) {
      process.env[name] = value;
      assert.equal(authConfigured(), false);
      assert.equal((await login(makeRequest("/api/auth/login", { password: "test-workshop-password" }))).status, 503);
      assert.equal((await chat(makeRequest("/api/chat", {}, token))).status, 503);
      process.env.CHAT_PASSWORD = "test-workshop-password";
      process.env.SESSION_SECRET = "local-test-session-secret-32-characters-minimum";
    }
    assert.equal(networkCalls, 0);
  });

  await t.test("próby z innej strony są odrzucane", async () => {
    assert.equal((await login(makeRequest("/api/auth/login", {}, undefined, "https://obca.example"))).status, 403);
    assert.equal((await logout(makeRequest("/api/auth/logout", {}, token, "https://obca.example"))).status, 403);
    assert.equal((await chat(makeRequest("/api/chat", {}, token, "https://obca.example"))).status, 403);
  });

  await t.test("po 5 próbach również poprawne hasło jest ograniczane; okno wygasa", async () => {
    // Dwie wcześniejsze próby zużyły dwa miejsca w lokalnym oknie.
    for (let i = 0; i < 3; i++) {
      assert.equal((await login(makeRequest("/api/auth/login", { password: "błędne" }))).status, 401);
    }
    const blocked = await login(makeRequest("/api/auth/login", { password: "test-workshop-password" }));
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
    const realNow = Date.now;
    Date.now = () => realNow() + 61_000;
    try { assert.equal((await login(makeRequest("/api/auth/login", { password: "test-workshop-password" }))).status, 200); }
    finally { Date.now = realNow; }
  });

  await t.test("produkcja wymaga globalnego limitu i ustawia Secure", async () => {
    process.env.NODE_ENV = "production";
    try {
      const cookie = sessionCookie(createSession());
      assert.match(cookie, /^__Host-netrunner_session=/);
      assert.match(cookie, /; Secure/);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Strict/);
      assert.equal((await login(makeRequest("/api/auth/login", { password: "test-workshop-password" }))).status, 503);
      assert.equal(networkCalls, 0);
    } finally { process.env.NODE_ENV = "development"; }
  });

  await t.test("Vercel: brak reguły/awaria blokuje logowanie, limit daje 429, działająca reguła pozwala wejść", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    try {
      for (const [firewallStatus, expectedStatus] of [[404, 503], [500, 503], [429, 429], [204, 200]]) {
        globalThis.fetch = async (url, options) => {
          assert.equal(String(url), "https://workshop.example/.well-known/vercel/rate-limit-api/netrunner-login");
          assert.equal(options.method, "GET");
          assert.ok(options.headers.get("x-vercel-rate-limit-key").startsWith("netrunner-workshop-"));
          return new Response(null, { status: firewallStatus });
        };
        const request = new Request("https://workshop.example/api/auth/login", {
          method: "POST", headers: { Host: "workshop.example", Origin: "https://workshop.example", "Content-Type": "application/json" },
          body: JSON.stringify({ password: "test-workshop-password" }),
        });
        assert.equal((await login(request)).status, expectedStatus);
      }
    } finally { process.env.NODE_ENV = "development"; delete process.env.VERCEL; }
  });
});
