// Update 0.3.16 — the Big Shark's moves, one by one (bigShark.ts picks them): its lunge, its snap, its swallow and its
// tail, and its feint (Update 0.3.16, the designer: "unpredictable moves"); and the arrow you answer its jaws with (the designer: "press move left and move right to escape the jaw"): while
// the arrow shows, press that way and you're thrown clear (its bite can't land); press the other way and you can't
// escape this one. Pure.
import { Vector3 } from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { CollisionWorld } from '../collisionWorld';
import { startJaws } from '../combat/jaws';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeAt } from '../../world/navGrid';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { aimDart, chest, dart, fishMiddle, holdDepth, swimTo } from './fishSwim';
import { ENEMY_STATS } from './kinds';

/** Its moves (`move`). */
export const LUNGE = 1;
export const SNAP = 2;
export const SWALLOW = 3;
export const TAIL = 4;
export const ROAR = 5;
export const FEINT = 6;
/** A lunge or swallow goes this far past you (m); it charges to swallow from this far off (m); a snap's pass goes this
 *  far beside you (m), and it gives up the pass after this long (s); a bite shoves you this hard (m/s). */
const PAST = 6;
const BACK_OFF = 12;
const PASS = 2.5;
const PASS_FOR = 2.6;
const SHOVE = 9;
/** A feint lines up this long (s). */
export const FEINT_WARN = 0.3;
/** Open water: nothing solid this near (m; its body is long); its circle moves out from the walls this much a step. */
const ROOM = 2.5;
const STEP = 1.5;

const at = new Vector3();
const mid = new Vector3();

/** Open water at (x, z): nothing solid within Room of it, on the fliers' grid. */
export function openAt(w: EnemyWorld, x: number, z: number): boolean {
  if (!freeAt(w.nav.air, x, z)) return false;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    if (!freeAt(w.nav.air, x + Math.cos(a) * ROOM, z + Math.sin(a) * ROOM)) return false;
  }
  return true;
}

/** Where it circles you, into `out`: round you, moved out from the walls step by step until its whole circle `ring` m
 *  round is open water (the designer: "it bumps on pillar, has difficulty to navigate"); never more than its circle off
 *  you, so it still sweeps past you. */
export function openMiddle(player: PlayerState, ring: number, w: EnemyWorld, out: Vector3): Vector3 {
  out.set(player.pos.x, 0, player.pos.z);
  for (let pass = 0; pass < 8; pass++) {
    let px = 0;
    let pz = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      if (!openAt(w, out.x + Math.cos(a) * ring, out.z + Math.sin(a) * ring)) {
        px -= Math.cos(a);
        pz -= Math.sin(a);
      }
    }
    const n = Math.hypot(px, pz);
    if (n < 1e-6) break;
    out.x += (px / n) * STEP;
    out.z += (pz / n) * STEP;
    const off = Math.hypot(out.x - player.pos.x, out.z - player.pos.z);
    if (off > ring) {
      out.x = player.pos.x + ((out.x - player.pos.x) / off) * ring;
      out.z = player.pos.z + ((out.z - player.pos.z) / off) * ring;
      break;
    }
  }
  return out;
}

/** Open water past you, the way it would come through you: a lunge wouldn't end in a wall (with a wall behind you, it
 *  snaps from the side instead: no standing in a corner while it stuns itself). */
export function roomPast(e: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  return openAt(w, player.pos.x + (dx / d) * PAST, player.pos.z + (dz / d) * PAST);
}

/** Frenzied, everything it warns of comes this much sooner. */
export const quick = (e: Enemy) => (e.stage > 0 ? BIG_SHARK.v.frenzyQuick : 1);

/** Which way the arrow points now (−1 left, 1 right; 0: none): its jaws are coming and you haven't answered. */
export function jawCue(e: Enemy): number {
  if (e.kind !== 'bigShark' || e.struck || e.deeds !== 0) return 0;
  const v = BIG_SHARK.v;
  if (e.move === LUNGE && ((e.phase === 'windup' && e.t >= v.lungeWarn * quick(e) - v.dodgeWindow) || e.phase === 'dive')) return e.blink;
  if (e.move === SNAP && e.phase === 'charge') return e.blink;
  return 0;
}

