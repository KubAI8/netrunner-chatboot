// Kwarantanna WYŁĄCZNIE starego protokołu. Nigdy nie odczytuje z niego stanu.
const markers = [
  { open: "<SCENE_STATE>", close: "</SCENE_STATE>" },
  { open: "[SCENE_STATE]", close: "[/SCENE_STATE]" },
];
const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
export function decodeEntities(text: string, complete = true): string {
  if (!complete) text = text.replace(/&(?:#(?:x[\da-f]*|\d*)?|[a-z]*)$/i, "");
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (source, body: string) => {
    if (body[0] !== "#") return named[body.toLowerCase()] ?? source;
    const point = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : "\ufffd";
  });
}
export function visibleNarrative(source: string, complete = true, entities = true): { text: string; technicalNotice: boolean } {
  let rest = entities ? decodeEntities(source, complete) : source, text = "", technicalNotice = false;
  while (rest) {
    const found = markers.map(marker => ({ ...marker, index: rest.indexOf(marker.open) }))
      .filter(marker => marker.index !== -1).sort((a, b) => a.index - b.index)[0];
    if (!found) {
      // Nawet fragment znacznika nie miga w strumieniu.
      let held = 0;
      for (const { open } of markers) for (let size = 1; size < open.length; size++) {
        if (rest.endsWith(open.slice(0, size))) held = Math.max(held, size);
      }
      if (complete && held === 1) held = 0;
      text += held ? rest.slice(0, -held) : rest;
      if (complete && held) technicalNotice = true;
      break;
    }
    technicalNotice = true;
    text += rest.slice(0, found.index);
    const end = rest.indexOf(found.close, found.index + found.open.length);
    if (end === -1) break;
    rest = rest.slice(end + found.close.length);
  }
  return { text, technicalNotice };
}
