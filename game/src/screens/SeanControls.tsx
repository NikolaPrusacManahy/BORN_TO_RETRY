// Update 0.3.87 — Gravity Sean's inputs, bottom right (the designer: "his UI needs to correspond better since there is a lot of cooldown on his kit"). A line for each key, saying what it does in the stance he's in. What's
// waiting: its name dimmed, a clock filling back round beside its key with the seconds left in it, and its name flashes as it comes back. Beside a key, small, what the other stance's move on it still has to wait: you
// switch knowing. Q's clock is the meter, and all of it while Time Stop runs is its seconds. No image files.
import type { CSSProperties } from 'react';
import type { HudState } from '../engine/hudStore';
import type { SeanWait } from '../sim/combat/gravityHud';

const seconds = (s: number) => s.toFixed(1);

/** One key. `ring`: a clock beside it, filled this far; `inRing`: what it says. `other`: the other stance's move on it, if it's waiting. */
function Row({ cap, name, state = '', ring, inRing, other }: { cap: string; name: string; state?: '' | 'is-off' | 'is-lit' | 'is-ready'; ring?: number; inRing?: string; other?: string }) {
  return (
    <span className={`rb-input rb-sean-row ${state}`}>
      {other && <span className="rb-sean-other">{other}</span>}
      <span className="rb-input-name">{name}</span>
      {ring !== undefined && (
        <span className="rb-sean-ring" style={{ '--ctl': ring } as CSSProperties}>
          {inRing && <b>{inRing}</b>}
        </span>
      )}
      <i className="rb-cap">{cap}</i>
    </span>
  );
}

/** A key with a wait on it. */
function Waiting({ cap, name, wait, other }: { cap: string; name: string; wait: SeanWait; other?: string }) {
  return wait.left > 0 ? <Row cap={cap} name={name} state="is-off" ring={wait.fill} inRing={seconds(wait.left)} other={other} /> : <Row cap={cap} name={name} other={other} />;
}

export function SeanControls({ s }: { s: HudState }) {
  const h = s.seanHud;
  const otherRmb = h.otherRmb > 0 ? `Black Hole ${seconds(h.otherRmb)}` : undefined;
  const otherCtrl = h.otherCtrl > 0 ? `${s.unstable ? 'Ground Slam' : 'Shockwave Punch'} ${seconds(h.otherCtrl)}` : undefined;
  const stopped = h.stopLeft > 0;
  const full = s.execution >= 1;
  return (
    <div className="rb-inputs rb-sean-inputs">
      <Row cap={s.attackKey} name={s.unstable ? 'Gravity Fists' : 'Gravity Punch'} state={s.unstable ? 'is-lit' : ''} />
      {s.seanHold === 1 ? (
        <Row cap={s.heavyKey} name="Throw" state={h.gather >= 1 ? 'is-ready' : 'is-lit'} ring={h.gather} />
      ) : s.seanHold === 2 ? (
        <Row cap={s.heavyKey} name="Throw" state="is-lit" />
      ) : (
        <Waiting cap={s.heavyKey} name={s.unstable ? 'Black Hole' : 'Grab'} wait={h.rmb} other={otherRmb} />
      )}
      <Waiting cap={s.interactKey} name={s.unstable ? 'Vent' : 'Unstable'} wait={h.e} />
      <Row cap={s.dashKey} name="Dash" />
      <Waiting cap={s.slamKey} name={s.unstable ? 'Shockwave Punch' : s.inAir ? 'Plunge' : 'Ground Slam'} wait={h.ctrl} other={otherCtrl} />
      {stopped ? (
        <Row cap={s.throwKey} name="Time Stop" state="is-lit" ring={h.stopFill} inRing={seconds(h.stopLeft)} />
      ) : (
        <Row cap={s.throwKey} name={s.unstable ? 'Meteor' : 'Time Stop'} state={full ? 'is-ready' : 'is-off'} ring={full ? undefined : s.execution} inRing={full ? undefined : `${Math.floor(s.execution * 100)}`} />
      )}
    </div>
  );
}