/** Your answer to the arrow, this tick: the right way, you're thrown clear; the wrong way, no escaping this bite. */
export function escape(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const side = jawCue(e);
  const press = player.strafePressed;
  if (side === 0 || press === 0 || player.dead) return;
  if (press !== side) {
    e.deeds = 1;
    w.events.push('bigSharkFumble', index, player.pos.x, player.pos.y + 1, player.pos.z);
    return;
  }
  e.struck = true;
  const k = BIG_SHARK.v.dodgeKick * side;
  player.vel.x += Math.cos(player.yaw) * k;
  player.vel.z += -Math.sin(player.yaw) * k;
  w.events.push('bigSharkEscape', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** A new bite coming: the arrow fresh (`side`). */
function arm(e: Enemy, move: number, side: number) {
  e.move = move;
  e.blink = side;
  e.struck = false;
  e.deeds = 0;
  setPhase(e, 'windup');
}

export function startLunge(e: Enemy, index: number, w: EnemyWorld) {
  arm(e, LUNGE, w.rng() < 0.5 ? -1 : 1);
  w.events.push('bigSharkLunge', index, e.pos.x, e.pos.y + ENEMY_STATS.bigShark().height, e.pos.z);
}

/** The snap: its pass beside you, on the side it's on now. */
export function startSnap(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  const s = w.rng() < 0.5 ? -1 : 1;
  e.aim.set(player.pos.x + (-dz / d) * PASS * s, chest(player), player.pos.z + (dx / d) * PASS * s);
  arm(e, SNAP, 0);
  w.events.push('bigSharkPass', index, e.pos.x, e.pos.y + ENEMY_STATS.bigShark().height, e.pos.z);
}

/** The swallow: it backs off from you the way it is from you, or (that way a wall) towards open water. */
export function startSwallow(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  let [ux, uz] = [dx / d, dz / d];
  if (!openAt(w, player.pos.x + ux * BACK_OFF, player.pos.z + uz * BACK_OFF)) {
    openMiddle(player, BACK_OFF, w, at);
    const m = Math.hypot(at.x - player.pos.x, at.z - player.pos.z);
    if (m > 1e-3) [ux, uz] = [(at.x - player.pos.x) / m, (at.z - player.pos.z) / m];
  }
  e.aim.set(player.pos.x + ux * BACK_OFF, chest(player), player.pos.z + uz * BACK_OFF);
  arm(e, SWALLOW, 0);
  w.events.push('bigSharkJaws', index, e.pos.x, e.pos.y + ENEMY_STATS.bigShark().height, e.pos.z);
}

/** A feint: it lines up an instant and rushes past you, close, without biting (no arrow): a lunge you can't count on. */
export function startFeint(e: Enemy, index: number, w: EnemyWorld) {
  arm(e, FEINT, 0);
  e.struck = true;
  w.events.push('bigSharkPass', index, e.pos.x, e.pos.y + ENEMY_STATS.bigShark().height, e.pos.z);
}

export function startTail(e: Enemy, index: number, w: EnemyWorld) {
  arm(e, TAIL, 0);
  w.events.push('bigSharkTailWindup', index, e.pos.x, e.pos.y + 1, e.pos.z);
}

/** Behind it (its back to you) and close: in its tail's reach. */
export function behind(e: Enemy, player: PlayerState): boolean {
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > BIG_SHARK.v.tailReach + ENEMY_STATS.bigShark().radius) return false;
  return (-Math.sin(e.facing) * dx - Math.cos(e.facing) * dz) / Math.max(d, 1e-3) < -0.4;
}

/** A move's warning, then the move: the lunge lines up, the snap swims past, the swallow backs off, the tail draws back. */
export function windup(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = BIG_SHARK.v;
  const q = quick(e);
  const s = ENEMY_STATS.bigShark();
  switch (e.move) {
    case LUNGE:
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 4 * dt);
      holdDepth(e, chest(player), s.speed, dt, w, world);
      if (e.t < v.lungeWarn * q) return;
      {
        // (Escaped already, it stays escaped: the dart's aim would forget.)
        const escaped = e.struck;
        aimDart(e, at.set(player.pos.x, chest(player), player.pos.z), PAST);
        e.struck = escaped;
      }
      setPhase(e, 'dive');
      return;
    case SNAP: {
      swimTo(e, e.aim.x, e.aim.y, e.aim.z, s.speed * 1.5, dt, w, world);
      fishMiddle(e, mid);
      const near = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.snapReach;
      if (!near && e.t < PASS_FOR) return;
      // Beside you: the arrow points away from it, as you look.
      const side = Math.cos(player.yaw) * (player.pos.x - e.pos.x) - Math.sin(player.yaw) * (player.pos.z - e.pos.z);
      e.blink = Math.abs(side) > 0.2 ? Math.sign(side) : w.rng() < 0.5 ? -1 : 1;
      setPhase(e, 'charge');
      w.events.push('bigSharkSnapWindup', index, mid.x, mid.y, mid.z);
      return;
    }
    case SWALLOW:
      swimTo(e, e.aim.x, e.aim.y, e.aim.z, s.speed, dt, w, world);
      if (e.t < v.swallowWarn * q * 0.6) return;
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 5 * dt);
      if (e.t < v.swallowWarn * q) return;
      aimDart(e, at.set(player.pos.x, chest(player), player.pos.z), PAST);
      setPhase(e, 'dive');
      w.events.push('bigSharkCharge', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      return;
    case FEINT: {
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 8 * dt);
      if (e.t < FEINT_WARN) return;
      // Past you, close beside you.
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      const d = Math.max(1e-3, Math.hypot(dx, dz));
      const k = w.rng() < 0.5 ? -1 : 1;
      aimDart(e, at.set(player.pos.x + (-dz / d) * PASS * k, chest(player), player.pos.z + (dx / d) * PASS * k), PAST);
      e.struck = true;
      setPhase(e, 'dive');
      return;
    }
    case TAIL:
      if (e.t < v.tailWarn) return;
      w.events.push('bigSharkTail', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      if (!player.dead && behind(e, player) && damagePlayer(player, v.tailDamage, 'bigShark')) shove(player, player.pos.x - e.pos.x, player.pos.z - e.pos.z);
      rest(e);
      return;
  }
}

