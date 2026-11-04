// M1 — pause: resume, back to start, and the settings that matter for testing feel.
// Update 0.0.4 — and back to the main menu. The keyboard-lock note moved to the F2 overlay (no info players don't need).
// M1 step 9 — the controls (rebinding) are a tab.
// Update 0.0.7 — the same options as the settings screen (Options: General and Controls); fullscreen is in General.
// Update 0.3.46 — and Feedback: its box in the options' place (Feedback.tsx), Back to the options.
import { useState } from 'react';
import type { Settings } from '../state/settings';
import { Feedback } from './Feedback';
import { Options } from './Options';

interface Props {
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onResume(): void;
  onRestart(): void;
  onFullscreen(): void;
  onMainMenu(): void;
  /** Update 0.3.46 — the session's average frame rate while playing. */
  averageFps(): number;
}

export function PauseMenu({ settings, fullscreen, onChange, onResume, onRestart, onFullscreen, onMainMenu, averageFps }: Props) {
  const [feedback, setFeedback] = useState(false);
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
          <button className="rb-btn" onClick={() => setFeedback(!feedback)}>
            Feedback
          </button>
          <button className="rb-btn" onClick={onMainMenu}>
            Main menu
          </button>
        </div>
        {feedback ? <Feedback settings={settings} averageFps={averageFps} onBack={() => setFeedback(false)} /> : <Options settings={settings} fullscreen={fullscreen} onChange={onChange} onFullscreen={onFullscreen} />}
      </div>
    </div>
  );
}
