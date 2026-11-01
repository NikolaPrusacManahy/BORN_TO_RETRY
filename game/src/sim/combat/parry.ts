// Update 0.3.3 — the parry (the designer: "Yes, parrying", from the gameplay-feel list: "like Doom or Ultra kill"; an
// early one was taken out in M1 at the designer's request, "it returns later"): an enemy's shot met sends it back the
// way you look (onto the nearest enemy close to your aim), faster and far deadlier. A parried shot hits enemies, never
// you, and pops on a wall. A freeze, and the 'parry' event (a ring, a clang). It never heals. Pure.
// Update 0.3.5 (the designer: "now right click is parry … it still has to time the hit with the projectile") — it's
// right click's (barehanded): while the window its press opened lasts, the first shot to come within a fist's reach is
// sent back (punches no longer parry). Cold Snap, Thunderclap and Powder Keg (Fate Cards; they were the charged punch's)
// go off where a parried shot hits.
// Update 0.3.7 — a parried shot that kills flings the body, as a killing punch does (flight.ts).
import { Vector3 } from 'three';
import { FEEDBACK, FISTS, TARGETS } from '../../tuning/combat';
import type { CollisionWorld } from '../collisionWorld';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import { chill } from '../cards/cardMoves';
import { heavyPowers } from '../cards/cardPowers';
import { segmentDistance } from './geometry';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How much further than the punch's own sweep a shot may be and still be caught (m); how close to your aim (rad) an
 *  enemy draws a parried shot onto it; how long a parried shot flies (s), how hard it knocks (m/s). */
const SLACK = 0.45;
const ASSIST = (20 * Math.PI) / 180;
const LIFE = 2.5;
const KNOCK = 8;

const end = new Vector3();
const at = new Vector3();
const sOut = { s: 0 };
const toward = new Vector3();
const next = new Vector3();
const way = new Vector3();
const hit = emptyTargetHit();

/** The parry's window is open, you looking from `eye` along `dir` (length 1): the first enemy shot within a fist's reach
 *  is sent back. Returns how far from the eye it was caught (m), or −1: none. */
export function parry(state: CombatState, eye: Vector3, dir: Vector3): number {
  end.copy(eye).addScaledVector(dir, FISTS.v.reach);
  const reach = FISTS.v.radius + TARGETS.v.orbRadius + SLACK;
  let best = -1;
  let bestS = Infinity;
  state.orbs.forEach((o, i) => {
    if (!o.alive || o.parried) return;
    if (segmentDistance(eye, end, o.pos, o.pos, at, sOut) > reach || sOut.s >= bestS) return;
    best = i;
    bestS = sOut.s;
  });
  if (best < 0) return -1;
  const o = state.orbs[best];
  // Back the way you look, or onto the enemy nearest your aim if one is close to it.
  toward.copy(dir);
  let close = ASSIST;
  for (const e of state.enemies) {
    if (!isLive(e)) continue;
    way.set(e.pos.x - o.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.6 - o.pos.y, e.pos.z - o.pos.z);
    const d = way.length();
    if (d < 0.5) continue;
    const angle = way.angleTo(dir);
    if (angle < close) {
      close = angle;
      toward.copy(way).divideScalar(d);
    }
  }
  o.vel.copy(toward).multiplyScalar(Math.max(o.vel.length() * FISTS.v.parrySpeed, FISTS.v.parryMinSpeed));
  o.parried = true;
  o.life = LIFE;
  o.damage = FISTS.v.parryDamage;
  state.events.push('parry', best, o.pos.x, o.pos.y, o.pos.z);
  state.hitStop.request(FEEDBACK.v.stopParry);
  return eye.distanceTo(o.pos);
}

/** One tick of the parried shots: on into the first enemy (or anything else to hit), a wall, or their time. */
export function stepParried(state: CombatState, world: CollisionWorld, dt: number) {
  const r = TARGETS.v.orbRadius;
  for (const o of state.orbs) {
    if (!o.alive || !o.parried) continue;
    o.life -= dt;
    if (o.life <= 0) {
      pop(state, o.pos);
      o.alive = false;
      continue;
    }
    next.copy(o.pos).addScaledVector(o.vel, dt);
    if (nearestTarget(state, o.pos, next, r, hit)) {
      o.alive = false;
      const flat = Math.hypot(o.vel.x, o.vel.z) || 1;
      const killed = landHit(state, hit, o.damage, KNOCK, o.vel.x / flat, o.vel.z / flat, 'hitThrown', o.damage);
      // (Update 0.3.5 — Cold Snap's freeze, Thunderclap's lightning, Powder Keg's blast.)
      if (hit.kind === 'enemy') {
        chill(state, hit.index);
        heavyPowers(state, hit.index, hit.point);
        if (killed) launch(state.enemies[hit.index], o.vel.x / flat, o.vel.z / flat);
      }
      continue;
    }
    const step = o.vel.length() * dt;
    way.copy(o.vel).divideScalar(Math.max(o.vel.length(), 1e-6));
    const wall = world.rayDistance(o.pos, way, step + r);
    if (wall <= step + r) {
      o.alive = false;
      pop(state, at.copy(o.pos).addScaledVector(way, Math.max(0, wall - r)));
      continue;
    }
    o.pos.copy(next);
  }
}

const pop = (state: CombatState, p: Vector3) => state.events.push('orbPop', 0, p.x, p.y, p.z);
