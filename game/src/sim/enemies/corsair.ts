// Update 0.3.15 — floor 6's Corsair (the Pirate Kit's Anne, her axe; the plan had her parrying your blows from the
// front, but floor 4's Skull Orc already does that: the designer, "nothing duplicated from other floors"). Up close,
// her axe (brawler.ts). Out of reach of it (from 5 m out to Hook range), with a clear line, she whirls her boarding hook
// overhead (Hook twirl: your warning: get out of its line) and throws it straight at where you stand. It catches you if
// it passes close: you're dragged to her (Hook pull, round nothing: as the water drags you) and her axe falls at once
// (Hook strike: parry it). It misses at a wall or at Hook range. A hit flinches her and drops the hook. Pure.
import { FOES_COVE } from '../../tuning/foesCove';
import { wallBetween } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const axe = (windup: () => number): Brawl => ({
  reach: () => FOES_COVE.v.corsairReach,
  windup,
  damage: () => FOES_COVE.v.corsairDamage,
  turn: 9,
  windupTurn: 4,
  arc: 80,
  recover: 0.55,
  shove: 8,
  windupEvent: 'corsairWindup',
  strikeEvent: 'corsairStrike',
});
const AXE = axe(() => FOES_COVE.v.corsairWindup);
/** Dragged in: her axe at once. */
const QUICK = axe(() => FOES_COVE.v.hookStrike);

/** Her moves (`move`): her axe, whirling the hook, the hook flying, dragging you in, her axe after it. */
export const HOOK_TWIRL = 1;
const HOOK_FLY = 2;
const HOOK_PULL = 3;
const AFTER_PULL = 4;
/** She throws from this far out at least (m); the hook catches you this close to its line (m); a drag gives up after
 *  this long (s); the hook leaves her hand this high (m). */
const HOOK_MIN = 5;
const CATCH = 1;
const PULL_FOR = 1.4;
export const HAND = 1.5;

export function updateCorsair(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  // (A hit drops whatever she was at.)
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === HOOK_TWIRL) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
    if (e.t >= v.hookTwirl) throwHook(e, index, player, w);
    return;
  }
  if (e.phase === 'dive') return flyHook(e, index, player, w, dt);
  if (e.phase === 'charge') return drag(e, index, player, w, dt);
  if (e.phase === 'chase' && e.cooldown <= 0 && !player.dead && dist >= HOOK_MIN && dist <= v.hookRange && armed(e) && inLine(e, player, w.nav.small, 2.5)) {
    e.move = HOOK_TWIRL;
    setPhase(e, 'windup');
    w.events.push('hookTwirl', index, e.pos.x, e.pos.y + ENEMY_STATS.corsair().height + 0.4, e.pos.z);
    return;
  }
  brawl(e, index, player, w, dt, e.move === AFTER_PULL ? QUICK : AXE, armed(e));
  if (e.phase === 'recover' && e.move === AFTER_PULL) e.move = 0;
}

/** Thrown: from her hand straight at where you stand (its way's angle kept in `near`). */
function throwHook(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  e.from.set(e.pos.x, e.pos.y + HAND, e.pos.z);
  e.aim.copy(e.from);
  e.near = Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  e.move = HOOK_FLY;
  setPhase(e, 'dive');
  w.events.push('hookThrow', index, e.from.x, e.from.y, e.from.z);
}

/** On its way (`aim`: where it is): it catches you, or misses at a wall or its range. */
function flyHook(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const step = v.hookSpeed * dt;
  const nx = e.aim.x + Math.sin(e.near) * step;
  const nz = e.aim.z + Math.cos(e.near) * step;
  const blocked = wallBetween(w.nav.small, e.aim.x, e.aim.z, nx, nz);
  if (!blocked) e.aim.set(nx, e.aim.y, nz);
  if (!player.dead && Math.hypot(player.pos.x - e.aim.x, player.pos.z - e.aim.z) < CATCH && player.pos.y < e.from.y + 2) {
    e.move = HOOK_PULL;
    setPhase(e, 'charge');
    w.events.push('hookCatch', index, player.pos.x, player.pos.y + 1, player.pos.z);
    return;
  }
  if (blocked || Math.hypot(e.aim.x - e.from.x, e.aim.z - e.from.z) >= v.hookRange) {
    w.events.push('hookMiss', index, e.aim.x, e.aim.y, e.aim.z);
    e.move = 0;
    e.cooldown = v.hookEvery;
    setPhase(e, 'recover');
  }
}

/** Hooked: you're dragged to her; in her axe's reach (or after a while) it falls at once. */
function drag(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 10 * dt);
  if (player.dead || d <= v.corsairReach * 0.8 || e.t >= PULL_FOR) {
    e.cooldown = v.hookEvery;
    e.move = AFTER_PULL;
    setPhase(e, 'windup');
    w.events.push('corsairWindup', index, e.pos.x, e.pos.y + 1.2, e.pos.z);
    return;
  }
  player.current.x += (dx / d) * v.hookPull;
  player.current.z += (dz / d) * v.hookPull;
}
