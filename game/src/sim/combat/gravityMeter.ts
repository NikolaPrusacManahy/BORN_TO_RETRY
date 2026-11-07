// Update 0.3.81 — Gravity Sean's state and meters (enemy_bibles/Born to Retry — Gravity Sean.docx): his stance, the Instability meter ("it rises while you stay in
// Unstable mode and as you land hits"), and the one meter Black Hole and Meteor share. Apart from his moves (gravity.ts), so that landing a hit (strike.ts) can feed
// them without them leaning on it. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { instabRate, mendFactor, ultRate, type Carries } from '../cards/seanPowers';
import type { CombatEvent } from './state';
import type { TargetKind } from './strike';
import type { EventQueue } from '../../core/eventQueue';

/** Update 0.3.82 — how many pieces can be in the air, how many craters a floor keeps (the oldest goes). */
export const ROCKS = 8;
export const CRATERS = 64;
/** Update 0.3.86 — rocks on their way to what he holds, at most. */
export const COMING = 10;
/** Update 0.3.85 — Time Stop: how many blows it holds, and how long both his palms are out as it goes (s). */
export const STORED = 128;
export const STOP_CAST = 0.35;

/** What his hands are doing that isn't the fists' (viewmodel/seanHands.ts). */
export type SeanHand = 'none' | 'reach' | 'palm' | 'wind' | 'raise' | 'join' | 'sky';

/** A piece he's holding: big (a pillar) or small (a chunk of floor), its size now and as it was taken, how long held, where it came from and where it is.
 *  Update 0.3.86 — how many rocks have joined it, how many have torn out, the wait for the next.
 *  Update 0.3.89 — his palms have joined: it's lifted, floating over the arena; where it'd come down now. */
export interface HeldPiece {
  big: boolean;
  r: number;
  base: number;
  t: number;
  from: Vector3;
  at: Vector3;
  gathered: number;
  torn: number;
  next: number;
  lifted: boolean;
  zone: Vector3;
}

/** Update 0.3.89 — the sphere coming down: how long so far and in all, where from, where it is, where it lands, how big, and all it'll do. */
export interface Falling {
  t: number;
  time: number;
  from: Vector3;
  at: Vector3;
  to: Vector3;
  r: number;
  k: number;
  damage: number;
  knock: number;
  blast: number;
}

/** A rock flying in to join what's held. */
export interface Coming {
  on: boolean;
  t: number;
  /** How long it takes to get there (s). */
  fly: number;
  from: Vector3;
  at: Vector3;
}

