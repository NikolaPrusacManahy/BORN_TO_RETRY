// Update 0.5.4 — floor 10's Puglin (the Bestiary pack's: squat, tusked, a club, about a metre tall; the Universal Animation Library's light
// sword clips swung with it: MD/FLOOR10_HELL_PLAN.md). Puglins come in packs of four and don't wait their turn: they crowd in close round you,
// quick little clubbings; from a few strides off one rushes in, club out, through you and on past (a sideways dash slips it). Light: easily
// knocked about, and down in a few blows. Pure.
import { FOES_HELL } from '../../tuning/foesHell';
import type { PlayerState } from '../player/state';
import type { Enemy, EnemyWorld } from './enemy';
import { CLUB_A, CLUB_B, RUSH } from './hellShared';
import { martial, Style } from './martial';
import { armed } from './tokens';

const v = () => FOES_HELL.v;

export const PUGLIN: Style = {
  stance: [1.4, 2.6],
  pace: 1.2,
  every: [0.6, 1.4],
  strikes: [
    { move: CLUB_A, from: 0, to: 2.6, reach: 1.5, arc: 60, damage: () => v().puglinClub, shove: 5, lunge: 4, lungeTo: 0.6, recover: 0.3, weight: 1.4, event: 'puglinClub' },
    { move: CLUB_B, from: 0, to: 2.6, reach: 1.5, arc: 60, damage: () => v().puglinClub, shove: 5, lunge: 3.5, lungeTo: 0.5, recover: 0.3, event: 'puglinClub' },
    { move: RUSH, from: 3, to: 8, reach: 1.2, arc: 180, damage: () => v().puglinRush, shove: 8, lift: 4, lunge: 13, lungeTo: 0.45, recover: 0.6, weight: 1.2, event: 'puglinRush', straight: true, sweep: true },
  ],
};

export function updatePuglin(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  martial(e, index, player, w, dt, PUGLIN, armed(e));
}
