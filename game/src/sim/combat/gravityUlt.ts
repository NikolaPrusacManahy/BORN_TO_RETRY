// Update 0.3.83 — Gravity Sean's ultimates, on Q (enemy_bibles/Born to Retry — Gravity Sean.docx): "both use one shared meter, so choosing your stance before you fire is part of the decision".
// Black Hole, normal mode, for crowds: "Sean floats, gathers energy in both palms and unleashes a black hole that pulls in every enemy except mini-bosses, deals damage over 4 s, then explodes and
// sends them flying"; "bosses aren't pulled in, only slowed". An open decision, the bible's suggestion taken: vulnerable through the first second, then invulnerable while it runs.
// Meteor, Unstable mode, for bosses: "aim at the sky, freeze everyone in place and call a meteor down onto the room"; "one huge hit on a target zone"; "bosses freeze briefly and take full
// damage". The world holds still for it, as for the Demon's Last Verdict; only your aim's your own, and the zone follows it till the meteor's on its way. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { pushOutOfWalls } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import type { Enemy } from '../enemies/enemy';
import { isLive, radiusOf, setPhase } from '../enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { dropCaught } from './gravityFling';
import { dropPiece } from './gravityGrab';
import { staggers } from './presence';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

/** How close a pulled body gets to the hole's middle (m, past its own size); how often its damage ticks (s). */
const CORE = 0.5;
const TICK = 0.25;
/** A pulled body hangs this far under the hole's middle (m). */
const HANG = 0.6;
const DOWN = new Vector3(0, -1, 0);
const AWAY_FROM_WALL = 1.2;

const eye = new Vector3();
const dir = new Vector3();
const from = new Vector3();
const hit = emptyTargetHit();

/** The floor under (x, z), from no lower than `y`. */
function floorUnder(world: CollisionWorld, x: number, y: number, z: number): number {
  from.set(x, y, z);
  const down = world.rayDistance(from, DOWN, 60);
  return Number.isFinite(down) ? y - down : 0;
}

/** What Black Hole drags in. */
export function pullable(e: Enemy): boolean {
  const s = ENEMY_STATS[e.kind]();
  return !s.boss && !MINI_BOSSES.includes(e.kind) && e.perch <= 0 && e.phase !== 'rebuild' && e.phase !== 'intro';
}

/** Q, if the meter's full: by your stance. */
export function tryUltimate(state: CombatState, player: PlayerState, pressed: boolean, yaw: number, pitch: number, world: CollisionWorld): boolean {
  const g = state.grav;
  if (!pressed || g.ult < 1 || g.hole || g.meteor) return false;
  dropPiece(state);
  dropCaught(state);
  g.ult = 0;
  player.slamming = false;
  player.dashTime = 0;
  if (g.unstable) {
    g.meteor = { t: 0, x: player.pos.x, y: player.pos.y, z: player.pos.z, falling: false };
    aimZone(state, player, yaw, pitch, world);
    state.events.push('seanMeteorCall', 0, player.pos.x, player.pos.y, player.pos.z);
  } else {
    g.hole = { charging: true, t: 0, tick: 0, x: 0, y: 0, z: 0, floor: 0, pulled: [] };
    player.floatY = player.pos.y + SEAN.v.holeFloat;
    state.events.push('seanHoleCharge', 0, player.pos.x, player.pos.y, player.pos.z);
  }
  return true;
}

