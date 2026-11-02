// Update 0.3.18 — floor 8's Flanker (Rae the Red Panda on foot: the designer's Fox; the plan: "Fox — the flank").
// Fast. Waiting its turn it circles out of reach as the close fighters do (tokens.ts); with its turn it runs round to
// your side, Flanker circle off (to your left or your right: two go opposite ways), crouches there with a hiss (Flanker
// warning: you hear it coming even where you don't look), darts in at you (Flanker dart) and lands two quick punches if
// it reaches you; then it springs away. A hit flinches it out of all of it. Pure.
import { Vector3 } from 'three';
import { FOES_MOON } from '../../tuning/foesMoon';
import { wallBetween } from '../../world/navGrid';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** It runs round for its spot at most this long (s); it's there this near (m); it darts this far past where you were
 *  (m) at most; its punches reach this far (m), the second this long after the first (s); it springs away this long (s),
 *  then rests (s). */
const ROUND_FOR = 2.6;
const THERE = 1.2;
const PAST = 2;
export const REACH = 1.7;
const SECOND = 0.28;
const SPRING = 0.55;
const REST = 1.2;

const way = new Vector3();

export function updateFlanker(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.flanker();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'recover');
      return;
    case 'recover': {
      // Springing away, then a breath.
      if (e.t < SPRING && dist > 1e-3) walk(e, (e.pos.x - player.pos.x) / dist, (e.pos.z - player.pos.z) / dist, s.speed * 1.2 * dt, w.nav.small);
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 8 * dt);
      if (e.t >= SPRING + REST) setPhase(e, 'chase');
      return;
    }
    case 'chase':
      if (player.dead) return;
      // Its spot: at your side, a ring off.
      if (armed(e)) return toFlank(e, index, player, w, dt);
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 8 * dt);
      if (chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
      return;
    case 'windup':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 14 * dt);
      if (e.t < v.flankerWarn) return;
      e.from.copy(e.pos);
      e.aim.set(player.pos.x, 0, player.pos.z);
      way.set(e.aim.x - e.from.x, 0, e.aim.z - e.from.z).normalize();
      e.aim.addScaledVector(way, PAST);
      e.shots = 0;
      setPhase(e, 'dive');
      w.events.push('flankerDart', index, e.pos.x, e.pos.y + 1, e.pos.z);
      return;
    case 'dive':
      return dart(e, index, player, w, dt);
  }
}

/** With its turn: round to your side (the side it's on, `strafe`), then crouched to dart. */
function toFlank(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.flanker();
  // Your side: across the way you face.
  const side = e.strafe >= 0 ? 1 : -1;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const tx = player.pos.x - fz * side * v.flankerRing;
  const tz = player.pos.z + fx * side * v.flankerRing;
  const gap = Math.hypot(tx - e.pos.x, tz - e.pos.z);
  if (gap > THERE && e.t < ROUND_FOR) {
    // (A wall in the way: round it on the way to you.)
    if (!wallBetween(w.nav.small, e.pos.x, e.pos.z, tx, tz)) walk(e, (tx - e.pos.x) / gap, (tz - e.pos.z) / gap, Math.min(gap, s.speed * dt), w.nav.small);
    else if (chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
    e.facing = turn(e.facing, Math.atan2(-(tx - e.pos.x), -(tz - e.pos.z)), 10 * dt);
    return;
  }
  setPhase(e, 'windup');
  w.events.push('flankerCrouch', index, e.pos.x, e.pos.y + 1, e.pos.z);
}

/** Straight in through where you were: two punches if it reaches you. */
function dart(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  way.set(e.aim.x - e.pos.x, 0, e.aim.z - e.pos.z);
  const left = way.length();
  if (left > 1e-3) walk(e, way.x / left, way.z / left, Math.min(left, v.flankerDart * dt), w.nav.small);
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 14 * dt);
  const near = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= REACH + ENEMY_STATS.flanker().radius && Math.abs(player.pos.y - e.pos.y) < 1.8;
  if (e.shots === 0 && near && !player.dead) {
    e.shots = 1;
    e.near = e.t;
    w.events.push('flankerPunch', index, e.pos.x, e.pos.y + 1.1, e.pos.z);
    meleeHit(player, w, e, index, v.flankerDamage);
  } else if (e.shots === 1 && e.t - e.near >= SECOND) {
    e.shots = 2;
    w.events.push('flankerPunch', index, e.pos.x, e.pos.y + 1.1, e.pos.z);
    if (near && !player.dead) meleeHit(player, w, e, index, v.flankerDamage);
  }
  if ((left <= 0.05 && e.shots !== 1) || e.t > 1.2) setPhase(e, 'recover');
}
