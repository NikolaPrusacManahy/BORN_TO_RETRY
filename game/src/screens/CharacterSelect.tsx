// Update 0.0.8 — the character select, over the prison corridor: the selected character's name and kit with Play
// (or Locked), arrows to walk the corridor, a dot per cell. The player's left / right keys or the arrow keys move,
// Enter plays, Esc goes back to the gate. No hints a player already knows (the designer's rule).
import { useEffect } from 'react';
import type { Bindings } from '../input/bindings';
import { ROSTER } from '../sim/characters';

interface Props {
  index: number;
  bindings: Bindings;
  /** Play or Back was pressed: everything slides away under the fade. */
  leaving: boolean;
  onStep(step: number): void;
  onPlay(): void;
  onBack(): void;
}

export function CharacterSelect({ index, bindings, leaving, onStep, onPlay, onBack }: Props) {
  const c = ROSTER[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || leaving) return;
      if (e.code === 'Escape') return onBack();
      if (e.code === 'ArrowLeft' || e.code === bindings.left) return onStep(-1);
      if (e.code === 'ArrowRight' || e.code === bindings.right) return onStep(1);
      // A focused button handles its own Enter / Space.
      if ((e.target as HTMLElement | null)?.closest?.('button')) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onPlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bindings, leaving, onStep, onPlay, onBack]);

  return (
    <div className={`rb-select${leaving ? ' is-leaving' : ''}`}>
      <button className="rb-select-arrow is-left" disabled={index === 0} onClick={() => onStep(-1)} aria-label="Previous">
        ‹
      </button>
      <button className="rb-select-arrow is-right" disabled={index === ROSTER.length - 1} onClick={() => onStep(1)} aria-label="Next">
        ›
      </button>

      <div className="rb-select-card" key={c.id}>
        <div className="rb-select-name">{c.name}</div>
        {c.kit && <div className="rb-select-kit">{c.kit}</div>}
        {c.available ? (
          <button className="rb-menu-btn is-start rb-select-play" onClick={onPlay}>
            <span>Play</span>
          </button>
        ) : (
          <div className="rb-select-locked">Locked</div>
        )}
      </div>

      <div className="rb-select-dots">
        {ROSTER.map((r, i) => (
          <i key={r.id} className={`${i === index ? 'is-on' : ''}${r.available ? '' : ' is-locked'}`} />
        ))}
      </div>
    </div>
  );
}
