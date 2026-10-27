// M1 — the HUD: a crosshair, the hit marker around it, the dash charges (bottom centre), and a red edge flash when
// you're hurt. M1 step 8 — health bottom left: the number and a bar, with a pale trail showing what a hit took; it
// pulses when low.
import { CSSProperties, useSyncExternalStore } from 'react';
import type { HudStore } from '../engine/hudStore';

/** At or below this share of max health the bar pulses. */
const LOW_HEALTH = 0.25;

export function Hud({ store }: { store: HudStore }) {
  const s = useSyncExternalStore(store.subscribe, store.get);
  return (
    <div className="rb-hud">
      <div className="rb-hud-cross" />
      {s.hits > 0 && <div key={`m${s.hits}`} className={`rb-hud-marker is-${s.marker}`} />}
      {s.hurts > 0 && <div key={`h${s.hurts}`} className="rb-hud-hurt" />}
      <div className={`rb-hud-health${s.hp <= s.maxHp * LOW_HEALTH ? ' is-low' : ''}`}>
        <span className="rb-hud-hp">{s.hp}</span>
        <div className="rb-hud-bar" style={{ '--fill': s.maxHp > 0 ? s.hp / s.maxHp : 0 } as CSSProperties}>
          <i className="rb-hud-bar-trail" />
          <i className="rb-hud-bar-fill" />
        </div>
      </div>
      <div className="rb-hud-dash">
        {Array.from({ length: s.dashMax }, (_, i) => (
          <span key={i} className="rb-hud-pip" style={{ '--fill': Math.max(0, Math.min(1, s.dashCharges - i)) } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
