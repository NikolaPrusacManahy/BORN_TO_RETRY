// Update 0.3.7 (the designer: "Punched enemies launching into the air and splatting against walls") — a body's flight.
// A killing punch (or a parried shot that kills) flings the body up and away from you; in the air it slows only a
// little (Air drag); on the floor it slides to a stop as before. Anything knocked into a wall at Splat speed or faster
// splats on it and stops there (sim/combat/splat.ts: the damage; the engine: the blood on the wall). Light: not a boss,
// not large, not on a ledge; a flier's body is flung, never thrown up (it falls). A live enemy is never thrown up (the
// designer: "no 3rd punch of a combo launches, it is not something I want, it is like a stun").
// Update 0.3.8 (the designer: "enemies being pinned to a wall when they die, they are thrown and they flicker for like 3
// sec and die … only the running type of enemy that have an humanoid looks, like grunts, skeleton, rabbit, Leaper") — a
// body of those thrown into a wall is pinned there: lifted off the floor, facing out, for Pinned time (it flickers: the
// view); then it drops (tick.ts). Meanwhile it can be executed for free (combat/execPin.ts). Update 0.3.15 — and
// Skull Cove's pirates. Pure.
import { pushOutOfWalls, type NavGrid } from '../../world/navGrid';
import { EXECUTION } from '../../tuning/execution';
import { LAUNCH } from '../../tuning/launch';
import type { Enemy } from './enemy';
import { ENEMY_STATS, EnemyKind, flies } from './kinds';

/** Sliding on the floor, a body slows at this rate (1/s); this far over its floor (m), it's in the air. */
const SLIDE_FRICTION = 7;
const AIR = 0.05;

/** The humanoid runners, pinned to the wall they're thrown into dead; how far up the wall a pinned body hangs (its feet,
 *  m: at least, at most). */
export const PINNABLE: ReadonlySet<EnemyKind> = new Set<EnemyKind>(['grunt', 'skeleton', 'rabbit', 'leaper', 'corsair', 'shanty', 'bomber', 'crewman', 'headless', 'gunner', 'flanker', 'hopper', 'beeNaut', 'flamingoNaut', 'foxNaut', 'frogNaut', 'raider', 'axeThrower', 'draugr', 'barrowMaid', 'volva', 'karateka', 'karateGirl', 'shinobi', 'kunoichi', 'sandNinja', 'sandNinjaF', 'archer', 'imp', 'puglin', 'boneAxeman', 'boneGuard']);
const PIN_LOW = 0.2;
const PIN_HIGH = 0.9;

/** A body that hit a wall (`e.wall`): pinned there, if it's one of those. */
export function pin(e: Enemy) {
  if (!PINNABLE.has(e.kind) || e.phase !== 'dead' || e.perch > 0) return;
  e.pinned = EXECUTION.v.pinTime;
  e.t = 0;
  e.vel.set(0, 0, 0);
  e.pos.y = Math.min(PIN_HIGH, Math.max(PIN_LOW, e.pos.y));
  e.facing = Math.atan2(-(e.pos.x - e.wall.x), -(e.pos.z - e.wall.z));
}

/** A killing punch landed on `e` (a body now) along (dx, dz) (length 1): it's flung. */
export function launch(e: Enemy, dx: number, dz: number) {
  const s = ENEMY_STATS[e.kind]();
  if (e.phase !== 'dead' || s.boss || s.size === 'large' || e.perch > 0) return;
  const v = LAUNCH.v;
  // Away from you at least this fast (a harder knock keeps its own).
  const more = Math.max(0, v.killFling - (e.vel.x * dx + e.vel.z * dz));
  e.vel.x += dx * more;
  e.vel.z += dz * more;
  if (flies(e.kind)) return;
  e.vel.y = Math.max(e.vel.y, v.killUp);
  e.pos.y = Math.max(e.pos.y, e.perch + AIR * 0.4);
}

/** One tick of `e`'s knock: on along its slide (out of any wall it runs into), slowing fast on the floor (a body in the
 *  air, only a little). A wall met at Splat speed: `e.splat` (how fast) and `e.wall` (where, at mid-body), and it
 *  stops. Update 0.3.11 — on floor 7's ice it slid far; Update 0.3.27 (the designer: "Do not make the enemies in Frozen Depths slide on ice at all") —
 *  no more: on ice as on stone. */
export function fly(e: Enemy, nav: NavGrid, radius: number, dt: number) {
  const speed = Math.hypot(e.vel.x, e.vel.z);
  if (speed <= 0.01) return;
  const dx = e.vel.x / speed;
  const dz = e.vel.z / speed;
  const step = speed * dt;
  const x = (e.pos.x += dx * step);
  const z = (e.pos.z += dz * step);
  pushOutOfWalls(nav, e.pos, radius);
  // Pushed back out more than half the way it went: it ran into the wall.
  const px = e.pos.x - x;
  const pz = e.pos.z - z;
  if (speed >= LAUNCH.v.splatSpeed && -(px * dx + pz * dz) > step * 0.5) {
    const out = Math.hypot(px, pz);
    e.splat = speed;
    e.wall.set(e.pos.x - (px / out) * radius, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z - (pz / out) * radius);
    e.vel.x = e.vel.z = 0;
    return;
  }
  const k = Math.exp(-(e.phase === 'dead' && e.pos.y > e.perch + AIR ? LAUNCH.v.airDrag : SLIDE_FRICTION) * dt);
  e.vel.x *= k;
  e.vel.z *= k;
}
