// Update 0.0.18 — the Spider (the designer: a big floor 2 enemy; it carries its room's key). It scuttles at you round
// walls. From a middle distance, with nothing tall between, it rears for the warning (it glows, it hisses), then leaps
// in an arc to where you stood: on the ground close by, you're hurt and thrown (jump it). Close up it rears and bites
// instead. Then it stands a moment: your opening. Only a hard hit staggers it. Pure.
import { FOES2 } from '../../tuning/foes2';
import { wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { arcTo, closeIn } from './moves';

/** Its two moves (Enemy.move). */
export const SPIDER_LEAP = 0;
export const SPIDER_BITE = 1;
const TURN = 7;
/** Above its landing by more than this (m), you're clear of it. */
const LAND_CLEAR = 1.2;

export function updateSpider(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES2.v;
  const dx = player.pos.x - s.pos.x;
  const dz = player.pos.z - s.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= 0.4) setPhase(s, 'chase');
      break;
    case 'recover':
      if (s.t >= v.spiderRecover) setPhase(s, 'chase');
      break;
    case 'chase': {
      if (player.dead) break;
      const level = Math.abs(player.pos.y - s.pos.y) < 1.2;
      if (level && dist <= v.spiderReach * 0.9 && inLine(s, player, w.nav.large, 1.2)) {
        warn(s, index, SPIDER_BITE, w);
        break;
      }
      if (level && s.cooldown <= 0 && dist >= v.spiderLeapNear && dist <= v.spiderLeapFar && !wallBetween(w.nav.air, s.pos.x, s.pos.z, player.pos.x, player.pos.z)) {
        warn(s, index, SPIDER_LEAP, w);
        break;
      }
      closeIn(s, player, w, 'large', v.spiderSpeed, v.spiderReach * 0.8, TURN, dt);
      break;
    }
    case 'windup':
      s.facing = turn(s.facing, toward, TURN * 0.5 * dt);
      if (s.t < v.spiderWindup) break;
      if (s.move === SPIDER_BITE) bite(s, index, player, dist, toward, w);
      else leap(s, index, player, w);
      break;
    case 'leap': {
      const k = Math.min(1, s.t / v.spiderAir);
      arcTo(s, k, v.spiderArc);
      if (k >= 1) land(s, index, player, w);
      break;
    }
  }
}

function warn(s: Enemy, index: number, move: number, w: EnemyWorld) {
  s.move = move;
  setPhase(s, 'windup');
  w.events.push('spiderWindup', index, s.pos.x, s.pos.y + FOES2.v.spiderHeight * 0.6, s.pos.z);
}

function bite(s: Enemy, index: number, player: PlayerState, dist: number, toward: number, w: EnemyWorld) {
  const v = FOES2.v;
  setPhase(s, 'recover');
  w.events.push('spiderBite', index, s.pos.x, s.pos.y + v.spiderHeight * 0.4, s.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - s.facing), Math.cos(toward - s.facing)));
  if (dist > v.spiderReach + 0.4 || off > 1.2 || !inLine(s, player, w.nav.large, 1.2)) return;
  damagePlayer(player, v.spiderBite, s.kind);
}

function leap(s: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  s.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, s.aim)) {
    setPhase(s, 'chase');
    s.cooldown = 0.5;
    return;
  }
  s.aim.y = s.pos.y;
  s.from.copy(s.pos);
  s.facing = yawTo(s, s.aim.x, s.aim.z);
  setPhase(s, 'leap');
  w.events.push('spiderLeap', index, s.pos.x, s.pos.y + 0.5, s.pos.z);
}

function land(s: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES2.v;
  s.pos.copy(s.aim);
  walk(s, 0, 0, 0, w.nav.large);
  s.cooldown = v.spiderCooldown;
  setPhase(s, 'recover');
  w.events.push('spiderLand', index, s.pos.x, s.pos.y, s.pos.z);
  const dx = player.pos.x - s.pos.x;
  const dz = player.pos.z - s.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > v.spiderReach || player.pos.y - s.pos.y > LAND_CLEAR || !damagePlayer(player, v.spiderDamage, s.kind)) return;
  const nx = d > 1e-3 ? dx / d : -Math.sin(s.facing);
  const nz = d > 1e-3 ? dz / d : -Math.cos(s.facing);
  player.vel.x += nx * v.spiderShove;
  player.vel.z += nz * v.spiderShove;
  player.vel.y = Math.max(player.vel.y, 5);
  player.grounded = false;
}
