// Update 0.0.7 — the options, in two tabs: General (sliders, invert Y, fullscreen) and Controls (rebinding). The
// camp's settings screen and the pause menu both show them, so the controls live inside the settings.
// Update 0.3.0 (the designer: "not all settings in one page, a bit more professional") — four pages: General, Graphics,
// Audio, Controls (SettingsFields.tsx has the first three).
import { useState } from 'react';
import type { Settings } from '../state/settings';
import { KeyBindings } from './KeyBindings';
import { SettingsFields, SettingsPage } from './SettingsFields';

interface Props {
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onFullscreen(): void;
}

type Page = SettingsPage | 'controls';

const PAGES: readonly [Page, string][] = [
  ['general', 'General'],
  ['graphics', 'Graphics'],
  ['audio', 'Audio'],
  ['controls', 'Controls'],
];

export function Options({ settings, fullscreen, onChange, onFullscreen }: Props) {
  const [page, setPage] = useState<Page>('general');
  return (
    <div className="rb-options">
      <div className="rb-tabs">
        {PAGES.map(([p, name]) => (
          <button key={p} className={`rb-tab${page === p ? ' is-on' : ''}`} onClick={() => setPage(p)}>
            {name}
          </button>
        ))}
      </div>
      <div className="rb-options-page">
        {page === 'controls' ? (
          <KeyBindings bindings={settings.bindings} onChange={(bindings) => onChange({ ...settings, bindings })} />
        ) : (
          <SettingsFields page={page} settings={settings} fullscreen={fullscreen} onChange={onChange} onFullscreen={onFullscreen} />
        )}
      </div>
    </div>
  );
}
