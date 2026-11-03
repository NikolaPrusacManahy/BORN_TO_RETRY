// Update 0.3.21 — the bestiary, upstairs in the lobby (the designer: "the collection area where player can see all the
// enemy list aligned that are all darken if not killed yet"; decided: "Statues on plinths"): every enemy once, on the
// floor it first comes to, in its roster's order, a body that becomes another when it breaks (the Cursed Crewman, the
// Bee mech) with its second self after it; and the floor's boss, if it has its own (floor 7 borrows floor 4's till its
// own are designed; floors 8 to 10's are still to come). Floors that bring none of their own yet (7, 9, 10: their
// rooms send stand-ins) show bare plinths: coming soon. Pure.
import { rosterOf } from '../dungeon/wavePlan';
import { bossOf, EnemyKind } from '../enemies/kinds';

/** The floors shown (the run's ten). */
export const FLOOR_COUNT = 10;
/** Floors up to this one have bosses of their own. */
const OWN_BOSSES = 6;
/** A body that becomes another when it breaks: shown beside it. */
const SECOND: Partial<Record<EnemyKind, EnemyKind>> = { crewman: 'headless', beeMech: 'beeNaut' };

export interface FloorShelf {
  /** 1: the first. */
  floor: number;
  enemies: EnemyKind[];
  boss: EnemyKind | null;
}

export function collection(): FloorShelf[] {
  const seen = new Set<EnemyKind>();
  const out: FloorShelf[] = [];
  for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
    const enemies: EnemyKind[] = [];
    for (const k of rosterOf(floor)) {
      if (seen.has(k)) continue;
      seen.add(k);
      enemies.push(k);
      const second = SECOND[k];
      if (second && !seen.has(second)) {
        seen.add(second);
        enemies.push(second);
      }
    }
    out.push({ floor, enemies, boss: floor <= OWN_BOSSES ? bossOf(floor) : null });
  }
  return out;
}
