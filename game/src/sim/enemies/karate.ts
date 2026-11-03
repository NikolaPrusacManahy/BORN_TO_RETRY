// Update 0.3.33 — floor 8's karate fighters (the More-enemies pack's two in white gis and red belts; the Universal
// Animation Library's clips: MD/FLOOR8_SHRINE_PLAN.md). The Karateka holds his stance a little off you, side-stepping
// round you, and comes in with his jab, his cross, a hook, a front kick that throws you back, a knee, his three-blow
// combo (jab, cross, kick), or a sprint in that ends in a cross; he blocks a blow from in front a third of the time and
// counters at once with an uppercut that throws you up. The Karate Girl is quicker and lighter, closer in: a jab, a hook,
// the combo, a kick, a flying knee from further off (she leaps in on it); she side-steps more (the more you swing, the
// likelier) and, her combo done, may back-flip away out of your reach. Both open after a strike: hit them then. Pure.
import { FOES_SHRINE } from '../../tuning/foesShrine';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import type { Enemy, EnemyWorld } from './enemy';
import { martial, martialDodges, Style } from './martial';
import { BACKFLIP, COMBO, CROSS, FLYING_KNEE, HOOK, JAB, KICK, KNEE, UPPERCUT } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE.v;
const punch = () => v().punch;
const kick = () => v().kick;

export const KARATEKA: Style = {
  stance: [2.6, 3.8],
  pace: 1.1,
  every: [0.5, 1.3],
  dash: { from: 5.5, to: 10, then: CROSS },
  dodge: () => v().karatekaDodge,
  block: () => v().karatekaBlock,
  counter: UPPERCUT,
  strikes: [
    { move: JAB, from: 0, to: 3.2, reach: 1.9, arc: 50, damage: punch, shove: 6, lunge: 4, lungeTo: 0.3, recover: 0.35, weight: 2, event: 'karateStrike' },
    { move: CROSS, from: 0, to: 3.4, reach: 2, arc: 50, damage: () => punch() * 1.2, shove: 8, lunge: 5, lungeTo: 0.35, recover: 0.45, weight: 1.5, event: 'karateStrike' },
    { move: HOOK, from: 0, to: 2.6, reach: 1.8, arc: 70, damage: () => punch() * 1.2, shove: 8, lunge: 3, lungeTo: 0.5, recover: 0.45, event: 'karateStrike' },
    { move: KICK, from: 1.5, to: 3.6, reach: 2.4, arc: 45, damage: kick, shove: 14, lunge: 3, lungeTo: 0.45, recover: 0.6, weight: 1.2, event: 'karateKick' },
    { move: KNEE, from: 0, to: 2.4, reach: 1.6, arc: 60, damage: kick, shove: 10, lift: 5, lunge: 4, lungeTo: 0.6, recover: 0.55, event: 'karateKick' },
    { move: COMBO, from: 0, to: 3.4, reach: 2.1, arc: 60, damage: () => punch() * 0.9, shove: 5, lunge: 2.5, lungeTo: 0.85, recover: 0.8, weight: 1.6, event: 'karateCombo' },
    // (His counter, after a block: never picked.)
    { move: UPPERCUT, from: 99, to: 0, reach: 2, arc: 70, damage: () => v().counter, shove: 4, lift: 9, lunge: 3, lungeTo: 0.25, recover: 0.7, event: 'karateCounter' },
  ],
};

export const KARATE_GIRL: Style = {
  stance: [2.2, 3.4],
  pace: 1.25,
  every: [0.35, 1],
  dash: { from: 4.5, to: 9.5, then: FLYING_KNEE },
  dodge: () => v().karateGirlDodge,
  strikes: [
    { move: JAB, from: 0, to: 3, reach: 1.8, arc: 50, damage: () => punch() * 0.8, shove: 5, lunge: 4.5, lungeTo: 0.3, recover: 0.3, weight: 1.5, event: 'karateStrike' },
    { move: HOOK, from: 0, to: 2.6, reach: 1.8, arc: 70, damage: punch, shove: 7, lunge: 3, lungeTo: 0.5, recover: 0.35, event: 'karateStrike' },
    { move: KICK, from: 1.4, to: 3.4, reach: 2.3, arc: 45, damage: () => kick() * 0.9, shove: 13, lunge: 3, lungeTo: 0.45, recover: 0.5, weight: 1.3, event: 'karateKick' },
    { move: COMBO, from: 0, to: 3.2, reach: 2, arc: 60, damage: () => punch() * 0.8, shove: 4, lunge: 3, lungeTo: 0.85, recover: 0.6, weight: 1.6, event: 'karateCombo' },
    // (Her flying knee: the dash's end, leaping in on it. Her back-flip away: after her combo, half the time, out of your
    // reach, no blows.)
    { move: FLYING_KNEE, from: 99, to: 0, reach: 1.8, arc: 60, damage: () => kick() * 1.1, shove: 12, lift: 6, lunge: 9, lungeTo: 0.62, recover: 0.6, event: 'karateKnee' },
    { move: BACKFLIP, from: 99, to: 0, reach: 0, arc: 0, damage: () => 0, shove: 0, lunge: -4.5, lungeTo: 0.8, recover: 0.2, event: 'karateFlip' },
  ],
  after: (move, roll) => (move === COMBO && roll < 0.5 ? BACKFLIP : null),
};

export const styleOf = (e: Enemy): Style => (e.kind === 'karateGirl' ? KARATE_GIRL : KARATEKA);

export function updateKarate(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  martial(e, index, player, w, dt, styleOf(e), armed(e));
}

/** A blow about to land on one (evade.ts). */
export const karateDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => martialDodges(state, i, dirX, dirZ, styleOf(state.enemies[i]));
