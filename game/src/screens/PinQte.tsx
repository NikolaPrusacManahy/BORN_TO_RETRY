// Update 0.2.8 — the Velociraptor's pin on screen (its frenzy; sim/combat/pin.ts): while it has you down, your dash's
// key under the view, dim while you wait and lit up with DASH! while a bite glows (that's when it counts); a dash too
// early shows TOO SOON in crimson (that bite will land); a pip for each dodge it takes to kick it off. As it ends:
// KICKED OFF in gold, or LET GO in crimson.
import type { HudState } from '../engine/hudStore';

export function PinQte({ s }: { s: HudState }) {
  if (s.pinDodges < 0) {
    if (!s.pinEnd) return null;
    return (
      <div className={`rb-qte-end is-${s.pinEnd === 'free' ? 'free' : 'thrown'}`} key={`pin-${s.pinEnd}`}>
        {s.pinEnd === 'free' ? 'Kicked off' : 'Let go'}
      </div>
    );
  }
  const state = s.pinWasted ? ' is-wasted' : s.pinGlow ? ' is-now' : '';
  return (
    <div className={`rb-qte rb-pin${state}`}>
      <div className="rb-qte-call">
        <span className="rb-qte-hit">{s.pinWasted ? 'Too soon' : s.pinGlow ? 'Dash!' : ''}</span>
        <span className="rb-qte-key">{s.dashKey}</span>
      </div>
      <div className="rb-qte-pips">
        {Array.from({ length: s.pinNeed }, (_, i) => (
          <i key={i} className={i < s.pinDodges ? 'is-on' : ''} />
        ))}
      </div>
    </div>
  );
}
