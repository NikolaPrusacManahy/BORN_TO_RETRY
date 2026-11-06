// Update 0.3.81 — Gravity Sean's state and meters (enemy_bibles/Born to Retry — Gravity Sean.docx): his stance, the Instability meter ("it rises while you stay in
// Unstable mode and as you land hits"), and the one meter Black Hole and Meteor share. Apart from his moves (gravity.ts), so that landing a hit (strike.ts) can feed
// them without them leaning on it. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import type { CombatEvent } from './state';
import type { TargetKind } from './strike';
import type { EventQueue } from '../../core/eventQueue';

/** Update 0.3.82 — how many pieces can be in the air, how many craters a floor keeps (the oldest goes). */
export const ROCKS = 8;
export const CRATERS = 12;
/** Update 0.3.85 — Time Stop: how many blows it holds, and how long both his palms are out as it goes (s). */
export const STORED = 128;
export const STOP_CAST = 0.35;

/** What his hands are doing that isn't the fists' (viewmodel/seanHands.ts). */
export type SeanHand = 'none' | 'reach' | 'palm' | 'wind' | 'raise' | 'sky';

/** A piece he's holding: big (a pillar) or small (a chunk of floor), its size, how long held, where it came from and where it is. */
export interface HeldPiece {
  big: boolean;
  r: number;
  t: number;
  from: Vector3;
  at: Vector3;
}

export interface Rock {
  alive: boolean;
  big: boolean;
  r: number;
  left: number;
  pos: Vector3;
  vel: Vector3;
}

export interface Crater {
  on: boolean;
  x: number;
  y: number;
  z: number;
  r: number;
}

/** Update 0.3.84 — Black Hole, thrown: in flight or open, how long, its next damage, where, its way, the floor under it, how hard (the Instability it was thrown at), who it has. */
export interface Hole {
  flying: boolean;
  t: number;
  tick: number;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  floor: number;
  power: number;
  pulled: number[];
}

/** Update 0.3.85 — what Time Stop's holding back for one target: all its blows' damage, the sum of their pushes, how many, where the last landed. */
export interface StoredHit {
  kind: TargetKind;
  index: number;
  part: number;
  point: Vector3;
  damage: number;
  dx: number;
  dz: number;
  hits: number;
}

/** Time Stop: how long, what it's holding back, and whether that's landing now. */
export interface TimeStop {
  t: number;
  stored: StoredHit[];
  releasing: boolean;
}

/** Meteor: how long the world's held, where its zone is, whether it's on its way. */
export interface Meteor {
  t: number;
  x: number;
  y: number;
  z: number;
  falling: boolean;
}

export interface GravityState {
  /** E: in Unstable mode. */
  unstable: boolean;
  /** The Instability meter (0 … 1). Only ever above 0 in Unstable mode. */
  instab: number;
  /** Seconds till E works again (after an overload), and till Ground Slam does. */
  switchWait: number;
  slamWait: number;
  /** The meter Black Hole and Meteor share (0 … 1). */
  ult: number;
  /** Seconds a punch just thrown still meets the boss blows only a parry answers. */
  clash: number;
  /** A dash under way has had its pull settled. */
  dashing: boolean;
  /** Update 0.3.82 — Grab: what's held; what would be taken now (`pillar`: which, −1 the floor); its wait; what's flying; the floor's craters. */
  held: HeldPiece | null;
  aim: { pillar: number; x: number; y: number; z: number };
  grabWait: number;
  rocks: Rock[];
  craters: Crater[];
  nextCrater: number;
  /** Update 0.3.84 — Black Hole: how long it's been in his palm (−1: it isn't), its wait, and it thrown. */
  palm: number;
  holeWait: number;
  hole: Hole | null;
  /** Shockwave Punch: how far through its wind-up (−1: not winding up), its wait. */
  shock: number;
  shockWait: number;
  /** Update 0.3.85 — Time Stop, under way. */
  stop: TimeStop | null;
  /** Update 0.3.83 — Meteor, under way. */
  meteor: Meteor | null;
}

export function createGravity(): GravityState {
  return {
    unstable: false,
    instab: 0,
    switchWait: 0,
    slamWait: 0,
    ult: 0,
    clash: 0,
    dashing: false,
    held: null,
    aim: { pillar: -1, x: 0, y: 0, z: 0 },
    grabWait: 0,
    rocks: Array.from({ length: ROCKS }, () => ({ alive: false, big: false, r: 0, left: 0, pos: new Vector3(), vel: new Vector3() })),
    craters: Array.from({ length: CRATERS }, () => ({ on: false, x: 0, y: 0, z: 0, r: 0 })),
    nextCrater: 0,
    palm: -1,
    holeWait: 0,
    hole: null,
    shock: -1,
    shockWait: 0,
    stop: null,
    meteor: null,
  };
}

interface Fed {
  grav: GravityState;
  events: EventQueue<CombatEvent>;
}

/** The shared meter fills. */
export function addUlt(state: Fed, amount: number) {
  const g = state.grav;
  const was = g.ult;
  g.ult = Math.min(1, g.ult + amount);
  if (was < 1 && g.ult >= 1) state.events.push('seanUltReady');
}

/** A hit of his lands. */
export function gravHit(state: Fed) {
  const g = state.grav;
  addUlt(state, SEAN.v.ultHit);
  if (g.unstable) g.instab = Math.min(1, g.instab + SEAN.v.instabHit);
}

/** Update 0.3.85 — a hit of his in stopped time: held back, for when it ends (gravityStop.ts). The meters don't wait, and nor does your sight of it; the enemy doesn't react at all. Plain targets add theirs up;
 *  the parts that only count blows (a knee, a chain) keep each. */
export function storeHit(state: Fed, kind: TargetKind, index: number, part: number, point: Vector3, damage: number, knock: number, dirX: number, dirZ: number) {
  const s = state.grav.stop;
  if (!s) return;
  gravHit(state);
  const adds = kind === 'enemy' || kind === 'dummy' || kind === 'turret' || kind === 'hive' || kind === 'wormling';
  let h = adds ? s.stored.find((o) => o.kind === kind && o.index === index) : undefined;
  if (!h) {
    if (s.stored.length >= STORED) return;
    h = { kind, index, part, point: new Vector3(), damage: 0, dx: 0, dz: 0, hits: 0 };
    s.stored.push(h);
  }
  h.point.copy(point);
  h.damage += damage;
  h.dx += dirX * knock;
  h.dz += dirZ * knock;
  h.hits++;
  state.events.push('seanStopHit', h.damage, point.x, point.y, point.z);
}

/** Nothing in the world moves: Time Stop, Meteor. The enemies' look holds still too. */
export const worldHeld = (g: GravityState) => g.stop !== null || g.meteor !== null;

/** A kill of his. */
export const gravKill = (state: Fed) => addUlt(state, SEAN.v.ultKill);

/** What his hands are doing now. */
export function seanHand(g: GravityState): SeanHand {
  if (g.meteor) return 'sky';
  if (g.shock >= 0) return 'wind';
  if (g.stop && g.stop.t < STOP_CAST) return 'raise';
  if (g.palm >= 0) return 'palm';
  return g.held ? 'reach' : 'none';
}

/** How much harder Unstable mode hits, now. */
export const instabFactor = (g: GravityState) => 1 + SEAN.v.instabDamage * g.instab;
