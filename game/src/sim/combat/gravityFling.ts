// Update 0.3.82 — Gravity Sean's right click in Unstable mode, Fling (enemy_bibles/Born to Retry — Gravity Sean.docx: "aim at an enemy and choose where they go flying"). Pressed on one:
// it's caught, lifted, held as an execution holds one. Let go, or after a while: it flies to where you're looking. An open decision in the bible, as a placeholder: flung into a wall, another enemy or
// what you can't walk on (lava, a pit's edge), it takes more. Too big to lift (a boss, a mini-boss, a large one): it only takes a blow. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { freeAt } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { isLive, radiusOf, setPhase } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS, flies, MINI_BOSSES } from '../enemies/kinds';
import type { Enemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import { instabFactor } from './gravityMeter';
import { staggers } from './presence';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How high the throw's arc rises over the lift (m), and how close two bodies must come to hit (m, over their sizes). */
const ARC = 0.6;
const TOUCH = 0.15;
/** Bodies this far apart in height miss each other (m). */
const LEVEL = 2.2;

const eye = new Vector3();
const dir = new Vector3();
const end = new Vector3();
const hit = emptyTargetHit();

/** Can this be lifted? */
export const liftable = (e: Enemy) => {
  const s = ENEMY_STATS[e.kind]();
  return !s.boss && !MINI_BOSSES.includes(e.kind) && s.size !== 'large' && e.perch <= 0 && e.phase !== 'rebuild' && e.phase !== 'dead';
};

/** A hit from Fling on enemy `index`: whether it killed. */
function blow(state: CombatState, index: number, damage: number, fx: number, fz: number): boolean {
  const e = state.enemies[index];
  hit.kind = 'enemy';
  hit.index = index;
  hit.part = 0;
  hit.s = 0;
  hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);
  const killed = landHit(state, hit, damage, SEAN.v.flingKnock, fx, fz, 'hitHeavy', 1);
  if (killed) launch(e, fx, fz);
  return killed;
}

/** It lands or strikes: it's walking again, if it lived. */
function setDown(state: CombatState, e: Enemy) {
  if (!isLive(e)) return;
  e.pos.y = e.perch;
  e.vel.set(0, 0, 0);
  setPhase(e, staggers(ENEMY_STATS[e.kind]()) ? 'flinch' : 'chase');
  state.events.push('seanLand', 0, e.pos.x, e.pos.y, e.pos.z);
}

/** Lets go of whatever's caught, flying nowhere (out of Unstable mode). */
export function dropCaught(state: CombatState) {
  const g = state.grav;
  if (g.caught < 0) return;
  const e = state.enemies[g.caught];
  g.caught = -1;
  setDown(state, e);
}

/** Thrown: to where you're looking now. */
function fling(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const g = state.grav;
  const v = SEAN.v;
  const index = g.caught;
  const e = state.enemies[index];
  g.caught = -1;
  g.flingWait = v.flingWait;
  const slot = g.flung.find((f) => f.index < 0);
  if (!slot || !isLive(e)) return setDown(state, e);
  aim(player, yaw, pitch, eye, dir);
  const far = Math.min(v.flingSight, world.rayDistance(eye, dir, v.flingSight));
  end.copy(eye).addScaledVector(dir, far);
  const dx = end.x - e.pos.x;
  const dz = end.z - e.pos.z;
  const d = Math.max(0.01, Math.hypot(dx, dz));
  slot.index = index;
  slot.dx = dx / d;
  slot.dz = dz / d;
  slot.left = slot.total = Math.min(d, v.flingFar);
  slot.from = e.pos.y;
  state.events.push('seanFling', index, e.pos.x, e.pos.y, e.pos.z);
}

