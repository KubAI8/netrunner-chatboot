import { sameOrigin, sessionCookie } from "../../../../lib/auth.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Żądanie z niedozwolonej strony." }, { status: 403 });
  return Response.json({ ok: true }, { headers: {
    "Cache-Control": "no-store",
    "Set-Cookie": sessionCookie("", true),
  } });
}
