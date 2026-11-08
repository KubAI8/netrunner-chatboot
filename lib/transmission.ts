export type TransmissionBlock = {
  kind: "terminal" | "zero" | "text";
  label?: string;
  content: string;
  closed?: true;
  tone?: "alert";
};

// Tylko prezentacja tekstu. Nagłówki z odpowiedzi nie wywołują żadnych operacji.
export function parseTransmission(text: string, streaming = false): TransmissionBlock[] {
  const chunks = text.replace(/\r\n/g, "\n")
    .replace(/^```(?:text|plaintext|terminal)?[ \t]*$/gm, "")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/\[KONIEC TERMINALA\]/g, "\n\n[KONIEC TERMINALA]\n\n")
    .split(/\n\s*\n/).map(chunk => chunk.trim()).filter(Boolean);
  const blocks: TransmissionBlock[] = [];
  const header = /^\[([^\]\n]{1,80})\](?:\n([\s\S]*))?$/;
  let terminal: TransmissionBlock | undefined;
  let explicitEnd = false;

  for (let index = 0; index < chunks.length; index++) {
    // Buforujemy wyłącznie nieukończony, znany prefiks dialogu ZERO.
    // Zwykły tekst i gwiazdki w treści nie są globalnie usuwane.
    const prefix = chunks[index].replace(/\s/g, "").toUpperCase();
    if (streaming && index === chunks.length - 1 && ["**ZERO/**", "**ZERO:**"].some(label => label.startsWith(prefix) && label !== prefix)) continue;
    const chunk = chunks[index].replace(/^(?:\*\*ZERO\s*[:/]\s*\*\*|ZERO\s*\/)\s*/i, "ZERO: ");
    if (chunk === "[KONIEC TERMINALA]") {
      if (terminal) terminal.closed = true;
      terminal = undefined;
      continue;
    }
    const pause = /^(?:krótka pauza|chwila ciszy)[.!…]*$/i.test(chunk.replaceAll("*", "").replace(/^\[|\]$/g, "").trim());
    if (pause && !(terminal && explicitEnd)) {
      terminal = undefined;
      blocks.push({ kind: "zero", content: "…" });
      continue;
    }
    const match = chunk.match(header);
    if (match && !match[1].startsWith("KONIEC ")) {
      terminal = { kind: "terminal", label: match[1], content: match[2] ?? "" };
      // Jawne oznaczenie prezentacji, nie wykrywanie zdarzeń lub zmiana stanu gry.
      if (/^(?:ALERT|ALARM|OSTRZEŻENIE)(?:\s*\/|$)/i.test(match[1])) terminal.tone = "alert";
      blocks.push(terminal);
      explicitEnd = false;
      for (let next = index + 1; next < chunks.length; next++) {
        if (chunks[next] === "[KONIEC TERMINALA]") { explicitEnd = true; break; }
        const nextHeader = chunks[next].match(header);
        if (nextHeader && !nextHeader[1].startsWith("KONIEC ")) break;
      }
      continue;
    }
    const dialogue = chunk.startsWith("ZERO:") || /^[—–]\s/.test(chunk) || pause;
    // Zgodność ze starszymi odpowiedziami bez znacznika końca.
    if (terminal && !explicitEnd && dialogue) terminal = undefined;
    if (terminal) {
      terminal.content += `${terminal.content ? "\n\n" : ""}${chunk}`;
    } else if (pause) {
      blocks.push({ kind: "zero", content: "…" });
    } else if (chunk.startsWith("ZERO:")) {
      blocks.push({ kind: "zero", content: chunk.slice(5).trimStart() });
    } else {
      blocks.push({ kind: "text", content: chunk });
    }
  }
  return blocks;
}
