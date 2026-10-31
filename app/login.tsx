"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function Login({ configurationError }: { configurationError?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy || configurationError) return;
    setShowPassword(false);
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
        <div className="password-field">
          <input id="password" name="password" type={showPassword ? "text" : "password"}
            autoComplete="current-password" autoCapitalize="none" spellCheck={false} maxLength={1024}
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || !!configurationError} required />
          <button className="password-toggle" type="button" aria-controls="password"
            aria-label="Pokaż hasło" aria-pressed={showPassword}
            title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            onClick={() => setShowPassword((visible) => !visible)} disabled={busy || !!configurationError}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword && <path d="m3 3 18 18" />}
            </svg>
          </button>
        </div>
        <button type="submit" disabled={!password || busy || !!configurationError}>{busy ? "Czekaj…" : "Wejdź"}</button>
      </form>
      {(configurationError || error) && <p className="chat-error" role="alert">{configurationError || error}</p>}
    </main>
  );
}
