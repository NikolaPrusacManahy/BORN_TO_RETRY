// Update 0.5.5 — floor 10's Brimstone Bee (MD/FLOOR10_HELL_PLAN.md; the Ultimate Monsters' Armabee Evolved, soot and lava: tools/hell_paint.py).
// A flier over the fight, the floor's percher: it hovers high, circling you a way off, and every few seconds rears back (your warning) and drops
// a fire bomb where you're running to; the spot's ringed on the floor from the moment it drops (engine/boss/bombView.ts), its burst hurts you in
// it, and it leaves a pool of fire burning a while. It dips low as it drops one, and a moment after: in reach of your fists then. Out of
// sight, it comes round. Pure.
import { Vector3 } from 'three';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, seesInAir } from './fly';
import { BEE_BOMB } from './hellShared';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const v = () => FOES_HELL_B.v;
const TURN = 8;
/** It drops from no further than this (m); after a bomb, before it moves (s); how far ahead of your run its bomb lands (1: where you'll be). */
const FAR = 16;
const RECOVER = 0.9;
const LEAD = 0.6;
const SHOVE = 8;

const from = new Vector3();
const to = new Vector3();

export function updateBrimBee(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  keepHeight(e, e.phase === 'windup' || e.phase === 'recover' ? v().beeDip : v().beeAlt, dt);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      return;
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= RECOVER) setPhase(e, 'chase');
      return;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v().beeWindup) return;
      bomb(e, index, player, w);
      e.cooldown = v().beeEvery * (0.8 + 0.4 * w.rng());
      setPhase(e, 'recover');
      return;
    case 'chase': {
      if (player.dead) return;
      const sees = seesInAir(e, player, world);
      if (sees && dist <= FAR && e.cooldown <= 0 && armed(e)) {
        e.move = BEE_BOMB;
        setPhase(e, 'windup');
        w.events.push('beeWindup', index, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
        return;
      }
      if (!sees || dist > FAR) flyCloser(e, player, w, v().beeSpeed, toward, dt);
      else circle(e, player, w, v().beeSpeed, v().beeNear, toward, dt);
      return;
    }
    default:
      return;
  }
}

/** Its bomb, dropped for where you're running to (on the floor). */
function bomb(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const fall = v().beeFall;
  from.set(e.pos.x, e.pos.y - 0.2, e.pos.z);
  to.set(player.pos.x + player.vel.x * fall * LEAD, player.grounded ? player.pos.y : Math.max(0, e.pos.y - v().beeAlt), player.pos.z + player.vel.z * fall * LEAD);
  if (dropBomb(w.bombs, from, to, fall, v().beeRadius, v().beeBomb, SHOVE, e.kind, 'ember')) w.events.push('beeBomb', index, from.x, from.y, from.z);
}
