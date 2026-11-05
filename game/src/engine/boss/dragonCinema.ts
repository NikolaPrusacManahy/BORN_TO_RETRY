// Update 0.3.50 — the Dragon's show as you see it (sim/dungeon/dragonShow.ts). The view tilts up from your eyes, facing into
// the room: it comes in over your head from behind and away over the far wall. High off the corner of the wall you came in by,
// looking down on the courtyard as it circles, its fire running along the walls, driving them back. Low in the courtyard
// looking up at a far tower as it passes and knocks the crown off. From the middle's floor, up at it climbing. Falling with
// it, beside it, as it dives, it on the left of the view and its name on the right, slowed. Low in front of it as it
// strikes, staggers and screams fire at the sky, it on the left of the view; and back into your eyes, facing it. Its shots
// stay clear of the pillars. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { dragonAt, dragonBeats, dragonPose } from '../../sim/dungeon/dragonShow';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from './cinema';

/** Tilted up off your eyes this far (rad). */
const TILT = 0.55;
/** High off the wall you came in by: this far back past the middle (m), across, up; then pushing in this far. */
const HIGH: readonly [number, number, number] = [60, 14, 46];
const HIGH_PUSH = 8;
/** This share through its lap, the view cuts down into the courtyard: this far in from the middle (m), across, up, looking
 *  at the tower it's coming to next, over its top. */
const LAP_CUT = 0.56;
const LOW: readonly [number, number, number] = [-10, -9, 1.8];
const LOW_LOOK = 15;
/** Up at it climbing: this far back from the middle (m), across, up. */
const CLIMB_AT: readonly [number, number, number] = [16, 6, 1.5];
/** Falling with it: this far from it toward you (m), aside, and this share of its height (with a little over the floor);
 *  aimed this share of its height off to its right as you see it (it on the left of the view). */
const FALL_BACK = 11;
const FALL_SIDE = 3;
const FALL_UP = 0.72;
const FRAME_LEFT = 0.42;
/** In front of it as it screams: this many of its heights out (closing to the second), this share of its height up; back
 *  into your eyes over this long (s). */
