// Update 0.3.7 (the designer: "Punched enemies … splatting against walls") — the bodies that hit a wall hard this tick
// (sim/enemies/flight.ts): one still alive takes Splat damage (no dodging a wall; it may kill it) and is staggered;
// each reports 'wallSplat' at the wall (value: how fast it hit, m/s) — the blood on the wall, the crunch. Pure.
import { LAUNCH } from '../../tuning/launch';
import { isLive, setPhase } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

const hit = emptyTargetHit();

export function wallSplats(state: CombatState) {
  state.enemies.forEach((e, i) => {
    if (e.splat <= 0) return;
    const speed = e.splat;
    e.splat = 0;
    if (!isLive(e)) {
      state.events.push('wallSplat', speed, e.wall.x, e.wall.y, e.wall.z);
      return;
    }
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(e.wall);
    const killed = landHit(state, hit, LAUNCH.v.splatDamage, 0, 0, 0, 'wallSplat', speed, true);
    if (!killed && isLive(e) && e.phase !== 'rebuild' && !ENEMY_STATS[e.kind]().boss) setPhase(e, 'flinch');
  });
}
