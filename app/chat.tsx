"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function Chat() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [message, setMessage] = useState("");
  const { messages, sendMessage, status, error, clearError, stop } = useChat({
    transport,
    onError: (error) => { if (error.message.startsWith("Sesja:")) router.refresh(); },
  });
  const conversationRef = useRef<HTMLElement>(null);
  const busy = status === "submitted" || status === "streaming";

  async function logout() {
    setLeaving(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout");
      await stop();
      // Pełna nawigacja usuwa także historię rozmowy z pamięci interfejsu.
      window.location.replace("/");
    } catch { setLogoutError("Nie udało się wyjść. Spróbuj ponownie."); setLeaving(false); }
  }

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, status]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy || leaving) return;
    clearError();
    void sendMessage({ text });
    setMessage("");
  }

  return (
    <main>
      <div className="chat-heading">
        <h1>NetRunner</h1>
        <button className="logout-button" type="button" onClick={logout} disabled={leaving}>{leaving ? "Czekaj…" : "Wyjdź"}</button>
      </div>
      {logoutError && <p className="chat-error" role="alert">{logoutError}</p>}
      <section ref={conversationRef} className="conversation" aria-label="Rozmowa" role="log" aria-live="polite" aria-busy={busy}>
        {messages.map((entry) => {
          const text = entry.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
          return text ? (
            <p className={`message message--${entry.role}`} key={entry.id}>
              <span className="message-author">{entry.role === "user" ? "Ty" : "NetRunner"}</span>
              {text}
            </p>
          ) : null;
        })}
      </section>
      {busy && <p className="chat-status" role="status">{status === "submitted" ? "NetRunner myśli…" : "NetRunner pisze…"}</p>}
      {error && (
        <p className="chat-error" role="alert">
          {error.message.startsWith("Brak konfiguracji") || error.message.startsWith("OpenRouter:") || error.message.startsWith("Sesja:")
            ? error.message
            : "Nie udało się uzyskać odpowiedzi AI. Sprawdź połączenie, klucz, model i środki w OpenRouter lub spróbuj ponownie."}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="message">Wiadomość</label>
        <div className="compose">
          <input id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Napisz wiadomość…" autoComplete="off" disabled={busy || leaving} />
          <button type="submit" disabled={!message.trim() || busy || leaving}>Wyślij</button>
        </div>
      </form>
    </main>
  );
}
