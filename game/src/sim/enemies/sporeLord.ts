// Update 0.5.5 — floor 10's Spore Lord (MD/FLOOR10_HELL_PLAN.md; the Ultimate Monsters' Mushnub Evolved, ashen under an ember cap: tools/
// hell_paint.py), a mini boss. It plods at you. Every pause, by how near you are: it shakes itself (your warning) and puffs burning spore clouds
// out round it, which drift your way and burn you in them, and blow up near fire (combat/spores.ts: lure them over lava, by a vent, through a
// line of fire, and it's caught in its own); it squats and hops into a slam (a blow close by, a ring rolling out: jump it); close in front, a
// bite. Only a hard hit staggers it. Pure.
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { pushOutOfWalls } from '../../world/navGrid';
import { meleeHit } from '../combat/meleeParry';
import { startQuake } from '../combat/quakes';
import { liveClouds, puffSpores, SPORE_POOL } from '../combat/spores';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, yawTo } from './enemy';
import { BITE, PUFF, SPORE_SLAM } from './hellShared';
import { closeIn } from './moves';
import { armed } from './tokens';

const v = () => FOES_HELL_B.v;
const TURN = 2.4;
/** It stops walking this close (m); its bite's warning (s) and arc (°, either side); its hop: in the air this long (s), this high (m), at
 *  most this far toward you (m); its ring clears this high (m); after a move, before it goes on (s). Within this it may slam (m). */
const STAND_OFF = 2.4;
const BITE_WINDUP = 0.45;
const BITE_ARC = 70;
const HOP_AIR = 0.45;
const HOP_HIGH = 1.6;
const HOP_FAR = 2;
const RING_CLEAR = 0.9;
const RECOVER = 0.6;
const SLAM_NEAR = 8;

export const sporeWindup = (move: number) => (move === PUFF ? v().sporeWindup : move === SPORE_SLAM ? v().sporeSlamWindup : BITE_WINDUP);

/** Its next move: a bite close in front, else a slam or a puff (a slam if the air's thick with its spores already). */
function pick(dist: number, w: EnemyWorld): number {
  const clouds = w.ground ? liveClouds(w.ground.spores) : SPORE_POOL;
  if (dist <= v().sporeBiteReach + 0.6 && w.rng() < 0.6) return BITE;
  if (clouds > SPORE_POOL - Math.round(v().sporeClouds)) return SPORE_SLAM;
  return dist <= SLAM_NEAR && w.rng() < 0.45 ? SPORE_SLAM : PUFF;
}

export function updateSporeLord(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= 0.4) setPhase(e, 'chase');
      return;
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= RECOVER) {
        setPhase(e, 'chase');
        e.cooldown = v().sporePause;
      }
      return;
    case 'chase':
      if (player.dead) return;
      if (e.cooldown <= 0 && armed(e) && Math.abs(player.pos.y - e.pos.y) < 3) {
        e.move = pick(dist, w);
        setPhase(e, 'windup');
        w.events.push('sporeWindup', e.move, e.pos.x, e.pos.y + v().sporeHeight * 0.6, e.pos.z);
        return;
      }
      closeIn(e, player, w, 'large', v().sporeSpeed, STAND_OFF, TURN, dt);
      return;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * (e.move === BITE ? 2 : 1) * dt);
      if (e.t < sporeWindup(e.move)) return;
      if (e.move === PUFF) {
        if (w.ground) puffSpores(w.ground.spores, e.pos.x, e.pos.y, e.pos.z, Math.round(v().sporeClouds), w.rng);
        w.events.push('sporePuff', index, e.pos.x, e.pos.y + 1, e.pos.z);
        setPhase(e, 'recover');
      } else if (e.move === SPORE_SLAM) {
        // A hop, a little toward you.
        const step = Math.min(HOP_FAR, Math.max(0, dist - STAND_OFF));
        e.from.copy(e.pos);
        e.aim.set(e.pos.x - Math.sin(e.facing) * step, e.pos.y, e.pos.z - Math.cos(e.facing) * step);
        setPhase(e, 'leap');
      } else {
        bite(e, index, player, w);
        setPhase(e, 'recover');
      }
      return;
    case 'leap': {
      const k = Math.min(1, e.t / HOP_AIR);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
      e.pos.y = e.from.y + 4 * HOP_HIGH * k * (1 - k);
      if (k < 1) return;
      e.pos.y = e.from.y;
      pushOutOfWalls(w.nav.large, e.pos, radiusOf(e));
      slam(e, index, player, w);
      setPhase(e, 'recover');
      return;
    }
    default:
      return;
  }
}

/** Its landing: you close by hurt and thrown, a ring rolling out. */
function slam(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  w.events.push('sporeSlam', v().sporeQuakeReach, e.pos.x, e.pos.y + 0.1, e.pos.z);
  startQuake(w.quakes, e.pos.x, e.pos.y, e.pos.z, 12, v().sporeQuakeReach, v().sporeQuake, RING_CLEAR, e.kind);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (player.dead || d > v().sporeSlamReach + radiusOf(e) || player.pos.y - e.pos.y > 1.5 || !damagePlayer(player, v().sporeSlam, e.kind)) return;
  const len = Math.max(d, 1e-3);
  player.vel.x += (dx / len) * 10;
  player.vel.z += (dz / len) * 10;
  player.vel.y = Math.max(player.vel.y, 6);
  player.grounded = false;
  void index;
}

/** Its bite: you close in front of it. */
function bite(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  w.events.push('sporeBite', index, e.pos.x - Math.sin(e.facing) * 1.2, e.pos.y + 1, e.pos.z - Math.cos(e.facing) * 1.2);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(e, player.pos.x, player.pos.z) - e.facing), Math.cos(yawTo(e, player.pos.x, player.pos.z) - e.facing)));
  if (player.dead || d > v().sporeBiteReach + radiusOf(e) + BODY.radius || off > (BITE_ARC * Math.PI) / 180 || Math.abs(player.pos.y - e.pos.y) > 2) return;
  if (!meleeHit(player, w, e, index, v().sporeBite)) return;
  const len = Math.max(d, 1e-3);
  player.vel.x += (dx / len) * 8;
  player.vel.z += (dz / len) * 8;
}
