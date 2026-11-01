// Update 0.0.20 — lava pits (the designer: rooms with lava pits in the middle; falling in loses 50 health and puts you
// back at the start of the floor; falling in with 50 or less, you die). A pit is a lava box under the floor's level
// (assemble.ts). Landing in it burns you and takes you back to where the floor starts; the fight of the room you were
// in stops (its enemies, shots and quakes gone, its gates open) and starts again when you walk back in. Pure.
// Update 0.2.23 — floor 2's pits hold sludge (world/dungeon/styles.ts `pit`): it burns the same, and poisons you too.
import type { ArenaBox, Spot } from '../../world/arena';
import { HEALTH } from '../../tuning/health';
import { LAB } from '../../tuning/lab';
import { clearQuakes } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { killPlayer, poisonPlayer } from '../player/health';
import { styleOf } from '../../world/dungeon/styles';
import { FOES2 } from '../../tuning/foes2';
import { GARDEN } from '../../tuning/garden';
import type { PlayerState } from '../player/state';
import type { DungeonRun } from './roomLoop';

/** Feet this close above lava (m) are in it. */
const IN_LAVA = 0.3;

/** Are your feet in a pit's lava? */
export function inLava(p: PlayerState, lava: readonly ArenaBox[]): boolean {
  for (const b of lava) {
    if (Math.abs(p.pos.x - b.x) > b.w / 2 || Math.abs(p.pos.z - b.z) > b.d / 2) continue;
    if (p.pos.y <= b.y + b.h / 2 + IN_LAVA) return true;
  }
  return false;
}

/** One tick: in the lava, you're burnt (or killed) and sent back to `start`. Returns true if you were sent back. */
export function lavaStep(p: PlayerState, lava: readonly ArenaBox[], start: Spot, run: DungeonRun | null, combat: CombatState): boolean {
  if (p.dead || lava.length === 0 || !inLava(p, lava)) return false;
  const burn = HEALTH.v.lavaDamage;
  if (LAB.v.god < 1) {
    if (p.hp <= burn) {
      killPlayer(p, 'lava');
      return false;
    }
    p.hp -= burn;
    p.events.push('hurt', burn);
  }
  p.events.push('lavaBurn');
  if (run && styleOf(run.level.plan.level).pit) poisonPlayer(p, FOES2.v.poisonDps, GARDEN.v.sludgePoison, 'lava');
  p.pos.set(start.x, start.y, start.z);
  p.vel.set(0, 0, 0);
  p.grounded = false;
  if (run) abandonFights(run, combat);
  return true;
}

/** A fight you left by the lava stops: its enemies, shots and quakes go, its gates open, and it starts over when you
 *  go back in. (Not the boss room's.) */
export function abandonFights(run: DungeonRun, combat: CombatState) {
  run.rooms.forEach((rr, i) => {
    const room = run.level.rooms[i];
    if (rr.state !== 'fighting' || room.kind === 'boss') return;
    rr.state = 'idle';
    for (const g of room.gates) run.shut[g] = false;
    combat.events.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
    for (const e of combat.enemies) e.alive = false;
    for (const o of combat.orbs) o.alive = false;
    clearQuakes(combat.quakes);
    combat.keyDrops = 0;
  });
}
