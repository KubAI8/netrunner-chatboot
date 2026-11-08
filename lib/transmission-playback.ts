import type { TransmissionBlock } from "./transmission.ts";

export type PlaybackCursor = { index: number; characters: number };
export const OPENING_DELAY_MS = 1200;
export const REPLY_DELAY_MS = 750;

// Wyłącznie tempo prezentacji. Nie zmienia historii, czasu ani stanu gry.
export function advancePlayback(blocks: TransmissionBlock[], cursor: PlaybackCursor, streaming: boolean) {
  const block = blocks[cursor.index];
  const complete = cursor.index < blocks.length - 1 || !streaming || block?.closed;
  if (!block) return { cursor, delay: 40, done: !streaming };
  if (block.kind === "terminal") {
    return block.closed || !streaming
      ? { cursor: { index: cursor.index + 1, characters: 0 }, delay: 280, done: false }
      : { cursor, delay: 40, done: false };
  }
  // Nie wypisujemy po literze niekompletnego nagłówka napływającego ze strumienia.
  if (streaming && /^\[[^\]]*$/.test(block.content)) return { cursor, delay: 40, done: false };
  const letters = Array.from(block.content);
  if (cursor.characters < letters.length) {
    const letter = letters[cursor.characters];
    return {
      cursor: { index: cursor.index, characters: cursor.characters + 1 },
      delay: /[.!?…]/.test(letter) ? 120 : /[,;:]/.test(letter) ? 60 : 16,
      done: false,
    };
  }
  return complete
    ? { cursor: { index: cursor.index + 1, characters: 0 }, delay: /^(?:\.{3}|…)$/.test(block.content.trim()) ? 650 : 320, done: false }
    : { cursor, delay: 40, done: false };
}

export function visiblePlayback(blocks: TransmissionBlock[], cursor: PlaybackCursor): TransmissionBlock[] {
  const visible = blocks.slice(0, cursor.index);
  const current = blocks[cursor.index];
  if (current && current.kind !== "terminal" && cursor.characters > 0) {
    visible.push({ ...current, content: Array.from(current.content).slice(0, cursor.characters).join("") });
  }
  return visible;
}
