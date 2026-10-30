// Update 0.2.7 — the White Rabbit (floor 3, in the Snake's place; the designer: "jumps around and can throw the carrot
// if at least 10M away from player is player is running away"). It hops at you a hop at a time, zig-zagging, and bonks
// you with its carrot up close (a melee fighter, brawler.ts). With you Rabbit throws from or further off — or running
// away from it past Rabbit throws at a runner from — it stops, draws its carrot back (your warning) and throws it
// at you (it always has another). Pure.
import { Vector3 } from 'three';
import { FOES3B } from '../../tuning/foes3b';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** Which move (Enemy.move). */
export const BONK = 0;
export const THROW = 1;
/** You run away from it at this speed or faster (m/s). */
const RUNNING = 3;
/** Its zig-zag: how far aside each hop goes, as a share of the hop. */
const ZIG = 0.55;
const TURN = 10;
/** The carrot leaves its hand this high (a share of its height), a little upward. */
const HAND = 0.7;
const LOFT = 0.06;

const RABBIT: Brawl = {
  reach: () => FOES3B.v.rabbitReach,
  windup: () => FOES3B.v.rabbitWindup,
  damage: () => FOES3B.v.rabbitDamage,
  turn: TURN,
  windupTurn: 4,
  arc: 80,
  recover: 0.4,
  shove: 5,
  windupEvent: 'rabbitWindup',
  strikeEvent: 'rabbitBonk',
};

const from = new Vector3();
const aim = new Vector3();

export const rabbitWindup = (move: number) => (move === THROW ? FOES3B.v.rabbitThrowWindup : FOES3B.v.rabbitWindup);

export function updateRabbit(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES3B.v;
  const s = ENEMY_STATS[e.kind]();
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  // Running away from it: your run carries you off from it.
  const away = dist > 1e-3 ? (player.vel.x * dx + player.vel.z * dz) / dist : 0;
  if (e.phase === 'windup' && e.move === THROW) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * dt);
    if (e.t >= v.rabbitThrowWindup) {
      throwCarrot(e, index, player, w);
      setPhase(e, 'recover');
      e.cooldown = v.rabbitThrowGap;
    }
    land(e, dt);
    return;
  }
  const far = dist >= v.rabbitThrowFrom || (away >= RUNNING && dist >= v.rabbitRunFrom);
  if (e.phase === 'chase' && !player.dead && far && e.cooldown <= 0 && inLine(e, player, w.nav.small, s.height + 1) && armed(e)) {
    e.move = THROW;
    setPhase(e, 'windup');
    w.events.push('rabbitWindup', THROW, e.pos.x, e.pos.y + s.height * HAND, e.pos.z);
    land(e, dt);
    return;
  }
  if (e.phase !== 'windup') e.move = BONK;
  const x = e.pos.x;
  const z = e.pos.z;
  brawl(e, index, player, w, dt, RABBIT, armed(e));
  if (e.phase !== 'chase') {
    land(e, dt);
    return;
  }
  // A hop at a time: it rises and falls, and swerves to one side, then the other.
  e.strafeTime += dt;
  const hop = Math.max(0.1, v.rabbitHop);
  const k = (e.strafeTime % hop) / hop;
  e.pos.y = e.perch + Math.sin(Math.PI * k) * v.rabbitHopHigh;
  const moved = Math.hypot(e.pos.x - x, e.pos.z - z);
  if (moved > 1e-4 && dist > v.rabbitReach * 1.5) {
    const side = Math.floor(e.strafeTime / hop) % 2 === 0 ? 1 : -1;
    walk(e, (-dz / Math.max(dist, 1e-3)) * side, (dx / Math.max(dist, 1e-3)) * side, moved * ZIG, w.nav.small);
  }
}

/** Not hopping: on its feet. */
function land(e: Enemy, dt: number) {
  e.pos.y = Math.max(e.perch, e.pos.y - 6 * dt);
}

/** Its carrot, at you (a little up, so it flies over a low wall's lip). */
function throwCarrot(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES3B.v;
  from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + ENEMY_STATS[e.kind]().height * HAND, e.pos.z - Math.cos(e.facing) * 0.4);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  aim.y += LOFT;
  aim.normalize();
  if (fireOrb(w.orbs, from, aim, v.carrotSpeed, v.carrotDamage, e.kind, 'carrot')) w.events.push('rabbitThrow', index, from.x, from.y, from.z);
}
