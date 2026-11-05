// Update 0.3.51 — The Swarm's eye's moves (the Boss Design Bible, Boss 2 "Pick your target"; swarm.ts picks them and tells):
//  - Gaze Beam: a thin laser that follows you slowly (outrun it in a circle, or put a pillar between you).
//  - Burrow Ambush: big worms up from under you, one after another (wormlings.ts).
//  - Acid Tears: globs that arc at you and leave puddles. Parry one back into the eye: it reels.
//  - Tethered Shield: big worms round it feed it a shield (nothing hurts it); kill them all and it drops, wide open.
//  - Split Pupil: three lasers turning like a fan, low (jump them, or turn with the gaps), its worms still at you.
//  - Abyssal Stare, its ultimate: it lifts up, its worms coiled round it, the room going dark; three hits on its pupil, which
//    shrinks, or one parried tear, before it's fully open and it reels; or a glare at everything it can see (a pillar between
//    you saves you).
// Enemy.aim: the gaze's far end; Enemy.near: the fan's turn; Enemy.shots: tears wept. Pure.
import { Vector3 } from 'three';
import { SWARM } from '../../tuning/swarm';
import { wallBetween } from '../../world/navGrid';
import { segmentDistance } from '../combat/geometry';
import { fireOrb } from '../combat/orbs';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, yawTo } from './enemy';
import { swarmEyeHeight } from './swarmHits';
import { openUltimate, stepUltimate } from './ultimate';
import { burrow, tether, tethersUp, wormlingsIn } from './wormlings';

export const GAZE = 0;
export const BURROW = 1;
export const TEARS = 2;
export const SHIELD = 3;
export const SPLIT = 4;
export const STARE = 5;
export const GLARE = 6;

/** What the screen says. */
export const STARE_CUE = 'HIT THE PUPIL';
/** The glare lasts this long (s): a dash's moment doesn't slip all of it. */
export const GLARE_FOR = 0.35;
/** The ground shakes and its heart beats this often through its stare (s). */
const HEART = 0.75;
const FANS = 3;

const eye = new Vector3();
const a = new Vector3();
const b = new Vector3();
const dir = new Vector3();

