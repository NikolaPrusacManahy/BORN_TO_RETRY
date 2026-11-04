// Update 0.0.18 — the boss in play, whichever it is (out of demonView.ts in Update 0.3.41, the Demon gone).
import type { CombatState } from '../../sim/combat/state';
import type { Enemy } from '../../sim/enemies/enemy';
import { ENEMY_STATS } from '../../sim/enemies/kinds';

export function bossIn(state: CombatState): Enemy | null {
  for (const e of state.enemies) if (e.alive && ENEMY_STATS[e.kind]().boss) return e;
  return null;
}
