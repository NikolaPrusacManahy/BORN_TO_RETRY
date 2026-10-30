// Update 0.2.3 — the Bone King's grab on screen (the designer: "very cool looking QTE on screen telling the player to hit
// the opponent with a cool Combo display"): while it holds you, HIT! and your attack's key pulsing, your hits as a combo
// count that slams in bigger with each one, a pip for each hit to land, and the time you have draining under them.
// As it ends: BROKE FREE in gold, or THROWN in crimson.
import type { CSSProperties } from 'react';
import type { HudState } from '../engine/hudStore';

export function GrabQte({ s }: { s: HudState }) {
  if (s.grabHits < 0) {
    if (!s.grabEnd) return null;
    return (
      <div className={`rb-qte-end is-${s.grabEnd}`} key={s.grabEnd}>
        {s.grabEnd === 'free' ? 'Broke free' : 'Thrown'}
      </div>
    );
  }
  const urgent = s.grabLeft <= 0.35;
  return (
    <div className={`rb-qte${urgent ? ' is-urgent' : ''}`}>
      <div className="rb-qte-call">
        <span className="rb-qte-hit">Hit!</span>
        <span className="rb-qte-key">{s.attackKey}</span>
      </div>
      <div className="rb-qte-combo" key={s.grabHits}>
        {s.grabHits > 0 && (
          <>
            <b>×{s.grabHits}</b>
            <span>Combo</span>
          </>
        )}
      </div>
      <div className="rb-qte-pips">
        {Array.from({ length: s.grabNeed }, (_, i) => (
          <i key={i} className={i < s.grabHits ? 'is-on' : ''} />
        ))}
      </div>
      <div className="rb-qte-time" style={{ '--left': s.grabLeft } as CSSProperties}>
        <i />
      </div>
    </div>
  );
}
