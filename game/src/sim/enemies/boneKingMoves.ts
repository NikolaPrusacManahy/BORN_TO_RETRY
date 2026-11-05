// Update 0.3.53 — the Bone King's moves, by the Boss Design Bible ("Go vertical"; boneKing.ts picks them and tells them).
// Rib Boomerang: two ribs out one side and back the other (a parried one staggers it). Grave Grasp: hands burst from the floor
// where the dust follows you (sim/combat/grab.ts holds you: mash out or be thrown). Arm Slam: its forearm flat on the floor,
// and then a ramp up to its skull (kingBody.ts). Its second life adds Shatter & Rebuild (its bones out along spokes and back,
// hurting both ways, its core left bare) and Rib Cage Trap (a ring of cracks round you; out before it closes, or break a bar).
// Its ultimate, Bone Colossus (ultimate.ts): it draws every bone in, grows and lowers its arm; climb it and break the vertebra
// behind its shoulders, or its club crosses the whole floor and only a ledge is clear. Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import { fireRib } from '../combat/orbs';
import { startGrab } from '../combat/grab';
import { canHurt, damagePlayer } from '../player/health';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import type { CombatState } from '../combat/state';
import { Enemy, EnemyWorld, isLive, setPhase, yawTo } from './enemy';
import { alongArm, handDownAt, kingTall, layArm, liftArm } from './kingBody';
import { doomTime, ENEMY_STATS } from './kinds';
import { openUltimate, stepUltimate } from './ultimate';

/** Which move (Enemy.move). */
export const RIBS = 0;
export const GRASP = 1;
export const SLAM = 2;
export const SHATTER = 3;
export const CAGE = 4;
export const COLOSSUS = 5;
/** What the screen says through its ultimate. */
export const COLOSSUS_CUE = 'CLIMB IT, BREAK ITS SPINE';
/** Its dust puffs this often (s); the floor shakes this often through its ultimate. */
const DUST = 0.2;
const RUMBLE = 0.5;
/** Above this (m), you're clear of its hands, of its arm as it lands. */
const GRASP_CLEAR = 1.4;
const SLAM_CLEAR = 2.5;
/** Its hands stay up this long, having missed (s). */
export const HANDS_UP = 1.1;
/** Its pieces (Enemy.shots while rebuilding): just fallen, lying, rising. */
const FALLEN = 0;
const LYING = 1;
const RISING = 2;
/** Its shattered bones: how high they fly (m), how thick. Over 2 m you've jumped them. */
export const BONE_Y = 1.1;
export const BONE_R = 0.75;
/** Shut in its cage, it holds you this far inside its ring (m). */
const CAGE_IN = 0.2;
/** Through its Colossus (Enemy.shots): growing, its window open, its club. */
const GROWING = 0;
const OPEN = 1;
const CLUB = 2;
/** Its club comes down this long after its window ends (s); its blast lasts this long (a dash's moment doesn't slip all of
 *  it); under this high (m), it catches you: a jump's top doesn't clear it, a ledge does. */
export const CLUB_DROP = 0.45;
const CLUB_FOR = 0.35;
export const CLUB_CLEAR = 2.2;
/** It shrinks back at this much a second. */
const SHRINK = 1;

const hand = new Vector3();
const spot = new Vector3();
const road = { along: 0, across: 0, wide: 0, y: 0 };

/** Its right hand, raised, where a rib leaves it. */
function handOf(k: Enemy, out: Vector3): Vector3 {
  const h = kingTall(k);
  const fx = -Math.sin(k.facing);
  const fz = -Math.cos(k.facing);
  return out.set(k.pos.x + fx * 0.14 * h - fz * 0.16 * h, k.pos.y + h * 0.56, k.pos.z + fz * 0.14 * h + fx * 0.16 * h);
}

/** The two ribs thrown at where you stand. */
export function throwRibs(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  handOf(k, hand);
  spot.set(player.pos.x, player.pos.y + BODY.height * 0.55, player.pos.z);
  const dx = spot.x - hand.x;
  const dz = spot.z - hand.z;
  const d = Math.hypot(dx, dz) || 1;
  // (However close you stand, it flies its whole curve.)
  if (d < v.ribMin) {
    spot.x = hand.x + (dx / d) * v.ribMin;
    spot.z = hand.z + (dz / d) * v.ribMin;
  }
  for (const side of [-1, 1]) fireRib(w.orbs, hand, spot, side, v.ribTime, v.ribWide, v.ribDamage, k.kind);
  w.events.push('kingRibs', index, hand.x, hand.y, hand.z);
}

