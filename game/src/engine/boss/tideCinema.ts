// Update 0.3.31 — Tidebreaker's show as you see it (sim/dungeon/tideShow.ts; the designer: "Intro cinematic for the boss:
// All previous rooms explode and all of space; The boss room is x2 bigger than a normal boss room, you see it expanding;
// A shot of the earth shakes and explode; A meteor is coming from the earth exploding as it has at least 2 different
// camera angler as it lands on the arena with a massive explosion, revealing the boss doing the monster transformation
// animation as the whole place shakes and name displayed in slow motion like the shark boss"): the view pulls up off
// you, then circles high over the floor as its rooms blow, the furthest first (the sky bursting with them); swings round
// high over the arena as its walls slide out, to a boss room's size, then twice it; cuts down into the arena, looking up
// at the Earth as it shakes and bursts; follows the meteor down out of it, close behind it (the first angle); cuts to the
// arena's floor, looking up at it coming (the second), white as it strikes; then low in front of Tidebreaker as it rises
// out of the crater roaring, it on the left of the view and its name on the right, slowed, the whole place shaking; and
// back into your eyes, facing it. Its shots stay clear of the arena's pillars. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { tideBeats } from '../../sim/dungeon/tideShow';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { meteorAt } from '../moon/tideShowView';
import { EARTH_DIR } from '../moon/spaceSky';
import type { Shot } from './cinema';

/** Pulled up off you this high and back (m); circling the floor this far out from its middle and this high (m), this far
 *  round (rad) as its rooms blow; easing from one to the next this long (s). */
const RISE = 18;
const RISE_BACK = 8;
const ORBIT_OUT = 60;
const ORBIT_UP = 230;
const ORBIT_TURN = 0.7;
const EASE = 1.1;
/** Over the arena as it grows: this far out past its wall you came in by and this high (m), coming down this much. */
const GROW_OUT = 24;
const GROW_UP = 92;
const GROW_DROP = 12;
/** In the arena at the Earth: this far back from its middle (m), this high, pushing in this far. */
const EARTH_BACK = 32;
const EARTH_UP = 2.2;
const EARTH_PUSH = 5;
/** Behind the meteor: this far back up its way, aside and over it (m), looking this far ahead of it. */
const CHASE_BACK = 22;
const CHASE_SIDE = 7;
const CHASE_UP = 5;
const CHASE_AHEAD = 60;
/** On the arena's floor watching it come: this far aside from the middle and back (m), this high; held this long past
 *  its strike (s). */
const GROUND_SIDE = 34;
const GROUND_BACK = 10;
const GROUND_UP = 1.4;
const STRIKE_HOLD = 0.3;
/** In front of it as it rises: this many of its heights out (closing to the second), this share of its height up; aimed
 *  this share of its height off to its right as you see it (it on the left of the view); back into your eyes over this
 *  long (s). */
const FRONT: readonly [number, number] = [2.4, 1.9];
const FRONT_UP = 0.32;
const FRAME_LEFT = 0.62;
const BACK = 1.2;
/** Kept this far off a pillar's side (m). */
const CLEAR = 1.6;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const UP = new THREE.Vector3(0, 1, 0);
const flat = new THREE.Vector3(EARTH_DIR.x, 0, EARTH_DIR.z).normalize();
const across = new THREE.Vector3().crossVectors(EARTH_DIR, UP).normalize();
const rock = new THREE.Vector3();
const a = shot();
const b = shot();

/** The haze in its wide shots (m: where it starts and where it hides everything), and how far it's pushed out to it
 *  (0..1; the floor's view: dungeonView.ts). */
export const WIDE_HAZE: readonly [number, number] = [380, 1200];
export function tideWide(run: BossRun): number {
  if (run.kind !== 'tidebreaker' || run.beat !== 'intro') return 0;
  const s = tideBeats();
  return smooth(run.t / 0.6) * (1 - smooth((run.t - s.impact - STRIKE_HOLD) / 0.6));
}

