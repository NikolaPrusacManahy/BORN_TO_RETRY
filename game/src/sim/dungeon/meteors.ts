// Update 0.3.17 — floor 8's meteor showers (the plan, MD/FLOOR8_MOON_PLAN.md: "in some rooms, now and then, a meteor
// falls where you stand: its shadow and a glow in the sky warn first; the strike leaves a small crater and throws
// everyone near it"). In a meteor room (moonRooms.ts) while it fights, about every Meteor every one is called down where
// you'll be (Meteor lead ahead); Meteor warning later it strikes: within Meteor reach you're hurt and thrown, any enemy
// hurt harder and thrown. Its mark stays on the dust. The view draws the shadow, the falling rock and the marks
// (engine/moon/meteorView.ts). Pure.
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { MOON } from '../../tuning/moon';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit } from '../combat/strike';
import { isLive } from '../enemies/enemy';
import { ENEMY_STATS, flies } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';

/** A meteor called down: where, how long since (s), the room. */
export interface Meteor {
  x: number;
  z: number;
  t: number;
  room: number;
}

export interface Meteors {
  /** Each room of the floor: does it have meteors? */
  rooms: boolean[];
  /** Until the next (s). */
  clock: number;
  falling: Meteor[];
  /** Where they've struck (the view's scorch marks; the last Marks of them). */
  marks: { x: number; z: number }[];
}

/** At most this many marks are kept; a strike is this share of its throw upwards; above this you're out of its blast
 *  (m: over the dust, on a roof). */
export const MARKS = 24;
const UP = 0.6;
const ABOVE = 3;

const hit = emptyTargetHit();

export function createMeteors(level: DungeonLevel): Meteors {
  return { rooms: level.plan.rooms.map((r) => !!r.layout.template.meteors), clock: 0, falling: [], marks: [] };
}

/** One tick: `room` the room you're in (−1: none), `fighting` whether it fights. */
export function stepMeteors(m: Meteors, room: number, fighting: boolean, player: PlayerState, combat: CombatState, dt: number) {
  const v = MOON.v;
  if (room >= 0 && fighting && m.rooms[room] && !player.dead) {
    m.clock -= dt;
    if (m.clock <= 0) {
      m.clock = v.meteorEvery * (0.6 + 0.8 * combat.rng());
      const x = player.pos.x + player.vel.x * v.meteorLead + (combat.rng() - 0.5) * 1.5;
      const z = player.pos.z + player.vel.z * v.meteorLead + (combat.rng() - 0.5) * 1.5;
      m.falling.push({ x, z, t: 0, room });
      combat.events.push('meteorWarn', 0, x, 0, z);
    }
  } else m.clock = Math.min(m.clock, v.meteorEvery * 0.5);
  for (let i = m.falling.length - 1; i >= 0; i--) {
    const f = m.falling[i];
    f.t += dt;
    if (f.t < v.meteorWarn) continue;
    m.falling.splice(i, 1);
    strike(f.x, f.z, player, combat);
    m.marks.push({ x: f.x, z: f.z });
    if (m.marks.length > MARKS) m.marks.shift();
  }
}

/** It strikes at (x, z): you and any enemy within reach hurt and thrown away from it. */
function strike(x: number, z: number, player: PlayerState, combat: CombatState) {
  const v = MOON.v;
  combat.events.push('meteorStrike', 0, x, 0, z);
  const dx = player.pos.x - x;
  const dz = player.pos.z - z;
  const d = Math.hypot(dx, dz);
  if (!player.dead && player.pos.y < ABOVE && d <= v.meteorReach && damagePlayer(player, v.meteorDamage, 'meteor')) {
    const k = d > 1e-3 ? 1 / d : 0;
    player.vel.x += dx * k * v.meteorThrow;
    player.vel.z += dz * k * v.meteorThrow;
    player.vel.y = Math.max(player.vel.y, v.meteorThrow * UP);
  }
  combat.enemies.forEach((e, i) => {
    const s = ENEMY_STATS[e.kind]();
    const ex = e.pos.x - x;
    const ez = e.pos.z - z;
    const ed = Math.hypot(ex, ez);
    if (!isLive(e) || e.pos.y > ABOVE || ed > v.meteorReach + s.radius) return;
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(e.pos.x, e.pos.y + s.height, e.pos.z);
    const k = ed > 1e-3 ? 1 / ed : 0;
    landHit(combat, hit, v.meteorFoeDamage, v.meteorThrow, ex * k, ez * k, 'hitSlam', v.meteorFoeDamage, true);
    // (A walker thrown up: off the ground, so it falls back.)
    if (s.boss || s.size === 'large' || flies(e.kind) || e.perch > 0) return;
    e.vel.y = Math.max(e.vel.y, v.meteorThrow * UP);
    e.pos.y = Math.max(e.pos.y, e.perch + 0.05);
  });
}