/** A rib parried back at it: it staggers (not out of what holds it up already). */
export function ribStruck(k: Enemy, index: number, w: Pick<EnemyWorld, 'events'>) {
  if (k.phase !== 'chase' && k.phase !== 'windup' && k.phase !== 'recover') return;
  k.move = RIBS;
  liftArm(k);
  setPhase(k, 'stun');
  w.events.push('kingRibBack', index, k.pos.x, k.pos.y + kingTall(k) * 0.8, k.pos.z);
}

/** One tick of its dust following you. */
export function followDust(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, tell: number, dt: number) {
  const b = k.king!;
  if (k.t < tell - BONE_KING.v.graspLock) {
    b.spotX = player.pos.x;
    b.spotZ = player.pos.z;
  }
  k.blink -= dt;
  if (k.blink > 0) return;
  k.blink = DUST;
  w.events.push('kingDust', index, b.spotX, 0.1, b.spotZ);
}

/** Its hands burst from the floor. True if they've got you. */
export function burstHands(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const b = k.king!;
  b.hands = 0;
  w.events.push('kingHands', index, b.spotX, 0.1, b.spotZ);
  const near = Math.hypot(player.pos.x - b.spotX, player.pos.z - b.spotZ) <= BONE_KING.v.graspRadius;
  if (player.dead || !near || player.pos.y - k.pos.y > GRASP_CLEAR || !canHurt(player)) return false;
  setPhase(k, 'grab');
  startGrab(w, index, player);
  return true;
}

/** Its arm comes down flat on the floor: what's under it is hurt and thrown aside; then it's a ramp. */
export function landSlam(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  const h = kingTall(k);
  handDownAt(k, h, hand);
  w.events.push('kingSlam', index, hand.x, 0.1, hand.z);
  alongArm(k, h, player.pos.x, player.pos.z, road);
  const under = road.along >= -0.05 && road.along <= 1.05 && road.across <= road.wide + BODY.radius;
  if (under && player.pos.y <= road.y + SLAM_CLEAR && damagePlayer(player, v.slamDamage, k.kind)) {
    const fx = -Math.sin(k.facing);
    const fz = -Math.cos(k.facing);
    const sign = (player.pos.x - hand.x) * -fz + (player.pos.z - hand.z) * fx >= 0 ? 1 : -1;
    player.vel.x += -fz * sign * v.slamShove;
    player.vel.z += fx * sign * v.slamShove;
    player.vel.y = Math.max(player.vel.y, 6);
    player.grounded = false;
  }
  // (One still under it stands on it: it's solid now.)
  if (under && player.pos.y < road.y) player.pos.y = road.y + 0.05;
  layArm(k, false);
}

/** Its reach of bones, `t` s into its shatter: out, hanging, back (m). */
export function shatterOut(t: number): number {
  const v = BONE_KING.v;
  if (t <= 0) return 0;
  if (t < v.shatterOut) {
    const c = 1 - t / v.shatterOut;
    return v.shatterReach * (1 - c * c);
  }
  if (t < v.shatterOut + v.shatterHang) return v.shatterReach;
  const c = Math.min(1, (t - v.shatterOut - v.shatterHang) / v.shatterBack);
  return v.shatterReach * (1 - c * c);
}

/** How long a shatter lasts (s). */
export const shatterLong = () => BONE_KING.v.shatterOut + BONE_KING.v.shatterHang + BONE_KING.v.shatterBack;

/** It goes to pieces: its bones fly out along their spokes. */
export function startShatter(k: Enemy, index: number, w: EnemyWorld) {
  k.king!.spoke = k.facing + w.rng() * Math.PI;
  setPhase(k, 'leap');
  w.events.push('kingShatter', index, k.pos.x, k.pos.y + kingTall(k) * 0.5, k.pos.z);
}

