"use client";

import { useId, useRef, useState } from "react";
import type { RecordingEvent } from "../lib/scene-session.ts";
import { recording } from "../lib/recording.ts";

export default function RecordingModal({ disabled, onEvent }: { disabled: boolean; onEvent: (event: RecordingEvent) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  const [videoError, setVideoError] = useState(false);

  function showRecording() {
    dialogRef.current?.showModal();
    setVideoError(false);
    setOpen(true);
    onEvent("opened");
    if (!recording.source) onEvent("unavailable");
  }

  function closed() {
    // Usuwa odtwarzacz, więc zamknięcie zatrzymuje także dźwięk i iframe.
    setOpen(false);
    onEvent("closed");
    triggerRef.current?.focus();
  }

  return (
    <>
      <button ref={triggerRef} className="recording-trigger" type="button" disabled={disabled} onClick={showRecording} aria-haspopup="dialog">
        <span aria-hidden="true">▷</span> Odtwórz nagranie
      </button>
      <dialog ref={dialogRef} className="recording-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-notice`} onClose={closed}>
        <div className="recording-header">
          <div><span className="eyebrow">MONITORING / M-17</span><h2 id={`${id}-title`}>Monitoring / zapis M-17</h2></div>
          <button className="recording-close" type="button" onClick={() => dialogRef.current?.close()} autoFocus>Zamknij</button>
        </div>
        <p id={`${id}-notice`} className="recording-notice">Fikcyjny materiał z laboratorium korporacji Arasaka</p>
        {recording.source ? (
          <>
            {open && (recording.source.kind === "video"
              ? <video className="recording-player" src={recording.source.url} onPlay={() => onEvent("started")} onError={() => { setVideoError(true); onEvent("unavailable"); }} controls playsInline preload="none" aria-label="Ilustracja klimatu laboratorium korporacji Arasaka" />
              : <iframe className="recording-player" src={recording.source.url} title="Ilustracja klimatu laboratorium korporacji Arasaka" allow="fullscreen; picture-in-picture" allowFullScreen />)}
            <p className="recording-caption">Korytarz laboratorium — ilustracja monitoringu. Osoba w kadrze nie ma ustalonej tożsamości. Osobny zapis M-17 poniżej zawiera rozmowę Leny; film jej nie przedstawia.</p>
            {videoError && <p className="recording-unavailable" role="status">Nagranie wideo jest niedostępne. Transkrypcja pozostaje dostępna.</p>}
            <p className="recording-caption">Źródło i warunki wykorzystania: {recording.sourceAndLicense ?? "Do uzupełnienia."}</p>
          </>
        ) : <p className="recording-unavailable">Nagranie wideo jeszcze niedostępne</p>}
        <h3>Osobny zapis tekstowy / dzień 14</h3>
        <div className="recording-transcript">{recording.transcript}</div>
        <p className="recording-caption">Otwarcie okna i rozpoczęcie filmu zostaną zgłoszone przy następnej wiadomości do ZERO. Samo otwarcie nie wysyła zapytania.</p>
      </dialog>
    </>
  );
}
