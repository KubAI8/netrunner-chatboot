import type { TransmissionBlock } from "../lib/transmission.ts";
import { terminalCommand } from "../lib/terminal-command.ts";

function InlineText({ text }: { text: string }) {
  // Ograniczony renderer tekstowy: żadnego HTML ani aktywnych linków z odpowiedzi.
  return text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

type Props = {
  blocks: TransmissionBlock[];
  onCommand?: (command: string) => void;
  commandsDisabled?: boolean;
};

export default function Transmission({ blocks, onCommand, commandsDisabled = false }: Props) {
  return blocks.map((block, index) => (
    <div key={index} className={`transmission-block transmission-block--${block.kind}${block.tone === "alert" ? " transmission-block--alert" : ""}`}>
      {block.label && <div className="terminal-label">{block.label}</div>}
      {block.kind === "zero" && <span className="zero-prefix">ZERO / </span>}
      {block.kind === "terminal"
        ? block.content.split("\n").map((line, lineIndex) => {
          const command = terminalCommand(line);
          return command && onCommand ? (
            <button key={lineIndex} className="terminal-command terminal-command-button" type="button"
              disabled={commandsDisabled} aria-label={`Wyślij polecenie: ${command}`}
              title={`Wyślij do rozmowy: ${command}`} onClick={() => onCommand(command)}>
              <InlineText text={line} /><span className="terminal-command-enter" aria-hidden="true">↵</span>
            </button>
          ) : (
            <div key={lineIndex} className={command ? "terminal-command" : "terminal-line"}>
              <InlineText text={line} />
            </div>
          );
        })
        : <InlineText text={block.content} />}
    </div>
  ));
}
