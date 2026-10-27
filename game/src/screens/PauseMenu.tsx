// M1 — pause: resume, back to start, fullscreen, and the settings that matter for testing feel.
// Update 0.0.4 — and back to the main menu. The keyboard-lock note moved to the F2 overlay (no info players don't need).
import type { Settings } from '../state/settings';
import { SettingsFields } from './SettingsFields';

interface Props {
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onResume(): void;
  onRestart(): void;
  onFullscreen(): void;
  onMainMenu(): void;
}

export function PauseMenu({ settings, fullscreen, onChange, onResume, onRestart, onFullscreen, onMainMenu }: Props) {
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
          <button className="rb-btn" onClick={onFullscreen}>
            {fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
          </button>
          <button className="rb-btn" onClick={onMainMenu}>
            Main menu
          </button>
        </div>
        <SettingsFields settings={settings} onChange={onChange} />
      </div>
    </div>
  );
}
