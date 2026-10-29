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
import { raiseChest } from './treasure';

/** A chest's item still waits for you within this of it (m). */
const NEAR_CHEST = 1.5;

const inside = (r: DungeonRoom, x: number, z: number) => x >= r.min.x && x <= r.max.x && z >= r.min.z && z <= r.max.z;

/** Room `i` is won: its chest starts rising, and its keys are yours. */
export function startReward(run: DungeonRun, i: number, player: PlayerState, combat: CombatState, rng: Rng) {
  const room = run.level.rooms[i];
  if (room.chest >= 0) raiseChest(run.treasure, room.chest, combat);
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
      return !anyKey(combat.items);
    case 'open':
      return c.given && !combat.drops.some((d) => d.alive && d.manual && Math.hypot(d.pos.x - c.spot.x, d.pos.z - c.spot.z) < NEAR_CHEST);
  }
}
