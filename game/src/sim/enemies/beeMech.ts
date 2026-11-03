// Update 0.3.18 — floor 8's second mini boss, Barbara the Bee's mech (the designer: "Bee mech is able to glide in the
// air and shoot salvos of missiles and lands with a 1sec cooldown"; "turn into astronaut bee after mech dies"). It walks
// at you; then it crouches, jumps up on its jets and glides round you out of reach (Bee mech glide, Bee mech height),
// firing Salvos of missiles that curve after you (Missile homing: dash through or sidestep); it comes down near you
// (its landing hurts close by) and holds there Bee mech landing: 1 s, its cooldown, the time to hit it. Close to it on
// the ground, it kicks. Broken, Barbara climbs out (enemy.ts makes it the Bee astronaut) and fights on foot: quick, her
// blaster from range, her punches close in. Only a hard hit staggers either. Pure.
// Update 0.3.28 — the Flamingo's, the Fox's and the Frog's mechs and pilots move the same (each its own name: `e.kind`).
import { Vector3 } from 'three';
import { FOES_MOON_B } from '../../tuning/foesMoonB';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { arcTo, closeIn } from './moves';

const KICK: Brawl = {
  reach: () => 2.6,
  windup: () => 0.5,
  damage: () => 16,
  turn: 6,
  windupTurn: 3,
  arc: 120,
  recover: 0.6,
  shove: 12,
  windupEvent: 'gunnerWindup',
  strikeEvent: 'gunnerKick',
};
const PUNCH: Brawl = {
  reach: () => 1.8,
  windup: () => 0.28,
  damage: () => FOES_MOON_B.v.nautPunch,
  turn: 10,
  windupTurn: 6,
  arc: 100,
  recover: 0.35,
  shove: 6,
  windupEvent: 'flankerCrouch',
  strikeEvent: 'flankerPunch',
};
/** It jumps from this near (m); crouches this long (s); rises this long (s); glides round you this far off (m), this
 *  fast; comes down this long (s), this far from you (m); between its jumps (s); its missiles leave this high on it
 *  (m), fanned this wide (rad). */
const JUMP_FROM = 14;
const CROUCH = 0.5;
const RISE = 0.6;
const GLIDE_RING = 9;
const GLIDE_SPEED = 4;
const DROP = 0.55;
const LAND_OFF = 3.5;
const BETWEEN = 1.5;
const POD = 2.6;
const FAN = 1.1;
/** Barbara on foot: she shoots from this far (m), up to this (m), two bolts this far apart (s), every this long (s). */
const NAUT_NEAR = 5;
const NAUT_FAR = 15;
const NAUT_GAP = 0.2;
const NAUT_EVERY = 2.2;

const dir = new Vector3();
const from = new Vector3();

export function updateBeeMech(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON_B.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) return;
      if (e.cooldown <= 0 && dist <= JUMP_FROM) {
        setPhase(e, 'roar');
        w.events.push('beeMechJump', index, e.pos.x, e.pos.y + 1, e.pos.z);
        return;
      }
      if (dist < 3) return brawl(e, index, player, w, dt, KICK, true);
      closeIn(e, player, w, 'large', s.speed, 6, 4, dt);
      return;
    case 'roar':
      // Crouched, then up.
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
      if (e.t < CROUCH) return;
      e.from.copy(e.pos);
      e.shots = 0;
      setPhase(e, 'sky');
      w.events.push('beeMechUp', index, e.pos.x, e.pos.y, e.pos.z);
      return;
    case 'sky':
      return glide(e, index, player, w, dt);
    case 'leap': {
      // Down, near you.
      const k = Math.min(1, e.t / DROP);
      arcTo(e, k, 0);
      e.pos.y = e.from.y * (1 - k);
      if (k < 1) return;
      e.pos.y = 0;
      w.events.push('beeMechLand', index, e.pos.x, 0, e.pos.z);
      if (!player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.stompReach + s.radius && player.pos.y < 1.5) damagePlayer(player, v.stompDamage, e.kind);
      setPhase(e, 'stun');
      return;
    }
    case 'stun':
      // Its 1 s on the ground (the designer's cooldown): hits do more.
      if (e.t < v.landCool) return;
      e.cooldown = BETWEEN;
      setPhase(e, 'chase');
      return;
    default:
      brawl(e, index, player, w, dt, KICK, true);
  }
}