const FRONT: readonly [number, number] = [1.6, 1.15];
const FRONT_UP = 0.16;
const BACK = 1.2;
/** Easing into a shot (s). Kept this far off a pillar's side (m). */
const EASE = 0.7;
const CLEAR = 1.6;

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
const pose = dragonPose();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function dragonWide(run: BossRun): number {
  if (run.kind !== 'dragon' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = dragonBeats();
  return smooth((run.t - s.lapFrom + 0.3) / 0.6) * (1 - smooth((run.t - s.impact) / 0.6));
}

export class DragonCinema {
  private readonly eye = shot();
  private readonly tilt = shot();
  private readonly mid = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly you = { x: 0, z: 0 };
  /** The yaw and pitch you face when the show ends: at it. */
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {
    const e = level.boss.entrance;
    this.fwd.set(e === 'w' ? 1 : e === 'e' ? -1 : 0, 0, e === 'n' ? 1 : e === 's' ? -1 : 0);
    this.right.set(-this.fwd.z, 0, this.fwd.x);
    this.mid.set(level.boss.portal.x, 0, level.boss.portal.z);
  }

  /** The show starts: your eyes at `eye` looking along `look`. Lays out its shots. */
  start(eye: THREE.Vector3, look: THREE.Vector3) {
    const h = ENEMY_STATS.dragon().height;
    this.you.x = eye.x;
    this.you.z = eye.z;
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(look, 20);
    // Your eyes, looking up into the room.
    this.tilt.pos.copy(eye);
    this.tilt.look.copy(eye).addScaledVector(this.fwd, 20 * Math.cos(TILT)).add(dir.set(0, 20 * Math.sin(TILT), 0));
    const dx = this.mid.x - eye.x;
    const dz = this.mid.z - eye.z;
    this.endYaw = Math.atan2(-dx, -dz);
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(h * 0.6 - eye.y, Math.hypot(dx, dz))));
  }

  /** The view `t` s into the show, into `out`; `eye`: your eyes now. */
  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = dragonBeats();
    if (t < s.pull) return blend(this.eye, this.tilt, t / s.pull, out);
    if (t < s.lapFrom) return copyShot(this.tilt, out);
    const cut = s.lapFrom + (s.lapTo - s.lapFrom) * LAP_CUT;
    if (t < cut) return this.high(t, out);
    if (t < s.riseFrom) return this.low(out);
    if (t < s.diveFrom) return this.climbing(t, out);
    if (t < s.impact) return this.falling(t, out);
    if (t < s.end - BACK) return this.scream(t, out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.scream(t, b), a, (t - (s.end - BACK)) / BACK, out);
  }

  /** Is `t` s into the show its name's time (slowed, on the right of the view)? */
  static named(t: number): boolean {
    const s = dragonBeats();
    return t >= s.slowFrom - 0.05 && t < s.impact + 0.25;
  }

  /** The whole place shaking `t` s in: its pass over your head, its fire on the walls, each tower's crown, its strike (the
   *  hardest), and its scream. */
  shake(camera: THREE.Camera, t: number) {
    const s = dragonBeats();
    let amp = 0.9 * pulse(t - s.overhead, 0.8);
    if (t >= s.lapFrom && t < s.lapTo) amp += 0.12;
    for (const k of [0.125, 0.375, 0.625, 0.875]) amp += 0.45 * pulse(t - (s.lapFrom + k * (s.lapTo - s.lapFrom)), 0.5);
    amp += 2 * pulse(t - s.impact, 1.3);
    if (t >= s.screamAt && t < s.end - BACK * 0.5) amp += 0.32;
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  /** High off the wall you came in by, pushing in as it circles. */
  private high(t: number, out: Shot): Shot {
    const s = dragonBeats();
    const k = smooth((t - s.lapFrom) / Math.max(0.1, (s.lapTo - s.lapFrom) * LAP_CUT));
    out.pos.copy(this.mid).addScaledVector(this.fwd, -(HIGH[0] - HIGH_PUSH * k)).addScaledVector(this.right, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).setY(2);
    return out;
  }

  /** Low in the courtyard, up at the tower it passes next. */
  private low(out: Shot): Shot {
    const half = (this.level.boss.end.max.x - this.level.boss.end.min.x) / 2 - 4;
    this.clear(out.pos.copy(this.mid).addScaledVector(this.fwd, LOW[0]).addScaledVector(this.right, LOW[1]).setY(LOW[2]));
    // (Its last corner: toward the wall it left by, on its far side.)
    out.look.copy(this.mid).addScaledVector(this.fwd, half).addScaledVector(this.right, -half).setY(LOW_LOOK);
    return out;
  }

  /** On the middle's floor, up at it climbing. */
  private climbing(t: number, out: Shot): Shot {
    const s = dragonBeats();
    dragonAt(this.level, t, this.you, pose);
    this.clear(out.pos.copy(this.mid).addScaledVector(this.fwd, -CLIMB_AT[0]).addScaledVector(this.right, CLIMB_AT[1]).setY(CLIMB_AT[2]));
    out.look.set(pose.x, pose.y + 2, pose.z);
    if (t < s.riseFrom + EASE) {
      // (Easing up from the shot before.)
      this.low(a);
      out.look.lerp(a.look, 1 - smooth((t - s.riseFrom) / EASE));
    }
    return out;
  }

  /** Falling with it as it dives, a little above it and toward you. */
  private falling(t: number, out: Shot): Shot {
    const h = ENEMY_STATS.dragon().height;
    dragonAt(this.level, t, this.you, pose);
    dir.set(this.you.x - pose.x, 0, this.you.z - pose.z).normalize();
    side.crossVectors(dir, UP).normalize();
    const y = Math.max(1.6, pose.y + h * FALL_UP * 0.5);
    out.pos.set(pose.x, y, pose.z).addScaledVector(dir, FALL_BACK).addScaledVector(side, -FALL_SIDE);
    this.clear(out.pos);
    out.look.set(pose.x, pose.y + h * 0.5, pose.z).addScaledVector(side, -h * FRAME_LEFT);
    return out;
  }

  /** Low in front of it, closing in, it on the left of the view. */
  private scream(t: number, out: Shot): Shot {
    const s = dragonBeats();
    const h = ENEMY_STATS.dragon().height;
    dir.set(this.you.x - this.mid.x, 0, this.you.z - this.mid.z).normalize();
    side.set(dir.z, 0, -dir.x);
    const k = smooth((t - s.impact) / Math.max(0.1, s.end - s.impact));
    const far = h * (FRONT[0] + (FRONT[1] - FRONT[0]) * k);
    this.clear(out.pos.copy(this.mid).addScaledVector(dir, far).addScaledVector(side, h * 0.25).setY(h * FRONT_UP));
    out.look.copy(this.mid).setY(h * 0.55).addScaledVector(side, h * FRAME_LEFT);
    return out;
  }

  /** Out of the room's pillars, if `pos` is in one. */
  private clear(pos: THREE.Vector3) {
    for (const c of this.level.arena.pillars ?? []) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const r = c.half + CLEAR;
      if (Math.abs(dx) >= r || Math.abs(dz) >= r) continue;
      if (Math.abs(dx) > Math.abs(dz)) pos.x = c.x + Math.sign(dx || 1) * r;
      else pos.z = c.z + Math.sign(dz || 1) * r;
    }
  }
}

function copyShot(from: Shot, out: Shot): Shot {
  out.pos.copy(from.pos);
  out.look.copy(from.look);
  return out;
}

/** Eased from shot `from` to `to` (k: 0..1). */
function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const e = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, e);
  out.look.lerpVectors(from.look, to.look, e);
  return out;
}
