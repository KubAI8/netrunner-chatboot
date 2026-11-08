import type { SceneState } from "../lib/scene-state.ts";
import type { RecordingEvent } from "../lib/scene-session.ts";
import RecordingModal from "./recording-modal";

const actions = [
  { key: "archive", label: "Otwórz archiwum", command: "otwórz archiwum" },
  { key: "monitoring", label: "Otwórz monitoring", command: "otwórz lokalny monitoring" },
  { key: "diagnostics", label: "Diagnostyka pakietu", command: "sprawdź diagnostykę pakietu bez uruchamiania kodu i transferu" },
] as const;

type Props = { state: SceneState; disabled: boolean; onCommand: (command: string) => void; onRecordingEvent: (event: RecordingEvent) => void; epoch: string };

export default function SceneResources({ state, disabled, onCommand, onRecordingEvent, epoch }: Props) {
  if (!Object.values(state).some(Boolean)) return null;
  return (
    <div className="scene-resources" aria-label="Dostępne zasoby w tej scenie">
      {actions.filter(action => state[action.key]).map(action => <button
        key={action.key} type="button" className="recording-trigger" disabled={disabled}
        onClick={() => onCommand(action.command)}>{action.label}</button>)}
      {state.recording && <RecordingModal key={epoch} disabled={disabled} onEvent={onRecordingEvent} />}
    </div>
  );
}
