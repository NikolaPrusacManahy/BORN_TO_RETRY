// Update 0.3.33 — floor 8's Sand Ninjas' smoke and caltrops (MD/FLOOR8_SHRINE_PLAN.md; sim/enemies/sandNinja.ts): a smoke
// bomb thrown in an arc bursts where it lands into a cloud you can't see through (engine/shrine/shrineFx.ts draws it;
// it thins out at its end); caltrops scattered across the floor lie there a while, and standing in them cuts you now
// and then and slows you. Kept with the fight's ground (dungeon/ground.ts). Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { EventQueue } from '../../core/eventQueue';
import type { CombatEvent } from './state';

export interface SmokeBomb {
  alive: boolean;
  from: Vector3;
  to: Vector3;
  pos: Vector3;
  t: number;
  fall: number;
}
/** A cloud or a scatter of caltrops: its middle, how far it reaches (m), its life left and whole (s). */
export interface Patch {
  alive: boolean;
  x: number;
  z: number;
  r: number;
  life: number;
  full: number;
}
export interface Smoke {
  bombs: SmokeBomb[];
  clouds: Patch[];
  caltrops: Patch[];
  /** Seconds till caltrops can cut you again. */
  cut: number;
}

const POOL = 6;
/** A bomb's arc over its line (m); caltrops cut you at most this often (s), on the floor (not above this, m). */
const ARC = 2.6;
const CUT_EVERY = 0.8;
const ON_FLOOR = 0.4;

const patches = () => Array.from({ length: POOL }, () => ({ alive: false, x: 0, z: 0, r: 0, life: 0, full: 1 }));
export const createSmoke = (): Smoke => ({ bombs: Array.from({ length: POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), pos: new Vector3(), t: 0, fall: 1 })), clouds: patches(), caltrops: patches(), cut: 0 });

/** A free one of `list`, or the one nearest its end. */
const free = (list: Patch[]) => list.find((p) => !p.alive) ?? list.reduce((a, b) => (b.life < a.life ? b : a));

/** A smoke bomb thrown from `from` to land at `to` in `fall` s. */
export function throwSmoke(s: Smoke, from: Vector3, to: Vector3, fall: number) {
  const b = s.bombs.find((x) => !x.alive) ?? s.bombs[0];
  b.alive = true;
  b.from.copy(from);
  b.to.copy(to);
  b.pos.copy(from);
  b.t = 0;
  b.fall = Math.max(0.2, fall);
}

/** Caltrops scattered at (x, z), `r` across. */
export function scatterCaltrops(s: Smoke, x: number, z: number, r: number, life: number) {
  Object.assign(free(s.caltrops), { alive: true, x, z, r, life, full: life });
}

/** Is (x, z) in smoke (`pad`: this far into its edge, m)? */
export const inSmoke = (s: Smoke, x: number, z: number, pad = 0) => s.clouds.some((c) => c.alive && Math.hypot(x - c.x, z - c.z) < c.r - pad);

/** Your speed's share in caltrops (1: none under you). */
export const caltropSlow = (s: Smoke, p: PlayerState) => (onCaltrops(s, p) ? FOES_SHRINE.v.caltropsSlow : 1);
const onCaltrops = (s: Smoke, p: PlayerState) => p.pos.y < ON_FLOOR && s.caltrops.some((c) => c.alive && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r);

/** One tick: bombs fly and burst into clouds; clouds and caltrops wear off; caltrops cut you. */
export function stepSmoke(s: Smoke, player: PlayerState, events: EventQueue<CombatEvent>, dt: number) {
  const v = FOES_SHRINE.v;
  for (const b of s.bombs) {
    if (!b.alive) continue;
    b.t += dt;
    const k = Math.min(1, b.t / b.fall);
    b.pos.lerpVectors(b.from, b.to, k);
    b.pos.y += 4 * ARC * k * (1 - k);
    if (k < 1) continue;
    b.alive = false;
    Object.assign(free(s.clouds), { alive: true, x: b.to.x, z: b.to.z, r: v.smokeSize, life: v.smokeLast, full: v.smokeLast });
    events.push('smokeBurst', v.smokeSize, b.to.x, b.to.y + 0.5, b.to.z);
  }
  for (const list of [s.clouds, s.caltrops]) {
    for (const p of list) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) p.alive = false;
    }
  }
  s.cut = Math.max(0, s.cut - dt);
  if (s.cut <= 0 && !player.dead && onCaltrops(s, player) && damagePlayer(player, v.caltropsCut, 'sandNinja')) {
    s.cut = CUT_EVERY;
    events.push('caltropsCut', 0, player.pos.x, player.pos.y + 0.2, player.pos.z);
  }
}

export function clearSmoke(s: Smoke) {
  for (const b of s.bombs) b.alive = false;
  for (const p of [...s.clouds, ...s.caltrops]) p.alive = false;
}
