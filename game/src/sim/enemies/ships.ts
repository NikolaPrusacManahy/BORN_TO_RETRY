// Update 0.3.18 — floor 8's tiny ships (the designer: "little space ships as floating monsters, make them tiny like the
// wasp size"; "3 spaceships"), each its animal's role in the air:
//  - the Strafer (Fernando the Flamingo's, range): it circles high; with its turn (a ranged one's) its line shows on
//    the ground across you (Strafe warning), then it flies down it low, a line of bolts falling along it: step off it;
//  - the Diver (Rae the Red Panda's, the flank): it circles tight and fast; with its turn (a close one's) it spins in
//    place (Dive warning) and rams you, straight through where you were; missing, it pulls up;
//  - the Mine-layer (Finn the Frog's, the ground): it drifts high round you and drops a mine ahead of you every Mine
//    every: it floats down in the low gravity and sits blinking till it pops, or you come near it (combat/bombs.ts).
// A hit flinches a ship; they're a punch or two. Pure.
import { Vector3 } from 'three';
import { FOES_MOON } from '../../tuning/foesMoon';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** The Strafer circles this high (m), this far off (m); its pass runs this low (m), this far past you (m), this much
 *  faster than it circles; it climbs back this long (s). */
const STRAFE_ALT = 5;
const STRAFE_RING = 10;
const PASS_ALT = 2.6;
const PASS_PAST = 9;
const PASS_FAST = 1.7;
const CLIMB = 1.2;
/** The Diver circles this high (m), this far off (m); rams this far past you (m); catches you this near (m); rests
 *  this long after a ram (s). */
const DIVE_ALT = 2.4;
const DIVE_RING = 4.5;
const DIVE_PAST = 4;
const CATCH = 1.1;
const DIVE_REST = 1.6;
/** The Mine-layer drifts this high (m), this far off (m); drops a mine where you'll be this long ahead (s). */
const LAYER_ALT = 6.5;
const LAYER_RING = 6;
const LAYER_LEAD = 0.8;

const mid = new Vector3();
const dir = new Vector3();
const to = new Vector3();

/** A ship flinched, back to circling. */
function flinched(e: Enemy) {
  if (e.t >= ENEMY_STATS[e.kind]().flinch) setPhase(e, 'chase');
}

export function updateStrafer(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES_MOON.v;
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      return flinched(e);
    case 'recover':
      keepHeight(e, STRAFE_ALT, dt);
      circle(e, player, w, v.shipSpeed, 0, toward, dt);
      if (e.t >= CLIMB) setPhase(e, 'chase');
      return;
    case 'chase':
      keepHeight(e, STRAFE_ALT, dt);
      circle(e, player, w, v.shipSpeed, STRAFE_RING * 0.6, toward, dt);
      if (player.dead || e.cooldown > 0 || !armed(e) || !seesInAir(e, player, world)) return;
      // Its line: from under it, across you, on past.
      e.from.set(e.pos.x, 0, e.pos.z);
      dir.set(player.pos.x - e.pos.x, 0, player.pos.z - e.pos.z).normalize();
      e.aim.set(player.pos.x + dir.x * PASS_PAST, 0, player.pos.z + dir.z * PASS_PAST);
      e.shots = 0;
      setPhase(e, 'windup');
      w.events.push('strafeLine', index, e.from.x, 0, e.from.z);
      return;
    case 'windup':
      keepHeight(e, PASS_ALT, dt);
      e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 8 * dt);
      if (e.t >= v.strafeWarn) setPhase(e, 'dive');
      return;
    case 'dive': {
      // Down its line, low, its bolts falling along it.
      keepHeight(e, PASS_ALT, dt);
      dir.set(e.aim.x - e.pos.x, 0, e.aim.z - e.pos.z);
      const left = dir.length();
      const step = Math.min(left, v.shipSpeed * PASS_FAST * dt);
      if (left > 1e-3) e.pos.addScaledVector(dir.divideScalar(left), step);
      e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 8 * dt);
      const total = Math.max(1e-3, Math.hypot(e.aim.x - e.from.x, e.aim.z - e.from.z));
      const along = 1 - (left - step) / total;
      const n = Math.round(v.strafeShots);
      while (e.shots < n && along >= (e.shots + 0.5) / n) {
        e.shots++;
        middle(e, mid);
        // Straight down onto its line a little ahead.
        to.set(e.pos.x + dir.x * 1.2, 0.2, e.pos.z + dir.z * 1.2).sub(mid).normalize();
        if (fireOrb(w.orbs, mid, to, 22, v.strafeDamage, 'strafer', 'laser')) w.events.push('strafeShot', index, mid.x, mid.y, mid.z);
      }
      if (left - step > 0.05) return;
      e.cooldown = 2;
      setPhase(e, 'recover');
      return;
    }
  }
}

export function updateDiver(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.diver();
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      return flinched(e);
    case 'recover':
      keepHeight(e, DIVE_ALT, dt);
      circle(e, player, w, s.speed, DIVE_RING, toward, dt);
      if (e.t >= DIVE_REST) setPhase(e, 'chase');
      return;
    case 'chase':
      keepHeight(e, DIVE_ALT, dt);
      circle(e, player, w, s.speed, DIVE_RING * 0.7, toward, dt);
      if (player.dead || e.cooldown > 0 || !armed(e) || !seesInAir(e, player, world)) return;
      setPhase(e, 'windup');
      w.events.push('diverSpin', index, e.pos.x, e.pos.y, e.pos.z);
      return;
    case 'windup':
      // Spinning where it is (the view spins it), then straight through where your chest is.
      e.facing += 18 * dt;
      if (e.t < v.diveWarn) return;
      middle(e, e.from);
      e.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
      dir.subVectors(e.aim, e.from).normalize();
      e.aim.addScaledVector(dir, DIVE_PAST);
      e.aim.y = Math.max(0.6, e.aim.y);
      e.struck = false;
      setPhase(e, 'dive');
      w.events.push('diverRam', index, e.pos.x, e.pos.y, e.pos.z);
      return;
    case 'dive': {
      middle(e, mid);
      dir.subVectors(e.aim, mid);
      const left = dir.length();
      const step = Math.min(left, v.diveSpeed * dt);
      if (left > 1e-4) dir.divideScalar(left);
      e.pos.addScaledVector(dir, step);
      e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 20 * dt);
      middle(e, mid);
      if (!e.struck && !player.dead && Math.hypot(player.pos.x - mid.x, player.pos.y + AIM_HEIGHT - mid.y, player.pos.z - mid.z) < CATCH) {
        e.struck = true;
        damagePlayer(player, v.diveDamage, 'diver');
      }
      if (left - step > 0.05 && e.t < 1.5) return;
      e.cooldown = 1.5;
      setPhase(e, 'recover');
      return;
    }
  }
}

export function updateMineLayer(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.mineLayer();
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'flinch') return flinched(e);
  keepHeight(e, LAYER_ALT, dt);
  circle(e, player, w, s.speed, LAYER_RING, toward, dt);
  if (player.dead || e.cooldown > 0) return;
  // A mine ahead of you, from under it.
  middle(e, mid);
  to.set(player.pos.x + player.vel.x * LAYER_LEAD, 0, player.pos.z + player.vel.z * LAYER_LEAD);
  if (dropBomb(w.bombs, mid, to, v.mineFall, v.mineReach, v.mineDamage, 6, 'mineLayer', 'mine', v.mineFuse)) w.events.push('mineDrop', index, mid.x, mid.y, mid.z);
  e.cooldown = v.layerEvery;
}
