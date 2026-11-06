// Update 0.3.84 — Gravity Sean's right click in Unstable mode, Black Hole (the designer: "rmb is now the black hole, just holding it in his palm and throw it, gathering enemies that are not mini
// bosses, 7 sec cooldown"). It was his normal mode's ultimate: floating, both palms, the meter. Now: right click held, it's in his palm; let go, it flies, and opens where it strikes. He's free meanwhile:
// he doesn't float, and nothing makes him untouchable. From his bible still: it pulls in every enemy but mini-bosses, hurts them over its time, then bursts and flings them; bosses aren't pulled, only slowed.
// Fling, which this replaced, is gone. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { pushOutOfWalls } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import type { Enemy } from '../enemies/enemy';
import { isLive, radiusOf, setPhase } from '../enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { instabFactor } from './gravityMeter';
import { staggers } from './presence';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How close a pulled body gets to the hole's middle (m, past its own size); how often its damage ticks (s). */
const CORE = 0.5;
const TICK = 0.25;
/** A pulled body hangs this far under the hole's middle (m). */
const HANG = 0.6;
/** The orb in flight: how big it is to hit with (m), and how far off a wall it opens (m). */
const ORB_R = 0.35;
const AWAY_FROM_WALL = 1.2;
/** Thrown from this far along your aim (m). */
const FROM_EYE = 0.8;
const DOWN = new Vector3(0, -1, 0);

const eye = new Vector3();
const dir = new Vector3();
const from = new Vector3();
const end = new Vector3();
const hit = emptyTargetHit();

/** The floor under (x, z), from no lower than `y`. */
export function floorUnder(world: CollisionWorld, x: number, y: number, z: number): number {
  from.set(x, y, z);
  const down = world.rayDistance(from, DOWN, 60);
  return Number.isFinite(down) ? y - down : 0;
}

/** What it drags in. */
export function pullable(e: Enemy): boolean {
  const s = ENEMY_STATS[e.kind]();
  return !s.boss && !MINI_BOSSES.includes(e.kind) && e.perch <= 0 && e.phase !== 'rebuild' && e.phase !== 'intro';
}

/** The orb in his palm goes out: he left Unstable mode, or Meteor took his hands. No wait, as it was never thrown. */
export function dropPalm(state: CombatState) {
  state.grav.palm = -1;
}

/** Let go: it flies along your aim. */
function throwHole(state: CombatState, player: PlayerState, yaw: number, pitch: number) {
  const g = state.grav;
  aim(player, yaw, pitch, eye, dir);
  g.palm = -1;
  g.holeWait = SEAN.v.holeWait;
  g.hole = { flying: true, t: 0, tick: 0, x: eye.x + dir.x * FROM_EYE, y: eye.y + dir.y * FROM_EYE, z: eye.z + dir.z * FROM_EYE, dx: dir.x, dy: dir.y, dz: dir.z, floor: 0, power: instabFactor(g), pulled: [] };
  state.events.push('seanHoleThrow', 0, g.hole.x, g.hole.y, g.hole.z);
}

/** Right click in Unstable mode, each tick: held, it's in his palm; let go, it's thrown. */
export function stepPalm(state: CombatState, player: PlayerState, pressed: boolean, heldDown: boolean, yaw: number, pitch: number, dt: number) {
  const g = state.grav;
  if (g.palm < 0) {
    if (!pressed || g.holeWait > 0 || g.hole) return;
    g.palm = 0;
    state.events.push('seanHoleCharge', 0, player.pos.x, player.pos.y, player.pos.z);
    return;
  }
  g.palm += dt;
  // (A tap: as soon as it's formed.)
  if (!heldDown && g.palm >= SEAN.v.palmMin) throwHole(state, player, yaw, pitch);
}

/** It strikes something, or has gone as far as it goes: it opens here, off the walls, over the floor. */
function openHole(state: CombatState, world: CollisionWorld, x: number, y: number, z: number) {
  const h = state.grav.hole;
  if (!h) return;
  const flat = Math.hypot(h.dx, h.dz);
  const back = flat > 1e-3 ? AWAY_FROM_WALL / flat : 0;
  h.flying = false;
  h.t = 0;
  h.x = x - h.dx * back;
  h.z = z - h.dz * back;
  h.floor = floorUnder(world, h.x, Math.max(y, 0) + 0.5, h.z);
  h.y = h.floor + SEAN.v.holeHeight;
  state.events.push('seanHoleOpen', 0, h.x, h.y, h.z);
}

