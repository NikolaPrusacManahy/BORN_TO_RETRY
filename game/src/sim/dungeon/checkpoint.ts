// Update 0.2.12 — checkpoints (the designer: "respawns from lava pit and dying in general, you just respawn just in front
// of the room you just died, where is says "Room" or "Boss", maybe add a saving checkpoint, much better for the easier
// difficulty and players falling to the lava"). Going into a fight room or the boss room saves a checkpoint: just
// outside the door you came in by, under its sign, facing in. Falling in lava sends you there (any difficulty); dying on
// WEAKLING EXPERIENCE does too (runBase.ts), the fight you died in starting over when you go back in: the boss's too.
// Pure.
import type { CombatState } from '../combat/state';
import { clearQuakes } from '../combat/quakes';
import type { PlayerState } from '../player/state';
import { createBossRun } from './bossRoom';
import { abandonFights } from './lava';
import type { DungeonRun } from './roomLoop';

export interface Checkpoint {
  x: number;
  y: number;
  z: number;
  /** Facing the door (0 faces −z). */
  yaw: number;
}

/** A checkpoint stands this far out from its doorway's gate (m). */
const OUT = 2.6;
/** Each side's way out of a room (x, z). */
const OUTWARD = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as const;

/** The spot outside room `i`'s door nearest you (the one you just came in by), facing in. */
export function doorSpot(run: DungeonRun, i: number, player: PlayerState): Checkpoint {
  const room = run.level.rooms[i];
  let best = -1;
  let bestD = Infinity;
  room.gates.forEach((g, k) => {
    const b = run.level.gates[g];
    const d = Math.hypot(b.x - player.pos.x, b.z - player.pos.z);
    if (d < bestD) [best, bestD] = [k, d];
  });
  if (best < 0) return { x: player.pos.x, y: 0, z: player.pos.z, yaw: player.yaw };
  const b = run.level.gates[room.gates[best]];
  const [ox, oz] = OUTWARD[room.sides[best]];
  const out = Math.min(b.w, b.d) / 2 + OUT;
  return { x: b.x + ox * out, y: 0, z: b.z + oz * out, yaw: Math.atan2(ox, oz) };
}

/** A boss fight you died in starts over: the boss and whoever it called gone, the room's gates open, its show to come
 *  again when you go back in. (Not once the boss is dying or dead.) */
export function resetBossFight(run: DungeonRun, combat: CombatState) {
  const b = run.boss;
  if (b.beat !== 'intro' && b.beat !== 'fight') return;
  const i = run.level.rooms.findIndex((r) => r.kind === 'boss');
  const room = run.level.rooms[i];
  run.boss = createBossRun(b.kind);
  run.rooms[i].state = 'idle';
  for (const g of room.gates) run.shut[g] = false;
  combat.events.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
  for (const e of combat.enemies) e.alive = false;
  for (const o of combat.orbs) o.alive = false;
  for (const bomb of combat.bombs) bomb.alive = false;
  clearQuakes(combat.quakes);
}

/** Every fight under way stops (to start over when you go back in): the rooms', the boss's. */
export function abandonAll(run: DungeonRun, combat: CombatState) {
  abandonFights(run, combat);
  resetBossFight(run, combat);
  for (const bomb of combat.bombs) bomb.alive = false;
  combat.grab.on = false;
  combat.pin.on = false;
}
