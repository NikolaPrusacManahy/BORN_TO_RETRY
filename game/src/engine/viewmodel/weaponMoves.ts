// Update 0.1.5 — each held weapon's own moves (the designer: every weapon its own grip and moves, never another's):
// its key poses (ready, the swing's path, the charged blow drawn back and at full stretch, which a throw also follows),
// its timings, where the fist holds it, and whether the left hand holds it too. SwordAnim plays whichever set the
// weapon in hand has (its model's `userData.kind`, set by weaponsView.ts).
import type { Object3D } from 'three';
import type { WeaponKind } from '../../sim/weapons/catalog';
import { ARMS } from '../../tuning/arms';
import type { SwordPose } from './armsRig';
import { AXE_COCKED, AXE_READY, AXE_SLASH, AXE_THROWN } from './axePoses';
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
};

/** (The Grimoire is held its own way, bookArms.ts; the sword's set stands in.) */
export const MOVES: Record<WeaponKind, MoveSet> = { sword: SWORD_MOVES, goldSword: SWORD_MOVES, grimoire: SWORD_MOVES, goldAxe: AXE_MOVES, hammer: HAMMER_MOVES };

/** The moves of the weapon model in hand (the sword's if it doesn't say). */
export function movesOf(model: Object3D | null): MoveSet {
  const kind = model?.userData.kind as WeaponKind | undefined;
  return kind ? MOVES[kind] : SWORD_MOVES;
}
