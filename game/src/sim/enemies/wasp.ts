// Update 0.0.18 — the Wasp (the designer: poison stings). It flies above the fight like the stinger, but keeps its
// distance (closer when it can't see you, away when you're close, circling between); with you in sight and its sting
// ready it curls its sting forward for the warning (it buzzes), then shoots it at you: a fast dart that hurts a little
// and poisons you. A hit flinches it and cancels the shot. Pure.
import { Vector3 } from 'three';
import { FOES2 } from '../../tuning/foes2';
import type { CollisionWorld } from '../collisionWorld';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';

const TURN = 9;
const RECOVER = 0.35;

const from = new Vector3();
const aim = new Vector3();

export function updateWasp(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES2.v;
  const dist = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  keepHeight(s, v.waspAlt, dt);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= 0.3) setPhase(s, 'chase');
      break;
    case 'recover':
      s.facing = turn(s.facing, toward, TURN * dt);
      if (s.t >= RECOVER) setPhase(s, 'chase');
      break;
    case 'chase': {
      if (player.dead) break;
      const sees = seesInAir(s, player, world);
      if (sees && dist <= v.waspFar && s.cooldown <= 0) {
        setPhase(s, 'windup');
        w.events.push('waspWindup', index, s.pos.x, s.pos.y + v.waspHeight / 2, s.pos.z);
        break;
      }
      if (!sees || dist > v.waspFar) flyCloser(s, player, w, v.waspSpeed, toward, dt);
      else circle(s, player, w, v.waspSpeed, v.waspNear, toward, dt);
      break;
    }
    case 'windup':
      s.facing = turn(s.facing, toward, TURN * dt);
      if (s.t >= v.waspWindup) {
        sting(s, index, player, w, world);
        setPhase(s, 'recover');
      }
      break;
  }
}

/** Its sting flies at your chest (none if a wall came between). */
function sting(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, world: CollisionWorld) {
  const v = FOES2.v;
  s.cooldown = v.waspCooldown;
  if (!seesInAir(s, player, world)) return;
  middle(s, from);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  if (fireOrb(w.orbs, from, aim, v.waspStingSpeed, v.waspDamage, v.poisonTime)) w.events.push('waspSting', index, from.x, from.y, from.z);
}
