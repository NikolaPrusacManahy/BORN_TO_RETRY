// Update 0.5.5 — a burst of floor 10's fire hurting enemies (the Cinder Chicken's, a spore cloud blowing): every enemy in its reach but the
// bosses, the more the nearer (half at its edge), thrown out, and the bodies it kills flung (as a powder keg's blast does, dungeon/powder.ts).
// They count as yours, as a keg's do. Pure.
import { launch } from '../enemies/flight';
import { isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

const hit = emptyTargetHit();

/** Enemies within `reach` of (x, z), all but slot `but`, hurt by up to `damage`, thrown out at `knock`. */
export function blastFoes(state: CombatState, x: number, z: number, reach: number, damage: number, knock: number, but = -1) {
  if (damage <= 0) return;
  state.enemies.forEach((e, i) => {
    const d = Math.hypot(e.pos.x - x, e.pos.z - z);
    if (i === but || !isLive(e) || d > reach + radiusOf(e) || ENEMY_STATS[e.kind]().boss) return;
    const ox = d > 1e-3 ? (e.pos.x - x) / d : 1;
    const oz = d > 1e-3 ? (e.pos.z - z) / d : 0;
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
    if (landHit(state, hit, damage * (1 - 0.5 * Math.min(1, d / reach)), knock, ox, oz, 'hitThrown', damage, true)) launch(e, ox, oz);
  });
}
