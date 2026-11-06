// Update 0.3.75 — the Playable Demon's weight (enemy_bibles/Born to Retry — Playable Demon.docx: "Heavier presence. Lower-pitched footsteps, a slight camera bob, and enemies that flinch or
// back off as you approach"; the designer: "start phase 4"). Its steps on the ground, at a heavy stride. And ordinary enemies coming near lose their nerve for a moment: some flinch, some
// back off, once in a while each, so it's a feeling and not a lock. Only as they're coming at you: never out of an attack, and never a boss or a mini boss. Pure.
import { DEMON } from '../../tuning/demon';
import { isLive, setPhase } from '../enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import type { EnemyStats } from '../enemies/kindStats';
import type { PlayerState } from '../player/state';
import type { CombatState } from './state';

/** Further than this in a tick isn't a step (m): you went to your sword. */
const NOT_A_STEP = 1;
/** Higher or lower than this it doesn't feel you (m). */
const LEVEL = 3;

/** Past this nothing staggers it: it never flinches from a blow, and doesn't from this (a Kraken Tentacle). */
const NEVER = 1e5;
export const staggers = (s: EnemyStats) => s.stagger < NEVER;

/** One tick of your feet: a step each stride you walk on the ground. */
export function stepFeet(state: CombatState, player: PlayerState) {
  const b = state.blade;
  const moved = Math.hypot(player.pos.x - b.feetX, player.pos.z - b.feetZ);
  b.feetX = player.pos.x;
  b.feetZ = player.pos.z;
  if (!player.grounded || player.dashTime > 0 || player.swimTop > 0 || moved > NOT_A_STEP) return;
  b.stride += moved;
  if (b.stride < DEMON.v.stepEvery) return;
  b.stride -= DEMON.v.stepEvery;
  player.events.push('demonStep');
}

/** One tick of what you do to them, coming near. */
export function stepPresence(state: CombatState, player: PlayerState, dt: number) {
  const v = DEMON.v;
  const wait = state.blade.dread;
  for (let i = 0; i < state.enemies.length; i++) {
    wait[i] = Math.max(0, (wait[i] ?? 0) - dt);
    if (v.presenceRange <= 0 || wait[i] > 0) continue;
    const e = state.enemies[i];
    if (!isLive(e) || e.phase !== 'chase') continue;
    const s = ENEMY_STATS[e.kind]();
    if (s.boss || MINI_BOSSES.includes(e.kind) || Math.abs(e.pos.y - player.pos.y) > LEVEL) continue;
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > v.presenceRange || d < 1e-3) continue;
    wait[i] = v.presenceWait;
    if (staggers(s) && state.rng() < v.presenceFlinch) setPhase(e, 'flinch');
    else {
      // As a blow's knock moves it: its weight counts.
      e.vel.x += (dx / d) * v.presenceBack * s.knock;
      e.vel.z += (dz / d) * v.presenceBack * s.knock;
    }
  }
}
