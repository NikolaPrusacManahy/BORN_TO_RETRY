// Update 0.3.71 — the Playable Demon's left click, Blazing Arc (design bible: "3-hit combo: slash, backslash, overhead"; the
// designer: "swing animation needs premium treatment"). A fist's hit lands on the click; a blade this size has to get there
// first, so a swing starts on the click (`bladeSwing`, for the arms and the sounds) and lands at its contact, where the
// arms' blade arrives (the same tuning: viewmodel/bladeArcs.ts). And it hits all it sweeps through, not the nearest thing:
// a fan of rays, each carrying on past what it meets, so nothing can stand behind another. Pure.
// Update 0.3.72 — the rest of phase 2 (the designer: "continue"). A click swings; held on past its swing, it charges, and let go
// full it's Ember Wave (the bible's "Hold LMB"; a press in the last moments of a swing is kept for the next). Right click held
// is a block; a parry that lands is Verdict Parry's instant counter-slash, in slow motion. Ctrl on the ground plants the sword.
// The overhead's blow leaves its fire wall (demonFire.ts).
// Update 0.3.73 — E's throw and Q's Last Verdict are swings too, so the arm's and the rules' times are one (bladeThrow.ts, lastVerdict.ts). At high
// heat (heat.ts) a swing reaches further and wider.
// Update 0.3.74 — the designer: no parry for it, right click's the throw: no block, no counter-slash.
// Update 0.3.78 — the designer: "Remove hold left mouse button and left them hold to just continually attack normally" and "call it mode switch": held, left click goes on swinging.
// E, its sword in hand, is Mode Switch: in ranged mode each swing's one of two slanted slashes, each throwing a crescent, as many as you like.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { DEMON } from '../../tuning/demon';
import type { CollisionWorld } from '../collisionWorld';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { createThrownBlade, launchBlade, type ThrownBlade } from './bladeThrow';
import { launchWave, leaveWall } from './demonFire';
import { isHot } from './heat';
import { frostHit } from './punch';
import type { CombatEvent, CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** The combo's third; ranged mode's two slanted slashes; right click's; Q's. */
export const OVERHEAD = 2;
export const SHOT_A = 3;
export const SHOT_B = 4;
export const THROW = 5;
export const VERDICT = 6;
/** One of ranged mode's. */
export const isShot = (s: number) => s === SHOT_A || s === SHOT_B;
/** So many rays make up a sweep; each goes on past what it meets (so far past it, m), through so many at most. */
const SLASH_RAYS = 9;
const OVERHEAD_RAYS = 5;
const THROUGH = 4;
const PAST = 0.5;
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;
/** A press in a swing is kept this long, for the next. */
const KEPT = 0.28;
/** However hot, no further round than this either side (degrees). */
const MOST_ARC = 100;

export interface BladeSwing {
  /** The swing in the air (0 slash, 1 backslash, 2 overhead, 3 and 4 ranged mode's slashes, 5 the throw, 6 Last Verdict; −1: none), seconds into it, and whether it's landed. */
  step: number;
  t: number;
  struck: boolean;
  /** The next in the combo, how long it waits for you, and a press being kept for it (s). */
  next: number;
  combo: number;
  queued: number;
  /** Update 0.3.78 — Mode Switch: in ranged mode. */
  ranged: boolean;
  /** The sword in the floor (s left), and till it can be again (s). */
  plant: number;
  brandWait: number;
  /** Hellfire Lunge: going, from where it was last tick, and what it's been through. */
  lunging: boolean;
  lungeFrom: Vector3;
  lungeStruck: Set<string>;
  /** Update 0.3.73 — where it started (a hot one leaves fire along it). */
  lungeStart: Vector3;
  /** Its heat (0 … 1), how long since it last hit anything (s), and kills not yet turned into health. */
  heat: number;
  heatIdle: number;
  fallen: number;
  /** Thrown. */
  flying: ThrownBlade;
  /** Last Verdict: going, how far in (s), whether it's landed, what it's hit; once over, how long the colour's still coming back. */
  verdict: boolean;
  verdictT: number;
  verdictStruck: boolean;
  verdictSeen: Set<string>;
  grey: number;
  /** Update 0.3.75 — your feet last tick, how far into this stride; per enemy slot, till it can lose its nerve again (s). */
  feetX: number;
  feetZ: number;
  stride: number;
  dread: number[];
}

export const createBladeSwing = (): BladeSwing => ({ step: -1, t: 0, struck: false, next: 0, combo: 0, queued: 0, ranged: false, plant: 0, brandWait: 0, lunging: false, lungeFrom: new Vector3(), lungeStruck: new Set(), lungeStart: new Vector3(), heat: 0, heatIdle: 0, fallen: 0, flying: createThrownBlade(), verdict: false, verdictT: 0, verdictStruck: false, verdictSeen: new Set(), grey: 0, feetX: 0, feetZ: 0, stride: 0, dread: [] });

/** Seconds from a swing's start to its contact, its last stretch of that (the strike itself), how long its weight carries it on,
 *  the way back to ready, and from contact till the next can start. */
export const bladeWindup = (s: number) => (s === VERDICT ? DEMON.v.verdictWindup : s === THROW ? DEMON.v.throwWindup : isShot(s) ? DEMON.v.shotWindup : s === OVERHEAD ? DEMON.v.overheadWindup : DEMON.v.slashWindup);
export const bladeStrike = (s: number) => (s === VERDICT ? DEMON.v.verdictStrike : s === THROW ? DEMON.v.throwStrike : isShot(s) ? DEMON.v.shotStrike : s === OVERHEAD ? DEMON.v.overheadStrike : DEMON.v.slashStrike);
export const bladeFollow = (s: number) => (s === VERDICT ? DEMON.v.verdictFollow : s === THROW ? DEMON.v.throwFollow : isShot(s) ? DEMON.v.shotFollow : s === OVERHEAD ? DEMON.v.overheadFollow : DEMON.v.slashFollow);
export const bladeBack = (s: number) => (s === VERDICT ? DEMON.v.verdictBack : s === THROW ? DEMON.v.throwBack : isShot(s) ? DEMON.v.shotBack : s === OVERHEAD ? DEMON.v.overheadBack : DEMON.v.slashBack);
const bladeNext = (s: number) => (s >= THROW ? 0 : isShot(s) ? DEMON.v.shotNext : s === OVERHEAD ? DEMON.v.overheadNext : DEMON.v.slashNext);

export function begin(b: BladeSwing, step: number, events: EventQueue<CombatEvent>) {
  b.step = step;
  b.t = 0;
  b.struck = false;
  b.queued = 0;
  events.push('bladeSwing', step);
}

/** Update 0.3.73 — the arm draws back to throw it. (It leaves at contact: landBlade.) */
export function startThrow(state: CombatState) {
  begin(state.blade, THROW, state.events);
}

/** Update 0.3.78 — E, its sword in hand: Mode Switch. What's in the air goes on; the next swing's of the new mode. */
export function switchMode(state: CombatState) {
  const b = state.blade;
  b.ranged = !b.ranged;
  b.combo = 0;
  b.next = 0;
  state.events.push('demonMode', b.ranged ? 1 : 0);
}

/** One tick. `pressed`, `held`: left click; `stop`: a slam's clasp, the sword in the floor, a dash: no swing now. `rate`: green
 *  rings and the like, which shorten the wait after contact (never the wind-up: the arms' blade has to get there). Returns
 *  true the tick it reaches contact. */
export function updateBlade(b: BladeSwing, pressed: boolean, held: boolean, stop: boolean, events: EventQueue<CombatEvent>, dt: number, rate: number): boolean {
  const v = DEMON.v;
  b.combo = Math.max(0, b.combo - dt);
  b.queued = pressed ? KEPT : Math.max(0, b.queued - dt);
  if (stop) {
    b.step = -1;
    b.queued = 0;
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
    if (b.step <= SHOT_B) b.combo = v.combo;
    b.step = -1;
  }
  // Update 0.3.78 — pressed, or held: the next one.
  if (b.queued <= 0 && !held) return false;
  if (b.ranged) {
    // Each the other way; after a pause, the first again.
    const step = b.combo > 0 && b.next === SHOT_B ? SHOT_B : SHOT_A;
    b.next = step === SHOT_A ? SHOT_B : SHOT_A;
    b.combo = 0;
    begin(b, step, events);
    return false;
  }
  const step = b.combo > 0 ? b.next : 0;
  b.next = (step + 1) % (OVERHEAD + 1);
  b.combo = 0;
  begin(b, step, events);
  return false;
}

const ray = new Vector3();
const from = new Vector3();
const end = new Vector3();
const hit = emptyTargetHit();
const seen: string[] = [];

/** Landing a swing, from `eye` along `dir` (length 1): everything in its arc takes it. `factor`: the fists' damage cards. Ranged
 *  mode's throw a crescent instead, leaning as the swing did; the overhead leaves its fire wall. Returns how many it hit. */
export function landBlade(state: CombatState, step: number, eye: Vector3, dir: Vector3, world: CollisionWorld, factor = 1): number {
  const v = DEMON.v;
  if (isShot(step)) {
    // (Seen from behind it: A's right end high, as the swing came; B's left.)
    launchWave(state, eye, dir, step === SHOT_A ? -v.waveTilt : v.waveTilt);
    return 0;
  }
  if (step === THROW) {
    launchBlade(state, eye, dir, world);
    return 0;
  }
  // (Update 0.3.73 — at high heat, bigger.)
  const hot = isHot(state) ? v.hotArc : 1;
  const big = step === OVERHEAD;
  const half = Math.min(MOST_ARC, (big ? v.overheadArc : v.slashArc) * hot) * DEG;
  const rays = big ? OVERHEAD_RAYS : SLASH_RAYS;
  const damage = (big ? v.overheadDamage : v.slashDamage) * factor;
  const knock = big ? v.overheadKnock : v.slashKnock;
  seen.length = 0;
  for (let i = 0; i < rays; i++) {
    ray.copy(dir).applyAxisAngle(UP, -half + (2 * half * i) / (rays - 1));
    const far = v.reach * hot;
    const reach = Math.min(far, world.rayDistance(eye, ray, far) + v.width);
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