/** The charge is done: it opens where you're looking, off the walls, over the floor. */
function openHole(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const h = state.grav.hole;
  const v = SEAN.v;
  if (!h) return;
  aim(player, yaw, pitch, eye, dir);
  const d = Math.min(v.holeRange, world.rayDistance(eye, dir, v.holeRange));
  const out = Math.max(1, Number.isFinite(d) ? d - AWAY_FROM_WALL : v.holeRange);
  const x = eye.x + dir.x * out;
  const z = eye.z + dir.z * out;
  h.charging = false;
  h.t = 0;
  h.x = x;
  h.z = z;
  h.floor = floorUnder(world, x, player.pos.y + 0.5, z);
  h.y = h.floor + v.holeHeight;
  state.events.push('seanHoleOpen', 0, h.x, h.y, h.z);
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
  const amount = v.holeDps * TICK;
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
function burst(state: CombatState, player: PlayerState) {
  const g = state.grav;
  const h = g.hole;
  const v = SEAN.v;
  if (!h) return;
  state.events.push('seanHoleBurst', 0, h.x, h.y, h.z);
  gravBlast(state, h.x, h.floor, h.z, v.holeBlast, v.holeBlastDamage, v.holeBlastKnock);
  for (const i of h.pulled) {
    const e = state.enemies[i];
    if (isLive(e) && e.phase === 'held') setPhase(e, staggers(ENEMY_STATS[e.kind]()) ? 'flinch' : 'chase');
  }
  g.hole = null;
  player.floatY = -1;
}

/** Black Hole, each tick. */
export function stepHole(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const h = state.grav.hole;
  if (!h) return;
  const v = SEAN.v;
  // (Dead in its first second, the one you can be hurt in.)
  if (player.dead) {
    state.grav.hole = null;
    player.floatY = -1;
    return;
  }
  h.t += dt;
  if (h.charging) {
    if (h.t >= v.holeCharge) openHole(state, player, yaw, pitch, world);
    return;
  }
  player.invuln = Math.max(player.invuln, v.holeSafeAfter);
  state.enemies.forEach((e, i) => {
    if (isLive(e)) drag(state, i, e, dt);
  });
  h.tick += dt;
  if (h.tick >= TICK) {
    h.tick -= TICK;
    drain(state);
  }
  if (h.t >= v.holeTime) burst(state, player);
}

/** After the enemies have moved: bosses in its reach lose some of the ground they made. They aren't pulled, only slowed. */
export function slowBosses(state: CombatState) {
  const h = state.grav.hole;
  if (!h || h.charging) return;
  const v = SEAN.v;
  for (const e of state.enemies) {
    if (!isLive(e) || !ENEMY_STATS[e.kind]().boss || Math.hypot(e.pos.x - h.x, e.pos.z - h.z) > v.holeReach) continue;
    e.pos.x -= (e.pos.x - e.prev.x) * v.holeBossSlow;
    e.pos.z -= (e.pos.z - e.prev.z) * v.holeBossSlow;
  }
}

/** Where you're looking, on the floor: the meteor's zone. */
function aimZone(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const m = state.grav.meteor;
  const v = SEAN.v;
  if (!m) return;
  aim(player, yaw, pitch, eye, dir);
  const d = Math.min(v.meteorRange, world.rayDistance(eye, dir, v.meteorRange));
  const out = Number.isFinite(d) ? d : v.meteorRange;
  m.x = eye.x + dir.x * out;
  m.z = eye.z + dir.z * out;
  m.y = floorUnder(world, m.x, player.pos.y + 0.5, m.z);
}

/** It lands: one huge hit on the zone. The world goes on from here. */
function strike(state: CombatState) {
  const g = state.grav;
  const m = g.meteor;
  const v = SEAN.v;
  if (!m) return;
  // (The Swarm's eye, past its worms: it's more than a hit on them. As with Last Verdict.)
  for (const e of state.enemies) {
    if (!isLive(e) || Math.hypot(e.pos.x - m.x, e.pos.z - m.z) > v.meteorRadius + radiusOf(e)) continue;
    if (e.swarm) e.swarm.pierce = true;
    // Bosses freeze briefly.
    if (ENEMY_STATS[e.kind]().boss) e.frozen = Math.max(e.frozen, v.meteorBossFreeze);
  }
  state.events.push('seanMeteorHit', v.meteorRadius, m.x, m.y, m.z);
  gravBlast(state, m.x, m.y, m.z, v.meteorRadius, v.meteorDamage, v.meteorKnock, true);
  g.meteor = null;
}

/** Meteor, each tick: nothing else in the world moves. */
export function stepMeteor(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const m = state.grav.meteor;
  if (!m) return;
  const v = SEAN.v;
  m.t += dt;
  if (m.t < v.meteorAim) {
    aimZone(state, player, yaw, pitch, world);
    return;
  }
  if (!m.falling) {
    m.falling = true;
    state.events.push('seanMeteorFall', 0, m.x, m.y, m.z);
  }
  if (m.t >= v.meteorAim + v.meteorFall) strike(state);
}

/** How drained of colour the screen is while the world holds still (0 … 1): the view's. */
export function meteorShade(state: CombatState): number {
  const m = state.grav.meteor;
  return m ? Math.min(1, m.t / 0.15) * SEAN.v.meteorGrey : 0;
}
