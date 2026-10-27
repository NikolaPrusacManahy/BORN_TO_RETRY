// Update 0.0.7 — the settings screen, over the night camp: the options panel on the right, beside the fire. Back (or
// Esc) returns to the gate. Esc while a key is being rebound only cancels that (the controls screen catches it first).
import { useEffect } from 'react';
import type { Settings } from '../state/settings';
import { Options } from './Options';

interface Props {
  settings: Settings;
  fullscreen: boolean;
  /** Back was pressed: the panel slides away under the fade. */
  leaving: boolean;
  onChange(s: Settings): void;
  onFullscreen(): void;
  onBack(): void;
}

export function CampMenu({ settings, fullscreen, leaving, onChange, onFullscreen, onBack }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !e.repeat && !leaving) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaving, onBack]);

  return (
    <div className={`rb-camp${leaving ? ' is-leaving' : ''}`}>
      <div className="rb-panel rb-camp-panel">
        <h2 className="rb-pause-title">Settings</h2>
        <Options settings={settings} fullscreen={fullscreen} onChange={onChange} onFullscreen={onFullscreen} />
        <button className="rb-btn rb-camp-back" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
