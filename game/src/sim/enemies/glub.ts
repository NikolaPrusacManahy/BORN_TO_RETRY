// Update 0.2.10 — floor 5's Glubs (fliers). The Glub keeps its distance (Glub keeps off), circling you, and when it may
// (its turn: tokens.ts) and sees you it puffs up (Glub wind-up: your warning) and spits water bolts at you, a few at
// once, a little apart. The Big Glub (Glub_Evolved) is the floor's percher: on a high perch it hangs (or, off one, over
// the floor) and swells (Bubble wind-up), then lobs a bubble that lands where you're going (its ring shows where) and
// bursts. Pure.
import { Vector3 } from 'three';
import { FOES5 } from '../../tuning/foes5';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** How high they fly (m; the Big Glub over its perch). */
const ALT = 2.8;
const PERCH_ALT = 1.2;
const TURN = 7;
/** The bolts' spread (rad between them); after spitting it rests this long (s). */
const SPREAD = 0.07;
const RECOVER = 0.45;
/** A bubble lands where you'll be this far ahead (a share of its flight). */
const LEAD = 0.6;

const from = new Vector3();
const aim = new Vector3();
const spot = new Vector3();

export function updateGlub(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  keepHeight(e, ALT, dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (armed(e) && e.cooldown <= 0 && dist <= v.glubRing * 1.6 && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('glubWindup', index, e.pos.x, e.pos.y + v.glubHeight * 0.5, e.pos.z);
        break;
      }
      if (dist > v.glubRing * 1.3) flyCloser(e, player, w, v.glubSpeed, toward, dt);
      else circle(e, player, w, v.glubSpeed, v.glubRing * 0.7, toward, dt);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.glubWindup) break;
      spit(e, index, player, w);
      e.cooldown = v.glubGap;
      setPhase(e, 'recover');
      break;
    case 'recover':
      if (e.t >= RECOVER) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Its bolts, fanned a little round the line to your chest. */
function spit(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5.v;
  middle(e, from);
  const n = Math.max(1, Math.round(v.glubBolts));
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * SPREAD;
    aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from);
    const yaw = Math.atan2(aim.x, aim.z) + off;
    const flat = Math.hypot(aim.x, aim.z);
    aim.set(Math.sin(yaw) * flat, aim.y, Math.cos(yaw) * flat).normalize();
    fireOrb(w.orbs, from, aim, v.boltSpeed, v.boltDamage, e.kind, 'water');
  }
  w.events.push('glubSpit', index, from.x, from.y, from.z);
}

export function updateBigGlub(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  const perched = e.perch > 0;
  keepHeight(e, perched ? e.perch + PERCH_ALT : ALT, dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.cooldown <= 0 && dist <= v.bubbleRange && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('bubbleWindup', index, e.pos.x, e.pos.y + v.bigGlubHeight * 0.5, e.pos.z);
        break;
      }
      // Off a perch it comes closer; on one it keeps its place.
      if (!perched && dist > v.bubbleRange * 0.5) flyCloser(e, player, w, v.bigGlubSpeed, toward, dt);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.bubbleWindup) break;
      lob(e, index, player, w);
      e.cooldown = v.bubbleGap;
      setPhase(e, 'recover');
      break;
    case 'recover':
      if (e.t >= RECOVER) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** A bubble, lobbed to land where you're going. */
function lob(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5.v;
  middle(e, from);
  spot.set(player.pos.x + player.vel.x * v.bubbleFall * LEAD, player.pos.y, player.pos.z + player.vel.z * v.bubbleFall * LEAD);
  if (dropBomb(w.bombs, from, spot, v.bubbleFall, v.bubbleRadius, v.bubbleDamage, 5, e.kind, 'bubble')) w.events.push('bubbleLob', index, from.x, from.y, from.z);
}
