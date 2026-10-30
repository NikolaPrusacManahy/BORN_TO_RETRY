// Update 0.2.4 — the Lizard (floor 4; the designer's "yellow lizard": the Ultimate Monsters big Frog, a yellow poison
// frog; enemies "smarter than ordinary enemies"). Camouflaged: while it creeps you barely see it (Lizard seen: the
// view). It keeps its distance (backs off within Lizard keeps off, creeps closer past Lizard spits from, circles
// between) and every Lizard spit gap it shows itself, rears (its warning) and spits a glob of poison where you're
// heading (your run carried on for the glob's flight); the glob splashes into a puddle that poisons you while you stand
// in it (puddles.ts). It turns floor 4's ground against you. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import { dropBomb } from '../combat/bombs';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Its turn rate (rad/s); it stands this long after a spit (s); it circles you this share of its speed. */
const TURN = 8;
const RECOVER = 0.7;
const CIRCLE = 0.6;
/** Its mouth, this share of its height up. */
const MOUTH = 0.75;

const way = new Vector3();
const from = new Vector3();
const spot = new Vector3();

/** It shows itself (the view): rearing to spit and just after. */
export const lizardSeen = (e: Enemy) => e.phase === 'windup' || e.phase === 'recover' || e.phase === 'flinch' || e.phase === 'dead' || e.phase === 'held';

export function updateLizard(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= RECOVER) setPhase(e, 'chase');
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.lizardWindup) break;
      spit(e, index, player, w, dist);
      setPhase(e, 'recover');
      e.cooldown = v.lizardGap;
      break;
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      const sees = inLine(e, player, w.nav.small, s.height + 1);
      if (e.cooldown <= 0 && sees && dist <= v.lizardFar + 3) {
        setPhase(e, 'windup');
        w.events.push('lizardWindup', index, e.pos.x, e.pos.y + s.height * MOUTH, e.pos.z);
        break;
      }
      if (!sees || dist > v.lizardFar) {
        const how = chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way);
        if (how !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
        break;
      }
      const nx = (e.pos.x - player.pos.x) / Math.max(dist, 1e-3);
      const nz = (e.pos.z - player.pos.z) / Math.max(dist, 1e-3);
      if (dist < v.lizardNear) {
        walk(e, nx, nz, s.speed * dt, w.nav.small);
        break;
      }
      e.strafeTime -= dt;
      if (e.strafeTime <= 0) {
        e.strafeTime = 2 + 2 * w.rng();
        e.strafe = -e.strafe;
      }
      walk(e, nz * e.strafe, -nx * e.strafe, s.speed * CIRCLE * dt, w.nav.small);
      break;
    }
    default:
      break;
  }
}

/** A glob of poison lobbed at where you'll be (a bomb that splashes into a puddle). */
function spit(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  const v = FOES4.v;
  from.set(e.pos.x - Math.sin(e.facing) * 0.5, e.pos.y + ENEMY_STATS[e.kind]().height * MOUTH, e.pos.z - Math.cos(e.facing) * 0.5);
  spot.set(player.pos.x + player.vel.x * v.globFall, e.pos.y, player.pos.z + player.vel.z * v.globFall);
  if (dist < 1) spot.set(player.pos.x, e.pos.y, player.pos.z);
  if (dropBomb(w.bombs, from, spot, v.globFall, v.puddleRadius, 0, 0, e.kind, 'poison')) w.events.push('lizardSpit', index, from.x, from.y, from.z);
}
