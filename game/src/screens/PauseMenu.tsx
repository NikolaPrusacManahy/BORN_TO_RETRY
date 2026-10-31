// M1 — pause: resume, back to start, and the settings that matter for testing feel.
// Update 0.0.4 — and back to the main menu. The keyboard-lock note moved to the F2 overlay (no info players don't need).
// M1 step 9 — the controls (rebinding) are a tab.
// Update 0.0.7 — the same options as the settings screen (Options: General and Controls); fullscreen is in General.
// Update 0.2.15 — the Scars you carry: each one's name, the move it changes and what it does.
import { SCAR_DOES, SCAR_MOVE, SCAR_NAME, scarsIn } from '../sim/scars/scars';
import type { Settings } from '../state/settings';
import { Options } from './Options';

interface Props {
  settings: Settings;
  /** The run's Scars (one bit each). */
  scars: number;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onResume(): void;
  onRestart(): void;
  onFullscreen(): void;
  onMainMenu(): void;
}

export function PauseMenu({ settings, scars, fullscreen, onChange, onResume, onRestart, onFullscreen, onMainMenu }: Props) {
  const carried = scarsIn(scars);
  return (
    <div className="rb-overlay">
      <div className="rb-panel rb-pause">
        <h2 className="rb-pause-title">Paused</h2>
        <div className="rb-pause-actions">
          <button className="rb-cta" onClick={onResume}>
            Resume
          </button>
          <button className="rb-btn" onClick={onRestart}>
            Back to start
          </button>
          <button className="rb-btn" onClick={onMainMenu}>
            Main menu
          </button>
        </div>
        {carried.length > 0 && (
          <ul className="rb-pause-scars">
            {carried.map((k) => (
              <li key={k}>
                <b>{SCAR_NAME[k]}</b>
                <i>{SCAR_MOVE[k]}</i>
                <span>{SCAR_DOES[k]()}</span>
              </li>
            ))}
          </ul>
        )}
        <Options settings={settings} fullscreen={fullscreen} onChange={onChange} onFullscreen={onFullscreen} />
      </div>
    </div>
  );
}