export class TideCinema {
  private readonly eye = shot();
  private readonly rise = shot();
  private readonly earth = shot();
  private readonly ground = shot();
  private readonly front = shot();
  private readonly floor = new THREE.Vector3();
  private readonly arena = new THREE.Vector3();
  private readonly out = new THREE.Vector3();
  private readonly toward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private half = 0;
  private turn0 = 0;
  /** The yaw and pitch you face when the show ends: at it. */
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {}

  /** The show starts: your eyes at `eye` looking along `dir`. Lays out its shots. */
  start(eye: THREE.Vector3, dir: THREE.Vector3) {
    const lv = this.level;
    const bs = lv.boss;
    const h = ENEMY_STATS.tidebreaker().height;
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(dir, 20);
    // The floor's middle (its rooms' bounds); the arena's; the way out through the wall you came in by.
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const r of lv.rooms) {
      x0 = Math.min(x0, r.min.x);
      x1 = Math.max(x1, r.max.x);
      z0 = Math.min(z0, r.min.z);
      z1 = Math.max(z1, r.max.z);
    }
    this.floor.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const e = bs.end;
    this.arena.set((e.min.x + e.max.x) / 2, 0, (e.min.z + e.max.z) / 2);
    this.half = Math.max(e.max.x - e.min.x, e.max.z - e.min.z) / 2;
    const side = bs.entrance;
    this.out.set(side === 'w' ? -1 : side === 'e' ? 1 : 0, 0, side === 'n' ? -1 : side === 's' ? 1 : 0);
    this.turn0 = Math.atan2(this.arena.z - this.floor.z, this.arena.x - this.floor.x);
    // Up off you, turning to look out over the floor.
    this.rise.pos.set(eye.x - dir.x * RISE_BACK, eye.y + RISE, eye.z - dir.z * RISE_BACK);
    this.rise.look.copy(this.floor);
    // In the arena, looking up at the Earth.
    const p = bs.portal;
    this.clear(this.earth.pos.set(p.x, EARTH_UP, p.z).addScaledVector(flat, -EARTH_BACK));
    // On its floor, aside, watching the meteor come.
    this.clear(this.ground.pos.set(p.x, GROUND_UP, p.z).addScaledVector(across, GROUND_SIDE).addScaledVector(flat, -GROUND_BACK));
    // In front of it (it faces you), aimed to its left.
    this.toward.set(eye.x - p.x, 0, eye.z - p.z);
    if (this.toward.lengthSq() < 1e-6) this.toward.copy(this.out);
    this.toward.normalize();
    this.right.set(this.toward.z, 0, -this.toward.x);
    this.front.look.set(p.x, h * 0.55, p.z).addScaledVector(this.right, h * FRAME_LEFT);
    // Facing it at the end.
    const dx = p.x - eye.x;
    const dz = p.z - eye.z;
    this.endYaw = Math.atan2(-dx, -dz);
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(h * 0.6 - eye.y, Math.hypot(dx, dz))));
  }

  /** The view `t` s into the show, into `out`; `eye`: your eyes now. */
  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = tideBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    // Circling high over the floor as its rooms blow.
    if (t < s.wreckTo) return t < s.pull + EASE ? blend(this.rise, this.orbit(t, a), (t - s.pull) / EASE, out) : this.orbit(t, out);
    // High over the arena as it grows.
    if (t < s.growTo) return t < s.wreckTo + EASE ? blend(this.orbit(s.wreckTo, a), this.grow(t, b), (t - s.wreckTo) / EASE, out) : this.grow(t, out);
    // In the arena, at the Earth, pushing in as it shakes and bursts.
    if (t < s.meteorFrom) {
      const k = smooth((t - s.earthFrom) / Math.max(0.1, s.meteorFrom - s.earthFrom));
      out.pos.copy(this.earth.pos).addScaledVector(flat, EARTH_PUSH * k);
      out.look.copy(out.pos).addScaledVector(EARTH_DIR, 100);
      return out;
    }
    const p = this.level.boss.portal;
    meteorAt(t, p, rock);
    // Close behind the meteor, looking down its way.
    if (t < s.angleB) {
      out.pos.copy(rock).addScaledVector(EARTH_DIR, CHASE_BACK).addScaledVector(across, CHASE_SIDE).addScaledVector(UP, CHASE_UP);
      out.look.copy(rock).addScaledVector(EARTH_DIR, -CHASE_AHEAD);
      return out;
    }
    // On the arena's floor, watching it come down; white as it strikes.
    if (t < s.impact + STRIKE_HOLD) {
      out.pos.copy(this.ground.pos);
      out.look.copy(t < s.impact ? rock : rock.set(p.x, 4, p.z));
      return out;
    }
    // In front of it as it rises, closing in.
    if (t < s.end - BACK) return this.reveal(t, out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.reveal(t, b), a, (t - (s.end - BACK)) / BACK, out);
  }

  /** Is `t` s into the show its name's time (slowed, on the right of the view)? */
  static named(t: number): boolean {
    const s = tideBeats();
    return t >= s.slowFrom - 0.2 && t < s.slowTo + 0.3;
  }

  /** The whole place shaking `t` s in: the rooms blowing, the walls grinding, the Earth, the meteor, its strike (the
   *  hardest), and on through its rise. */
  shake(camera: THREE.Camera, t: number) {
    const s = tideBeats();
    const k = (t - s.earthFrom) / Math.max(0.1, s.earthBurst - s.earthFrom);
    let amp = 0;
    if (t >= s.wreckFrom && t < s.wreckTo + 0.5) amp += 0.12;
    if (t >= s.growFrom && t < s.growTo) amp += 0.06;
    if (k > 0 && k < 1) amp += 0.25 * k * k;
    amp += 0.6 * pulse(t - s.earthBurst, 1.2);
    if (t >= s.meteorFrom && t < s.impact) amp += 0.1 + 0.2 * smooth((t - s.meteorFrom) / (s.impact - s.meteorFrom));
    amp += 1.4 * pulse(t - s.impact, 1.4);
    if (t >= s.impact && t < s.slowTo + 0.3) amp += 0.28;
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  /** High over the floor, circling it `t` s in. */
  private orbit(t: number, out: Shot): Shot {
    const s = tideBeats();
    const turn = this.turn0 + ORBIT_TURN * smooth((t - s.pull) / Math.max(0.1, s.wreckTo - s.pull));
    out.pos.set(this.floor.x + Math.cos(turn) * ORBIT_OUT, ORBIT_UP, this.floor.z + Math.sin(turn) * ORBIT_OUT);
    out.look.copy(this.floor);
    return out;
  }

  /** High over the arena (out past the wall you came in by), coming down a little as it grows. */
  private grow(t: number, out: Shot): Shot {
    const s = tideBeats();
    const k = smooth((t - s.growFrom) / Math.max(0.1, s.growTo - s.growFrom));
    out.pos.copy(this.arena).addScaledVector(this.out, this.half + GROW_OUT).setY(GROW_UP - GROW_DROP * k);
    out.look.copy(this.arena);
    return out;
  }

  /** Low in front of it, closing in as it rises. */
  private reveal(t: number, out: Shot): Shot {
    const s = tideBeats();
    const h = ENEMY_STATS.tidebreaker().height;
    const p = this.level.boss.portal;
    const k = smooth((t - s.impact) / Math.max(0.1, s.end - s.impact));
    const far = h * (FRONT[0] + (FRONT[1] - FRONT[0]) * k);
    this.clear(out.pos.set(p.x, h * FRONT_UP, p.z).addScaledVector(this.toward, far).addScaledVector(this.right, h * 0.25));
    out.look.copy(this.front.look);
    return out;
  }

  /** Out of the arena's pillars, if `pos` is in one. */
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

/** Eased from shot `from` to `to` (k: 0..1). */
function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const s = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, s);
  out.look.lerpVectors(from.look, to.look, s);
  return out;
}
