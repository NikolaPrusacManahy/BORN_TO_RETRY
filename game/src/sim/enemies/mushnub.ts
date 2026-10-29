// Update 0.1.19 — the Mushnub (floor 3; the designer: "Blob - Mushnub"), a mushroom that waddles at you and bites: a
// melee fighter of the Grunt's kind (brawler.ts), small and quick to warn. Pure.
import { FOES3 } from '../../tuning/foes3';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import type { Enemy, EnemyWorld } from './enemy';
import { armed } from './tokens';

const MUSHNUB: Brawl = {
  reach: () => FOES3.v.mushnubReach,
  windup: () => FOES3.v.mushnubWindup,
  damage: () => FOES3.v.mushnubDamage,
  turn: 9,
  windupTurn: 3,
  arc: 75,
  recover: 0.45,
  shove: 4,
  windupEvent: 'mushnubWindup',
  strikeEvent: 'mushnubBite',
};

export function updateMushnub(m: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  brawl(m, index, player, w, dt, MUSHNUB, armed(m));
}
