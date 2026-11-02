// Update 0.3.16 — the Big Shark's show as you see it (the designer: "when entering the arena -> the camera changes angle
// as we see the water flooding the whole arena … -> the camera is then on the Sharks shoulder as they swim -> a camera
// shot of the front as they jump out of the water with a slow motion effect with the boss name on the right"; "a much
// fitting cinematic presentation for this boss"): the view leaves your eyes for high over the arena's near corner,
// drifting as the water climbs its walls; drops under the water onto the shark's left shoulder, close, as it sweeps round
// the far side; cuts to a fixed shot under the water as it swims straight at it and bursts up past it (the designer:
// "a fixed shot of the shark going toward the camera (still under water)"); then waits just over the surface ahead of
// its leap (slowed: sim/dungeon/sharkShow.ts), turned so it fills the left of the view and its name the right; then
// back into your eyes, quickly, under the water now, facing it.
// The shark's path is the show's own (sharkAt), so the shots follow it exactly. Pure maths on Three.js vectors.
import * as THREE from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import { DEPTH, OUT_FROM, OUT_TO, sharkAt, sharkBeats, sharkLength, sharkMark } from '../../sim/dungeon/sharkShow';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import type { Shot } from './cinema';

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** High over the near corner (m: out from the middle, up); the flood shot drifts this much lower and nearer. Over its left
 *  shoulder (the designer: "maybe it's left side, much closer"): this share of its length back, of its height up and
 *  across. Under the water ahead of it: this far past where it leaves the water and aside (m), this far up (m). Ahead of
 *  its leap: this far ahead of its peak and to the side (m), this high over the water (m). A drift eases in this long
 *  (s). */
const CORNER = 14;
const HIGH = 12.5;
const DRIFT = 2;
const BACK = 0.16;
const UP = 0.42;
const SIDE = 0.62;
const WAIT = 4;
const WAIT_ASIDE = 1.8;
const AHEAD = 9;
const ASIDE = 3.2;
const OVER = 1.3;
const EASE = 0.6;
/** Its leap's shot aims this far right of it and under it (m). */
const FRAME_LEFT = 2.5;
const FRAME_DOWN = 1.5;

const into = new THREE.Vector3();
const right = new THREE.Vector3();
const fwd = new THREE.Vector3();
const side = new THREE.Vector3();
const a = shot();
const b = shot();