/** What he's thrown. Update 0.3.86 — all it does, set by how much it gathered. */
export interface Rock {
  alive: boolean;
  big: boolean;
  r: number;
  lumps: number;
  left: number;
  damage: number;
  knock: number;
  blast: number;
  blastDamage: number;
  drop: number;
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
  /** Update 0.5.0 — how far it pulls (a card of his can make it further). */
  reach: number;
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

/** Update 0.3.85 — what Time Stop's holding back for one target: all its blows' damage, the sum of their pushes, how many, where the last landed.
 *  Update 0.3.90 — whether any were struck in Unstable mode (what it heals by), and whether they're enough to kill it (the view shows it red). */
export interface StoredHit {
  kind: TargetKind;
  index: number;
  part: number;
  point: Vector3;
  damage: number;
  dx: number;
  dz: number;
  hits: number;
  unstable: boolean;
  doomed: boolean;
}

/** Time Stop: how long, what it's holding back, and whether that's landing now. */
export interface TimeStop {
  t: number;
  /** Update 0.5.0 — how long it runs (a card of his can change it). */
  time: number;
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
  /** Update 0.3.86 — the way from you to the zone (flat, length 1), for the view: it comes down from beyond it, where you can see it. */
  dx: number;
  dz: number;
}

export interface GravityState {
  /** E: in Unstable mode. */
  unstable: boolean;
  /** The Instability meter (0 … 1). Only ever above 0 in Unstable mode. */
  instab: number;
  /** Seconds till E works again (after an overload), and till Ground Slam does. */
  switchWait: number;
  slamWait: number;
  /** Update 0.5.0 — how long Ground Slam's, Black Hole's and Shockwave Punch's waits were when they began, for the HUD (his cards change them; 0: as the knobs say). */
  slamFull: number;
  holeFull: number;
  shockFull: number;
  /** The meter his ultimates share (0 … 1). */
  ult: number;
  /** Update 0.3.88 — health owed him by kills: step.ts pays it, having the player. */
  mend: number;
  /** Update 0.3.90 — the stance the blows landing right now were struck in, when that's not the stance he's in (null: it is). A Black Hole he's walked away from, a rock in the air. */
  as: boolean | null;
  /** Seconds a punch just thrown still meets the boss blows only a parry answers. */
  clash: number;
  /** A dash under way has had its pull settled. */
  dashing: boolean;
  /** Update 0.3.82 — Grab: what's held; what would be taken now (`pillar`: which, −1 the floor); its wait; what's flying; the floor's craters. */
  held: HeldPiece | null;
  fall: Falling | null;
  coming: Coming[];
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
    slamFull: 0,
    holeFull: 0,
    shockFull: 0,
    ult: 0,
    mend: 0,
    as: null,
    clash: 0,
    dashing: false,
    held: null,
    fall: null,
    coming: Array.from({ length: COMING }, () => ({ on: false, t: 0, fly: 1, from: new Vector3(), at: new Vector3() })),
    aim: { pillar: -1, x: 0, y: 0, z: 0 },
    grabWait: 0,
    rocks: Array.from({ length: ROCKS }, () => ({ alive: false, big: false, r: 0, lumps: 0, left: 0, damage: 0, knock: 0, blast: 0, blastDamage: 0, drop: 0, pos: new Vector3(), vel: new Vector3() })),
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

interface Fed extends Carries {
  grav: GravityState;
  events: EventQueue<CombatEvent>;
}

/** The shared meter fills. */
export function addUlt(state: Fed, amount: number) {
  const g = state.grav;
  const was = g.ult;
  g.ult = Math.min(1, g.ult + amount * ultRate(state));
  if (was < 1 && g.ult >= 1) state.events.push('seanUltReady');
}

/** A hit of his lands. */
export function gravHit(state: Fed) {
  const g = state.grav;
  addUlt(state, SEAN.v.ultHit);
  if (g.unstable) g.instab = Math.min(1, g.instab + SEAN.v.instabHit * instabRate(state));
}

/** Update 0.3.85 — a hit of his in stopped time: held back, for when it ends (gravityStop.ts). The meters don't wait, and nor does your sight of it; the enemy doesn't react at all. Plain targets add theirs up;
 *  the parts that only count blows (a knee, a chain) keep each. */
export function storeHit(state: Fed, kind: TargetKind, index: number, part: number, point: Vector3, damage: number, knock: number, dirX: number, dirZ: number): StoredHit | null {
  const g = state.grav;
  const s = g.stop;
  if (!s) return null;
  gravHit(state);
  const adds = kind === 'enemy' || kind === 'dummy' || kind === 'turret' || kind === 'hive' || kind === 'wormling';
  let h = adds ? s.stored.find((o) => o.kind === kind && o.index === index) : undefined;
  if (!h) {
    if (s.stored.length >= STORED) return null;
    h = { kind, index, part, point: new Vector3(), damage: 0, dx: 0, dz: 0, hits: 0, unstable: false, doomed: false };
    s.stored.push(h);
  }
  h.point.copy(point);
  h.damage += damage;
  h.dx += dirX * knock;
  h.dz += dirZ * knock;
  h.hits++;
  h.unstable = h.unstable || (g.as ?? g.unstable);
  state.events.push('seanStopHit', h.damage, point.x, point.y, point.z);
  return h;
}

/** Update 0.3.90 — is what Time Stop's holding for enemy `i` enough to kill it? (The view shows it red.) */
export function doomed(g: GravityState, i: number): boolean {
  if (!g.stop) return false;
  for (const s of g.stop.stored) if (s.kind === 'enemy' && s.index === i) return s.doomed;
  return false;
}

/** Nothing in the world moves: Time Stop, Meteor. The enemies' look holds still too. */
export const worldHeld = (g: GravityState) => g.stop !== null || g.meteor !== null;

/** A kill of his. `big`: a mini-boss or a boss. Update 0.3.88 — it gives health back. Update 0.3.90 — in both stances, by the stance the blow was struck in (the designer: a Black Hole "casted" in Unstable mode heals as Unstable, "since it's
 *  an attack in the unstable mode", whatever he's gone to since). */
export function gravKill(state: Fed, big: boolean) {
  const g = state.grav;
  const v = SEAN.v;
  addUlt(state, v.ultKill);
  const unstable = g.as ?? g.unstable;
  // (Update 0.5.0 — Cold Reactor and Cold Comfort, cards of his: less, or none.)
  g.mend += (unstable ? (big ? v.mendBig : v.mendKill) : big ? v.mendNormalBig : v.mendNormal) * mendFactor(state, unstable);
}

/** Update 0.3.86 — how many rocks a piece can gather (the last's there as its time's up), and how far it's got (0 … 1). */
export const gatherMax = () => Math.max(1, Math.floor((SEAN.v.gatherTime - SEAN.v.gatherFly) / SEAN.v.gatherEvery));
export const gatherK = (h: HeldPiece) => Math.min(1, h.gathered / gatherMax());
/** Update 0.3.89 — how far its landing reaches, gathered this far. */
export const crashBlast = (k: number) => SEAN.v.gatherBlastFrom + (SEAN.v.gatherBlast - SEAN.v.gatherBlastFrom) * k;

/** Update 0.3.89 — as it starts to come down, both palms push it. */
const DROP_PUSH = 0.35;

/** What his hands are doing now. */
export function seanHand(g: GravityState): SeanHand {
  if (g.meteor) return 'sky';
  if (g.shock >= 0) return 'wind';
  if (g.stop && g.stop.t < STOP_CAST) return 'raise';
  if (g.palm >= 0) return 'palm';
  if (g.fall && g.fall.t < DROP_PUSH) return 'raise';
  if (!g.held) return 'none';
  return g.held.lifted ? 'join' : 'reach';
}

/** How much harder Unstable mode hits, now. */
export const instabFactor = (g: GravityState) => 1 + SEAN.v.instabDamage * g.instab;
