// M1 — the start card: click to lock the mouse and play.
import type { Bindings } from '../input/bindings';
import { keyLabel } from './keyLabel';

interface Props {
  ready: boolean;
  bindings: Bindings;
  onPlay(): void;
}

export function TitleCard({ ready, bindings, onPlay }: Props) {
  const rows: [string, string][] = [
    ['Move', 'WASD'],
    ['Jump / wall jump', keyLabel(bindings.jump)],
    ['Dash', keyLabel(bindings.dash)],
    ['Slide (hold; in the air: on landing)', keyLabel(bindings.slide)],
    ['Wall run: hold forward along a wall', keyLabel(bindings.forward)],
    ['Jab combo (hold)', keyLabel(bindings.attack)],
    ['Charged punch (hold 1 s, release)', keyLabel(bindings.heavy)],
    ['Quick punch', keyLabel(bindings.punch)],
    ['Pause', 'Esc'],
  ];
  return (
    <div className="rb-overlay" onClick={ready ? onPlay : undefined}>
      <div className="rb-panel rb-title">
        <h1 className="rb-title-name">RUINBREAKER</h1>
        <div className="rb-title-sub">Feel Lab · M1</div>
        <ul className="rb-keys">
          {rows.map(([label, key]) => (
            <li key={label}>
              <span>{label}</span>
              <kbd>{key}</kbd>
            </li>
          ))}
        </ul>
        <button className="rb-cta" disabled={!ready}>
          {ready ? 'Click to play' : 'Loading…'}
        </button>
        {import.meta.env.DEV && <div className="rb-title-dev">F1 tuning · F2 debug · F3 reset player and targets</div>}
      </div>
    </div>
  );
}
