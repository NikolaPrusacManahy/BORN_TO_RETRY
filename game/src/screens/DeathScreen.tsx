// Update 0.1.14 — the death screen (the designer: play, lose, learn, retry): over the black, what killed you, how far you
// got (the floor, the time, your kills), and Retry (a new run) or Menu. No hints (the designer's rule). 1.5× bigger than
// first drawn (the designer, after the preview).
import type { DeathInfo } from '../engine/runLinks';
import { causeName, clockText } from './deathText';

interface Props {
  info: DeathInfo;
  onRetry(): void;
  onMenu(): void;
}

export function DeathScreen({ info, onRetry, onMenu }: Props) {
  return (
    <div className="rb-death">
      <div className="rb-death-box">
        <div className="rb-death-label">Killed by</div>
        <div className="rb-death-cause">{causeName(info.by)}</div>
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
