// Update 0.3.22 — floor 7's Axe Thrower (the More-enemies pack's Viking woman, small axes; MD/FLOOR7_WARBAND_PLAN.md).
// She keeps Axe Thrower keeps off from you, within her range, and with her turn and a clear line draws her arm back
// (Axe Thrower wind-up) and throws two axes at once, spinning flat: one at where you are, one at where you're going (Thrown
// axe lead): stand still and the first finds you, run straight and the second does, change your way and both miss (a
// punch sends one back: combat/parry.ts). Come within Roll near and she rolls away to a side (random: Roll every between);
// cornered meanwhile, she shoves you. On a perch she stays up there and throws. A hit flinches her out of a throw. Pure.
import { Vector3 } from 'three';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { fireOrb } from '../combat/orbs';
import type { PlayerState } from '../player/state';
import { BODY } from '../player/body';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const SHOVE: Brawl = {
  reach: () => 2,
  windup: () => 0.35,
  damage: () => FOES_NORSE.v.throwerShove,
  turn: 9,
  windupTurn: 5,
  arc: 80,
  recover: 0.5,
  shove: 10,
  windupEvent: 'throwerShove',
  strikeEvent: 'throwerShove',
};
/** Her moves (`move`): her arm back for a throw, rolling away. */
export const THROWING = 1;
const ROLLING = 2;
/** Her axes leave her hand this high (m), a little to her right; the second goes at least this far from the first
 *  (m: standing still, it goes to your side); her roll takes this long (s). */
const HAND = 1.5;
const SPREAD = 1.4;
export const ROLL_TIME = 0.75;
/** Closer than this (m) she shoves rather than rolls if her roll isn't ready. */
const CORNERED = 2.4;

const way = new Vector3();
const from = new Vector3();
const dir = new Vector3();

export function updateAxeThrower(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  const s = ENEMY_STATS.axeThrower();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === THROWING) {
    e.facing = turn(e.facing, toward, 6 * dt);
    if (e.t >= v.throwerWindup) throwAxes(e, index, player, w, dist);
    return;
  }
  if (e.phase === 'dive' && e.move === ROLLING) {
    walk(e, e.aim.x, e.aim.z, (v.rollFar / ROLL_TIME) * dt, w.nav.small);
    if (e.t >= ROLL_TIME) {
      e.move = 0;
      setPhase(e, 'recover');
    }
    return;
  }
  const perched = e.perch > 0;
  if (e.phase !== 'chase' || player.dead) {
    brawl(e, index, player, w, dt, SHOVE, true);
    return;
  }
  // Too close: away in a roll, or a shove.
  if (dist < v.rollNear && !perched) {
    if (e.blink <= 0) return roll(e, index, player, w);
    if (dist < CORNERED) return brawl(e, index, player, w, dt, SHOVE, true);
  }
  if (e.cooldown <= 0 && dist <= v.throwerFar && armed(e) && inLine(e, player, w.nav.small, 3)) {
    e.move = THROWING;
    setPhase(e, 'windup');
    w.events.push('throwerWindup', index, e.pos.x, e.pos.y + HAND, e.pos.z);
    return;
  }
  e.facing = turn(e.facing, toward, 6 * dt);
  if (perched) return;
  // Her distance: back off if you're near, come on if she's far or can't see you, else she holds there.
  if (dist < v.throwerNear && dist > 1e-3) walk(e, (e.pos.x - player.pos.x) / dist, (e.pos.z - player.pos.z) / dist, s.speed * dt, w.nav.small);
  else if ((dist > v.throwerFar * 0.85 || !inLine(e, player, w.nav.small, 3)) && chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
}

/** Two axes: at you, and at where your run takes you while they fly (to your side if you stand still). */
function throwAxes(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  const v = FOES_NORSE.v;
  from.set(e.pos.x + Math.cos(e.facing) * 0.35, e.pos.y + HAND, e.pos.z - Math.sin(e.facing) * 0.35);
  const chest = player.pos.y + BODY.height * 0.55;
  dir.set(player.pos.x - from.x, chest - from.y, player.pos.z - from.z).normalize();
  fireOrb(w.orbs, from, dir, v.axeSpeed, v.axeDamage, 'axeThrower', 'axe');
  const flight = dist / v.axeSpeed;
  let lx = player.vel.x * flight * v.axeLead;
  let lz = player.vel.z * flight * v.axeLead;
  if (Math.hypot(lx, lz) < SPREAD) {
    // (Standing still: to your side, square to her throw.)
    const side = e.strafe >= 0 ? 1 : -1;
    lx = -dir.z * SPREAD * side;
    lz = dir.x * SPREAD * side;
  }
  dir.set(player.pos.x + lx - from.x, chest - from.y, player.pos.z + lz - from.z).normalize();
  fireOrb(w.orbs, from, dir, v.axeSpeed, v.axeDamage, 'axeThrower', 'axe');
  w.events.push('throwerThrow', index, from.x, from.y, from.z);
  e.strafe = -e.strafe;
  e.move = 0;
  e.cooldown = v.throwerEvery;
  setPhase(e, 'recover');
}

/** Away from you and off to a side (either, at random), a roll's length. */
function roll(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const d = Math.max(1e-3, Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z));
  const ax = (e.pos.x - player.pos.x) / d;
  const az = (e.pos.z - player.pos.z) / d;
  const side = w.rng() < 0.5 ? -1 : 1;
  // (Half away, half aside.)
  const k = Math.SQRT1_2;
  e.aim.set((ax - az * side) * k, 0, (az + ax * side) * k);
  e.facing = Math.atan2(-e.aim.x, -e.aim.z);
  e.blink = FOES_NORSE.v.rollEvery;
  e.move = ROLLING;
  setPhase(e, 'dive');
  w.events.push('throwerRoll', index, e.pos.x, e.pos.y + 0.5, e.pos.z);
}
