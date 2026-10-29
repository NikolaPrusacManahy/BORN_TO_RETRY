// Update 0.0.12 — what the minimap shows (the designer: a small minimap): the rooms you've been in, the ones beside them
// that you know of (as Soul Knight shows them), the corridors between known rooms, and the room you're in. Made again
// only when that changes; the HUD feed adds where you are.
// Update 0.1.20 — a challenge room shows as one.
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import { GRID } from '../world/dungeon/floorPlan';
import type { MapView } from './hudStore';

const cache = new WeakMap<DungeonRun, { key: number; view: MapView }>();

export function mapOf(d: DungeonRun): MapView {
  let mask = 0;
  for (let i = 0; i < d.visited.length; i++) if (d.visited[i]) mask |= 1 << i;
  const key = mask * 64 + d.current + 1;
  const hit = cache.get(d);
  if (hit && hit.key === key) return hit.view;
  const plan = d.level.plan;
  const known = d.visited.slice();
  for (const [a, b] of plan.links) {
    if (d.visited[a]) known[b] = true;
    if (d.visited[b]) known[a] = true;
  }
  const view: MapView = {
    size: GRID,
    rooms: plan.rooms.flatMap((r) =>
      known[r.index] ? [{ x: r.x0, z: r.z0, w: r.layout.w, h: r.layout.h, kind: r.challenge ? 'challenge' : r.kind, state: r.index === d.current ? 'here' : d.visited[r.index] ? 'been' : 'known' } as const] : [],
    ),
    corridors: plan.corridors.flatMap((c, i) => (known[plan.links[i][0]] && known[plan.links[i][1]] ? [{ x: c.x0, z: c.z0, w: c.x1 - c.x0 + 1, h: c.z1 - c.z0 + 1 }] : [])),
  };
  cache.set(d, { key, view });
  return view;
}
