// Update 0.0.4 — the main menu over the gate scene: the BORN TO RETRY logo up in the sky, Start / Settings /
// Controls bottom left over the dark wall, the version bottom right. Enter or Space starts too. Once Start is
// pressed it slides away while the gate opens. No hints a player already knows (the designer's rule).
import { useEffect, useState } from 'react';
import { version } from '../../package.json';
import type { Bindings } from '../input/bindings';
import type { Settings } from '../state/settings';
import { keyLabel } from './keyLabel';
import { SettingsFields } from './SettingsFields';

type Panel = 'settings' | 'controls' | null;

interface Props {
  ready: boolean;
  /** Start was pressed: the menu animates out. */
  leaving: boolean;
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onStart(): void;
  onFullscreen(): void;
}

function controls(b: Bindings): [string, string][] {
  return [
    ['Move', 'WASD'],
    ['Jump', keyLabel(b.jump)],
    ['Dash', keyLabel(b.dash)],
    ['Slide', keyLabel(b.slide)],
    ['Jab', keyLabel(b.attack)],
    ['Charged punch', keyLabel(b.heavy)],
    ['Quick punch', keyLabel(b.punch)],
    ['Pause', 'Esc'],
  ];
}

/** The retry arrow beside the logo: a clockwise arc and its head; it turns slowly. */
function RetryArrow() {
  return (
    <svg className="rb-logo-arrow" viewBox="0 0 48 48" aria-hidden>
      <path d="M40 24a16 16 0 1 1-4.7-11.3" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M43 3v16H27z" fill="currentColor" />
    </svg>
  );
}

export function MainMenu({ ready, leaving, settings, fullscreen, onChange, onStart, onFullscreen }: Props) {
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || leaving) return;
      if (e.code === 'Escape') return setPanel(null);
      // A focused button or field handles its own Enter / Space.
      if ((e.target as HTMLElement | null)?.closest?.('button, input, textarea')) return;
      if (!panel && ready && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, ready, leaving, onStart]);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className={`rb-menu${leaving ? ' is-leaving' : ''}${panel ? ' has-panel' : ''}`}>
      <div className="rb-logo">
        <div className="rb-logo-born">
          <span className="rb-logo-rule" />
          <b>BORN TO</b>
          <span className="rb-logo-rule" />
        </div>
        <div className="rb-logo-retry">
          <span className="rb-logo-streaks" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="rb-logo-word" data-text="RETRY">
            RETRY
          </span>
          <RetryArrow />
        </div>
        <div className="rb-logo-tag">
          Die <b>·</b> Learn <b>·</b> <em>Retry</em>
        </div>
      </div>

      <nav className="rb-menu-nav">
        <button className="rb-menu-btn is-start" disabled={!ready || leaving} onClick={onStart}>
          <span>{ready ? 'Start' : 'Loading…'}</span>
        </button>
        <button className={`rb-menu-btn${panel === 'settings' ? ' is-open' : ''}`} onClick={() => toggle('settings')}>
          <span>Settings</span>
        </button>
        <button className={`rb-menu-btn${panel === 'controls' ? ' is-open' : ''}`} onClick={() => toggle('controls')}>
          <span>Controls</span>
        </button>
      </nav>

      {panel && (
        <div className="rb-menu-side">
          <div className="rb-panel rb-menu-panel">
            <h2 className="rb-pause-title">{panel === 'settings' ? 'Settings' : 'Controls'}</h2>
            {panel === 'settings' ? (
              <>
                <SettingsFields settings={settings} onChange={onChange} />
                <div className="rb-pause-actions rb-menu-panel-actions">
                  <button className="rb-btn" onClick={onFullscreen}>
                    {fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
                  </button>
                </div>
              </>
            ) : (
              <ul className="rb-keys">
                {controls(settings.bindings).map(([label, key]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <kbd>{key}</kbd>
                  </li>
                ))}
              </ul>
            )}
            <button className="rb-btn rb-menu-back" onClick={() => setPanel(null)}>
              Back
            </button>
          </div>
        </div>
      )}

      <div className="rb-menu-foot">v{version}</div>
    </div>
  );
}
