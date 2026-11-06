// Update 0.1.5 — each held weapon's own moves (the designer: every weapon its own grip and moves, never another's):
// its key poses (ready, the swing's path, the charged blow drawn back and at full stretch, which a throw also follows),
// its timings, where the fist holds it, and whether the left hand holds it too. SwordAnim plays whichever set the
// weapon in hand has (its model's `userData.kind`, set by weaponsView.ts).
// Update 0.1.9 — a weapon can be a pair, one in each hand (the Dual Daggers): its `pair` is the left hand's own set,
// which a second SwordAnim plays (offHand.ts).
import type { Object3D, Vector3 } from 'three';
import type { WeaponKind } from '../../sim/weapons/catalog';
import { ARMS } from '../../tuning/arms';
import type { SwordPose } from './armsRig';
import { AXE_COCKED, AXE_READY, AXE_SLASH, AXE_THROWN } from './axePoses';
import type { BladeArc } from './bladeArcs';
import { DEMON_ARCS, DEMON_DOWN, DEMON_CAUGHT, DEMON_PLANT, DEMON_READY, DEMON_SLASH, DEMON_THRUST, DEMON_UP } from './demonPoses';
import { DAGGER_COCKED, DAGGER_COCKED_L, DAGGER_CUT, DAGGER_CUT_L, DAGGER_READY, DAGGER_READY_L, DAGGER_TIP, DAGGER_TOSSED, DAGGER_TOSSED_L } from './daggerPoses';
import { HAMMER_READY, HAMMER_SLASH, HAMMER_SMASH, HAMMER_UP } from './hammerPoses';
import { PIERCE_OUT, PIERCE_READY, READY, SLASH } from './swordPoses';

export interface MoveSet {
  ready: SwordPose;
  /** The charged blow: drawn back (as it charges) and at full stretch. */
  heavyReady: SwordPose;
  heavyOut: SwordPose;
  /** A swing, from ready (0) to its rest on the left (1). */
  slash: readonly SwordPose[];
  /** Seconds: a swing across, its rest, back to ready; the blow out, held, back. */
  swing: () => number;
  rest: () => number;
  recover: () => number;
  out: () => number;
  hold: () => number;
  back: () => number;
  /** How far up the haft the fist holds it, from the model's middle (m); how far along the haft from it the left hand
   *  holds it (below: negative; 0: one-handed, the left arm out of view); its size in the hand, times Weapon size. */
  slide: () => number;
  hands: () => number;
  scale: () => number;
  /** Update 0.1.6 — how thick its handle is where the hands close on it (radius, m, as held): the fingers wrap that. */
  grip: () => number;
  /** Update 0.1.9 — the left hand's own set when it holds a second one (null: it doesn't). */
  pair: MoveSet | null;
  /** Update 0.1.9 — where the fist closes once it's turned over for throwing (its model's metres; tipHold.ts), null: it
   *  never is. */
  tip: Vector3 | null;
  /** Update 0.3.71 — the Demon's Blazing Arc: its three swings (bladeArcs.ts). Update 0.3.72 — and Ember Wave's and the counter's; its
   *  block, its lunge's thrust, the sword going into the floor. */
  arcs?: readonly BladeArc[];
  caught?: SwordPose;
  thrust?: SwordPose;
  plant?: SwordPose;
}

const a = () => ARMS.v;

export const SWORD_MOVES: MoveSet = {
  ready: READY,
  heavyReady: PIERCE_READY,
  heavyOut: PIERCE_OUT,
  slash: SLASH,
  swing: () => a().swordSwing,
  rest: () => a().swordRest,
  recover: () => a().swordRecover,
  out: () => a().pierceOut,
  hold: () => a().pierceHold,
  back: () => a().pierceBack,
  slide: () => a().swordGripSlide,
  hands: () => 0,
  scale: () => 1,
  grip: () => 0.019,
  pair: null,
  tip: null,
};

