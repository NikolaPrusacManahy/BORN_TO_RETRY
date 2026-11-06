// Update 0.0.15 — the boss room's show on screen (the designer: a cinematic presentation, the boss's name beside it):
// black bars slide in while the view isn't yours; the boss's name card on the right as it takes its stance; its
// health bar along the top during the fight (a mark where it rages); the black of the way down, and the next floor's
// name as it clears.
// Update 0.2.3 — the mark is each boss's own (the Bone King's: its final blast, in its second life; none before).
// Update 0.3.36 — while its show plays, the key that skips it (the designer: "SPACE" to skip), in the bottom bar.
// Update 0.3.49 — a boss's ultimate (the Boss Design Bible): the cue saying how to cancel it, under its bar; the cancel's
// progress, and a thin line of its window running out.
import type { CSSProperties } from 'react';
import type { HudState } from '../engine/hudStore';

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
        {s.bossLine && <span className="rb-show-card-line">{s.bossLine}</span>}
      </div>
      {s.bossHp >= 0 && !s.cine && (
        <div className="rb-boss-bar" style={{ '--fill': s.bossHp, '--rage': s.bossMark } as CSSProperties}>
          <span className="rb-boss-bar-name">{s.bossName}</span>
          <div className="rb-boss-bar-track">
            <i className="rb-boss-bar-fill" />
            {s.bossMark >= 0 && <i className="rb-boss-bar-rage" />}
          </div>
        </div>
      )}
      {s.bloodMist > 0 && !s.cine && <div className="rb-blood-mist" style={{ '--mist': s.bloodMist } as CSSProperties} />}
      {s.ultCue && !s.cine && (
        <div className="rb-ult" style={{ '--fill': s.ultFill, '--left': s.ultLeft } as CSSProperties}>
          <span className="rb-ult-cue">{s.ultCue}</span>
          <div className="rb-ult-track">
            <i className="rb-ult-fill" />
          </div>
          <div className="rb-ult-time">
            <i className="rb-ult-left" />
          </div>
        </div>
      )}
      {s.skip && (
        <div className="rb-show-skip">
          <i className="rb-cap">{s.skip}</i> skip
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
