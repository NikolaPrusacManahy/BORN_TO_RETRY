// Update 0.3.34 — Yokai : Okami's show as you see it (sim/dungeon/okamiShow.ts; the designer's intro, each beat its
// angles): the view pulls up off you; circles high over the floor as the whole place shakes and its rooms all blow at
// once (the first angle); swings round high over the arena as its walls slide out (the second); then wide from high
// off the arena's corner as the sky's islands come in (the first), and from its floor, looking up, as they gather over
// it (the second); from the arena's floor, looking up at it coming down out of the sky onto its island and following
// the island down as it crashes in; at the doorway you came in by as the first two temples come down across it (the
// first), then low at its side for the third (the second); high behind the doorway as the other islands slide in and
// crash down; low in front of it as it leaps from its island, it on the left of the view and its name on the right,
// slowed; it landing, the whole place shaking; and back into your eyes, facing it. Pure maths on Three.js vectors.
// The designer, having read it: its island crashing in, the view cuts far and wide to the shock wave blowing everything
// away; its landing destroying, then low in front of it as it does its monster transformation, screaming, it on the
// left of the view; then back into your eyes.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { isleLands, okamiAt, okamiBeats } from '../../sim/dungeon/okamiShow';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { OkamiArena } from '../../world/dungeon/okamiIsles';
import type { Shot } from '../boss/cinema';

/** Pulled up off you this high and back (m); circling the floor this far out from its middle and this high, this far
 *  round (rad); over the arena as it grows: this far out past its wall you came in by and this high, coming down this
 *  much; easing from one shot to the next this long (s). */
const RISE = 18;
const RISE_BACK = 8;
const ORBIT_OUT = 60;
const ORBIT_UP = 230;
const ORBIT_TURN = 0.7;
const GROW_OUT = 24;
const GROW_UP = 92;
const GROW_DROP = 12;
const EASE = 1.1;
/** The islands coming in: off the arena's corner (m back, across, up), pushing in this far; then on its floor (m back,
 *  across, up), looking this high over its middle. */
const ISLES_A: readonly [number, number, number] = [95, 80, 62];
const ISLES_PUSH = 18;
const ISLES_B: readonly [number, number, number] = [34, 6, 2.2];
const ISLES_LOOK = 42;
/** At its island: this far toward the middle from it (m), aside, up. Then far and wide off the arena (m back from
 *  the doorway's side, across, up), pulling back this far as the shock wave goes. */
const CRASH: readonly [number, number, number] = [46, 10, 3];
const WIDE: readonly [number, number, number] = [150, 120, 80];
const WIDE_PULL = 25;
/** Its roar: in front of it, this many of its heights out (closing to the second), this share of its height up. */
const FRONT: readonly [number, number] = [2.6, 2];
const FRONT_UP = 0.32;
/** The temples: in from the doorway (m), up; then in, across, up; looking at this far in, this high. */
const TEMPLES_A: readonly [number, number] = [32, 5];
const TEMPLES_B: readonly [number, number, number] = [16, 30, 1.8];
const TEMPLES_LOOK: readonly [number, number] = [6, 8];
/** The islands merging: back past the doorway (m), up, drifting across this far. */
const MERGE: readonly [number, number] = [80, 60];
const MERGE_DRIFT = 20;
/** Its leap: from where you'll stand, this far aside and up (m); aimed this share of its height off to its right as you
 *  see it (it on the left of the view); back into your eyes over this long (s). */
const LEAP_AT: readonly [number, number] = [-5, 2.5];
const FRAME_LEFT = 0.62;
const BACK = 1.2;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const UP = new THREE.Vector3(0, 1, 0);
const a = shot();
const b = shot();
const dir = new THREE.Vector3();
const side = new THREE.Vector3();
const it = { x: 0, y: 0, z: 0 };

