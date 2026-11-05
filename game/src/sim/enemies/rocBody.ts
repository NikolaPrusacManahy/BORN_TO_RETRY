// Update 0.3.56 — the Frost Roc's state beyond an enemy's (the Boss Design Bible, "Ground or air?"): how much you've been in the
// air lately (its picks punish whichever you overuse), the slabs its Fault Line raises (real ground: `boxes`, once `dirty`, goes to
// the physics in engine/run.ts), its pillar swings, its knees through Mountain Fall, its block of ice in flight, the boulders
// falling, the cornice over its plateau. Where its knees are, for the rules and the view. Pure.
import type { Vector3 } from 'three';
import { FROST_ROC } from '../../tuning/frostRoc';
import type { ArenaBox } from '../../world/arena';
import type { Enemy } from './enemy';

export interface Slab {
  x: number;
  z: number;
  /** Its side (m), its turn, how high it stands. */
  side: number;
  yaw: number;
  h: number;
  /** Fight time it erupts, and goes. */
  at: number;
  until: number;
  up: boolean;
}

export interface Crack {
  x: number;
  z: number;
  yaw: number;
  long: number;
}

export type CorniceState = 'hung' | 'cracking' | 'onIt' | 'smashed';

export interface RocBody {
  /** What you can stand on now, and that those have changed. */
  boxes: ArenaBox[];
  dirty: boolean;
  /** Where it stood first; the way to the cliff from there (unit; a plateau's: plateau.ts). */
  midX: number;
  midZ: number;
  midSet: boolean;
  cliffX: number;
  cliffZ: number;
  /** How much of the last while you've been in the air (0..1). */
  air: number;
  /** Seconds of the fight. */
  time: number;
  slabs: Slab[];
  /** The cracks running out from its feet, its Fault Line told. */
  cracks: Crack[];
  /** This swing's height; which way it crosses. */
  swingLow: boolean;
  swingSide: number;
  swingHit: boolean;
  /** Blows left on each knee (its left, its right), and those landed since last counted. */
  knees: [number, number];
  kneeHit: number;
  /** Seconds till its block lands (−1: none) and where. */
  hurlIn: number;
  hurlX: number;
  hurlZ: number;
  /** Boulders still to fall, seconds to the next; a pillar one's coming down on, and when. */
  rainLeft: number;
  rainIn: number;
  strikes: { pillar: number; at: number }[];
  cornice: CorniceState;
  corniceT: number;
}

export const createRocBody = (): RocBody => ({
  boxes: [],
  dirty: false,
  midX: 0,
  midZ: 0,
  midSet: false,
  cliffX: 0,
  cliffZ: -1,
  air: 0,
  time: 0,
  slabs: [],
  cracks: [],
  swingLow: true,
  swingSide: 1,
  swingHit: false,
  knees: [0, 0],
  kneeHit: 0,
  hurlIn: -1,
  hurlX: 0,
  hurlZ: 0,
  rainLeft: 0,
  rainIn: 0,
  strikes: [],
  cornice: 'hung',
  corniceT: 0,
});

/** Its knees: out to each side, up, thick (shares of its height: the model's). */
const KNEE_SIDE = 0.112;
const KNEE_UP = 0.15;
const KNEE_R = 0.11;

/** Knee `i` (0: its left, 1: its right). */
export function kneeAt(e: Enemy, i: number, out: Vector3): Vector3 {
  const h = FROST_ROC.v.rocHeight;
  const side = (i === 0 ? -1 : 1) * KNEE_SIDE * h;
  return out.set(e.pos.x + Math.cos(e.facing) * side, e.pos.y + KNEE_UP * h, e.pos.z - Math.sin(e.facing) * side);
}

export const kneeRadius = () => KNEE_R * FROST_ROC.v.rocHeight;

/** Its knees are there to hit: its window's open. */
export const kneesOpen = (e: Enemy) => !!e.roc && e.ult.on;

/** Every slab down at once (it's dead). */
export function clearSlabs(r: RocBody) {
  r.slabs.length = 0;
  r.cracks.length = 0;
  if (r.boxes.length > 0) {
    r.boxes = [];
    r.dirty = true;
  }
}
