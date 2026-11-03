// Update 0.2.23 — floor 2's wasps' hives (the Venom Garden: world/dungeon/garden.ts hangs them on its walls). While a
// hive's room fights, it lets a wasp out now and then (Hive gap; the first half as soon), Wasps a hive in all, and none
// while Hive wasps at once of the hives' wasps are flying. A hive is something to hit (combat/strike.ts): punch it, cut
// it or throw at it (jump to reach it) and at Hive health it falls, and lets out no more. Its wasps are the room's
// enemies like the rest: the room is won once its own are all sent and every wasp is dead (a full hive stays quiet
// then). Pure.
// Update 0.3.27 (the designer: the count "would loop back to 2 after killing the last enemy and spawns them again … 3
// times") — the hives let wasps out only while the room's own are still coming or fighting (roomLoop.ts).
import { Vector3 } from 'three';
import type { HiveSpot } from '../../world/dungeon/garden';
import { GARDEN } from '../../tuning/garden';
import { isLive, spawnEnemy } from '../enemies/enemy';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';

export interface Hive {
  room: number;
  /** Its middle, and the way out of its wall. */
  pos: Vector3;
  nx: number;
  nz: number;
  hp: number;
  broken: boolean;
  /** Wasps it still holds this fight, seconds to the next, and the slots of those it let out. */
  left: number;
  timer: number;
  out: number[];
}

/** A hive's body for hits: a ball this wide (m). */
export const HIVE_RADIUS = 0.55;
/** A wasp comes out this far in front of its hive (m). */
const OUT = 0.9;
const at = new Vector3();

export function createHives(spots: readonly HiveSpot[]): Hive[] {
  return spots.map((s) => ({ room: s.room, pos: new Vector3(s.x, s.y, s.z), nx: s.nx, nz: s.nz, hp: GARDEN.v.hiveHp, broken: false, left: 0, timer: 0, out: [] }));
}

/** Every hive whole again and empty (a fresh try at the floor). */
export function resetHives(hives: Hive[]) {
  for (const h of hives) {
    h.hp = GARDEN.v.hiveHp;
    h.broken = false;
    h.left = 0;
    h.out.length = 0;
  }
}

/** Room `room` starts its fight: its standing hives fill up. */
export function armHives(hives: Hive[], room: number) {
  for (const h of hives) {
    if (h.room !== room || h.broken) continue;
    h.left = Math.round(GARDEN.v.hiveWasps);
    h.timer = GARDEN.v.hiveGap / 2;
    h.out.length = 0;
  }
}

/** The hives' wasps flying now. */
export function flyingWasps(state: CombatState): number {
  let flying = 0;
  for (const h of state.hives) for (const i of h.out) if (state.enemies[i].kind === 'wasp' && isLive(state.enemies[i])) flying++;
  return flying;
}

/** One tick of room `room`'s fight: its hives let their wasps out. */
export function stepHives(state: CombatState, room: number, player: PlayerState, dt: number) {
  let flying = flyingWasps(state);
  for (const h of state.hives) {
    if (h.room !== room || h.broken || h.left <= 0) continue;
    h.timer -= dt;
    if (h.timer > 0 || flying >= GARDEN.v.hiveCap) continue;
    at.set(h.pos.x + h.nx * OUT, h.pos.y - 0.3, h.pos.z + h.nz * OUT);
    const i = spawnEnemy(state.enemies, 'wasp', at, Math.atan2(-(player.pos.x - at.x), -(player.pos.z - at.z)));
    if (i < 0) continue;
    h.left--;
    h.timer = GARDEN.v.hiveGap;
    h.out.push(i);
    flying++;
    state.events.push('enemySpawn', i, at.x, at.y, at.z);
    state.events.push('hiveOut', i, h.pos.x, h.pos.y, h.pos.z);
  }
}

/** A hit on hive `index`. Returns true if it fell. */
export function hitHive(state: CombatState, index: number, damage: number): boolean {
  const h = state.hives[index];
  if (h.broken) return false;
  h.hp -= damage;
  if (h.hp > 0) return false;
  h.broken = true;
  h.left = 0;
  state.events.push('hiveDown', index, h.pos.x, h.pos.y, h.pos.z);
  return true;
}
