// Update 0.0.20 — lava pits (the designer: rooms with lava pits in the middle; falling in loses 50 health and puts you
// back at the start of the floor; falling in with 50 or less, you die). A pit is a lava box under the floor's level
// (assemble.ts). Landing in it burns you and takes you back to where the floor starts; the fight of the room you were
// in stops (its enemies, shots and quakes gone, its gates open) and starts again when you walk back in. Pure.
// Update 0.2.23 — floor 2's pits hold sludge (world/dungeon/styles.ts `pit`): it burns the same, and poisons you too.
// Update 0.3.14 — floor 6's hold the sea (`calm`): it hurts the same and takes you back ("The sea" if it kills you); only
// sludge poisons (`poisons`). And a body knocked over any pit sinks: a live one dies (your kill), out of sight.
// Update 0.3.67 (the designer: "when falling in them, just take a few amount of damage and bounce back out, not teleporting away, just take damage and bounce out") — every pit, lava, sludge,
// the sea or a pond: a small burn (with that or less left, you still die) and you're thrown back to where you last stood on solid ground (player/pitBounce.ts). Your fight goes on.
import type { ArenaBox, Spot } from '../../world/arena';
import { LAVA_DEPTH } from '../../world/dungeon/assemble';
import { isLive } from '../enemies/enemy';
import { ENEMY_STATS, flies } from '../enemies/kinds';
import { emptyTargetHit, landHit } from '../combat/strike';
import { HEALTH } from '../../tuning/health';
import { LAB } from '../../tuning/lab';
import { clearQuakes } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { killPlayer, poisonPlayer } from '../player/health';
import { startBounce } from '../player/pitBounce';
import { styleOf } from '../../world/dungeon/styles';
import { FOES2 } from '../../tuning/foes2';
import { GARDEN } from '../../tuning/garden';
import type { PlayerState } from '../player/state';
import type { DungeonRun } from './roomLoop';

/** Feet this close above lava (m) are in it. */
const IN_LAVA = 0.3;
/** Thrown this far past where you last stood (m), well onto it. */
const PAST = 0.4;

/** Are your feet in a pit's lava? */
export function inLava(p: PlayerState, lava: readonly ArenaBox[]): boolean {
  for (const b of lava) {
    if (Math.abs(p.pos.x - b.x) > b.w / 2 || Math.abs(p.pos.z - b.z) > b.d / 2) continue;
    if (p.pos.y <= b.y + b.h / 2 + IN_LAVA) return true;
  }
  return false;
}

/** Is this spot over a pit? */
function overPit(x: number, z: number, lava: readonly ArenaBox[]): boolean {
  for (const b of lava) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2) return true;
  return false;
}

/** One tick: on solid ground, that's where you'd be thrown back to; in the pit, you're burnt (or killed) and thrown back there (`start`, if you've stood nowhere yet). Returns true if you
 *  were thrown. */
export function lavaStep(p: PlayerState, lava: readonly ArenaBox[], start: Spot, run: DungeonRun | null): boolean {
  if (p.dead || lava.length === 0) return false;
  if (p.grounded && !overPit(p.pos.x, p.pos.z, lava)) {
    p.solid.copy(p.pos);
    p.solidSet = true;
  }
  if (!inLava(p, lava)) return false;
  const burn = HEALTH.v.lavaDamage;
  const pit = run ? styleOf(run.level.plan.level).pit : undefined;
  if (LAB.v.god < 1) {
    if (p.hp <= burn) {
      killPlayer(p, pit?.calm ? 'sea' : 'lava');
      return false;
    }
    p.hp -= burn;
    p.events.push('hurt', burn);
  }
  p.events.push(pit?.calm ? 'seaFall' : 'lavaBurn');
  if (pit?.poisons) poisonPlayer(p, FOES2.v.poisonDps, GARDEN.v.sludgePoison, 'lava');
  // Clear of its surface (or the next tick would burn you again), and over to solid ground, a little past where you stood.
  for (const b of lava) if (Math.abs(p.pos.x - b.x) <= b.w / 2 && Math.abs(p.pos.z - b.z) <= b.d / 2) p.pos.y = Math.max(p.pos.y, b.y + b.h / 2 + IN_LAVA + 0.01);
  const toX = p.solidSet ? p.solid.x : start.x;
  const toY = p.solidSet ? p.solid.y : start.y;
  const toZ = p.solidSet ? p.solid.z : start.z;
  const far = Math.max(0.01, Math.hypot(toX - p.pos.x, toZ - p.pos.z));
  startBounce(p, toX + ((toX - p.pos.x) / far) * PAST, toY, toZ + ((toZ - p.pos.z) / far) * PAST);
  return true;
}

/** A fight you left stops: its enemies, shots and quakes go, its gates open, and it starts over when you go back in. (Not the boss room's. Update 0.3.67 — a respawn's; a pit doesn't.) */
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

/** Above this a body is over a pit, not in it (m). */
const SINK_HIGH = 0.6;
const hit = emptyTargetHit();

/** Update 0.3.14 — a body knocked out over a pit (the sea, lava, sludge) sinks: a live one dies (your kill), and down it
 *  goes, out of sight (its floor far under the pit's top: it falls to it). Not a flier or a boss. */
export function sinkInPits(pits: readonly ArenaBox[], combat: CombatState) {
  if (pits.length === 0) return;
  combat.enemies.forEach((e, i) => {
    if (!e.alive || e.perch < 0 || e.pos.y > SINK_HIGH || flies(e.kind) || ENEMY_STATS[e.kind]().boss) return;
    if (!pits.some((b) => Math.abs(e.pos.x - b.x) < b.w / 2 && Math.abs(e.pos.z - b.z) < b.d / 2)) return;
    if (isLive(e)) {
      hit.kind = 'enemy';
      hit.index = i;
      hit.point.set(e.pos.x, e.pos.y + 0.5, e.pos.z);
      landHit(combat, hit, 1e6, 0, 0, 0, 'hitSlam', 0, true);
    }
    e.perch = -LAVA_DEPTH - 2;
    e.vel.x *= 0.2;
    e.vel.z *= 0.2;
    combat.events.push('pitSink', i, e.pos.x, -LAVA_DEPTH, e.pos.z);
  });
}