export class SharkCinema {
  private readonly eye = shot();
  private readonly high = shot();
  private readonly low = shot();
  private readonly front = shot();
  private readonly under = shot();
  private readonly mark = sharkMark();
  private readonly you = new THREE.Vector3();
  /** The yaw and pitch you face when the show ends: at the shark. */
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly mid: { x: number; z: number }) {}

  /** The show starts: your eyes at `eye` looking along `dir`, your feet at `feet`. Lays out its fixed shots. */
  start(eye: THREE.Vector3, dir: THREE.Vector3, feet: THREE.Vector3) {
    const top = BIG_SHARK.v.floodTop;
    this.you.copy(feet);
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(dir, 20);
    into.set(this.mid.x - feet.x, 0, this.mid.z - feet.z);
    if (into.lengthSq() < 1e-6) into.set(0, 0, -1);
    into.normalize();
    right.set(-into.z, 0, into.x);
    this.high.pos.set(this.mid.x, HIGH, this.mid.z).addScaledVector(into, -CORNER).addScaledVector(right, CORNER * 0.8);
    this.high.look.set(this.mid.x, 0.5, this.mid.z);
    this.low.pos.copy(this.high.pos).addScaledVector(into, DRIFT * 2).setY(HIGH - DRIFT);
    this.low.look.set(this.mid.x, top * 0.75, this.mid.z);
    // Ahead of its leap, just over the water, a little aside: it comes out at you on the left, its name on the right.
    const s = sharkBeats();
    sharkAt(s.swimTo, this.mid, feet, this.mark);
    side.set(-this.mark.way.z, 0, this.mark.way.x);
    this.front.pos.copy(this.mark.peak).addScaledVector(this.mark.way, AHEAD).addScaledVector(side, -ASIDE).setY(top + OVER);
    // Under the water, just past where it leaves the water: it comes straight at the view, then up over it.
    this.under.pos.copy(this.mark.from).addScaledVector(this.mark.way, WAIT).addScaledVector(side, WAIT_ASIDE).setY(top * DEPTH + 0.6);
    // Facing it at the end: where it swims on to.
    sharkAt(s.end, this.mid, feet, this.mark);
    const dx = this.mark.mid.x - eye.x;
    const dz = this.mark.mid.z - eye.z;
    this.endYaw = Math.atan2(-dx, -dz);
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(this.mark.mid.y - eye.y, Math.hypot(dx, dz))));
  }

  /** The view `t` s into the show, into `out`; `eye`: your eyes now (the water has lifted you). */
  intro(t: number, eye: THREE.Vector3, out: Shot) {
    const s = sharkBeats();
    const h = ENEMY_STATS.bigShark().height;
    const len = sharkLength();
    // The flood: up over the corner, then drifting down as the water climbs.
    if (t < s.swimFrom + EASE) {
      if (t < 1.2) return blend(this.eye, this.high, t / 1.2, out);
      blend(this.high, this.low, (t - 1.2) / Math.max(0.1, s.swimFrom - 1.2), a);
      if (t < s.swimFrom) return copy(a, out);
      return blend(a, this.shoulder(t, h, len, b), (t - s.swimFrom) / EASE, out);
    }
    // Over its shoulder as it swims.
    if (t < s.swimTo) return this.shoulder(t, h, len, out);
    sharkAt(t, this.mid, this.you, this.mark);
    // Cut: under the water, it coming straight at the view and bursting up past it.
    if (t < s.approachTo + (s.breachTo - s.approachTo) * OUT_FROM) {
      this.under.look.copy(this.mark.mid);
      return copy(this.under, out);
    }
    // Cut: ahead of its leap, over the water, watching it: aimed a little to its right (it on the left of the view, its
    // name on the right) and under it (the water's surface in the view).
    fwd.set(this.mark.mid.x - this.front.pos.x, 0, this.mark.mid.z - this.front.pos.z).normalize();
    this.front.look.copy(this.mark.mid).addScaledVector(side.set(-fwd.z, 0, fwd.x), FRAME_LEFT);
    this.front.look.y -= FRAME_DOWN;
    if (t < s.breachTo) return copy(this.front, out);
    // Back into your eyes, facing it.
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.front, a, (t - s.breachTo) / Math.max(0.1, s.end - s.breachTo), out);
  }

  /** Is `t` s into the show its leap's time out of the water (the boss's name on the right)? */
  static named(t: number): boolean {
    const s = sharkBeats();
    const k = (t - s.approachTo) / Math.max(0.01, s.breachTo - s.approachTo);
    return k >= OUT_FROM && k <= OUT_TO + 0.15;
  }

  /** Over its left shoulder `t` s in: close behind its head, over its back and to its left, looking ahead of it. */
  private shoulder(t: number, h: number, len: number, out: Shot): Shot {
    sharkAt(t, this.mid, this.you, this.mark);
    fwd.set(-Math.sin(this.mark.yaw), 0, -Math.cos(this.mark.yaw));
    side.set(fwd.z, 0, -fwd.x);
    out.pos.copy(this.mark.mid).addScaledVector(fwd, -len * BACK).addScaledVector(side, h * SIDE);
    out.pos.y += h * UP;
    out.look.copy(this.mark.mid).addScaledVector(fwd, 12);
    out.look.y -= 0.5;
    return out;
  }
}

function copy(from: Shot, out: Shot): Shot {
  out.pos.copy(from.pos);
  out.look.copy(from.look);
  return out;
}

/** Eased from shot `a` to `b` (k: 0..1). */
function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const s = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, s);
  out.look.lerpVectors(from.look, to.look, s);
  return out;
}
