// Update 0.0.21 — how many enemies are left in the fight (the designer: "an enemy room count that shows how many enemies
// are left in the room, like a total enemy count left"): those alive now and every one of the waves still to come. In
// the Lab, those alive. A boss isn't counted (it has its bar); outside a fight, nothing (−1). Pure.
import type { CombatState } from '../combat/state';
import { isLive } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { DungeonRun } from './roomLoop';

export function enemiesLeft(run: DungeonRun | null, combat: CombatState): number {
  let live = 0;
  for (const e of combat.enemies) if (isLive(e) && !ENEMY_STATS[e.kind]().boss) live++;
  if (!run) return live > 0 ? live : -1;
  for (let i = 0; i < run.rooms.length; i++) {
    const rr = run.rooms[i];
    if (rr.state !== 'fighting' || run.level.rooms[i].kind !== 'fight') continue;
    const waves = run.level.rooms[i].waves;
    let later = 0;
    for (let w = rr.wave; w < waves.length; w++) later += waves[w].length;
    return live + later;
  }
  return -1;
}
