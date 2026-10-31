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
            onClick={() => setShowPassword((visible) => !visible)} disabled={busy || !!configurationError}>
            {showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          </button>
        </div>
        <button type="submit" disabled={!password || busy || !!configurationError}>{busy ? "Czekaj…" : "Wejdź"}</button>
      </form>
      {(configurationError || error) && <p className="chat-error" role="alert">{configurationError || error}</p>}
    </main>
  );
}
