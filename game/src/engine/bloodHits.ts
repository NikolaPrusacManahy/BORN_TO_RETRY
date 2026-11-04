// Update 0.3.15 — blood's sums, out of bloodFx.ts (which had reached its size): how many drops each hit sprays, and which
// enemy a hit landed on (the one whose body the hit's point is on: the events carry only the point). Pure.
import type { CombatEvent, CombatState } from '../sim/combat/state';
import { Enemy, radiusOf } from '../sim/enemies/enemy';
import type { BloodAmount } from './bloodLooks';

/** How far a hit's point may be off an enemy's body and still be on it (m). */
const ON_BODY = 1;

/** How many drops event `kind` (with `value`) sprays (0: none of blood's). */
export function bloodDrops(kind: CombatEvent, value: number, a: BloodAmount): number {
  switch (kind) {
    case 'hitJab':
    case 'hitFinisher':
    case 'hitSlash':
    case 'hitPierce':
    case 'hitThrown':
    case 'hitKnife':
    case 'hitShot':
    case 'hitSlam':
      return a.hit(value > 1 ? value : 15);
    case 'hitHeavy':
      return a.hit(20 + 30 * Math.min(1, value));
    case 'cardDot':
      return value === 0 ? Math.max(1, Math.round(a.hit(0) / 3)) : 0;
    case 'cardBlastHit':
    case 'cardZap':
      return Math.round(a.hit(10) / 2);
    case 'kill':
    case 'wallSplat':
      return a.kill;
    // (Update 0.3.42 — a worm torn off The Swarm: half a kill's; its eye struck: a hit's.)
    case 'swarmGore':
      return Math.round(a.kill / 2);
    case 'swarmEye':
      return a.hit(20);
    case 'execBlow':
      return Math.round(a.exec / 2);
    case 'execBurst':
    case 'execLand':
      return a.exec;
    default:
      return 0;
  }
}

/** The live enemy whose body (x, z) is on, if any. */
export function enemyAt(state: CombatState, x: number, z: number): Enemy | null {
  let best: Enemy | null = null;
  let near = ON_BODY;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - x, e.pos.z - z) - radiusOf(e);
    if (d < near) {
      near = d;
      best = e;
    }
  }
  return best;
}
