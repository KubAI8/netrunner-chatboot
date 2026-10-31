import { AUTH_CONFIG_ERROR, authConfigured, createSession, passwordMatches, sameOrigin, sessionCookie } from "../../../../lib/auth.ts";
import { loginLimit } from "../../../../lib/login-limit.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return Response.json({ error: "Żądanie z niedozwolonej strony." }, { status: 403, headers });
  if (!authConfigured()) return Response.json({ error: AUTH_CONFIG_ERROR }, { status: 503, headers });
  const limit = await loginLimit(request);
  if (limit === "unavailable") return Response.json({ error: "Logowanie zablokowane: ochrona przed zgadywaniem hasła jest niedostępna. Skonfiguruj regułę netrunner-login w Vercel Firewall." }, { status: 503, headers });
  if (limit === "limited") return Response.json({ error: "Za dużo prób logowania. Poczekaj minutę." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });

  // Limit jest sprawdzany przed odczytaniem i porównaniem hasła.
  if (Number(request.headers.get("content-length")) > 4096) return Response.json({ error: "Żądanie jest zbyt duże." }, { status: 413, headers });
  let password: unknown;
  try { password = (await request.json())?.password; }
  catch { return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400, headers }); }
  if (typeof password !== "string" || !password || password.length > 1024) return Response.json({ error: "Wpisz hasło." }, { status: 400, headers });
  if (!passwordMatches(password)) return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401, headers });
  return Response.json({ ok: true }, { headers: { ...headers, "Set-Cookie": sessionCookie(createSession()) } });
}
