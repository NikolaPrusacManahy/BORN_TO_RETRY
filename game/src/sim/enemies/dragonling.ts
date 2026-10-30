// Update 0.2.7 — the Dragonling (floor 3, in the Stinger's place; the designer: "the flying orange dragon = make him a
// dangerous brat"). A little dragon that flits about you, never still: it circles at Dragonling keeps off, zig-zagging,
// comes closer over cover when it can't see you, and every Dragonling burst rest it puffs up (your warning) and spits
// a burst of fireballs, each one where you're running to. Come closer than Dragonling too close and it spits one right
// in your face and darts off out of reach (then can't again for a while). Small and quick to flinch. Pure.
import { Vector3 } from 'three';
import { FOES3B } from '../../tuning/foes3b';
import type { CollisionWorld } from '../collisionWorld';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** Which move (Enemy.move). */
export const BURST = 0;
export const SPIT = 1;
/** The face-spit's short warning (s); its dart's time (s); after a burst, before it moves (s). */
const SPIT_WINDUP = 0.2;
const DART = 0.3;
const RECOVER = 0.3;
const TURN = 10;
/** Its zig-zag: how hard and how quick it swerves. */
const ZIG = 0.7;
const ZIG_RATE = 3.2;
/** How far ahead of your run it spits (1: where you'll be). */
const LEAD = 0.8;

const from = new Vector3();
const aim = new Vector3();

export const bratWindup = (move: number) => (move === SPIT ? SPIT_WINDUP : FOES3B.v.bratWindup);

export function updateDragonling(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES3B.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  e.blink = Math.max(0, e.blink - dt);
  if (e.phase !== 'dead' && e.phase !== 'leap') keepHeight(e, v.bratAlt, dt);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover': {
      // A burst: its fireballs one after another.
      e.facing = turn(e.facing, toward, TURN * dt);
      const n = Math.max(1, Math.round(v.bratShots));
      if (e.move === BURST && e.shots < n && e.t >= e.shots * v.bratShotGap) {
        e.shots++;
        spit(e, index, player, w);
      }
      if (e.t >= (e.move === BURST ? n * v.bratShotGap : 0) + RECOVER) setPhase(e, 'chase');
      break;
    }
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      const sees = seesInAir(e, player, world);
      if (sees && dist < v.bratPuffNear && e.blink <= 0) {
        e.move = SPIT;
        setPhase(e, 'windup');
        w.events.push('bratWindup', SPIT, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
        break;
      }
      if (sees && dist <= v.bratFar && e.cooldown <= 0 && armed(e)) {
        e.move = BURST;
        setPhase(e, 'windup');
        w.events.push('bratWindup', BURST, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
        break;
      }
      if (!sees || dist > v.bratFar) {
        flyCloser(e, player, w, v.bratSpeed, toward, dt);
        break;
      }
      circle(e, player, w, v.bratSpeed, v.bratNear, toward, dt);
      // A brat never flies straight: it swerves in and out.
      const zig = Math.sin(e.t * ZIG_RATE + index) * ZIG;
      walk(e, (player.pos.x - e.pos.x) / Math.max(dist, 1e-3), (player.pos.z - e.pos.z) / Math.max(dist, 1e-3), zig * v.bratSpeed * dt * 0.5, w.nav.air);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < bratWindup(e.move)) break;
      e.shots = 0;
      if (e.move === SPIT) {
        spit(e, index, player, w);
        dartOff(e, index, player, w);
        break;
      }
      setPhase(e, 'recover');
      e.cooldown = v.bratGap;
      break;
    case 'leap': {
      // Darting off.
      const k = Math.min(1, e.t / DART);
      const ease = 1 - (1 - k) * (1 - k);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * ease;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * ease;
      if (k >= 1) setPhase(e, 'chase');
      break;
    }
    default:
      break;
  }
}

/** One fireball from its mouth at where you'll be. */
function spit(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES3B.v;
  middle(e, from);
  from.x -= Math.sin(e.facing) * 0.4;
  from.z -= Math.cos(e.facing) * 0.4;
  const flight = Math.hypot(player.pos.x - from.x, player.pos.z - from.z) / Math.max(1, v.bratShotSpeed);
  aim.set(player.pos.x + player.vel.x * flight * LEAD, player.pos.y + AIM_HEIGHT, player.pos.z + player.vel.z * flight * LEAD).sub(from).normalize();
  if (fireOrb(w.orbs, from, aim, v.bratShotSpeed, v.bratShotDamage, e.kind, 'fire')) w.events.push('bratSpit', index, from.x, from.y, from.z);
}

/** Away from you, out of reach, over open floor (none: it stays and fights). */
function dartOff(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES3B.v;
  e.blink = v.bratFlitRest;
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  // (Away, and a little to one side.)
  const side = w.rng() < 0.5 ? 0.5 : -0.5;
  e.aim.set(e.pos.x + ((dx + dz * side) / d) * v.bratFlit, e.pos.y, e.pos.z + ((dz - dx * side) / d) * v.bratFlit);
  if (!freeSpotNear(w.nav.air, e.aim.x, e.aim.z, e.aim)) {
    setPhase(e, 'chase');
    return;
  }
  e.aim.y = e.pos.y;
  e.from.copy(e.pos);
  setPhase(e, 'leap');
  w.events.push('bratFlit', index, e.pos.x, e.pos.y, e.pos.z);
}
