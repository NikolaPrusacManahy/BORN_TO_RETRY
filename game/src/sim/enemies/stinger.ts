// Update 0.0.13 — the Stinger (the designer: a flying enemy). A giant armoured bee (Armabee) that flies about above
// you, out of reach. In range, with a clear line at you, it rears back for the warning (it glows red and buzzes), then
// dives in a straight line through where your chest was, and on past it: in its way, you're hit and knocked. A dive
// ends on the ground, a wall or a crate, and leaves it hanging low and dazed: your opening. Then it climbs again. A hit
// flinches it and cancels a dive. Pure.
import { Vector3 } from 'three';
import { FOES } from '../../tuning/foes';
import type { CollisionWorld } from '../collisionWorld';
import { segmentDistance } from '../combat/geometry';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';
import { RADIUS } from './kinds';

/** It dives this far past your chest (m), never lower than this over the floor (m, its middle). */
const OVERSHOOT = 2.5;
const LOWEST = 0.7;
/** Rearing back in the warning: away from you and up (m/s). */
const REAR_BACK = 1.2;
const REAR_UP = 0.6;
/** Dazed, it hangs this low (m, under it). */
const DAZED_ALT = 0.5;
/** A dive that couldn't go (no clear line) is tried again this soon (s). */
const RETRY = 0.6;

const mid = new Vector3();
const next = new Vector3();
const dir = new Vector3();
const a = new Vector3();
const b = new Vector3();

export function updateStinger(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES.v;
  const dist = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= v.stingerFlinch) setPhase(s, 'chase');
      break;
    case 'recover':
      keepHeight(s, DAZED_ALT, dt);
      if (s.t >= v.stingerRecover) setPhase(s, 'chase');
      break;
    case 'chase': {
      keepHeight(s, v.stingerAlt, dt);
      if (player.dead) break;
      const sees = seesInAir(s, player, world);
      if (sees && dist <= v.stingerRange && s.cooldown <= 0 && Math.abs(s.pos.y - v.stingerAlt) < 0.6) {
        setPhase(s, 'windup');
        w.events.push('stingerWindup', index, s.pos.x, s.pos.y + v.stingerHeight / 2, s.pos.z);
        break;
      }
      if (!sees || dist > v.stingerRange * 0.8) flyCloser(s, player, w, v.stingerSpeed, toward, dt);
      else circle(s, player, w, v.stingerSpeed, 0, toward, dt);
      break;
    }
    case 'windup': {
      s.facing = turn(s.facing, toward, 10 * dt);
      const len = Math.max(dist, 1e-3);
      s.pos.x -= ((player.pos.x - s.pos.x) / len) * REAR_BACK * dt;
      s.pos.z -= ((player.pos.z - s.pos.z) / len) * REAR_BACK * dt;
      s.pos.y += REAR_UP * dt;
      if (s.t >= v.stingerWindup) startDive(s, index, player, w, world);
      break;
    }
    case 'dive':
      dive(s, player, dt, world);
      break;
  }
}

/** Locks on to your chest and goes, if the way there is clear. */
function startDive(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, world: CollisionWorld) {
  if (!seesInAir(s, player, world)) {
    setPhase(s, 'chase');
    s.cooldown = RETRY;
    return;
  }
  middle(s, s.from);
  s.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
  dir.subVectors(s.aim, s.from).normalize();
  s.aim.addScaledVector(dir, OVERSHOOT);
  // Not into the floor: the dive ends where its line comes down to the lowest it goes.
  if (s.aim.y < LOWEST && dir.y < -1e-3) s.aim.addScaledVector(dir, (LOWEST - s.aim.y) / dir.y);
  s.facing = yawTo(s, s.aim.x, s.aim.z);
  s.struck = false;
  setPhase(s, 'dive');
  w.events.push('stingerDive', index, s.from.x, s.from.y, s.from.z);
}

/** Along the dive: through you (once), until its end or something solid. */
function dive(s: Enemy, player: PlayerState, dt: number, world: CollisionWorld) {
  const v = FOES.v;
  const h = v.stingerHeight / 2;
  middle(s, mid);
  dir.subVectors(s.aim, mid);
  const left = dir.length();
  const step = Math.min(left, v.stingerDive * dt);
  if (left > 1e-4) dir.divideScalar(left);
  const wall = world.rayDistance(mid, dir, step + RADIUS.stinger);
  const go = Math.min(step, Math.max(0, wall - RADIUS.stinger));
  next.copy(mid).addScaledVector(dir, go);
  if (!s.struck) {
    a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
    b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
    if (segmentDistance(mid, next, a, b) <= RADIUS.stinger + BODY.radius) {
      s.struck = true;
      if (damagePlayer(player, v.stingerDamage)) {
        player.vel.x += dir.x * v.stingerShove;
        player.vel.z += dir.z * v.stingerShove;
        player.vel.y = Math.max(player.vel.y, 3);
        player.grounded = false;
      }
    }
  }
  s.pos.set(next.x, next.y - h, next.z);
  // The end of the dive, or bumped into something: dazed.
  if (go < step - 1e-4 || left - go <= 1e-3) {
    s.cooldown = v.stingerCooldown;
    setPhase(s, 'recover');
  }
}
