// Update 0.3.71 — the Playable Demon's left click, Blazing Arc (design bible: "3-hit combo: slash, backslash, overhead"; the
// designer: "swing animation needs premium treatment"). A fist's hit lands on the click; a blade this size has to get there
// first, so a swing starts on the click (`bladeSwing`, for the arms and the sounds) and lands at its contact, where the
// arms' blade arrives (the same tuning: viewmodel/bladeArcs.ts). And it hits all it sweeps through, not the nearest thing:
// a fan of rays, each carrying on past what it meets, so nothing can stand behind another. Pure.
// (The third's fire wall is still to come: phase 2.)
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { DEMON } from '../../tuning/demon';
import type { CollisionWorld } from '../collisionWorld';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { frostHit } from './punch';
import type { CombatEvent, CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** The third hit. */
export const OVERHEAD = 2;
/** So many rays make up a sweep; each goes on past what it meets (so far past it, m), through so many at most. */
const SLASH_RAYS = 9;
const OVERHEAD_RAYS = 5;
const THROUGH = 4;
const PAST = 0.5;
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;

export interface BladeSwing {
  /** The swing in the air (0 slash, 1 backslash, 2 overhead; −1: none), seconds into it, and whether it's landed. */
  step: number;
  t: number;
  struck: boolean;
  /** The next in the combo, and how long it waits for you. */
  next: number;
  combo: number;
}

export const createBladeSwing = (): BladeSwing => ({ step: -1, t: 0, struck: false, next: 0, combo: 0 });

/** Seconds from a swing's click to its contact, and from contact till the next can start. */
export const bladeWindup = (step: number) => (step === OVERHEAD ? DEMON.v.overheadWindup : DEMON.v.slashWindup);
const bladeNext = (step: number) => (step === OVERHEAD ? DEMON.v.overheadNext : DEMON.v.slashNext);

/** One tick. `attack`: left click down; `stop`: a parry's window open or a slam's clasp: the swing's off. `rate`: green rings
 *  and the like, which shorten the wait after contact (never the wind-up: the arms' blade has to get there). Returns true
 *  the tick it reaches contact. */
export function updateBlade(b: BladeSwing, attack: boolean, stop: boolean, events: EventQueue<CombatEvent>, dt: number, rate: number): boolean {
  b.combo = Math.max(0, b.combo - dt);
  if (stop) {
    b.step = -1;
    return false;
  }
  if (b.step >= 0) {
    b.t += dt;
    if (!b.struck) {
      if (b.t < bladeWindup(b.step)) return false;
      b.struck = true;
      return true;
    }
    if (b.t < bladeWindup(b.step) + bladeNext(b.step) / rate) return false;
    b.combo = DEMON.v.combo;
    b.step = -1;
  }
  if (!attack) return false;
  b.step = b.combo > 0 ? b.next : 0;
  b.t = 0;
  b.struck = false;
  b.next = (b.step + 1) % (OVERHEAD + 1);
  b.combo = 0;
  events.push('bladeSwing', b.step);
  return false;
}

const ray = new Vector3();
const from = new Vector3();
const end = new Vector3();
const hit = emptyTargetHit();
const seen: string[] = [];

/** Landing a swing, from `eye` along `dir` (length 1): everything in its arc takes it. `factor`: the fists' damage cards.
 *  Returns how many it hit. */
export function landBlade(state: CombatState, step: number, eye: Vector3, dir: Vector3, world: CollisionWorld, factor = 1): number {
  const v = DEMON.v;
  const big = step === OVERHEAD;
  const half = (big ? v.overheadArc : v.slashArc) * DEG;
  const rays = big ? OVERHEAD_RAYS : SLASH_RAYS;
  const damage = (big ? v.overheadDamage : v.slashDamage) * factor;
  const knock = big ? v.overheadKnock : v.slashKnock;
  seen.length = 0;
  for (let i = 0; i < rays; i++) {
    ray.copy(dir).applyAxisAngle(UP, -half + (2 * half * i) / (rays - 1));
    const reach = Math.min(v.reach, world.rayDistance(eye, ray, v.reach) + v.width);
    const flat = Math.hypot(ray.x, ray.z) || 1;
    end.copy(eye).addScaledVector(ray, reach);
    from.copy(eye);
    for (let n = 0; n < THROUGH && nearestTarget(state, from, end, v.width, hit); n++) {
      // On past it, for what's behind it.
      from.copy(hit.point).addScaledVector(ray, v.width + PAST);
      const id = `${hit.kind}${hit.index}/${hit.part}`;
      if (seen.includes(id)) continue;
      seen.push(id);
      const killed = landHit(state, hit, damage, knock, ray.x / flat, ray.z / flat, big ? 'hitPierce' : 'hitSlash', big ? 1 : damage);
      if (hit.kind !== 'enemy') continue;
      if (killed) launch(state.enemies[hit.index], ray.x / flat, ray.z / flat);
      else if (isLive(state.enemies[hit.index])) frostHit(state, hit);
    }
  }
  if (seen.length > 0) state.hitStop.request(big ? v.overheadStop : v.stop);
  else {
    end.copy(eye).addScaledVector(dir, v.reach);
    state.events.push('whiff', 0, end.x, end.y, end.z);
  }
  return seen.length;
}
