// Update 0.3.15 — floor 6's Cave Bats (the unused Bat). They come in a swarm (Bat swarm: wavePlan.ts) and wheel round
// over you, each on its own side and height; one at a time (never two together) one drops at you: a quick shriek, then a
// dive through your head, biting as it passes (Bat bite), and back up. Fragile: a punch kills one. A hit flinches it
// and stops a dive. Pure.
import { Vector3 } from 'three';
import { FOES_COVE } from '../../tuning/foesCove';
import type { CollisionWorld } from '../collisionWorld';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';

/** They wheel this far off you (m) at this height (m, give or take); a dive's shriek (s); it bites this near (m); a dive
 *  goes this far past you (m), no lower than this (m, its feet), for this long at most (s). */
const RING = 4.5;
const ALT = 3.4;
const SHRIEK = 0.3;
const BITE = 1.1;
const OVERSHOOT = 2;
const LOWEST = 0.3;
const DIVE_FOR = 1.5;

const mid = new Vector3();
const dir = new Vector3();

export function updateBat(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES_COVE.v;
  const toward = yawTo(e, player.pos.x, player.pos.z);
  // (Each its own place round you from the start; back to wheeling once its rest is over.)
  if (e.deeds === 0) {
    e.deeds = 1;
    e.near = index * 2.399;
  }
  if (e.phase === 'recover' && e.cooldown <= 0) setPhase(e, 'chase');
  switch (e.phase) {
    case 'flinch':
      if (e.t >= ENEMY_STATS.bat().flinch) setPhase(e, 'chase');
      break;
    case 'recover':
    case 'chase': {
      // Wheel round you: its own angle (`near`) going round, its own height.
      e.near += (v.batSpeed / RING) * dt * e.strafe;
      const alt = ALT + Math.sin(index * 1.7) * 0.8;
      keepHeight(e, alt, dt);
      const tx = player.pos.x + Math.sin(e.near) * RING;
      const tz = player.pos.z + Math.cos(e.near) * RING;
      const dx = tx - e.pos.x;
      const dz = tz - e.pos.z;
      const d = Math.hypot(dx, dz);
      const step = Math.min(d, v.batSpeed * dt);
      if (d > 1e-3) {
        e.pos.x += (dx / d) * step;
        e.pos.z += (dz / d) * step;
      }
      e.facing = turn(e.facing, toward, 8 * dt);
      if (e.phase === 'recover' || player.dead || e.cooldown > 0) break;
      if (w.enemies.some((o) => o !== e && o.alive && o.kind === 'bat' && (o.phase === 'windup' || o.phase === 'dive'))) break;
      if (!seesInAir(e, player, world)) break;
      setPhase(e, 'windup');
      w.events.push('batDive', index, e.pos.x, e.pos.y + 0.4, e.pos.z);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, toward, 12 * dt);
      if (e.t < SHRIEK) break;
      middle(e, e.from);
      e.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT + 0.3, player.pos.z);
      dir.subVectors(e.aim, e.from).normalize();
      e.aim.addScaledVector(dir, OVERSHOOT);
      {
        const low = LOWEST + ENEMY_STATS.bat().height / 2;
        if (e.aim.y < low && dir.y < -1e-3) e.aim.addScaledVector(dir, (low - e.aim.y) / dir.y);
      }
      e.struck = false;
      setPhase(e, 'dive');
      break;
    case 'dive': {
      const h = ENEMY_STATS.bat().height / 2;
      middle(e, mid);
      dir.subVectors(e.aim, mid);
      const left = dir.length();
      const step = Math.min(left, v.batSpeed * 1.6 * dt);
      if (left > 1e-4) dir.divideScalar(left);
      e.pos.set(mid.x + dir.x * step, Math.max(LOWEST, mid.y + dir.y * step - h), mid.z + dir.z * step);
      middle(e, mid);
      if (!e.struck && !player.dead && Math.hypot(player.pos.x - mid.x, player.pos.y + AIM_HEIGHT - mid.y, player.pos.z - mid.z) < BITE) {
        e.struck = true;
        damagePlayer(player, v.batDamage, 'bat');
        w.events.push('batBite', index, mid.x, mid.y, mid.z);
      }
      if (left - step <= 1e-3 || e.t >= DIVE_FOR) {
        e.cooldown = v.batGap * (0.8 + 0.4 * w.rng());
        setPhase(e, 'recover');
      }
      break;
    }
  }
}
