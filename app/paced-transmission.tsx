"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { visibleNarrative } from "../lib/scene-protocol.ts";
import { parseTransmission } from "../lib/transmission.ts";
import { advancePlayback, visiblePlayback, OPENING_DELAY_MS, REPLY_DELAY_MS, type PlaybackCursor } from "../lib/transmission-playback.ts";
import Transmission from "./transmission";

type Props = {
  id: string;
  text: string;
  animate: boolean;
  streaming: boolean;
  skip: boolean;
  onPlaying: (id: string, playing: boolean) => void;
  onProgress: () => void;
  onCommand: (command: string) => void;
  commandsDisabled: boolean;
  normalized?: boolean;
};

export default function PacedTransmission({ id, text, animate, streaming, skip, onPlaying, onProgress, onCommand, commandsDisabled, normalized = false }: Props) {
  const blocks = useMemo(() => parseTransmission(visibleNarrative(text, !streaming, !normalized).text, streaming), [text, streaming, normalized]);
  const latest = useRef({ blocks, streaming });
  latest.current = { blocks, streaming };
  const [cursor, setCursor] = useState<PlaybackCursor>({ index: 0, characters: 0 });
  const [waiting, setWaiting] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const immediate = !animate || skip || reducedMotion;
  const playing = !immediate && (waiting || cursor.index < blocks.length || streaming);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReducedMotion(query.matches);
    changed();
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    if (immediate) return;
    let position: PlaybackCursor = { index: 0, characters: 0 };
    setCursor(position);
    setWaiting(true);
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      setWaiting(false);
      const frame = advancePlayback(latest.current.blocks, position, latest.current.streaming);
      const next = frame.cursor;
      position = next;
      setCursor(previous => previous.index === next.index && previous.characters === next.characters ? previous : next);
      if (!frame.done) timer = setTimeout(tick, frame.delay);
    }
    timer = setTimeout(tick, id === "zero-opening" ? OPENING_DELAY_MS : REPLY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [id, immediate]);

  useEffect(() => { onPlaying(id, playing); }, [id, playing, onPlaying]);
  useEffect(() => { onProgress(); }, [cursor, waiting, text, immediate, onProgress]);

  const visible = immediate ? blocks : visiblePlayback(blocks, cursor);
  const current = blocks[cursor.index];
  const thinking = playing && (waiting || !current || current.kind === "terminal" || cursor.characters === 0);
  return (
    <>
      <Transmission blocks={visible} onCommand={onCommand} commandsDisabled={commandsDisabled} />
      {thinking && <div className="zero-thinking" aria-hidden="true"><span className="zero-prefix">ZERO / </span><span className="thinking-dots">…</span></div>}
    </>
  );
}