/** Its eye's middle, into `out`. */
export function eyeOf(e: Enemy, out: Vector3): Vector3 {
  return out.set(e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** How far a laser from (x, z) along (dx, dz) goes before a wall or a pillar (m), up to `max`. */
function reach(w: EnemyWorld, x: number, z: number, dx: number, dz: number, max: number): number {
  const g = w.nav.small;
  if (!wallBetween(g, x, z, x + dx * max, z + dz * max)) return max;
  let lo = 0;
  let hi = max;
  for (let k = 0; k < 10; k++) {
    const mid = (lo + hi) / 2;
    if (wallBetween(g, x, z, x + dx * mid, z + dz * mid)) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** The gaze's far end, along where it faces, at your chest's height. */
export function aimGaze(e: Enemy, player: PlayerState, w: EnemyWorld) {
  eyeOf(e, eye);
  const dx = -Math.sin(e.facing);
  const dz = -Math.cos(e.facing);
  const len = reach(w, e.pos.x, e.pos.z, dx, dz, SWARM.v.gazeRange);
  const flat = Math.max(1, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z));
  const y = eye.y + (player.pos.y + 1.1 - eye.y) * (len / flat);
  e.aim.set(e.pos.x + dx * len, Math.max(0, y), e.pos.z + dz * len);
}

/** One tick of its gaze: it burns what it crosses. True once it's over. */
export function stepGaze(e: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = SWARM.v;
  aimGaze(e, player, w);
  eyeOf(e, eye);
  a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
  b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
  if (!player.dead && segmentDistance(eye, e.aim, a, b) <= v.gazeWidth + BODY.radius) damagePlayer(player, v.gazeDamage, 'swarm');
  return e.t >= v.gazeTime;
}

/** Its burrowers on their way, one after another. */
export function startBurrow(player: PlayerState, w: EnemyWorld) {
  const v = SWARM.v;
  const list = wormlingsIn(w);
  for (let i = 0; i < 3; i++) burrow(list, i * v.burrowGap, player);
}

/** One glob, lobbed to land at your feet. */
function weep(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = SWARM.v;
  eyeOf(e, eye);
  const T = Math.max(0.2, v.tearFlight);
  const g = v.tearDrop;
  dir.set((player.pos.x - eye.x) / T, (player.pos.y + 0.9 - eye.y + 0.5 * g * T * T) / T, (player.pos.z - eye.z) / T);
  const speed = dir.length();
  if (!fireOrb(w.orbs, eye, dir.divideScalar(speed), speed, v.tearDamage, 'swarm', 'tear', 0, g)) return;
  w.events.push('swarmTear', index, eye.x, eye.y, eye.z);
}

/** One tick of its tears. True once they've all gone. */
export function stepTears(e: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = SWARM.v;
  const n = Math.round(v.tears) + (e.stage > 0 ? 1 : 0);
  if (!player.dead && e.shots < n && e.t >= e.shots * v.tearGap) {
    e.shots++;
    weep(e, index, player, w);
  }
  return e.shots >= n && e.t >= e.shots * v.tearGap;
}

/** Its tethers rise round it, and its shield's up. */
export function startShield(e: Enemy, index: number, w: EnemyWorld) {
  const v = SWARM.v;
  const list = wormlingsIn(w);
  const n = Math.round(v.tethers);
  const from = e.facing;
  for (let i = 0; i < n; i++) {
    const t = from + (i / n) * Math.PI * 2 + Math.PI / n;
    tether(list, e.pos.x - Math.sin(t) * v.tetherOut, e.pos.z - Math.cos(t) * v.tetherOut, w);
  }
  if (e.swarm) e.swarm.shield = tethersUp(list) > 0;
  w.events.push('swarmShield', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** The fan's lasers: where each points now (rad). */
export const fanYaw = (e: Enemy, i: number) => e.near + (i / FANS) * Math.PI * 2;
export const FAN_LASERS = FANS;

/** How far laser `i` of its fan reaches (m). */
export function fanReach(e: Enemy, i: number, w: EnemyWorld): number {
  const y = fanYaw(e, i);
  return reach(w, e.pos.x, e.pos.z, -Math.sin(y), -Math.cos(y), SWARM.v.gazeRange);
}

/** One tick of its fan: three low lasers turning. True once it's over. */
export function stepFan(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = SWARM.v;
  e.near += v.splitSpin * dt;
  if (player.dead || player.pos.y > v.splitClear) return e.t >= v.splitTime;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  for (let i = 0; i < FANS; i++) {
    const y = fanYaw(e, i);
    const along = dx * -Math.sin(y) + dz * -Math.cos(y);
    const off = Math.abs(dx * Math.cos(y) - dz * Math.sin(y));
    if (along > 0 && off <= v.gazeWidth + BODY.radius && along <= fanReach(e, i, w)) damagePlayer(player, v.splitDamage, 'swarm');
  }
  return e.t >= v.splitTime;
}

/** Its stare starts: up off the floor, its worms round it. */
export function startStare(e: Enemy, index: number, w: EnemyWorld) {
  const v = SWARM.v;
  e.move = STARE;
  e.shots = 0;
  setPhase(e, 'blast');
  openUltimate(e.ult, STARE_CUE, v.stareWindow, v.stareShots);
  w.events.push('swarmStare', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** How wide its pupil is through its stare (m, the eye's middle out): it shrinks as it opens. */
export function pupilNow(e: Enemy): number {
  const v = SWARM.v;
  const k = 1 - e.ult.left / Math.max(0.1, e.ult.window);
  return v.pupilBig + (v.pupilSmall - v.pupilBig) * k;
}

/** Does a blow landing at `at` hit its pupil, through its stare? */
export function onPupil(e: Enemy, at: Vector3 | null): boolean {
  if (!e.ult.on || !at) return false;
  eyeOf(e, eye);
  return eye.distanceTo(at) <= pupilNow(e) + SWARM.v.eye * 0.35;
}

/** One tick of its stare. Cancelled: it reels; failed: its glare. */
export function stepStare(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = SWARM.v;
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  e.blink -= dt;
  if (e.blink <= 0) {
    e.blink = HEART;
    w.events.push('swarmHeart', 1 - e.ult.left / e.ult.window, e.pos.x, 0.1, e.pos.z);
  }
  // It weeps all through it: what fists have to send back.
  if (!player.dead && e.t >= (e.shots + 1) * v.stareTears) {
    e.shots++;
    weep(e, index, player, w);
  }
  const s = stepUltimate(e.ult, dt);
  if (s === 'open') return;
  if (s === 'cancelled') {
    e.near = v.stareStun;
    setPhase(e, 'stun');
    w.events.push('swarmBroken', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
    return;
  }
  e.move = GLARE;
  e.shots = 0;
  setPhase(e, 'recover');
  w.events.push('swarmGlare', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** Its glare's moment: everything it can see. A pillar or a wall between you saves you. */
export function stepGlare(e: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = SWARM.v;
  if (e.shots > 0 || e.t > GLARE_FOR || player.dead) return;
  if (wallBetween(w.nav.small, e.pos.x, e.pos.z, player.pos.x, player.pos.z)) {
    e.shots = 1;
    return;
  }
  if (!damagePlayer(player, v.stareDamage, 'swarm')) return;
  e.shots = 1;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  player.vel.x += (dx / d) * v.stareShove;
  player.vel.z += (dz / d) * v.stareShove;
  player.vel.y = Math.max(player.vel.y, 7);
  player.grounded = false;
}

/** It drops, open to everything, for `long` s. */
export function dropEye(e: Enemy, index: number, long: number, w: EnemyWorld) {
  e.near = long;
  setPhase(e, 'stun');
  w.events.push('swarmDrop', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** A parried tear has struck it: it reels; through its stare, that's its cancel. */
export function tearStruck(e: Enemy, index: number, w: EnemyWorld) {
  if (e.ult.on) {
    e.ult.fill = e.ult.need;
    return;
  }
  if (e.phase === 'stun') return;
  dropEye(e, index, SWARM.v.tearStagger, w);
}

