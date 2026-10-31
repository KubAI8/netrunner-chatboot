"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function Login({ configurationError }: { configurationError?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy || configurationError) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Logowanie nie powiodło się."); return; }
      setPassword("");
      router.refresh();
    } catch { setError("Nie udało się połączyć z serwerem. Spróbuj ponownie."); }
    finally { setBusy(false); }
  }

  return (
    <main className="login-screen">
      <h1>NetRunner</h1>
      <form onSubmit={enter}>
        <label className="login-label" htmlFor="password">Wpisz hasło</label>
        <input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024}
          value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || !!configurationError} required />
        <button type="submit" disabled={!password || busy || !!configurationError}>{busy ? "Czekaj…" : "Wejdź"}</button>
      </form>
      {(configurationError || error) && <p className="chat-error" role="alert">{configurationError || error}</p>}
    </main>
  );
}
