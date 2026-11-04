// Update 0.0.18 — the Blue Demon (the designer: a big floor 2 enemy; it carries its room's key): a smaller cousin of
// the Demon. It walks at you; every so often it warns and either charges (head down, glowing: a straight run that
// throws you aside, and a wall or column in its way stuns it, hits doing more meanwhile) or, from further off, throws a
// fireball. Only a hard hit staggers it. Pure.
import { Vector3 } from 'three';
import { FOES2 } from '../../tuning/foes2';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { ChargeSpec, startCharge, stepCharge } from './charge';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { closeIn } from './moves';
import { armed } from './tokens';

/** Its two moves (Enemy.move). */
export const BLUE_CHARGE = 0;
export const BLUE_FIRE = 1;
const TURN = 3;
/** It stops walking this close (m); throws fire only from further than this (m); after a move (s). */
const STAND_OFF = 3.5;
const FIRE_FROM = 8;
const RECOVER = 0.6;

const SPEC: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };
const from = new Vector3();
const aim = new Vector3();

function spec(): ChargeSpec {
  const v = FOES2.v;
  SPEC.speed = v.blueChargeSpeed;
  SPEC.range = v.blueChargeRange;
  SPEC.damage = v.blueChargeDamage;
  SPEC.shove = v.blueChargeShove;
  SPEC.height = v.blueHeight;
  return SPEC;
}

export const blueWindup = (move: number) => (move === BLUE_CHARGE ? FOES2.v.blueChargeWindup : FOES2.v.blueFireWindup);

export function updateBlueDemon(b: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES2.v;
  const dist = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z);
  const toward = yawTo(b, player.pos.x, player.pos.z);
  switch (b.phase) {
    case 'flinch':
      if (b.t >= 0.4) setPhase(b, 'chase');
      break;
    case 'stun':
      if (b.t >= v.blueStun) {
        setPhase(b, 'chase');
        b.cooldown = v.blueCooldown * 0.5;
      }
      break;
    case 'recover':
      b.facing = turn(b.facing, toward, TURN * dt);
      if (b.t >= RECOVER) {
        setPhase(b, 'chase');
        b.cooldown = v.blueCooldown;
      }
      break;
    case 'chase':
      if (player.dead) break;
      if (armed(b) && b.cooldown <= 0 && Math.abs(player.pos.y - b.pos.y) < 2) {
        b.move = dist > FIRE_FROM && w.rng() < 0.5 ? BLUE_FIRE : BLUE_CHARGE;
        setPhase(b, 'windup');
        w.events.push('blueWindup', b.move, b.pos.x, b.pos.y + v.blueHeight * 0.6, b.pos.z);
        break;
      }
      closeIn(b, player, w, 'large', v.blueSpeed, STAND_OFF, TURN, dt);
      break;
    case 'windup':
      b.facing = turn(b.facing, toward, TURN * (b.move === BLUE_CHARGE ? 0.6 : 1.5) * dt);
      if (b.t < blueWindup(b.move)) break;
      if (b.move === BLUE_CHARGE) startCharge(b, index, w);
      else {
        fireball(b, index, player, w);
        setPhase(b, 'recover');
      }
      break;
    case 'charge':
      if (stepCharge(b, index, player, w, dt, spec()) === 'out') setPhase(b, 'recover');
      break;
  }
}

/** A fireball from its hand at your chest. */
function fireball(b: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES2.v;
  from.set(b.pos.x - Math.sin(b.facing) * 1.1, b.pos.y + v.blueHeight * 0.55, b.pos.z - Math.cos(b.facing) * 1.1);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  if (fireOrb(w.orbs, from, aim, v.blueFireSpeed, v.blueFireDamage, b.kind)) w.events.push('blueFireball', index, from.x, from.y, from.z);
}
