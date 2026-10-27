// Update 0.0.12 — the Spitter (design §9: keeps its distance and fires slow orbs). It holds a ring round you: further
// than Spitter too far, or with a wall in the way, it comes closer (round walls, like a grunt); closer than Spitter
// too close it backs off; in between it circles you, turning round now and then. With you in sight and its shot ready
// it winds up (it rears, glows and gurgles: the warning), then spits an orb at where you are: sidestep it or dash
// through it. A hit flinches it and cancels the shot. Pure.
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { freeAt } from '../../world/navGrid';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { RADIUS } from './kinds';

/** Turning speed (rad/s): it keeps its eyes on you. */
const TURN = 10;
/** After a shot, before it moves again (s). */
const RECOVER = 0.35;
/** Circling speed, as a share of its speed; seconds between turning round. */
const STRAFE_SHARE = 0.55;
const STRAFE_TIME = 2.5;
/** It looks this far ahead (m) before stepping back or sideways into a wall. */
const LOOK = 1;

const way = new Vector3();
const from = new Vector3();
const aim = new Vector3();

/** You're in its sight: no wall in between (it can shoot up at you on a block). */
const sees = (s: Enemy, player: PlayerState, w: EnemyWorld) => inLine(s, player, w.nav.small, 8);

export function updateSpitter(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = ENEMIES.v;
  const dx = player.pos.x - s.pos.x;
  const dz = player.pos.z - s.pos.z;
  const dist = Math.max(1e-3, Math.hypot(dx, dz));
  const toward = yawTo(s, player.pos.x, player.pos.z);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= v.spitterFlinch) setPhase(s, 'chase');
      break;
    case 'recover':
      s.facing = turn(s.facing, toward, TURN * dt);
      if (s.t >= RECOVER) setPhase(s, 'chase');
      break;
    case 'chase': {
      const inSight = !player.dead && sees(s, player, w);
      if (inSight && dist <= v.spitterFar && s.cooldown <= 0) {
        setPhase(s, 'windup');
        w.events.push('spitterWindup', index, s.pos.x, s.pos.y + v.spitterHeight * 0.6, s.pos.z);
        break;
      }
      if (player.dead) break;
      if (!inSight || dist > v.spitterFar) {
        // Come closer, round walls.
        const how = chaseDir(w.flow.small, w.nav.small, s.pos, player.pos.x, player.pos.z, way);
        if (how !== 'none') {
          walk(s, way.x, way.z, v.spitterSpeed * dt, w.nav.small);
          s.facing = turn(s.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), TURN * dt);
        }
        break;
      }
      s.facing = turn(s.facing, toward, TURN * dt);
      // Too close: back off, unless there's a wall behind it; then (or in range) circle you.
      const ax = -dx / dist;
      const az = -dz / dist;
      if (dist < v.spitterNear && freeAt(w.nav.small, s.pos.x + ax * LOOK, s.pos.z + az * LOOK)) {
        walk(s, ax, az, v.spitterSpeed * dt, w.nav.small);
        break;
      }
      s.strafeTime -= dt;
      const cx = -az * s.strafe;
      const cz = ax * s.strafe;
      if (s.strafeTime <= 0 || !freeAt(w.nav.small, s.pos.x + cx * LOOK, s.pos.z + cz * LOOK)) {
        s.strafe = -s.strafe;
        s.strafeTime = STRAFE_TIME;
        break;
      }
      walk(s, cx, cz, v.spitterSpeed * STRAFE_SHARE * dt, w.nav.small);
      break;
    }
    case 'windup':
      s.facing = turn(s.facing, toward, TURN * dt);
      if (s.t >= v.spitterWindup) {
        spit(s, index, player, w);
        setPhase(s, 'recover');
      }
      break;
  }
}

/** An orb from its mouth at your chest (unless a wall came between: then it holds its fire). */
function spit(s: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = ENEMIES.v;
  s.cooldown = v.spitterCooldown;
  if (!sees(s, player, w)) return;
  from.set(-Math.sin(s.facing), 0, -Math.cos(s.facing)).multiplyScalar(RADIUS.spitter + 0.2);
  from.add(s.pos).setY(s.pos.y + v.spitterHeight * 0.6);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  if (fireOrb(w.orbs, from, aim, v.spitterOrbSpeed, v.spitterOrbDamage)) w.events.push('spit', index, from.x, from.y, from.z);
}