/** One tick of its bones: out or back, each hurts what it meets. True once they're back. */
export function stepShatter(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = BONE_KING.v;
  if (k.t >= shatterLong()) {
    w.events.push('kingRoar', index, k.pos.x, k.pos.y + kingTall(k) * 0.85, k.pos.z);
    return true;
  }
  const r = shatterOut(k.t);
  const n = Math.round(v.shatterBones);
  const up = player.pos.y;
  if (player.dead || up > BONE_Y + BONE_R || up + BODY.height < BONE_Y - BONE_R) return false;
  for (let i = 0; i < n; i++) {
    const a = k.king!.spoke + (i / n) * Math.PI * 2;
    if (Math.hypot(player.pos.x - (k.pos.x - Math.sin(a) * r), player.pos.z - (k.pos.z - Math.cos(a) * r)) > BONE_R + BODY.radius) continue;
    if (damagePlayer(player, v.shatterDamage, k.kind)) w.events.push('kingBoneHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
    break;
  }
  return false;
}

/** Its ring of cracks round you. */
export function crackRing(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const c = k.king!.cage;
  c.on = true;
  c.closed = c.trapped = false;
  c.t = 0;
  c.x = player.pos.x;
  c.z = player.pos.z;
  w.events.push('kingCracks', index, c.x, 0.1, c.z);
}

/** Its ribs erupt and close. In the ring and not up over it, you're shut in. */
export function closeCage(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  const c = k.king!.cage;
  c.closed = true;
  c.t = 0;
  c.trapped = !player.dead && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < v.cageRadius && player.pos.y - k.pos.y < kingTall(k) * 0.5;
  w.events.push('kingCage', c.trapped ? 1 : 0, c.x, 0.1, c.z);
  if (!c.trapped) return;
  w.events.push('kingCageShut', index, c.x, 0.1, c.z);
}

/** One tick of its cage: it holds you in, till you break it or it crushes you; empty, it sinks. */
export function stepCage(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BONE_KING.v;
  const c = k.king!.cage;
  if (!c.on || !c.closed) return;
  c.t += dt;
  if (!c.trapped) {
    if (c.t >= HANDS_UP) c.on = false;
    return;
  }
  const dx = player.pos.x - c.x;
  const dz = player.pos.z - c.z;
  const d = Math.hypot(dx, dz) || 1;
  const most = v.cageRadius - CAGE_IN - BODY.radius;
  if (d > most) {
    player.pos.x = c.x + (dx / d) * most;
    player.pos.z = c.z + (dz / d) * most;
    const out = (player.vel.x * dx + player.vel.z * dz) / d;
    if (out > 0) {
      player.vel.x -= (dx / d) * out;
      player.vel.z -= (dz / d) * out;
    }
  }
  if (c.t < v.cageTime) return;
  c.on = c.trapped = false;
  damagePlayer(player, v.cageDamage, k.kind);
  w.events.push('kingCrush', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** You've swung, shut in its cage: a bar breaks, and you're out (combat/step.ts). */
export function breakCage(state: CombatState) {
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || !e.king?.cage.trapped) continue;
    const c = e.king.cage;
    c.on = c.trapped = false;
    state.events.push('kingCageBreak', i, c.x, 0.1, c.z);
  }
}

/** Its ultimate: every bone floats to it, it strides to the room's middle and grows. */
export function startColossus(k: Enemy, index: number, w: EnemyWorld) {
  k.move = COLOSSUS;
  k.shots = GROWING;
  k.blink = 0;
  liftArm(k);
  setPhase(k, 'blast');
  w.events.push('kingColossus', index, k.pos.x, k.pos.y + 1, k.pos.z);
}

/** One tick of its ultimate. True once it's done with its club (it has shrunk back). */
export function stepColossus(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = BONE_KING.v;
  const b = k.king!;
  k.blink -= dt;
  if (k.blink <= 0 && k.shots !== CLUB) {
    k.blink = RUMBLE;
    w.events.push('kingRumble', k.shots === OPEN ? 1 - k.ult.left / k.ult.window : k.t / v.colossusRise, k.pos.x, 0.1, k.pos.z);
  }
  if (k.shots === GROWING) {
    const left = Math.max(dt, v.colossusRise - k.t);
    const share = Math.min(1, dt / left);
    k.pos.x += (b.midX - k.pos.x) * share;
    k.pos.z += (b.midZ - k.pos.z) * share;
    b.grow += (v.colossusGrow - b.grow) * share;
    k.facing = yawTo(k, player.pos.x, player.pos.z);
    if (share < 1) return false;
    k.pos.x = b.midX;
    k.pos.z = b.midZ;
    b.grow = v.colossusGrow;
    k.shots = OPEN;
    k.t = 0;
    k.blink = 0;
    openUltimate(k.ult, COLOSSUS_CUE, v.colossusWindow, Math.round(v.colossusHits));
    layArm(k, true);
    w.events.push('kingOpen', index, k.pos.x, k.pos.y + kingTall(k) * 0.5, k.pos.z);
    return false;
  }
  if (k.shots === OPEN) {
    const s = stepUltimate(k.ult, dt);
    if (s === 'open') return false;
    liftArm(k);
    if (s === 'cancelled') {
      setPhase(k, 'stun');
      w.events.push('kingSpine', index, k.pos.x, k.pos.y + kingTall(k) * 0.5, k.pos.z);
      return false;
    }
    k.shots = CLUB;
    k.t = 0;
    k.struck = false;
    w.events.push('kingClubUp', index, k.pos.x, k.pos.y + kingTall(k), k.pos.z);
    return false;
  }
  if (k.t >= CLUB_DROP && !k.struck) {
    // (Once, as it lands.)
    if (k.t - dt < CLUB_DROP) w.events.push('kingClub', index, k.pos.x, 0.1, k.pos.z);
    if (k.t < CLUB_DROP + CLUB_FOR && !player.dead && player.pos.y - k.pos.y < CLUB_CLEAR && damagePlayer(player, v.colossusDamage, k.kind)) {
      k.struck = true;
      const dx = player.pos.x - k.pos.x;
      const dz = player.pos.z - k.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      player.vel.x += (dx / d) * v.colossusShove;
      player.vel.z += (dz / d) * v.colossusShove;
      player.vel.y = Math.max(player.vel.y, 8);
      player.grounded = false;
    }
  }
  if (k.t < CLUB_DROP + CLUB_FOR + v.kingRecover) return false;
  k.struck = false;
  return true;
}

/** Its size, back to its own: it shrinks once it isn't its Colossus. */
export function shrink(k: Enemy, dt: number) {
  const b = k.king!;
  if (b.grow > 1 && !(k.phase === 'blast' && k.shots !== CLUB)) b.grow = Math.max(1, b.grow - SHRINK * dt);
}

/** Brought down the first time: it bursts apart, lies in pieces (nothing hurts it), then rebuilds, wrong (its bar filling
 *  again) and stands in its second life. Returns true once it stands. */
export function stepRebuild(k: Enemy, index: number, w: EnemyWorld): boolean {
  const v = BONE_KING.v;
  const full = ENEMY_STATS[k.kind]().hp;
  if (k.shots === FALLEN) {
    k.shots = LYING;
    k.hp = 0;
    liftArm(k);
    w.events.push('kingCollapse', index, k.pos.x, k.pos.y + 1, k.pos.z);
  }
  if (k.shots === LYING && k.t >= v.kingDown) {
    k.shots = RISING;
    w.events.push('kingRise', index, k.pos.x, k.pos.y + 1, k.pos.z);
  }
  if (k.shots === RISING) k.hp = full * Math.min(1, (k.t - v.kingDown) / Math.max(0.1, v.kingRise));
  if (k.t < v.kingDown + v.kingRise) return false;
  k.stage = 1;
  k.hp = full;
  k.shots = 0;
  setPhase(k, 'chase');
  w.events.push('kingRoar', index, k.pos.x, k.pos.y + v.kingHeight * 0.85, k.pos.z);
  return true;
}

/** Its death: it crumbles where it stands (its death clip), and its bones burst at the end of the show. */
export function doomKing(k: Enemy, index: number, w: EnemyWorld) {
  // (Nothing of it left to stand on, nor shut in.)
  liftArm(k);
  if (k.king) {
    k.king.cage.on = k.king.cage.trapped = false;
    k.king.grow = 1;
  }
  if (k.struck || k.t < doomTime()) return;
  k.struck = true;
  w.events.push('bossBurst', index, k.pos.x, k.pos.y + ENEMY_STATS[k.kind]().height * 0.3, k.pos.z);
}
