// Update 0.1.19 — the Ninja (floor 3's mini boss; the designer: "can teleport away as an evasion trick when player
// trying to hit them, like 20% chance"). A big, fast sword fighter (brawler.ts: the Weapon slash); only a hard hit
// staggers it; it carries its room's key. Of the hits that would land on it (a punch, a swing, a throw, a blast), it
// teleports away from Ninja dodge chance of them (seeded): gone from where it stood, back on its feet Ninja teleport
// nearest to furthest further along the blow's way (turned up to 60° aside), on free floor, its wind-up dropped, and
// not again for Ninja dodge rest. Not while held in an execution. Pure.
import { Vector3 } from 'three';
import { FOES3 } from '../../tuning/foes3';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, isLive, setPhase } from './enemy';
import { armed } from './tokens';

const NINJA: Brawl = {
  reach: () => FOES3.v.ninjaReach,
  windup: () => FOES3.v.ninjaWindup,
  damage: () => FOES3.v.ninjaDamage,
  turn: 10,
  windupTurn: 4,
  arc: 80,
  recover: 0.5,
  shove: 9,
  windupEvent: 'ninjaWindup',
  strikeEvent: 'ninjaStrike',
};
/** Turned aside up to this from the blow's way (rad). */
const ASIDE = Math.PI / 3;

const to = new Vector3();

export function updateNinja(n: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  n.blink = Math.max(0, n.blink - dt);
  brawl(n, index, player, w, dt, NINJA, armed(n));
}

/** A hit along (dirX, dirZ) is about to land on enemy `i`: true if it's a Ninja that teleports away instead (the hit
 *  misses). */
export function dodges(state: CombatState, i: number, dirX: number, dirZ: number): boolean {
  const e = state.enemies[i];
  if (e.kind !== 'ninja' || !isLive(e) || e.phase === 'held' || e.blink > 0 || e.frozen > 0) return false;
  if (state.rng() >= FOES3.v.ninjaDodge) return false;
  const v = FOES3.v;
  const along = Math.atan2(dirX, dirZ) + (state.rng() * 2 - 1) * ASIDE;
  const far = v.ninjaBlinkNear + state.rng() * Math.max(0, v.ninjaBlinkFar - v.ninjaBlinkNear);
  to.set(e.pos.x + Math.sin(along) * far, e.pos.y, e.pos.z + Math.cos(along) * far);
  if (!freeSpotNear(state.nav.small, to.x, to.z, to)) return false;
  state.events.push('ninjaVanish', i, e.pos.x, e.pos.y + 1, e.pos.z);
  e.pos.set(to.x, e.pos.y, to.z);
  e.prev.copy(e.pos);
  e.vel.set(0, 0, 0);
  e.blink = v.ninjaDodgeRest;
  setPhase(e, 'chase');
  state.events.push('ninjaAppear', i, e.pos.x, e.pos.y + 1, e.pos.z);
  return true;
}
