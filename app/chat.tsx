"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { zeroOpeningMessage } from "../lib/zero-opening.ts";
import PacedTransmission from "./paced-transmission";
import SceneResources from "./scene-resources";
import { visibleNarrative } from "../lib/scene-protocol.ts";
import type { RecordingEvent, RecordingReport } from "../lib/scene-session.ts";
import { EMPTY_SCENE, gameCommand, getSceneState, isGameRestart } from "../lib/scene-state.ts";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const initialMessages = [zeroOpeningMessage];

export default function Chat() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [technicalNotice, setTechnicalNotice] = useState(false);
  const recordingReport = useRef<RecordingReport>({ epoch: "", events: [] });
  const [message, setMessage] = useState("");
  const [playback, setPlayback] = useState({ id: "zero-opening", playing: true });
  const [revealedMessage, setRevealedMessage] = useState<string | null>(null);
  const [presentedScene, setPresentedScene] = useState(EMPTY_SCENE);
  const { messages, sendMessage, status, error, clearError, stop } = useChat({
    transport,
    messages: initialMessages,
    onData: part => { if (part.type === "data-app-notice") setTechnicalNotice(true); },
    onError: (error) => { if (error.message.startsWith("Sesja:")) router.refresh(); },
  });
  const conversationRef = useRef<HTMLElement>(null);
  const submittingRef = useRef(false);
  const latestAssistantId = messages.findLast(entry => entry.role === "assistant" && entry.parts.some(part => part.type === "text" && part.text.trim()))?.id;
  const presenting = !!latestAssistantId && (playback.id !== latestAssistantId || playback.playing);
  const networkBusy = status === "submitted" || status === "streaming";
  const busy = networkBusy || presenting;
  const sceneState = useMemo(() => getSceneState(messages), [messages]);
  const latestMetadata = messages.findLast(entry => entry.role === "assistant" && entry.metadata)?.metadata as { sceneEpoch?: string } | undefined;
  const sceneEpoch = latestMetadata?.sceneEpoch ?? "";
  const recordEvent = (event: RecordingEvent) => {
    const previous = recordingReport.current;
    recordingReport.current = { epoch: sceneEpoch, events: [...(previous.epoch === sceneEpoch ? previous.events : []), event].slice(-64) };
  };
  const latestUser = messages.findLast(entry => entry.role === "user");
  const resettingScene = !!latestUser && (isGameRestart(latestUser) || gameCommand(latestUser) === "koniec gry");
  const channelStatus = leaving ? "Zamykanie sesji" : error ? "Błąd transmisji" : busy ? "ZERO pisze…" : "Kanał otwarty";
  const playbackChanged = useCallback((id: string, playing: boolean) => {
    if (id === latestAssistantId) setPlayback(previous => previous.id === id && previous.playing === playing ? previous : { id, playing });
  }, [latestAssistantId]);
  const scrollConversation = useCallback(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, []);
  useEffect(() => {
    if (resettingScene) setPresentedScene(EMPTY_SCENE);
    else if (!presenting) setPresentedScene(sceneState);
  }, [sceneState, presenting, resettingScene]);

  function submitAction(text: string) {
    if (!text.trim() || busy || leaving || submittingRef.current) return false;
    submittingRef.current = true;
    clearError();
    const action = { id: "pending", role: "user" as const, parts: [{ type: "text" as const, text: text.trim() }] };
    if (isGameRestart(action) || gameCommand(action) === "koniec gry") {
      recordingReport.current = { epoch: "", events: [] };
      setPresentedScene(EMPTY_SCENE);
      setTechnicalNotice(false);
    }
    void sendMessage({ text: text.trim() }, { body: { recordingReport: recordingReport.current } }).finally(() => { submittingRef.current = false; });
    return true;
  }

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
    if (submitAction(text)) setMessage("");
  }

  return (
    <main className="netrunner-screen">
      <div className="chat-heading">
        <div><h1>NetRunner</h1><p className="protocol-label">PROTOKÓŁ ZERO / KANAŁ LABORATORIUM</p></div>
        <button className="logout-button" type="button" onClick={logout} disabled={leaving}>{leaving ? "Czekaj…" : "Wyjdź"}</button>
      </div>
      {logoutError && <p className="chat-error" role="alert">{logoutError}</p>}
      <div className="mission-layout">
      <section className="chat-channel" aria-label="Kanał ZERO">
      <div className="channel-bar">
        <span>LAB / 03:17</span>
        <span className={`channel-state${busy ? " channel-state--busy" : ""}${error ? " channel-state--error" : ""}`} role="status"><span className="channel-dot" aria-hidden="true" />{channelStatus}</span>
      </div>
      <SceneResources state={presentedScene} disabled={busy || leaving} onCommand={submitAction} onRecordingEvent={recordEvent} epoch={sceneEpoch} />
      <section ref={conversationRef} className="conversation" aria-label="Rozmowa" role="log" aria-live="polite" aria-busy={busy}>
        {messages.map((entry) => {
          const text = entry.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
          return text ? (
            <article className={`message message--${entry.role}`} key={entry.id}>
              <span className="message-author">{entry.role === "user" ? "> OPERATOR" : "TRANSMISJA / ZERO"}</span>
              {entry.role === "user" ? text : <PacedTransmission
                id={entry.id} text={text} normalized={!!(entry.metadata as { narrativeNormalized?: boolean } | undefined)?.narrativeNormalized} animate={entry.id === latestAssistantId}
                streaming={entry.id === latestAssistantId && networkBusy}
                skip={revealedMessage === entry.id} onPlaying={playbackChanged} onProgress={scrollConversation}
                onCommand={submitAction} commandsDisabled={busy || leaving || entry.id !== latestAssistantId}
              />}
            </article>
          ) : null;
        })}
      </section>
      {(technicalNotice || messages.some(entry => entry.role === "assistant" && entry.parts.some(part =>
        part.type === "text" && visibleNarrative(part.text).technicalNotice))) && <p className="chat-error" role="status">Pojawił się techniczny komunikat aplikacji. Nie jest częścią fabuły.</p>}
      <div className="transmission-controls">
        {networkBusy && <button className="stop-button" type="button" onClick={() => { void stop(); }} disabled={leaving}>Zatrzymaj odbiór</button>}
        {presenting && <button className="stop-button" type="button" onClick={() => setRevealedMessage(latestAssistantId ?? null)} disabled={leaving}>Pokaż całość</button>}
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error.message.startsWith("Brak konfiguracji") || error.message.startsWith("OpenRouter:") || error.message.startsWith("Sesja:")
            ? error.message
            : "Nie udało się uzyskać odpowiedzi AI. Sprawdź połączenie, klucz, model i środki w OpenRouter lub spróbuj ponownie."}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="message">Twoje działanie</label>
        <div className="compose">
          <input id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Napisz do ZERO…" autoComplete="off" disabled={busy || leaving} />
          <button type="submit" disabled={!message.trim() || busy || leaving}>Wyślij</button>
        </div>
      </form>
      </section>
      </div>
    </main>
  );
}
