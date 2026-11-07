// Update 0.2.0 — a won challenge room holds you until you've taken its reward (the designer: "players aren't allowed
// to leave the challenge room without taking their hard earned rewards"; "when success in the challenge room … the
// chest emerges from the ground"): its gates stay shut, its chest rises out of the floor, and the gates open once the
// chest is open and what came out of it is taken. You can't be shut in for nothing: the room's keys still lying there
// are yours as it's won (and one its mini bosses never dropped is given then), and the gates open anyway if you have
// no key to open the chest, or if you're no longer in the room (the lava took you back to the floor's start). Pure.
import type { Rng } from '../../core/rng';
import type { DungeonRoom } from '../../world/dungeon/assemble';
import type { CombatState } from '../combat/state';
import { anyKey, betterKeyFor, keyFor, takeItem } from '../items/items';
import type { PlayerState } from '../player/state';
import type { DungeonRun } from './roomLoop';
import { keyless, raiseChest } from './treasure';

/** A chest's item still waits for you within this of it (m). */
const NEAR_CHEST = 1.5;

const inside = (r: DungeonRoom, x: number, z: number) => x >= r.min.x && x <= r.max.x && z >= r.min.z && z <= r.max.z;

/** Room `i` is won: its chest starts rising, and its keys are yours. */
export function startReward(run: DungeonRun, i: number, player: PlayerState, combat: CombatState, rng: Rng) {
  const room = run.level.rooms[i];
  if (room.chest >= 0) raiseChest(run.treasure, room.chest, combat);
  takeKeys(run, i, player, combat, rng);
}

/** Update 0.2.5 — room `i` is won: the keys lying in it are yours, and one its mini boss never dropped (the designer
 *  found a chest that needed a key in a room with none: one dropped under where the chest rises, or taken by another
 *  drop when they were all in use). Every room's, as the challenge room's always were. */
export function takeKeys(run: DungeonRun, i: number, player: PlayerState, combat: CombatState, rng: Rng) {
  const room = run.level.rooms[i];
  for (const d of combat.drops) {
    if (!d.alive || d.manual || (d.kind !== 'key' && d.kind !== 'whiteKey' && d.kind !== 'goldKey') || !inside(room, d.pos.x, d.pos.z)) continue;
    d.alive = false;
    takeItem(d.kind, player, combat);
  }
  for (; combat.keyDrops > 0; combat.keyDrops--) takeItem((combat.betterKeys ? betterKeyFor : keyFor)(rng()), player, combat);
}

/** May room `i`'s gates open now: its chest's reward taken, or no way to take it. */
export function rewardDone(run: DungeonRun, i: number, player: PlayerState, combat: CombatState): boolean {
  const room = run.level.rooms[i];
  const c = run.treasure.chests[room.chest];
  if (!c || !inside(room, player.pos.x, player.pos.z)) return true;
  switch (c.state) {
    case 'buried':
    case 'rising':
    case 'opening':
      return false;
    case 'shut':
      // (Update 0.5.0 — Gravity Sean's opens without one: nothing lets him off.)
      return !keyless(c) && !anyKey(combat.items);
    case 'open':
      // (Update 0.2.16 — and no Fate Card deal of its still to choose from.)
      return c.given && !combat.deal && !combat.drops.some((d) => d.alive && d.manual && Math.hypot(d.pos.x - c.spot.x, d.pos.z - c.spot.z) < NEAR_CHEST);
  }
}
