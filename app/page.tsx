import { cookies } from "next/headers";
import { AUTH_CONFIG_ERROR, authConfigured, cookieName, verifySession } from "../lib/auth.ts";
import Chat from "./chat";
import Login from "./login";

export default async function Home() {
  const configured = authConfigured();
  const token = (await cookies()).get(cookieName())?.value;
  return configured && verifySession(token)
    ? <Chat />
    : <Login configurationError={configured ? undefined : AUTH_CONFIG_ERROR} />;
}
