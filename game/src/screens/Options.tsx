// Update 0.0.7 — the options, in two tabs: General (sliders, invert Y, fullscreen) and Controls (rebinding). The
// camp's settings screen and the pause menu both show them, so the controls live inside the settings.
import { useState } from 'react';
import type { Settings } from '../state/settings';
import { KeyBindings } from './KeyBindings';
import { SettingsFields } from './SettingsFields';

interface Props {
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onFullscreen(): void;
}

export function Options({ settings, fullscreen, onChange, onFullscreen }: Props) {
  const [tab, setTab] = useState<'general' | 'controls'>('general');
  return (
    <>
      <div className="rb-tabs">
        <button className={`rb-tab${tab === 'general' ? ' is-on' : ''}`} onClick={() => setTab('general')}>
          General
        </button>
        <button className={`rb-tab${tab === 'controls' ? ' is-on' : ''}`} onClick={() => setTab('controls')}>
          Controls
        </button>
      </div>
      {tab === 'general' ? (
        <>
          <SettingsFields settings={settings} onChange={onChange} />
          <div className="rb-options-row">
            <button className="rb-btn" onClick={onFullscreen}>
              {fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </>
      ) : (
        <KeyBindings bindings={settings.bindings} onChange={(bindings) => onChange({ ...settings, bindings })} />
      )}
    </>
  );
}
