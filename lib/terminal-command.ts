// Tylko treść wiadomości gracza. Nigdy nie wykonujemy kodu ani poleceń systemu.
export function terminalCommand(line: string): string | null {
  const match = line.match(/^\s*>\s+(.+?)\s*$/);
  if (!match) return null;
  const command = match[1].replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
  return command || null;
}