/** Its lunge or its swallow, through where you were: bitten, or caught in its jaws; into a wall, its teeth stick. */
export function charge(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = BIG_SHARK.v;
  const swallow = e.move === SWALLOW;
  const how = dart(e, player, swallow ? v.swallowSpeed : v.lungeSpeed, dt, world, () => {
    if (player.dead || e.move === FEINT) return;
    if (swallow) return startJaws(w, index, player);
    w.events.push('bigSharkBite', index, player.pos.x, player.pos.y + 1, player.pos.z);
    if (damagePlayer(player, v.lungeDamage, 'bigShark')) shove(player, e.aim.x - e.from.x, e.aim.z - e.from.z);
  });
  if (e.phase === 'grab') return;
  if (how === 'wall') {
    e.move = 0;
    setPhase(e, 'stun');
    w.events.push('bigSharkStuck', index, e.pos.x, e.pos.y + ENEMY_STATS.bigShark().height / 2, e.pos.z);
    return;
  }
  if (how === 'end') rest(e);
}

/** Its snap: its head swung back, then sideways at you. */
export function snap(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BIG_SHARK.v;
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 2 * dt);
  if (e.t < v.snapWarn * quick(e)) return;
  fishMiddle(e, mid);
  w.events.push('bigSharkSnap', index, mid.x, mid.y, mid.z);
  const near = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.snapReach + ENEMY_STATS.bigShark().radius;
  if (!e.struck && !player.dead && near && damagePlayer(player, v.snapDamage, 'bigShark')) shove(player, player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  rest(e);
}

/** A move done: a breath, and one more since its last swallow (a feint isn't one). */
function rest(e: Enemy) {
  if (e.move === SWALLOW) e.shots = 0;
  else if (e.move !== FEINT) e.shots++;
  e.move = 0;
  setPhase(e, 'recover');
}

function shove(player: PlayerState, dx: number, dz: number) {
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  player.vel.x += (dx / d) * SHOVE;
  player.vel.z += (dz / d) * SHOVE;
}
