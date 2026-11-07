// Update 0.5.4 — floor 10's Imp (the Bestiary pack's: lanky, chains and a spiked collar, a spiked mace in its right hand; the Universal Animation
// Library's sword clips swung with it: MD/FLOOR10_HELL_PLAN.md). Imps come in threes. One keeps a little off you, side-stepping round you, and
// comes in with its mace: two quick swings, or its combo (four blows, coming on: open after). From further off it throws a fireball from its
// left hand (punch it back). A blow about to land, now and then it's gone in a puff of smoke and behind you, swinging; else it may side-step it
// (the more you swing at it, the likelier). Pure.
import { Vector3 } from 'three';
import { FOES_HELL } from '../../tuning/foesHell';
import { fireOrb } from '../combat/orbs';
import type { CombatState } from '../combat/state';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import type { Enemy, EnemyWorld } from './enemy';
import { FIREBALL, MACE_COMBO, SWING_A, SWING_B } from './hellShared';
import { martial, martialDodges, Style } from './martial';
import { vanishes } from './shinobi';
import { armed } from './tokens';

const v = () => FOES_HELL.v;
/** Its fireball leaves its left hand this high (m), this far in front. */
const HAND = 1.35;
const OUT = 0.5;

const from = new Vector3();
const dir = new Vector3();

/** Its fireball, at your chest. */
function fireball(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  from.set(e.pos.x - Math.sin(e.facing) * OUT, e.pos.y + HAND, e.pos.z - Math.cos(e.facing) * OUT);
  dir.set(player.pos.x - from.x, player.pos.y + BODY.height * 0.55 - from.y, player.pos.z - from.z).normalize();
  fireOrb(w.orbs, from, dir, v().impFireSpeed, v().impFire, e.kind, 'fire');
  w.events.push('impFire', index, from.x, from.y, from.z);
}

export const IMP: Style = {
  stance: [2.2, 3.6],
  pace: 1.1,
  every: [0.5, 1.2],
  dodge: () => v().impDodge,
  strikes: [
    { move: SWING_A, from: 0, to: 3.2, reach: 2, arc: 60, damage: () => v().impSwing, shove: 6, lunge: 4.5, lungeTo: 0.6, recover: 0.35, weight: 1.5, event: 'impSwing' },
    { move: SWING_B, from: 0, to: 3.2, reach: 2, arc: 60, damage: () => v().impSwing, shove: 6, lunge: 4, lungeTo: 0.5, recover: 0.35, weight: 1.2, event: 'impSwing' },
    { move: MACE_COMBO, from: 0, to: 3.3, reach: 2.1, arc: 70, damage: () => v().impSwing * 0.8, shove: 5, lunge: 2.5, lungeTo: 0.8, recover: 0.8, event: 'impCombo' },
    { move: FIREBALL, from: 5.5, to: 15, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.5, weight: 1.4, event: 'impFireWindup', fire: fireball },
  ],
};

export function updateImp(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  martial(e, index, player, w, dt, IMP, armed(e));
}

/** A blow about to land on an Imp (evade.ts): now and then it's behind you in a puff of smoke, swinging; else perhaps a side-step. True: the
 *  blow misses. */
const BEHIND = IMP.strikes[0];
export const impDodges = (state: CombatState, i: number, dirX: number, dirZ: number) =>
  vanishes(state, i, dirX, dirZ, v().impBlink, v().impBlinkRest, BEHIND) || martialDodges(state, i, dirX, dirZ, IMP);
