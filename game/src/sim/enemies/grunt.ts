// M2 — the Grunt (design §9: a melee chaser in groups, fodder). It runs at you and stops in reach; winds up for the
// full warning time (its swing starts, it flashes, it growls), turning only slowly so a sideways dash dodges; then
// swings: only if you're still in reach and in front does it land. A hit flinches it (cancelling a wind-up) and
// knocks it back. Pure: it moves on the floor.
// Update 0.0.11 (the designer: grunts ran into walls forever and got stuck in blocks) — it finds its way round walls
// (chase.ts), never swings through one or at you up on a block, and whatever moves it ends with it pushed back out
// of any wall (world/navGrid.ts). Update 0.0.12 — its body and the moves every enemy shares are in enemy.ts.
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { armed } from './tokens';

const way = new Vector3();

/** Can it hit the player from here: level with it and no wall in between? */
const canReach = (g: Enemy, player: PlayerState, w: EnemyWorld) => inLine(g, player, w.nav.small, ENEMIES.v.gruntHeight * 0.75);

/** One tick of a grunt's fight with the player (after enemy.ts's beginTick). */
export function updateGrunt(g: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = ENEMIES.v;
  const dx = player.pos.x - g.pos.x;
  const dz = player.pos.z - g.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(g, player.pos.x, player.pos.z);
  switch (g.phase) {
    case 'flinch':
      if (g.t >= v.gruntFlinch) setPhase(g, 'chase');
      break;
    case 'recover':
      if (g.t >= v.gruntRecover) setPhase(g, 'chase');
      break;
    case 'chase': {
      if (player.dead) {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        break;
      }
      if (armed(g) && dist <= v.gruntReach * 0.9 && canReach(g, player, w)) {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        setPhase(g, 'windup');
        w.events.push('gruntWindup', index, g.pos.x, g.pos.y + v.gruntHeight * 0.6, g.pos.z);
        break;
      }
      const how = chaseDir(w.flow.small, w.nav.small, g.pos, player.pos.x, player.pos.z, way);
      // No way closer (you're up on a block): it waits below, watching you.
      if (how === 'none') {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        break;
      }
      // Running straight at you it stops in reach; round a wall it faces the way it runs.
      const step = how === 'straight' ? Math.min(v.gruntSpeed * dt, Math.max(0, dist - v.gruntReach * 0.9)) : v.gruntSpeed * dt;
      g.facing = turn(g.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), v.gruntTurn * dt);
      walk(g, way.x, way.z, step, w.nav.small);
      break;
    }
    case 'windup':
      g.facing = turn(g.facing, toward, v.gruntWindupTurn * dt);
      if (g.t >= v.gruntWindup) {
        strike(g, index, player, dist, toward, w);
        setPhase(g, 'recover');
      }
      break;
  }
}

/** The swing lands only if the player is in reach, in front, roughly level with it and not behind a wall. */
function strike(g: Enemy, index: number, player: PlayerState, dist: number, toward: number, w: EnemyWorld) {
  const v = ENEMIES.v;
  w.events.push('gruntStrike', index, g.pos.x, g.pos.y + v.gruntHeight * 0.5, g.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - g.facing), Math.cos(toward - g.facing)));
  if (dist > v.gruntReach || off > (v.gruntArc * Math.PI) / 180 || !canReach(g, player, w)) return;
  if (!damagePlayer(player, v.gruntDamage, g.kind)) return;
  // Shoved away from it, and a little up.
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - g.pos.x) / len) * v.gruntShove;
  player.vel.z += ((player.pos.z - g.pos.z) / len) * v.gruntShove;
  player.vel.y = Math.max(player.vel.y, 3);
  player.grounded = false;
}
