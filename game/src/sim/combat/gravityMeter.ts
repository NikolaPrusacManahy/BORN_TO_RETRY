// Update 0.3.81 — Gravity Sean's state and meters (enemy_bibles/Born to Retry — Gravity Sean.docx): his stance, the Instability meter ("it rises while you stay in
// Unstable mode and as you land hits"), and the one meter Black Hole and Meteor share. Apart from his moves (gravity.ts), so that landing a hit (strike.ts) can feed
// them without them leaning on it. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import type { CombatEvent } from './state';
import type { EventQueue } from '../../core/eventQueue';

/** Update 0.3.82 — how many pieces can be in the air, how many craters a floor keeps (the oldest goes), how many flung at once. */
export const ROCKS = 8;
export const CRATERS = 12;
export const FLUNG = 6;

/** What his open hands are doing (viewmodel/seanHands.ts). */
export type SeanHand = 'none' | 'reach' | 'gather' | 'raise' | 'sky';

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

/** An enemy in flight (`index` −1: free slot): its way, how far to go, how far in all, its height at the start. */
export interface Flung {
  index: number;
  dx: number;
  dz: number;
  left: number;
  total: number;
  from: number;
}

/** Update 0.3.83 — Black Hole: gathering or running, how long, its next damage, where, the floor under it, who it has. */
export interface Hole {
  charging: boolean;
  t: number;
  tick: number;
  x: number;
  y: number;
  z: number;
  floor: number;
  pulled: number[];
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
  /** Fling: who's caught (−1: nobody), for how long, from what height; its wait; who's in flight. */
  caught: number;
  caughtT: number;
  caughtY: number;
  flingWait: number;
  flung: Flung[];
  /** Update 0.3.83 — his ultimates, under way. */
  hole: Hole | null;
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
    caught: -1,
    caughtT: 0,
    caughtY: 0,
    flingWait: 0,
    flung: Array.from({ length: FLUNG }, () => ({ index: -1, dx: 0, dz: 0, left: 0, total: 0, from: 0 })),
    hole: null,
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

/** A kill of his. */
export const gravKill = (state: Fed) => addUlt(state, SEAN.v.ultKill);

/** What his open hands are doing now. */
export function seanHand(g: GravityState): SeanHand {
  if (g.meteor) return 'sky';
  if (g.hole) return g.hole.charging ? 'gather' : 'raise';
  return g.held || g.caught >= 0 ? 'reach' : 'none';
}

/** How much harder Unstable mode hits, now. */
export const instabFactor = (g: GravityState) => 1 + SEAN.v.instabDamage * g.instab;
