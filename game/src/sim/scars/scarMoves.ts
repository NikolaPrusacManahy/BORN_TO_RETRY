// Update 0.2.15 — what the Scars (scars.ts) do in a fight, where it isn't a number changed in place: Shoulder Charge
// and Bowling (a dash or a slide into an enemy throws it back and staggers it: no damage), Pogo (a killing slam
// bounces you back up), Hair Trigger (a charged punch twice as quick, for a dash), Iron Knuckles (a punch on an enemy
// winding up makes it start over: what it changes is a mini boss's, as any hit already staggers the rest), Ricochet (a
// thrown weapon turns to the next enemy). A boss is never staggered or stalled. Pure.
import { Vector3 } from 'three';
import { FISTS } from '../../tuning/combat';
import { MOVE } from '../../tuning/movement';
import { SCARS } from '../../tuning/scars';
import { wallBetween } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { isLive, radiusOf, setPhase } from '../enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { THROWN_GRAVITY, THROWN_LIFE, Thrown } from '../weapons/weapons';
import { THROWN_RADIUS } from '../weapons/thrown';
import { scarred } from './scars';

/** A dash or slide touches an enemy this much beyond your two bodies (m): before you're pushed out of it. */
const TOUCH = 0.35;
/** Which move bumps now: none, a dash (Shoulder Charge), a slide (Bowling). */
const NONE = 0;
const DASH_MOVE = 1;
const SLIDE_MOVE = 2;

const way = new Vector3();

/** Shoulder Charge and Bowling: each enemy your dash (or slide) runs into is thrown back along your way and away from
 *  you, and staggered (not a boss or a mini boss), once a dash or slide. */
export function bumpEnemies(state: CombatState, player: PlayerState) {
  const move = player.dashTime > 0 && scarred(state, 'shoulderCharge') ? DASH_MOVE : player.sliding && player.grounded && scarred(state, 'bowling') ? SLIDE_MOVE : NONE;
  if (move !== state.bumpMove) state.bumped.length = 0;
  state.bumpMove = move;
  if (move === NONE) return;
  const dir = move === DASH_MOVE ? player.dashDir : player.slideDir;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || e.phase === 'held' || e.phase === 'rebuild' || state.bumped.includes(i)) continue;
    const s = ENEMY_STATS[e.kind]();
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > radiusOf(e) + BODY.radius + TOUCH || player.pos.y > e.pos.y + s.height || player.pos.y + BODY.height < e.pos.y) continue;
    state.bumped.push(i);
    // Along your way, and out to the side you passed it on.
    way.set(dir.x + (d > 1e-3 ? dx / d : 0), 0, dir.z + (d > 1e-3 ? dz / d : 0));
    const len = Math.hypot(way.x, way.z) || 1;
    const knock = SCARS.v.bumpKnock * FISTS.v.chargeKnock * s.knock;
    e.vel.x += (way.x / len) * knock;
    e.vel.z += (way.z / len) * knock;
    e.flash = 0.12;
    if (!s.boss && !MINI_BOSSES.includes(e.kind)) setPhase(e, 'flinch');
    state.events.push('scarBump', i, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
  }
}

/** Pogo: a slam that killed (`kills`) bounces you back up, high enough to slam again. */
export function pogo(state: CombatState, player: PlayerState, kills: number) {
  if (kills <= 0 || !scarred(state, 'pogo') || player.dead) return;
  player.vel.y = Math.sqrt(2 * MOVE.v.gravity * SCARS.v.pogoHeight);
  player.grounded = false;
  player.slamBounce = 0;
  state.events.push('scarPogo', kills, player.pos.x, player.pos.y, player.pos.z);
}

/** Hair Trigger: how fast your fists' charge fills (×1: as tuned). Twice as quick while you have a dash to pay. */
export const chargeRate = (state: CombatState, player: PlayerState) => (state.weapon === null && scarred(state, 'hairTrigger') && player.dashCharges >= 1 ? 1 / Math.max(0.05, SCARS.v.hairTrigger) : 1);

/** Hair Trigger: a charged punch let go pays its dash. */
export function payCharge(state: CombatState, player: PlayerState) {
  if (scarred(state, 'hairTrigger') && player.dashCharges >= 1) player.dashCharges -= 1;
}

/** Iron Knuckles: enemy `i`, just punched, starts its windup over (not a boss). */
export function stall(state: CombatState, i: number) {
  const e = state.enemies[i];
  if (!scarred(state, 'ironKnuckles') || !isLive(e) || e.phase !== 'windup' || ENEMY_STATS[e.kind]().boss) return;
  e.t = 0;
  state.events.push('scarStall', i, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height, e.pos.z);
}

const aimAt = new Vector3();

/** Ricochet: thrown weapon `t`, which has just hit enemy `skip` (at `at`), turns on to the next enemy (once a throw).
 *  Returns true if it did (it flies on); false: it breaks as before. */
export function ricochet(state: CombatState, t: Thrown, at: Vector3, skip: number): boolean {
  if (t.returns || t.bounces > 0 || !scarred(state, 'ricochet')) return false;
  const first = state.enemies[skip];
  const i = nextTarget(state, first.pos, skip);
  if (i < 0) return false;
  const e = state.enemies[i];
  // From just outside the one it hit (its middle, out past its body: so it can't hit it again), towards the next.
  const hx = e.pos.x - first.pos.x;
  const hz = e.pos.z - first.pos.z;
  const h = Math.hypot(hx, hz) || 1;
  const out = radiusOf(first) + THROWN_RADIUS + 0.1;
  t.pos.set(first.pos.x + (hx / h) * out, at.y, first.pos.z + (hz / h) * out);
  aimAt.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z).sub(t.pos);
  const dist = Math.max(aimAt.length(), 1e-3);
  const speed = Math.max(t.vel.length(), 1);
  const time = dist / speed;
  // Straight at it, a little higher for the drop on the way.
  t.vel.copy(aimAt).multiplyScalar(speed / dist);
  t.vel.y += 0.5 * THROWN_GRAVITY * time;
  t.life = Math.max(t.life, Math.min(THROWN_LIFE, time + 0.3));
  t.bounces++;
  state.events.push('scarRicochet', i, t.pos.x, t.pos.y, t.pos.z);
  return true;
}

/** Ricochet: the live enemy nearest `from` (not `skip`) within reach and not behind a wall, or −1. */
export function nextTarget(state: CombatState, from: Vector3, skip: number): number {
  let best = -1;
  let bestD = SCARS.v.ricochetRange;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (i === skip || !isLive(e) || e.phase === 'held') continue;
    const d = Math.hypot(e.pos.x - from.x, e.pos.z - from.z);
    if (d >= bestD || wallBetween(state.nav.small, from.x, from.z, e.pos.x, e.pos.z)) continue;
    bestD = d;
    best = i;
  }
  return best;
}
