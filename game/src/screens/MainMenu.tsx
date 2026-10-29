// Update 0.0.4 — the main menu over the gate scene: the BORN TO RETRY logo up in the sky, Start and Settings bottom
// left over the dark wall, the version bottom right. Enter or Space starts too. Once Start (or Settings) is pressed
// it slides away. No hints a player already knows (the designer's rule).
// Update 0.0.7 — Settings goes to the night camp (CampMenu), where the controls are too.
// Update 0.0.19 — Lab (dev builds): straight into the Lab.
// Update 0.1.14 — the retry arrow moved to RetryArrow.tsx (the loader turns it too).
import { useEffect } from 'react';
import { version } from '../../package.json';
import { RetryArrow } from './RetryArrow';

interface Props {
  ready: boolean;
  /** Start or Settings was pressed: the menu animates out. */
  leaving: boolean;
  onStart(): void;
  onSettings(): void;
  /** Update 0.0.19 — dev builds only. */
  onLab?: () => void;
}

export function MainMenu({ ready, leaving, onStart, onSettings, onLab }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || leaving) return;
      // A focused button handles its own Enter / Space.
      if ((e.target as HTMLElement | null)?.closest?.('button, input, textarea')) return;
      if (ready && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, leaving, onStart]);

  return (
    <div className={`rb-menu${leaving ? ' is-leaving' : ''}`}>
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
          <RetryArrow className="rb-logo-arrow" />
        </div>
        <div className="rb-logo-tag">
          Die <b>·</b> Learn <b>·</b> <em>Retry</em>
        </div>
      </div>

      <nav className="rb-menu-nav">
        <button className="rb-menu-btn is-start" disabled={!ready || leaving} onClick={onStart}>
          <span>{ready ? 'Start' : 'Loading…'}</span>
        </button>
        <button className="rb-menu-btn" disabled={!ready || leaving} onClick={onSettings}>
          <span>Settings</span>
        </button>
        {onLab && (
          <button className="rb-menu-btn" disabled={!ready || leaving} onClick={onLab}>
            <span>Lab</span>
          </button>
        )}
      </nav>

      <div className="rb-menu-foot">v{version}</div>
    </div>
  );
}
