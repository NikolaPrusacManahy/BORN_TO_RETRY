// Update 0.1.19 — what floor 3's melee fighters share (the Skeleton, the Mushnub, the Ninja), the Grunt's way with their
// own numbers: it runs at you round walls and stops in reach; winds up for the full warning (turning only slowly, so a
// sideways dash dodges); then strikes, landing only if you're still in reach, in front and not behind a wall (you're
// shoved away and a little up). A hit flinches it (a light one doesn't stagger the Ninja), cancelling a wind-up. Its
// attack needs its turn (tokens.ts: `armed`, given by the caller). Pure.
// Update 0.3.10 — its melee blow can be parried (combat/meleeParry.ts). Update 0.3.15 — a big one (floor 6's Mako,
// Barbarossa) walks the big bodies' grid: on the small one it ran into gaps too narrow for it.
import { Vector3 } from 'three';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import type { CombatEvent } from '../combat/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

export interface Brawl {
  reach: () => number;
  windup: () => number;
  damage: () => number;
  /** Turning while it runs, and while it winds up (rad/s). */
  turn: number;
  windupTurn: number;
  /** Its blow lands within this angle of where it faces (degrees). */
  arc: number;
  /** After its blow, before it moves again (s). */
  recover: number;
  /** How hard it shoves you (m/s). */
  shove: number;
  windupEvent: CombatEvent;
  strikeEvent: CombatEvent;
}

const way = new Vector3();

/** One tick of a melee fighter's fight (after enemy.ts's beginTick). `armed`: it may start an attack. */
export function brawl(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, b: Brawl, armed: boolean) {
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const reach = b.reach();
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= b.recover) setPhase(e, 'chase');
      break;
    case 'chase': {
      if (player.dead) {
        e.facing = turn(e.facing, toward, b.turn * dt);
        break;
      }
      if (armed && dist <= reach * 0.9 && inLine(e, player, w.nav.small, s.height * 0.75)) {
        e.facing = turn(e.facing, toward, b.turn * dt);
        setPhase(e, 'windup');
        w.events.push(b.windupEvent, index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
        break;
      }
      const size = s.size === 'large' ? 'large' : 'small';
      const how = chaseDir(w.flow[size], w.nav[size], e.pos, player.pos.x, player.pos.z, way);
      if (how === 'none') {
        e.facing = turn(e.facing, toward, b.turn * dt);
        break;
      }
      const step = how === 'straight' ? Math.min(s.speed * dt, Math.max(0, dist - reach * 0.9)) : s.speed * dt;
      e.facing = turn(e.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), b.turn * dt);
      walk(e, way.x, way.z, step, w.nav[size]);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, toward, b.windupTurn * dt);
      if (e.t >= b.windup()) {
        strike(e, index, player, dist, toward, w, b);
        setPhase(e, 'recover');
      }
      break;
  }
}

function strike(e: Enemy, index: number, player: PlayerState, dist: number, toward: number, w: EnemyWorld, b: Brawl) {
  const s = ENEMY_STATS[e.kind]();
  w.events.push(b.strikeEvent, index, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
  if (dist > b.reach() || off > (b.arc * Math.PI) / 180 || !inLine(e, player, w.nav.small, s.height * 0.75)) return;
  if (!meleeHit(player, w, e, index, b.damage())) return;
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - e.pos.x) / len) * b.shove;
  player.vel.z += ((player.pos.z - e.pos.z) / len) * b.shove;
  player.vel.y = Math.max(player.vel.y, 3);
  player.grounded = false;
}