/** On its jets: up, round you, its salvos at even times; then down. */
function glide(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON_B.v;
  const up = Math.min(1, e.t / RISE);
  e.pos.y = e.from.y + v.glideHeight * up * (2 - up);
  // Round you, at its ring.
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  const pull = (GLIDE_RING - d) * 0.8;
  e.pos.x += ((-dz / d) * GLIDE_SPEED + (dx / d) * pull) * dt;
  e.pos.z += ((dx / d) * GLIDE_SPEED + (dz / d) * pull) * dt;
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
  const salvos = Math.round(v.salvos);
  if (e.shots < salvos && e.t >= (v.glideTime * (e.shots + 1)) / (salvos + 1)) {
    e.shots++;
    salvo(e, index, player, w);
  }
  if (e.t < v.glideTime) return;
  // Down near you (the way it is from you).
  e.from.copy(e.pos);
  e.aim.set(player.pos.x + (dx / d) * LAND_OFF, 0, player.pos.z + (dz / d) * LAND_OFF);
  setPhase(e, 'leap');
}

/** Its missiles, fanned out from its pods and up a little, each curving after you. */
function salvo(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES_MOON_B.v;
  const n = Math.round(v.salvoSize);
  from.set(e.pos.x, e.pos.y + POD, e.pos.z);
  const yaw = Math.atan2(player.pos.x - from.x, player.pos.z - from.z);
  for (let i = 0; i < n; i++) {
    const a = yaw + (n > 1 ? (i / (n - 1) - 0.5) * FAN * 2 : 0);
    dir.set(Math.sin(a), 0.35, Math.cos(a)).normalize();
    fireOrb(w.orbs, from, dir, v.missileSpeed, v.missileDamage, e.kind, 'missile', v.missileTurn);
  }
  w.events.push('beeMissiles', index, from.x, from.y, from.z);
}

/** Barbara on foot, out of her broken mech: her blaster from range, quick punches close in. */
export function updateBeeNaut(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const s = ENEMY_STATS[e.kind]();
  // (Just out: she climbs out, a moment.)
  if (e.shots === 1) {
    e.shots = 0;
    w.events.push('beeEject', index, e.pos.x, e.pos.y + 1, e.pos.z);
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'charge') return shoot(e, index, player, w);
  if (e.phase === 'chase' && !player.dead && e.cooldown <= 0 && dist >= NAUT_NEAR && dist <= NAUT_FAR && inLine(e, player, w.nav.small, 3)) {
    e.near = 0;
    setPhase(e, 'charge');
    return;
  }
  if (e.phase === 'chase' && dist > NAUT_NEAR) {
    closeIn(e, player, w, 'small', s.speed, 1.5, 10, dt);
    return;
  }
  brawl(e, index, player, w, dt, PUNCH, true);
}

/** Two quick bolts at your chest. */
function shoot(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  if (e.t < e.near * NAUT_GAP + 0.15) return;
  e.near++;
  from.set(e.pos.x, e.pos.y + 1.25, e.pos.z);
  dir.set(player.pos.x - from.x, player.pos.y + AIM_HEIGHT - from.y, player.pos.z - from.z).normalize();
  if (!player.dead && fireOrb(w.orbs, from, dir, 16, 9, e.kind, 'laser')) w.events.push('gunnerShot', index, from.x, from.y, from.z);
  if (e.near < 2) return;
  e.cooldown = NAUT_EVERY;
  setPhase(e, 'recover');
}
