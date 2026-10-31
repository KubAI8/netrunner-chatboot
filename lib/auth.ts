import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_SECONDS = 8 * 60 * 60;
export const AUTH_CONFIG_ERROR = "Brak konfiguracji ochrony. Ustaw CHAT_PASSWORD i SESSION_SECRET (minimum 32 znaki) na serwerze.";

function config() {
  const password = process.env.CHAT_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password?.trim() || !secret || Buffer.byteLength(secret) < 32) return null;
  // Zmiana hasła lub sekretu unieważnia dotychczasowe podpisy.
  return { password, key: createHmac("sha256", secret).update("netrunner-session\0").update(password).digest() };
}

export function authConfigured() { return config() !== null; }

export function passwordMatches(candidate: string) {
  const settings = config();
  if (!settings) return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(candidate), digest(settings.password));
}

export function cookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-netrunner_session" : "netrunner_session";
}

export function createSession(now = Date.now()) {
  const settings = config();
  if (!settings) throw new Error(AUTH_CONFIG_ERROR);
  const issued = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, iat: issued, exp: issued + SESSION_SECONDS, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", settings.key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined, now = Date.now()) {
  const settings = config();
  if (!settings || !token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", settings.key).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const current = Math.floor(now / 1000);
    return data.v === 1 && Number.isSafeInteger(data.iat) && Number.isSafeInteger(data.exp) &&
      data.iat <= current && data.exp > current && data.exp - data.iat === SESSION_SECONDS &&
      typeof data.nonce === "string" && /^[a-f0-9]{32}$/.test(data.nonce);
  } catch { return false; }
}

export function sessionCookie(token: string, remove = false) {
  return `${cookieName()}=${remove ? "" : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : SESSION_SECONDS}${remove ? "; Expires=Thu, 01 Jan 1970 00:00:00 GMT" : ""}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function requestSession(request: Request) {
  const values = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim())
    .filter(value => value.startsWith(`${cookieName()}=`));
  return values.length === 1 ? values[0].slice(cookieName().length + 1) : undefined;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  // Next.js może normalizować request.url do localhost mimo wejścia przez 127.0.0.1.
  // Host pochodzi z faktycznego żądania; nie ufamy x-forwarded-host od klienta.
  const target = new URL(request.url);
  const host = request.headers.get("host");
  if (host) {
    if (!/^[a-zA-Z0-9.:[\]-]+$/.test(host)) return false;
    target.host = host;
  }
  return origin === target.origin;
}

export function requireSession(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authConfigured()) return new Response(AUTH_CONFIG_ERROR, { status: 503, headers });
  if (!verifySession(requestSession(request))) {
    return new Response("Sesja: zaloguj się ponownie, aby korzystać z czatu.", { status: 401, headers });
  }
  if (!sameOrigin(request)) return new Response("Żądanie z niedozwolonej strony.", { status: 403, headers });
  return null;
}
