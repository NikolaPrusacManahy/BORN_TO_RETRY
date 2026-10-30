// Update 0.1.14 — the death screen (the designer: play, lose, learn, retry): over the black, what killed you, how far you
// got (the floor, the time, your kills), and Retry (a new run) or Menu. No hints (the designer's rule). 1.5× bigger than
// first drawn (the designer, after the preview).
// Update 0.2.2 — the run's end (the last floor's way down): the same, saying you survived, in gold.
import type { DeathInfo } from '../engine/runLinks';
import { causeName, clockText } from './deathText';

interface Props {
  info: DeathInfo;
  onRetry(): void;
  onMenu(): void;
}

export function DeathScreen({ info, onRetry, onMenu }: Props) {
  return (
    <div className={info.won ? 'rb-death rb-won' : 'rb-death'}>
      <div className="rb-death-box">
        <div className="rb-death-label">{info.won ? 'Run complete' : 'Killed by'}</div>
        <div className="rb-death-cause">{info.won ? 'Survived' : causeName(info.by)}</div>
        <div className="rb-death-stats">
          <div className="rb-death-stat">
            <span>Floor</span>
            <b>{info.floor}</b>
          </div>
          <div className="rb-death-stat">
            <span>Time</span>
            <b>{clockText(info.time)}</b>
          </div>
          <div className="rb-death-stat">
            <span>Kills</span>
            <b>{info.kills}</b>
          </div>
        </div>
        <div className="rb-death-actions">
          <button className="rb-cta" autoFocus onClick={onRetry}>
            Retry
          </button>
          <button className="rb-btn" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