/** Right click in Unstable mode, each tick. */
export function stepFling(state: CombatState, player: PlayerState, pressed: boolean, heldDown: boolean, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const g = state.grav;
  const v = SEAN.v;
  g.flingWait = Math.max(0, g.flingWait - dt);
  if (g.caught >= 0) {
    const e = state.enemies[g.caught];
    if (!isLive(e)) {
      g.caught = -1;
      return;
    }
    g.caughtT += dt;
    e.pos.y += (g.caughtY + v.flingLift - e.pos.y) * (1 - Math.exp(-12 * dt));
    e.vel.set(0, 0, 0);
    if (!heldDown || g.caughtT >= v.flingHold) fling(state, player, yaw, pitch, world);
    return;
  }
  if (!pressed || g.flingWait > 0) return;
  aim(player, yaw, pitch, eye, dir);
  const far = Math.min(v.flingRange, world.rayDistance(eye, dir, v.flingRange));
  end.copy(eye).addScaledVector(dir, far);
  if (!nearestTarget(state, eye, end, v.flingAim, hit, false) || hit.kind !== 'enemy') {
    state.events.push('seanMiss', 0, end.x, end.y, end.z);
    g.flingWait = v.flingMissWait;
    return;
  }
  const index = hit.index;
  const e = state.enemies[index];
  if (!liftable(e)) {
    const fl = Math.hypot(dir.x, dir.z) || 1;
    blow(state, index, v.flingHeavyDamage * instabFactor(g), dir.x / fl, dir.z / fl);
    g.flingWait = v.flingWait;
    return;
  }
  g.caught = index;
  g.caughtT = 0;
  g.caughtY = e.pos.y;
  // (A flier's held where it is; a walker's held as an execution holds one: nothing it's doing goes on.)
  setPhase(e, 'held');
  state.events.push('seanCatch', index, e.pos.x, e.pos.y, e.pos.z);
}

/** What's in flight, each tick. */
export function stepFlung(state: CombatState, dt: number) {
  const g = state.grav;
  const v = SEAN.v;
  for (const f of g.flung) {
    if (f.index < 0) continue;
    const e = state.enemies[f.index];
    if (!isLive(e)) {
      f.index = -1;
      continue;
    }
    const step = Math.min(f.left, v.flingSpeed * dt);
    const nx = e.pos.x + f.dx * step;
    const nz = e.pos.z + f.dz * step;
    const base = v.flingDamage * instabFactor(g);
    const r = radiusOf(e);
    // Into what you can't walk on: a wall, lava.
    if (!freeAt(state.nav.small, nx + f.dx * r, nz + f.dz * r)) {
      state.events.push('seanSlamInto', 0, e.pos.x, e.pos.y + 0.8, e.pos.z);
      f.index = -1;
      e.splat = v.flingSpeed;
      e.wall.set(e.pos.x + f.dx * r, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z + f.dz * r);
      if (!blow(state, state.enemies.indexOf(e), base * v.flingBonus, f.dx, f.dz)) setDown(state, e);
      continue;
    }
    // Into another.
    let other = -1;
    for (let i = 0; i < state.enemies.length && other < 0; i++) {
      const o = state.enemies[i];
      if (o === e || !isLive(o) || Math.abs(o.pos.y - e.pos.y) > LEVEL) continue;
      if (Math.hypot(o.pos.x - nx, o.pos.z - nz) <= r + radiusOf(o) + TOUCH) other = i;
    }
    if (other >= 0) {
      const self = state.enemies.indexOf(e);
      state.events.push('seanSlamInto', 0, e.pos.x, e.pos.y + 0.8, e.pos.z);
      f.index = -1;
      blow(state, other, base * v.flingBonus, f.dx, f.dz);
      if (!blow(state, self, base * v.flingBonus, -f.dx, -f.dz)) setDown(state, e);
      continue;
    }
    e.pos.x = nx;
    e.pos.z = nz;
    f.left -= step;
    const k = 1 - f.left / Math.max(0.01, f.total);
    e.pos.y = flies(e.kind) ? f.from : f.from + (v.flingLift * (1 - k) + ARC * Math.sin(k * Math.PI)) * (e.phase === 'held' ? 1 : 0);
    if (f.left <= 1e-4) {
      f.index = -1;
      if (!blow(state, state.enemies.indexOf(e), base, f.dx, f.dz)) setDown(state, e);
    }
  }
}
