// Update 0.3.71 — the Playable Demon's left click, Blazing Arc (design bible: "3-hit combo: slash, backslash, overhead"; the
// designer: "swing animation needs premium treatment"). A fist's hit lands on the click; a blade this size has to get there
// first, so a swing starts on the click (`bladeSwing`, for the arms and the sounds) and lands at its contact, where the
// arms' blade arrives (the same tuning: viewmodel/bladeArcs.ts). And it hits all it sweeps through, not the nearest thing:
// a fan of rays, each carrying on past what it meets, so nothing can stand behind another. Pure.
// Update 0.3.72 — the rest of phase 2 (the designer: "continue"). A click swings; held on past its swing, it charges, and let go
// full it's Ember Wave (the bible's "Hold LMB"; a press in the last moments of a swing is kept for the next). Right click held
// is a block; a parry that lands is Verdict Parry's instant counter-slash, in slow motion. Ctrl on the ground plants the sword.
// The overhead's blow leaves its fire wall (demonFire.ts).
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { DEMON } from '../../tuning/demon';
import type { CollisionWorld } from '../collisionWorld';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { launchWave, leaveWall } from './demonFire';
import { frostHit } from './punch';
import type { CombatEvent, CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** The combo's third; what a charge lets go; what a parry answers with. */
export const OVERHEAD = 2;
export const EMBER = 3;
export const COUNTER = 4;
/** So many rays make up a sweep; each goes on past what it meets (so far past it, m), through so many at most. */
const SLASH_RAYS = 9;
const OVERHEAD_RAYS = 5;
const THROUGH = 4;
const PAST = 0.5;
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;
/** A press in a swing is kept this long, for the next. */
const KEPT = 0.28;

export interface BladeSwing {
  /** The swing in the air (0 slash, 1 backslash, 2 overhead, 3 Ember Wave, 4 the counter; −1: none), seconds into it, and whether it's landed. */
  step: number;
  t: number;
  struck: boolean;
  /** The next in the combo, how long it waits for you, and a press being kept for it (s). */
  next: number;
  combo: number;
  queued: number;
  /** Left click held since its press (s), and the charge it's become: going, how long, full. */
  heldFor: number;
  charging: boolean;
  charge: number;
  full: boolean;
  /** Right click held: the block. */
  guard: boolean;
  /** The sword in the floor (s left), and till it can be again (s). */
  plant: number;
  brandWait: number;
  /** Hellfire Lunge: going, from where it was last tick, and what it's been through. */
  lunging: boolean;
  lungeFrom: Vector3;
  lungeStruck: Set<string>;
}

export const createBladeSwing = (): BladeSwing => ({ step: -1, t: 0, struck: false, next: 0, combo: 0, queued: 0, heldFor: 0, charging: false, charge: 0, full: false, guard: false, plant: 0, brandWait: 0, lunging: false, lungeFrom: new Vector3(), lungeStruck: new Set() });

/** Seconds from a swing's start to its contact, its last stretch of that (the strike itself), how long its weight carries it on,
 *  the way back to ready, and from contact till the next can start. */
export const bladeWindup = (s: number) => (s === COUNTER ? DEMON.v.counterWindup : s === EMBER ? DEMON.v.emberWindup : s === OVERHEAD ? DEMON.v.overheadWindup : DEMON.v.slashWindup);
export const bladeStrike = (s: number) => (s === COUNTER ? DEMON.v.counterStrike : s === EMBER ? DEMON.v.emberStrike : s === OVERHEAD ? DEMON.v.overheadStrike : DEMON.v.slashStrike);
export const bladeFollow = (s: number) => (s === COUNTER ? DEMON.v.counterFollow : s === EMBER ? DEMON.v.emberFollow : s === OVERHEAD ? DEMON.v.overheadFollow : DEMON.v.slashFollow);
export const bladeBack = (s: number) => (s === COUNTER ? DEMON.v.counterBack : s === EMBER ? DEMON.v.emberBack : s === OVERHEAD ? DEMON.v.overheadBack : DEMON.v.slashBack);
const bladeNext = (s: number) => (s === COUNTER ? DEMON.v.counterNext : s === EMBER ? DEMON.v.emberNext : s === OVERHEAD ? DEMON.v.overheadNext : DEMON.v.slashNext);

function begin(b: BladeSwing, step: number, events: EventQueue<CombatEvent>) {
  b.step = step;
  b.t = 0;
  b.struck = false;
  b.queued = 0;
  events.push('bladeSwing', step);
}

/** Verdict Parry: a parry landed. The counter-slash, at once, and the world slows for it. */
export function startCounter(state: CombatState) {
  const b = state.blade;
  b.charging = b.full = false;
  begin(b, COUNTER, state.events);
  state.slowMo = DEMON.v.counterSlow;
}

/** One tick. `pressed`, `held`: left click; `stop`: a parry's window open, a block or a slam's clasp: no swing now. `rate`: green
 *  rings and the like, which shorten the wait after contact (never the wind-up: the arms' blade has to get there). Returns
 *  true the tick it reaches contact. */
export function updateBlade(b: BladeSwing, pressed: boolean, held: boolean, stop: boolean, events: EventQueue<CombatEvent>, dt: number, rate: number): boolean {
  const v = DEMON.v;
  b.combo = Math.max(0, b.combo - dt);
  b.queued = pressed ? KEPT : Math.max(0, b.queued - dt);
  b.heldFor = !held || pressed ? 0 : b.heldFor + dt;
  // (The counter's yours: it isn't stopped by the block it came from.)
  if (stop && b.step !== COUNTER) {
    b.step = -1;
    b.queued = 0;
    if (b.charging) events.push('chargeCancel');
    b.charging = b.full = false;
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
    if (b.step <= OVERHEAD) b.combo = v.combo;
    b.step = -1;
  }
  if (b.charging) {
    if (held) {
      b.charge = Math.min(v.chargeTime, b.charge + dt);
      if (!b.full && b.charge >= v.chargeTime) {
        b.full = true;
        events.push('chargeReady');
      }
      return false;
    }
    b.charging = false;
    if (b.full) {
      b.full = false;
      begin(b, EMBER, events);
    } else events.push('chargeCancel');
    return false;
  }
  if (b.queued > 0) {
    const step = b.combo > 0 ? b.next : 0;
    b.next = (step + 1) % (OVERHEAD + 1);
    b.combo = 0;
    begin(b, step, events);
    return false;
  }
  if (held && b.heldFor >= v.chargeAfter) {
    b.charging = true;
    b.charge = 0;
    b.full = false;
    events.push('chargeStart');
  }
  return false;
}

const ray = new Vector3();
const from = new Vector3();
const end = new Vector3();
const hit = emptyTargetHit();
const seen: string[] = [];

/** Landing a swing, from `eye` along `dir` (length 1): everything in its arc takes it. `factor`: the fists' damage cards. Ember
 *  Wave throws instead; the overhead leaves its fire wall. Returns how many it hit. */
export function landBlade(state: CombatState, step: number, eye: Vector3, dir: Vector3, world: CollisionWorld, factor = 1): number {
  const v = DEMON.v;
  if (step === EMBER) {
    launchWave(state, eye, dir);
    return 0;
  }
  const big = step === OVERHEAD || step === COUNTER;
  const half = (step === COUNTER ? v.counterArc : step === OVERHEAD ? v.overheadArc : v.slashArc) * DEG;
  const rays = step === OVERHEAD ? OVERHEAD_RAYS : SLASH_RAYS;
  const damage = (step === COUNTER ? v.counterDamage : step === OVERHEAD ? v.overheadDamage : v.slashDamage) * factor;
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
  if (step === OVERHEAD) leaveWall(state, eye, dir, world);
  if (seen.length > 0) state.hitStop.request(big ? v.overheadStop : v.stop);
  else {
    end.copy(eye).addScaledVector(dir, v.reach);
    state.events.push('whiff', 0, end.x, end.y, end.z);
  }
  return seen.length;
}
