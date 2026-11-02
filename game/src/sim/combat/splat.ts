// Update 0.3.7 (the designer: "Punched enemies … splatting against walls") — the bodies that hit a wall hard this tick
// (sim/enemies/flight.ts): one still alive takes Splat damage (no dodging a wall; it may kill it) and is staggered;
// each reports 'wallSplat' at the wall (value: how fast it hit, m/s) — the blood on the wall, the crunch.
// Update 0.3.8 — one dead there (thrown dead, or killed by it) is pinned to the wall, if it's a humanoid runner
// (sim/enemies/flight.ts).
// Update 0.3.10 — against a pillar, at its stone (and pinned against it), not the edge of its box (the plain column's
// is its base, a cell wide). Pure.
import { LAUNCH } from '../../tuning/launch';
import { Enemy, isLive, radiusOf, setPhase } from '../enemies/enemy';
import { pin } from '../enemies/flight';
import { onStone, pillarAt } from './pillars';
import { ENEMY_STATS } from '../enemies/kinds';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

const hit = emptyTargetHit();

export function wallSplats(state: CombatState) {
  state.enemies.forEach((e, i) => {
    if (e.splat <= 0) return;
    const speed = e.splat;
    e.splat = 0;
    const on = pillarAt(state, e.wall);
    if (on >= 0) onStone(state.pillars[on], e.wall);
    if (!isLive(e)) {
      state.events.push('wallSplat', speed, e.wall.x, e.wall.y, e.wall.z);
      pinTo(state, e, on);
      return;
    }
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(e.wall);
    const killed = landHit(state, hit, LAUNCH.v.splatDamage, 0, 0, 0, 'wallSplat', speed, true);
    if (killed) pinTo(state, e, on);
    else if (isLive(e) && e.phase !== 'rebuild' && !ENEMY_STATS[e.kind]().boss) setPhase(e, 'flinch');
  });
}

/** Pinned there (if it's one that is); to pillar `on` (−1: a wall), against its stone. */
function pinTo(state: CombatState, e: Enemy, on: number) {
  pin(e);
  if (e.pinned <= 0 || on < 0) return;
  const p = state.pillars[on];
  const dx = e.wall.x - p.x;
  const dz = e.wall.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  e.pos.x = e.wall.x + (dx / d) * radiusOf(e);
  e.pos.z = e.wall.z + (dz / d) * radiusOf(e);
}
