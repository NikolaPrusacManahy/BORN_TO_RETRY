// Update 0.0.13 — the Leaper (design §9: jumps at you from range, punish it on landing; the designer: another enemy on
// the ground that causes problems). It runs at you round walls. Within Leaper range, with nothing tall in between (it
// leaps over crates and low cover) and its leap ready, it crouches for the warning (it glows, it hisses), watching
// you; then it leaps in an arc to where you stood as the warning ended. Landing on or beside you hurts and throws you;
// a jump at the right moment clears it. Then it's stuck a moment: your opening. Too close, it backs off to leap
// again. A hit flinches it, even in the air (it drops). Pure.
import { Vector3 } from 'three';
import { FOES } from '../../tuning/foes';
import { freeAt, wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir, freeSpotNear } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';

/** Turning speed (rad/s). */
const TURN = 9;
/** It looks this far behind it (m) before backing into a wall; backs off at this share of its speed. */
const LOOK = 1;
const BACK_SHARE = 0.7;
/** You must be about level with it (m): it doesn't leap at you up on a ledge, and a jump clears its landing. */
const LEVEL = 1;
/** After a leap that couldn't go (a wall came between), it tries again this soon (s). */
const RETRY = 0.5;

const way = new Vector3();

/** A clear leap at you from here: about level, nothing tall in between. */
function canLeap(l: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  return Math.abs(player.pos.y - l.pos.y) < LEVEL && !wallBetween(w.nav.air, l.pos.x, l.pos.z, player.pos.x, player.pos.z);
}

export function updateLeaper(l: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES.v;
  const dx = player.pos.x - l.pos.x;
  const dz = player.pos.z - l.pos.z;
  const dist = Math.max(1e-3, Math.hypot(dx, dz));
  const toward = yawTo(l, player.pos.x, player.pos.z);
  switch (l.phase) {
    case 'flinch':
      if (l.t >= v.leaperFlinch && l.pos.y <= 0) setPhase(l, 'chase');
      break;
    case 'recover':
      if (l.t >= v.leaperRecover) setPhase(l, 'chase');
      break;
    case 'chase': {
      const how = player.dead ? 'none' : chaseDir(w.flow.small, w.nav.small, l.pos, player.pos.x, player.pos.z, way);
      // It watches you, or the way it runs round a wall.
      l.facing = turn(l.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, TURN * dt);
      if (player.dead) break;
      const clear = canLeap(l, player, w);
      if (clear && l.cooldown <= 0 && dist <= v.leaperFar) {
        setPhase(l, 'windup');
        w.events.push('leaperWindup', index, l.pos.x, l.pos.y + v.leaperHeight * 0.5, l.pos.z);
        break;
      }
      if (clear && dist < v.leaperNear) {
        // Too close: back off for room to leap (unless a wall is behind it).
        const ax = -dx / dist;
        const az = -dz / dist;
        if (freeAt(w.nav.small, l.pos.x + ax * LOOK, l.pos.z + az * LOOK)) walk(l, ax, az, v.leaperSpeed * BACK_SHARE * dt, w.nav.small);
        break;
      }
      // In range and waiting for its leap, it holds; otherwise it closes in, round walls.
      if ((clear && dist <= v.leaperFar) || how === 'none') break;
      walk(l, way.x, way.z, v.leaperSpeed * dt, w.nav.small);
      break;
    }
    case 'windup':
      l.facing = turn(l.facing, toward, TURN * dt);
      if (l.t >= v.leaperWindup) leap(l, index, player, w);
      break;
    case 'leap': {
      const k = Math.min(1, l.t / v.leaperAir);
      l.pos.x = l.from.x + (l.aim.x - l.from.x) * k;
      l.pos.z = l.from.z + (l.aim.z - l.from.z) * k;
      l.pos.y = l.from.y + 4 * v.leaperArc * k * (1 - k);
      if (k >= 1) land(l, index, player, w);
      break;
    }
  }
}

/** Off it goes, for the free spot nearest where you stand now. */
function leap(l: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  l.aim.y = l.pos.y;
  if (!canLeap(l, player, w) || !freeSpotNear(w.nav.small, player.pos.x, player.pos.z, l.aim)) {
    setPhase(l, 'chase');
    l.cooldown = RETRY;
    return;
  }
  l.from.copy(l.pos);
  l.facing = yawTo(l, l.aim.x, l.aim.z);
  setPhase(l, 'leap');
  w.events.push('leaperLeap', index, l.pos.x, l.pos.y + 0.5, l.pos.z);
}

/** Down: anyone on the ground close by is hurt and thrown; then it's stuck a moment. */
function land(l: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES.v;
  l.pos.copy(l.aim);
  l.cooldown = v.leaperCooldown;
  setPhase(l, 'recover');
  w.events.push('leaperLand', index, l.pos.x, l.pos.y, l.pos.z);
  const dx = player.pos.x - l.pos.x;
  const dz = player.pos.z - l.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > v.leaperReach || player.pos.y - l.pos.y > LEVEL || !damagePlayer(player, v.leaperDamage, l.kind)) return;
  const nx = d > 1e-3 ? dx / d : -Math.sin(l.facing);
  const nz = d > 1e-3 ? dz / d : -Math.cos(l.facing);
  player.vel.x += nx * v.leaperShove;
  player.vel.z += nz * v.leaperShove;
  player.vel.y = Math.max(player.vel.y, 4);
  player.grounded = false;
}