export const AXE_MOVES: MoveSet = {
  ready: AXE_READY,
  heavyReady: AXE_COCKED,
  heavyOut: AXE_THROWN,
  slash: AXE_SLASH,
  swing: () => a().axeSwing,
  rest: () => 0,
  recover: () => a().axeRecover,
  out: () => a().axeThrowOut,
  hold: () => a().axeThrowHold,
  back: () => a().axeThrowBack,
  slide: () => a().axeGripSlide,
  hands: () => 0,
  scale: () => 1,
  grip: () => 0.019,
  pair: null,
  tip: null,
};

export const HAMMER_MOVES: MoveSet = {
  ready: HAMMER_READY,
  heavyReady: HAMMER_UP,
  heavyOut: HAMMER_SMASH,
  slash: HAMMER_SLASH,
  swing: () => a().hammerSwing,
  rest: () => 0,
  recover: () => a().hammerRecover,
  out: () => a().smashOut,
  hold: () => a().smashHold,
  back: () => a().smashBack,
  slide: () => a().hammerGripSlide,
  hands: () => -a().hammerHands,
  scale: () => a().hammerScale,
  grip: () => 0.017,
  pair: null,
  tip: null,
};

/** Update 0.1.9 — the Dual Daggers: the left hand's set (the right's mirrored), and the right's, which pairs them. Their
 *  charged blow is the volley's throw: cocked (as it charges, and between throws), whipped over (a toss). */
const DAGGER_LEFT: MoveSet = {
  ready: DAGGER_READY_L,
  heavyReady: DAGGER_COCKED_L,
  heavyOut: DAGGER_TOSSED_L,
  slash: DAGGER_CUT_L,
  swing: () => a().daggerSwing,
  rest: () => 0,
  recover: () => a().daggerRecover,
  out: () => a().tossOut,
  hold: () => a().tossHold,
  back: () => a().tossBack,
  slide: () => a().daggerGripSlide,
  hands: () => 0,
  scale: () => 1,
  grip: () => 0.019,
  pair: null,
  tip: DAGGER_TIP,
};

export const DAGGER_MOVES: MoveSet = {
  ...DAGGER_LEFT,
  ready: DAGGER_READY,
  heavyReady: DAGGER_COCKED,
  heavyOut: DAGGER_TOSSED,
  slash: DAGGER_CUT,
  pair: DAGGER_LEFT,
};

/** Update 0.3.70 — the Playable Demon's blade. It isn't a weapon of the catalog (no uses, never dropped, and its model's
 *  loaded only for the Demon): the model carries this set itself, `userData.moves`. */
export const DEMON_MOVES: MoveSet = {
  ready: DEMON_READY,
  heavyReady: DEMON_UP,
  heavyOut: DEMON_DOWN,
  slash: DEMON_SLASH,
  swing: () => a().demonSwing,
  rest: () => 0,
  recover: () => a().demonRecover,
  out: () => a().demonOut,
  hold: () => a().demonHold,
  back: () => a().demonBack,
  slide: () => 0,
  hands: () => -a().demonHands,
  scale: () => 1,
  grip: () => 0.023,
  pair: null,
  tip: null,
  arcs: DEMON_ARCS,
  caught: DEMON_CAUGHT,
  thrust: DEMON_THRUST,
  plant: DEMON_PLANT,
};

/** (The Grimoire is held its own way, bookArms.ts, and the Pistol, gunArms.ts; the sword's set stands in.) */
export const MOVES: Record<WeaponKind, MoveSet> = { sword: SWORD_MOVES, goldSword: SWORD_MOVES, grimoire: SWORD_MOVES, goldAxe: AXE_MOVES, hammer: HAMMER_MOVES, daggers: DAGGER_MOVES, goldHammer: HAMMER_MOVES, goldDaggers: DAGGER_MOVES, pistol: SWORD_MOVES };

/** The moves of the weapon model in hand (the sword's if it doesn't say). */
export function movesOf(model: Object3D | null): MoveSet {
  const own = model?.userData.moves as MoveSet | undefined;
  if (own) return own;
  const kind = model?.userData.kind as WeaponKind | undefined;
  return kind ? MOVES[kind] : SWORD_MOVES;
}
