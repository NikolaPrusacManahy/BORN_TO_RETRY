// Update 0.0.15 — the boss room's show on screen (the designer: a cinematic presentation, the boss's name beside it):
// black bars slide in while the view isn't yours; the boss's name card on the right as it takes its stance; its
// health bar along the top during the fight (a mark where it rages); the black of the way down, and the next floor's
// name as it clears.
import type { CSSProperties } from 'react';
import type { HudState } from '../engine/hudStore';
import { BOSS } from '../tuning/boss';

export function BossHud({ s }: { s: HudState }) {
  return (
    <>
      <div className={`rb-show-bars${s.cine ? ' is-on' : ''}`}>
        <i className="rb-show-bar is-top" />
        <i className="rb-show-bar is-bottom" />
      </div>
      <div className={`rb-show-card${s.card ? ' is-on' : ''}`}>
        <span className="rb-show-card-title">{s.bossTitle}</span>
        <span className="rb-show-card-name">{s.bossName}</span>
        <i className="rb-show-card-rule" />
      </div>
      {s.bossHp >= 0 && !s.cine && (
        <div className="rb-boss-bar" style={{ '--fill': s.bossHp, '--rage': BOSS.v.rageAt } as CSSProperties}>
          <span className="rb-boss-bar-name">{s.bossName}</span>
          <div className="rb-boss-bar-track">
            <i className="rb-boss-bar-fill" />
            <i className="rb-boss-bar-rage" />
          </div>
        </div>
      )}
      <div className={`rb-show-veil${s.veil ? ' is-on' : ''}`} />
      {s.floorName && (
        <div key={s.floorName} className="rb-show-floor">
          {s.floorName}
        </div>
      )}
    </>
  );
}