/** How far its wide shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function okamiWide(run: BossRun): number {
  if (run.kind !== 'okami' || run.beat !== 'intro') return 0;
  return smooth(run.t / 0.6) * (1 - smooth((run.t - okamiBeats().mergeTo) / 0.6));
}

export class OkamiCinema {
  private readonly eye = shot();
  private readonly rise = shot();
  private readonly floor = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly door = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly arena: OkamiArena;
  private half = 0;
  private turn0 = 0;
  /** The yaw and pitch you face when the show ends: at it. */
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {
    this.arena = level.okami!;
  }

  /** The show starts: your eyes at `eye` looking along `look`. Lays out its shots. */
  start(eye: THREE.Vector3, look: THREE.Vector3) {
    const lv = this.level;
    const e = lv.boss.end;
    const h = ENEMY_STATS.okami().height;
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(look, 20);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const r of lv.rooms) {
      x0 = Math.min(x0, r.min.x);
      x1 = Math.max(x1, r.max.x);
      z0 = Math.min(z0, r.min.z);
      z1 = Math.max(z1, r.max.z);
    }
    this.floor.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    this.mid.set(lv.boss.portal.x, 0, lv.boss.portal.z);
    this.half = Math.max(e.max.x - e.min.x, e.max.z - e.min.z) / 2;
    this.fwd.set(this.arena.fwd.x, 0, this.arena.fwd.z);
    this.right.set(this.arena.right.x, 0, this.arena.right.z);
    this.door.copy(this.mid).addScaledVector(this.fwd, -this.half);
    this.turn0 = Math.atan2(this.mid.z - this.floor.z, this.mid.x - this.floor.x);
    this.rise.pos.set(eye.x - look.x * RISE_BACK, eye.y + RISE, eye.z - look.z * RISE_BACK);
    this.rise.look.copy(this.floor);
    // Facing it at the end: from where you'll stand to where it lands.
    const s = this.arena.safe;
    const l = this.arena.landing;
    this.endYaw = Math.atan2(-(l.x - s.x), -(l.z - s.z));
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(h * 0.6 - 1.6, Math.hypot(l.x - s.x, l.z - s.z))));
  }

  /** The view `t` s into the show, into `out`; `eye`: your eyes now. */
  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = okamiBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.wreckTo) return t < s.pull + EASE ? blend(this.rise, this.orbit(t, a), (t - s.pull) / EASE, out) : this.orbit(t, out);
    if (t < s.growTo) return t < s.wreckTo + EASE ? blend(this.orbit(s.wreckTo, a), this.grow(t, b), (t - s.wreckTo) / EASE, out) : this.grow(t, out);
    if (t < s.islesB) return this.islesA(t, out);
    if (t < s.islesTo) return this.islesB(out);
    if (t < s.crashTo) return this.crash(t, out);
    if (t < s.templesB) return this.at(out, this.door, TEMPLES_A[0], 0, TEMPLES_A[1]);
    if (t < s.templesTo) return this.at(out, this.door, TEMPLES_B[0], TEMPLES_B[1], TEMPLES_B[2]);
    if (t < s.mergeTo) return this.merge(t, out);
    if (t < s.leapTo) return this.leap(t, out);
    if (t < s.end - BACK) return this.roar(t, out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.roar(t, b), a, (t - (s.end - BACK)) / BACK, out);
  }

  /** Is `t` s into the show its name's time (slowed, on the right of the view)? */
  static named(t: number): boolean {
    const s = okamiBeats();
    return t >= s.slowFrom - 0.2 && t < s.slowTo + 0.3;
  }

  /** The whole place shaking `t` s in: the rooms blowing, the walls grinding, each island and temple striking (its own
   *  the hardest), its landing. */
  shake(camera: THREE.Camera, t: number) {
    const s = okamiBeats();
    let amp = 0;
    if (t >= s.pull && t < s.wreckTo + 0.5) amp += 0.14 + 0.9 * pulse(t - s.blast, 1.5);
    if (t >= s.growFrom && t < s.growTo) amp += 0.07;
    isleLands(this.arena).forEach((when, i) => (amp += i === 0 ? 1.8 * pulse(t - when, 2.2) : 0.45 * pulse(t - when, 0.9)));
    for (const when of s.temple) amp += 0.6 * pulse(t - when, 0.9);
    amp += 1.8 * pulse(t - s.leapTo, 1.8);
    if (t >= s.roarAt && t < s.end) amp += 0.3;
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  /** High over the floor, circling it. */
  private orbit(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const turn = this.turn0 + ORBIT_TURN * smooth((t - s.pull) / Math.max(0.1, s.wreckTo - s.pull));
    out.pos.set(this.floor.x + Math.cos(turn) * ORBIT_OUT, ORBIT_UP, this.floor.z + Math.sin(turn) * ORBIT_OUT);
    out.look.copy(this.floor);
    return out;
  }

  /** High over the arena, out past the wall you came in by, coming down a little as it grows. */
  private grow(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const k = smooth((t - s.growFrom) / Math.max(0.1, s.growTo - s.growFrom));
    out.pos.copy(this.mid).addScaledVector(this.fwd, -(this.half + GROW_OUT)).setY(GROW_UP - GROW_DROP * k);
    out.look.copy(this.mid);
    return out;
  }

  /** Wide off the arena's corner, high, pushing in as the islands come. */
  private islesA(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const k = smooth((t - s.islesFrom) / Math.max(0.1, s.islesB - s.islesFrom));
    out.pos.copy(this.mid).addScaledVector(this.fwd, -(ISLES_A[0] - ISLES_PUSH * k)).addScaledVector(this.right, ISLES_A[1]).setY(ISLES_A[2]);
    out.look.copy(this.mid).setY(ISLES_LOOK * 0.7);
    return out;
  }

  /** On the arena's floor, looking up as they gather over it. */
  private islesB(out: Shot): Shot {
    out.pos.copy(this.mid).addScaledVector(this.fwd, -ISLES_B[0]).addScaledVector(this.right, ISLES_B[1]).setY(ISLES_B[2]);
    out.look.copy(this.mid).addScaledVector(this.fwd, 10).setY(ISLES_LOOK);
    return out;
  }

  /** On the floor toward the middle from its island: up at it coming down, then following the island down; struck,
   *  far and wide off the arena, pulling back as the shock wave goes. */
  private crash(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const own = this.arena.isles[0];
    if (t >= s.crashAt) {
      const k = smooth((t - s.crashAt) / Math.max(0.1, s.crashTo - s.crashAt));
      out.pos.copy(this.mid).addScaledVector(this.fwd, -(WIDE[0] + WIDE_PULL * k)).addScaledVector(this.right, WIDE[1]).setY(WIDE[2] + WIDE_PULL * 0.4 * k);
      out.look.copy(this.mid);
      return out;
    }
    dir.set(this.mid.x - own.x, 0, this.mid.z - own.z).normalize();
    side.set(-dir.z, 0, dir.x);
    out.pos.set(own.x, CRASH[2], own.z).addScaledVector(dir, CRASH[0]).addScaledVector(side, CRASH[1]);
    okamiAt(this.arena, t, it);
    out.look.set(it.x, Math.max(own.top + 5, it.y + 2), it.z);
    return out;
  }

  /** At `from` (the doorway): this far in, across, up; looking at the temples. */
  private at(out: Shot, from: THREE.Vector3, inward: number, across: number, up: number): Shot {
    out.pos.copy(from).addScaledVector(this.fwd, inward).addScaledVector(this.right, across).setY(up);
    out.look.copy(from).addScaledVector(this.fwd, TEMPLES_LOOK[0]).setY(TEMPLES_LOOK[1]);
    return out;
  }

  /** High behind the doorway, drifting across as the islands come in. */
  private merge(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const k = smooth((t - s.mergeFrom) / Math.max(0.1, s.mergeTo - s.mergeFrom));
    out.pos.copy(this.mid).addScaledVector(this.fwd, -MERGE[0]).addScaledVector(this.right, MERGE_DRIFT * (k - 0.5)).setY(MERGE[1]);
    out.look.copy(this.mid).addScaledVector(this.fwd, 10);
    return out;
  }

  /** Low in front of it as it lands and roars, closing in, it on the left of the view. */
  private roar(t: number, out: Shot): Shot {
    const s = okamiBeats();
    const h = ENEMY_STATS.okami().height;
    const l = this.arena.landing;
    const sf = this.arena.safe;
    dir.set(sf.x - l.x, 0, sf.z - l.z).normalize();
    side.set(dir.z, 0, -dir.x);
    const k = smooth((t - s.leapTo) / Math.max(0.1, s.end - s.leapTo));
    const far = h * (FRONT[0] + (FRONT[1] - FRONT[0]) * k);
    out.pos.set(l.x, h * FRONT_UP, l.z).addScaledVector(dir, far).addScaledVector(side, h * 0.25);
    out.look.set(l.x, h * 0.55, l.z).addScaledVector(side, h * FRAME_LEFT);
    return out;
  }

  /** Low by where you'll stand, it on the left of the view as it leaps and lands. */
  private leap(t: number, out: Shot): Shot {
    const h = ENEMY_STATS.okami().height;
    const sf = this.arena.safe;
    out.pos.set(sf.x, LEAP_AT[1], sf.z).addScaledVector(this.right, LEAP_AT[0]);
    okamiAt(this.arena, Math.min(t, okamiBeats().leapTo), it);
    dir.set(it.x - out.pos.x, it.y + h * 0.55 - out.pos.y, it.z - out.pos.z);
    side.crossVectors(dir, UP).normalize();
    out.look.set(it.x, it.y + h * 0.55, it.z).addScaledVector(side, h * FRAME_LEFT);
    return out;
  }
}

/** Eased from shot `from` to `to` (k: 0..1). */
function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const s = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, s);
  out.look.lerpVectors(from.look, to.look, s);
  return out;
}
