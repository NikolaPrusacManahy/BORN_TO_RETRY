// Update 0.3.16 — the Big Shark's jaws coming (the designer: "press move left and move right to escape the jaw"): while
// they come, an arrow the way to go and that way's move key, big under the view and to that side, pulsing. Gone as you
// escape (or as it bites).
import type { HudState } from '../engine/hudStore';

export function JawCue({ s }: { s: HudState }) {
  if (s.jawCue === 0) return null;
  const left = s.jawCue < 0;
  return (
    <div className={`rb-qte rb-jaw${left ? ' is-left' : ' is-right'}`}>
      <div className="rb-qte-call">
        {left && <span className="rb-jaw-arrow">◀</span>}
        <span className="rb-qte-key">{left ? s.leftKey : s.rightKey}</span>
        {!left && <span className="rb-jaw-arrow">▶</span>}
      </div>
    </div>
  );
}
