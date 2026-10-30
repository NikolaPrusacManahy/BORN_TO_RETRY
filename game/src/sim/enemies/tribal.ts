// Update 0.2.4 — the Tribal (floor 4; the designer: enemies that "evade", "smarter than ordinary enemies"). A spear
// thrower that keeps its distance: closer than Tribal keeps off it backs away, further than Tribal throws from it comes
// on, between it circles you. It throws where you'll be, not where you are (your run carried on for the spear's
// flight), so running straight is no escape. Aim at it for Tribal aim read and it springs aside out of your sights;
// some of your blows it rolls away from (evade.ts). On a perch (a high ledge: roomLoop.ts puts it there) it stands and
// throws from above. Enemy.near counts how long you've aimed at it; Enemy.blink its rest between sidesteps. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { aimedAt, slideAside } from './evade';
import { ENEMY_STATS } from './kinds';

/** You aim at it within this angle (degrees). */
const AIM_CONE = 7;
/** Its turn rate (rad/s), and how long it stands after a throw (s). */
const TURN = 9;
const RECOVER = 0.35;
/** It circles you this fast (a share of its speed), turning round every few seconds. */
const CIRCLE = 0.55;
const CIRCLE_FOR = 2.5;
/** The spear leaves its hand this high (a share of its height). */
const HAND = 0.8;

const way = new Vector3();
const from = new Vector3();
const aim = new Vector3();

export function updateTribal(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const perched = e.perch > 0;
  // Your aim on it: held long enough, it springs aside (not from a perch).
  e.near = !player.dead && aimedAt(player, e, AIM_CONE) ? e.near + dt : 0;
  if (!perched && e.near >= v.tribalAimed && e.blink <= 0 && e.phase !== 'flinch') {
    slideAside(e, player.pos.x, player.pos.z, v.tribalSidestep, w.rng() < 0.5 ? 1 : -1);
    e.blink = v.tribalSidestepRest;
    e.near = 0;
    w.events.push('tribalDodge', index, e.pos.x, e.pos.y + 1, e.pos.z);
  }
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= RECOVER) setPhase(e, 'chase');
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= v.tribalWindup) {
        throwSpear(e, index, player, w, dist);
        setPhase(e, 'recover');
        e.cooldown = v.tribalGap;
      }
      break;
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      const sees = inLine(e, player, w.nav.small, s.height + (perched ? 4 : 0));
      if (e.cooldown <= 0 && sees && dist <= v.tribalFar + 4) {
        setPhase(e, 'windup');
        w.events.push('tribalWindup', index, e.pos.x, e.pos.y + s.height * HAND, e.pos.z);
        break;
      }
      if (perched) break;
      if (!sees || dist > v.tribalFar) {
        // Come on round the walls.
        const how = chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way);
        if (how !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
        break;
      }
      if (dist < v.tribalNear) {
        // Back off.
        walk(e, (e.pos.x - player.pos.x) / Math.max(dist, 1e-3), (e.pos.z - player.pos.z) / Math.max(dist, 1e-3), s.speed * dt, w.nav.small);
        break;
      }
      // Circle you, turning round now and then.
      e.strafeTime -= dt;
      if (e.strafeTime <= 0) {
        e.strafeTime = CIRCLE_FOR * (0.6 + 0.8 * w.rng());
        e.strafe = -e.strafe;
      }
      walk(e, ((e.pos.z - player.pos.z) / dist) * e.strafe, (-(e.pos.x - player.pos.x) / dist) * e.strafe, s.speed * CIRCLE * dt, w.nav.small);
      break;
    }
    default:
      break;
  }
}

/** Its spear, at where you'll be when it gets there (your run carried on for its flight, Tribal aim ahead of it). */
function throwSpear(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  const v = FOES4.v;
  from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + ENEMY_STATS[e.kind]().height * HAND, e.pos.z - Math.cos(e.facing) * 0.4);
  const flight = dist / Math.max(1, v.spearSpeed);
  aim.set(player.pos.x + player.vel.x * flight * v.tribalLead, player.pos.y + AIM_HEIGHT, player.pos.z + player.vel.z * flight * v.tribalLead);
  aim.sub(from).normalize();
  if (fireOrb(w.orbs, from, aim, v.spearSpeed, v.spearDamage, e.kind, 'spear')) w.events.push('tribalThrow', index, from.x, from.y, from.z);
}