/** In flight, each tick. */
function fly(state: CombatState, world: CollisionWorld, dt: number) {
  const h = state.grav.hole;
  const v = SEAN.v;
  if (!h) return;
  h.t += dt;
  const len = v.holeSpeed * dt;
  from.set(h.x, h.y, h.z);
  dir.set(h.dx, h.dy, h.dz);
  const wall = world.rayDistance(from, dir, len + ORB_R);
  end.copy(from).addScaledVector(dir, Math.min(len, wall));
  if (nearestTarget(state, from, end, ORB_R, hit, false)) return openHole(state, world, hit.point.x, hit.point.y, hit.point.z);
  if (wall <= len + ORB_R || h.t * v.holeSpeed >= v.holeRange) return openHole(state, world, end.x, end.y, end.z);
  h.x = end.x;
  h.y = end.y;
  h.z = end.z;
}

/** One tick of what it does to the body at slot `i`. */
function drag(state: CombatState, i: number, e: Enemy, dt: number) {
  const h = state.grav.hole;
  const v = SEAN.v;
  if (!h) return;
  const dx = e.pos.x - h.x;
  const dz = e.pos.z - h.z;
  const d = Math.hypot(dx, dz);
  if (d > v.holeReach) return;
  if (!pullable(e)) return;
  if (e.phase !== 'held') setPhase(e, 'held');
  if (!h.pulled.includes(i)) h.pulled.push(i);
  e.vel.set(0, 0, 0);
  if (d > 1e-3) {
    const nx = dx / d;
    const nz = dz / d;
    // Faster the nearer it's come; round as it goes in.
    const speed = v.holePull * (2 - d / v.holeReach);
    const inward = Math.min(speed * dt, Math.max(0, d - radiusOf(e) - CORE));
    e.pos.x += -nx * inward - nz * v.holeSwirl * dt;
    e.pos.z += -nz * inward + nx * v.holeSwirl * dt;
    pushOutOfWalls(state.nav.small, e.pos, radiusOf(e));
  }
  e.pos.y += (Math.max(h.floor, h.y - HANG) - e.pos.y) * (1 - Math.exp(-2.5 * dt));
}

/** Its damage: all it's got hold of, and anything else near its middle. */
function drain(state: CombatState) {
  const h = state.grav.hole;
  const v = SEAN.v;
  if (!h) return;
  const amount = v.holeDps * TICK * h.power;
  state.enemies.forEach((e, i) => {
    if (!isLive(e)) return;
    const near = Math.hypot(e.pos.x - h.x, e.pos.z - h.z) <= v.holeHurt;
    if (!near && !h.pulled.includes(i)) return;
    hit.kind = 'enemy';
    hit.index = i;
    hit.part = 0;
    hit.s = 0;
    hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);
    // (No dodging it, no stagger.)
    landHit(state, hit, amount, 0, 0, 0, 'seanHoleHit', amount, true);
  });
}

/** It ends: it bursts, flinging them, and it's over. */
function burst(state: CombatState) {
  const g = state.grav;
  const h = g.hole;
  const v = SEAN.v;
  if (!h) return;
  state.events.push('seanHoleBurst', 0, h.x, h.y, h.z);
  gravBlast(state, h.x, h.floor, h.z, v.holeBlast, v.holeBlastDamage * h.power, v.holeBlastKnock);
  for (const i of h.pulled) {
    const e = state.enemies[i];
    if (isLive(e) && e.phase === 'held') setPhase(e, staggers(ENEMY_STATS[e.kind]()) ? 'flinch' : 'chase');
  }
  g.hole = null;
}

/** Black Hole, thrown, each tick, in whichever stance he's in by now. */
export function stepHole(state: CombatState, world: CollisionWorld, dt: number) {
  const h = state.grav.hole;
  if (!h) return;
  if (h.flying) return fly(state, world, dt);
  const v = SEAN.v;
  h.t += dt;
  state.enemies.forEach((e, i) => {
    if (isLive(e)) drag(state, i, e, dt);
  });
  h.tick += dt;
  if (h.tick >= TICK) {
    h.tick -= TICK;
    drain(state);
  }
  if (h.t >= v.holeTime) burst(state);
}

/** After the enemies have moved: bosses in its reach lose some of the ground they made. They aren't pulled, only slowed. */
export function slowBosses(state: CombatState) {
  const h = state.grav.hole;
  if (!h || h.flying) return;
  const v = SEAN.v;
  for (const e of state.enemies) {
    if (!isLive(e) || !ENEMY_STATS[e.kind]().boss || Math.hypot(e.pos.x - h.x, e.pos.z - h.z) > v.holeReach) continue;
    e.pos.x -= (e.pos.x - e.prev.x) * v.holeBossSlow;
    e.pos.z -= (e.pos.z - e.prev.z) * v.holeBossSlow;
  }
}
