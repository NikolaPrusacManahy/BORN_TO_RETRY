// Update 0.2.10 — floor 5's Squidle (a flier) and Spawnling (the Alien blob). The Squidle circles you (Squidle circles
// at); when it may (its turn: tokens.ts) and sees you it rears back (Squidle wind-up: your warning), then dives at your
// chest: if it reaches you, it hurts a little and sprays ink over your view (Ink). The Spawnling is small, fast and weak:
// it runs at you, rears, bites; many come. Pure.
// Update 0.3.10 — its melee blow can be parried (combat/meleeParry.ts).
import { Vector3 } from 'three';
import { FOES5 } from '../../tuning/foes5';
import type { CollisionWorld } from '../collisionWorld';
import { segmentDistance } from '../combat/geometry';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS, RADIUS } from './kinds';
import { closeIn } from './moves';
import { armed } from './tokens';

const ALT = 3;
const TURN = 7;
/** A dive goes this far past your chest (m), never lower than this (m); after it, a daze (s). */
const OVERSHOOT = 2;
const LOWEST = 0.7;
const DAZED = 0.8;
/** The Spawnling's bite: its arc in front (rad), its rest after (s). */
const ARC = 1.3;
const BITE_REST = 0.5;

const mid = new Vector3();
const dir = new Vector3();
const next = new Vector3();
const a = new Vector3();
const b = new Vector3();

export function updateSquidle(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase !== 'dive') keepHeight(e, ALT, dt);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (armed(e) && e.cooldown <= 0 && dist <= v.squidleRing * 1.5 && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('squidleWindup', index, e.pos.x, e.pos.y + v.squidleHeight * 0.5, e.pos.z);
        break;
      }
      if (dist > v.squidleRing * 1.3) flyCloser(e, player, w, v.squidleSpeed, toward, dt);
      else circle(e, player, w, v.squidleSpeed, v.squidleRing * 0.7, toward, dt);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.squidleWindup) break;
      middle(e, e.from);
      e.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
      dir.subVectors(e.aim, e.from).normalize();
      e.aim.addScaledVector(dir, OVERSHOOT);
      if (e.aim.y < LOWEST && dir.y < -1e-3) e.aim.addScaledVector(dir, (LOWEST - e.aim.y) / dir.y);
      e.struck = false;
      setPhase(e, 'dive');
      w.events.push('squidleDive', index, e.from.x, e.from.y, e.from.z);
      break;
    case 'dive':
      dive(e, index, player, w, dt, world);
      break;
    case 'recover':
      if (e.t >= DAZED) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Along its dive: through you (once: hurt, and ink in your eyes), to its end or something solid. */
function dive(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES5.v;
  middle(e, mid);
  dir.subVectors(e.aim, mid);
  const left = dir.length();
  const step = Math.min(left, v.squidleDive * dt);
  if (left > 1e-4) dir.divideScalar(left);
  const wall = world.rayDistance(mid, dir, step + RADIUS.squidle);
  const go = Math.min(step, Math.max(0, wall - RADIUS.squidle));
  next.copy(mid).addScaledVector(dir, go);
  if (!e.struck) {
    a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
    b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
    if (segmentDistance(mid, next, a, b) <= RADIUS.squidle + BODY.radius) {
      e.struck = true;
      if (damagePlayer(player, v.squidleDamage, e.kind)) {
        player.ink = v.inkTime;
        w.events.push('squidleInk', index, next.x, next.y, next.z);
      }
    }
  }
  e.pos.set(next.x, next.y - v.squidleHeight / 2, next.z);
  if (go < step - 1e-4 || left - go <= 1e-3) {
    e.cooldown = v.squidleGap;
    setPhase(e, 'recover');
  }
}

export function updateSpawnling(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (armed(e) && dist <= v.spawnReach * 0.9 && inLine(e, player, w.nav.small, 1)) {
        setPhase(e, 'windup');
        w.events.push('spawnWindup', index, e.pos.x, e.pos.y + v.spawnHeight * 0.6, e.pos.z);
        break;
      }
      closeIn(e, player, w, 'small', v.spawnSpeed, v.spawnReach * 0.8, TURN, dt);
      break;
    case 'windup': {
      e.facing = turn(e.facing, toward, TURN * 0.4 * dt);
      if (e.t < v.spawnWindup) break;
      setPhase(e, 'recover');
      w.events.push('spawnBite', index, e.pos.x, e.pos.y + v.spawnHeight * 0.5, e.pos.z);
      const off = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
      if (dist <= v.spawnReach && off <= ARC && Math.abs(player.pos.y - e.pos.y) < 1.5) meleeHit(player, w, e, index, v.spawnDamage);
      break;
    }
    case 'recover':
      if (e.t >= BITE_REST) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}
