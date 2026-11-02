// Update 0.0.18 — the Wasp (the designer: poison stings). Update 0.0.19 (the designer: it shot venom; it should
// actually sting you) — it flies high above the fight, circling, while its sting is ready again; then it swoops down
// to hover in front of your chest, curls its sting forward for the warning (it buzzes) and stabs: in reach and in front,
// a little damage and you're poisoned. Dash away during the warning and it stabs the air. Then it climbs away. Down
// there your fists reach it; a hit flinches it and cancels the sting. A swoop you outrun is given up. Pure.
// Update 0.3.10 — its melee blow can be parried (combat/meleeParry.ts).
import { Vector3 } from 'three';
import { FOES2 } from '../../tuning/foes2';
import type { CollisionWorld } from '../collisionWorld';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { poisonPlayer } from '../player/health';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';
import { armed } from './tokens';

const TURN = 9;
/** Climbing away after a sting (s); a swoop it gives up after this long (s); its sting's arc in front (rad). */
const RECOVER = 0.6;
const SWOOP_MAX = 3;
const ARC = 1.2;
/** In the swoop it stops this share of its reach from you. */
const STOP = 0.75;

const way = new Vector3();
const from = new Vector3();
const chest = new Vector3();

/** Where its feet are when its middle is at your chest. */
const chestAlt = (player: PlayerState) => player.pos.y + AIM_HEIGHT - FOES2.v.waspHeight / 2;

export function updateWasp(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES2.v;
  const dx = player.pos.x - s.pos.x;
  const dz = player.pos.z - s.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  switch (s.phase) {
    case 'flinch':
      keepHeight(s, v.waspAlt, dt);
      if (s.t >= 0.3) {
        setPhase(s, 'chase');
        s.cooldown = Math.max(s.cooldown, 1);
      }
      break;
    case 'recover':
      // Up and away.
      keepHeight(s, v.waspAlt, dt);
      s.facing = turn(s.facing, toward, TURN * dt);
      if (dist > 1e-3) walk(s, -dx / dist, -dz / dist, v.waspSpeed * 0.6 * dt, w.nav.air);
      if (s.t >= RECOVER) setPhase(s, 'chase');
      break;
    case 'chase': {
      keepHeight(s, v.waspAlt, dt);
      if (player.dead) break;
      const sees = seesInAir(s, player, world);
      if (sees && dist <= v.waspFar && s.cooldown <= 0 && armed(s)) {
        setPhase(s, 'dive');
        break;
      }
      if (!sees || dist > v.waspFar) flyCloser(s, player, w, v.waspSpeed, toward, dt);
      else circle(s, player, w, v.waspSpeed, v.waspNear, toward, dt);
      break;
    }
    case 'dive':
      // Down to your chest, in front of you.
      if (player.dead || s.t > SWOOP_MAX) {
        setPhase(s, 'recover');
        s.cooldown = v.waspCooldown * 0.5;
        break;
      }
      sink(s, chestAlt(player), v.waspSwoop, dt);
      s.facing = turn(s.facing, toward, TURN * dt);
      if (chaseDir(w.flow.air, w.nav.air, s.pos, player.pos.x, player.pos.z, way) !== 'none') walk(s, way.x, way.z, Math.min(v.waspSwoop * dt, Math.max(0, dist - v.waspReach * STOP)), w.nav.air);
      if (dist <= v.waspReach && Math.abs(s.pos.y - chestAlt(player)) < 0.6) {
        setPhase(s, 'windup');
        middle(s, from);
        w.events.push('waspWindup', index, from.x, from.y, from.z);
      }
      break;
    case 'windup':
      // It hovers where it is, turning to you: a dash away and it stabs the air.
      sink(s, chestAlt(player), v.waspSwoop * 0.3, dt);
      s.facing = turn(s.facing, toward, TURN * dt);
      if (s.t >= v.waspWindup) {
        sting(s, index, player, w);
        setPhase(s, 'recover');
        s.cooldown = v.waspCooldown;
      }
      break;
  }
}

/** Towards `alt` at up to `speed` (m/s). */
function sink(s: Enemy, alt: number, speed: number, dt: number) {
  const d = alt - s.pos.y;
  s.pos.y += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
}

/** It stabs: your chest in reach of its middle and in front of it, you're hurt and poisoned. */
function sting(s: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES2.v;
  middle(s, from);
  w.events.push('waspSting', index, from.x, from.y, from.z);
  chest.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - s.facing), Math.cos(toward - s.facing)));
  if (from.distanceTo(chest) > v.waspReach + BODY.radius || off > ARC) return;
  if (meleeHit(player, w, s, index, v.waspDamage)) poisonPlayer(player, v.poisonDps, v.poisonTime, s.kind);
}
