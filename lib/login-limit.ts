import { checkRateLimit } from "@vercel/firewall";

// Licznik służy TYLKO lokalnemu developmentowi. Nie jest ochroną hostingu.
let localWindow = { expires: 0, attempts: 0 };
export async function loginLimit(request: Request) {
  if (process.env.NODE_ENV === "development" && process.env.VERCEL !== "1") {
    const host = new URL(request.url).hostname;
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return "unavailable";
    const now = Date.now();
    if (now >= localWindow.expires) localWindow = { expires: now + 60_000, attempts: 0 };
    return ++localWindow.attempts > 5 ? "limited" : "allowed";
  }

  // Brak Vercel lub działającej reguły nigdy nie uruchamia lokalnego fallbacku.
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") return "unavailable";
  try {
    const result = await checkRateLimit("netrunner-login", {
      request,
      rateLimitKey: "netrunner-workshop",
      timeout: 3000,
    });
    if (result.error === "not-found") return "unavailable";
    if (result.rateLimited || result.error === "blocked") return "limited";
    return "allowed";
  } catch { return "unavailable"; }
}
