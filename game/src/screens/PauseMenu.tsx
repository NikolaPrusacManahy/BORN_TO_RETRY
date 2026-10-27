// M1 — pause: resume, back to start, fullscreen, and the settings that matter for testing feel.
// Update 0.0.4 — and back to the main menu. The keyboard-lock note moved to the F2 overlay (no info players don't need).
// M1 step 9 — two tabs: the settings, and the controls (rebinding).
import { useState } from 'react';
import type { Settings } from '../state/settings';
import { KeyBindings } from './KeyBindings';
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
  const [tab, setTab] = useState<'settings' | 'controls'>('settings');
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
        <div className="rb-tabs">
          <button className={`rb-tab${tab === 'settings' ? ' is-on' : ''}`} onClick={() => setTab('settings')}>
            Settings
          </button>
          <button className={`rb-tab${tab === 'controls' ? ' is-on' : ''}`} onClick={() => setTab('controls')}>
            Controls
          </button>
        </div>
        {tab === 'settings' ? <SettingsFields settings={settings} onChange={onChange} /> : <KeyBindings bindings={settings.bindings} onChange={(bindings) => onChange({ ...settings, bindings })} />}
      </div>
    </div>
  );
}
