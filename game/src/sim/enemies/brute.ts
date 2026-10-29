// Update 0.0.12 — the Brute (design §9: slow and heavy, a telegraphed ground slam). It walks at you, round walls.
// In reach it rears up for Brute wind-up (the ground round it glows in a ring as wide as the slam, it roars), then
// slams: on the ground inside the ring you take Brute slam damage and are thrown back; in the air (a jump at the
// right moment) you're safe. Then it stands winded for Brute recovery: your opening. Light hits don't stop it: only a
// hit of Brute stagger or more flinches it (and cancels the slam). It drops no weapon (the designer). Pure.
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { armed } from './tokens';

/** Above the ground by more than this when the slam lands, you're clear of it (m). */
export const SLAM_CLEAR = 0.5;
/** It turns this much slower while rearing up (so a dash round it gets behind it). */
const WINDUP_TURN = 0.5;

const way = new Vector3();

export function updateBrute(b: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = ENEMIES.v;
  const dx = player.pos.x - b.pos.x;
  const dz = player.pos.z - b.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(b, player.pos.x, player.pos.z);
  switch (b.phase) {
    case 'flinch':
      if (b.t >= v.bruteFlinch) setPhase(b, 'chase');
      break;
    case 'recover':
      if (b.t >= v.bruteRecover) setPhase(b, 'chase');
      break;
    case 'chase': {
      if (player.dead) break;
      const level = Math.abs(player.pos.y - b.pos.y) < v.bruteHeight * 0.6;
      if (armed(b) && dist <= v.bruteReach && level && !wallBetween(w.nav.large, b.pos.x, b.pos.z, player.pos.x, player.pos.z)) {
        setPhase(b, 'windup');
        w.events.push('bruteWindup', index, b.pos.x, b.pos.y, b.pos.z);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, b.pos, player.pos.x, player.pos.z, way);
      if (how === 'none') {
        b.facing = turn(b.facing, toward, v.bruteTurn * dt);
        break;
      }
      const step = how === 'straight' ? Math.min(v.bruteSpeed * dt, Math.max(0, dist - v.bruteReach * 0.8)) : v.bruteSpeed * dt;
      b.facing = turn(b.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), v.bruteTurn * dt);
      walk(b, way.x, way.z, step, w.nav.large);
      break;
    }
    case 'windup':
      b.facing = turn(b.facing, toward, v.bruteTurn * WINDUP_TURN * dt);
      if (b.t >= v.bruteWindup) {
        slam(b, index, player, dist, w);
        setPhase(b, 'recover');
      }
      break;
  }
}

/** The slam: on the ground in the ring (and not behind a wall), you're hurt and thrown back and up. */
function slam(b: Enemy, index: number, player: PlayerState, dist: number, w: EnemyWorld) {
  const v = ENEMIES.v;
  w.events.push('bruteSlam', index, b.pos.x, b.pos.y, b.pos.z);
  if (dist > v.bruteSlamRadius || player.pos.y - b.pos.y > SLAM_CLEAR || wallBetween(w.nav.large, b.pos.x, b.pos.z, player.pos.x, player.pos.z)) return;
  if (!damagePlayer(player, v.bruteSlamDamage, b.kind)) return;
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - b.pos.x) / len) * v.bruteShove;
  player.vel.z += ((player.pos.z - b.pos.z) / len) * v.bruteShove;
  player.vel.y = Math.max(player.vel.y, 6);
  player.grounded = false;
}
