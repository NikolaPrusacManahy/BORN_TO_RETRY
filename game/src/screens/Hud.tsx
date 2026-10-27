// M1 — the HUD: a crosshair, the hit marker around it, the dash charges (bottom centre), and a red edge flash when
// an orb hits you. Health joins in M1 step 8.
import { CSSProperties, useSyncExternalStore } from 'react';
import type { HudStore } from '../engine/hudStore';

export function Hud({ store }: { store: HudStore }) {
  const s = useSyncExternalStore(store.subscribe, store.get);
  return (
    <div className="rb-hud">
      <div className="rb-hud-cross" />
      {s.hits > 0 && <div key={`m${s.hits}`} className={`rb-hud-marker is-${s.marker}`} />}
      {s.hurts > 0 && <div key={`h${s.hurts}`} className="rb-hud-hurt" />}
      <div className="rb-hud-dash">
        {Array.from({ length: s.dashMax }, (_, i) => (
          <span key={i} className="rb-hud-pip" style={{ '--fill': Math.max(0, Math.min(1, s.dashCharges - i)) } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
