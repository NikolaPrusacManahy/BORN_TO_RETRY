// Update 0.2.4 — the Skull Orc, floor 4's mini boss beside the big Cactoro (the designer: "the tough looking green goblin
// with the skull mask"; a floor "smarter than ordinary enemies"). It guards: every blow from in front of it (within
// Skull Orc guard of its facing) it turns on its club (evade.ts); Skull Orc riposte of them in a row and it strikes back
// at once. Get round it (a dash to its side or back), or hit it while it swings or after. Every Skull Orc pause it
// picks: its club combo (Club swings, each a step at you) or a leap (its landing glowing; a slam and a quake ring).
// Only a hard hit staggers it; it carries its room's key. Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { FOES4 } from '../../tuning/foes4';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir, freeSpotNear } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Which move (Enemy.move). */
export const COMBO = 0;
export const LEAP = 1;
export const RIPOSTE = 2;
/** Its riposte's warning (s): short. */
const RIPOSTE_WINDUP = 0.25;
/** Each swing steps it at you this far (m); its swing's arc either side of its facing (rad). */
const STEP = 1.1;
const ARC = 1.1;
const TURN = 4;
const STAND_OFF = 1.5;
/** Its leap's height (m); its slam's quake ring: how fast it rolls (m/s), how far (m), what it does to you. */
const LEAP_ARC = 3.5;
const QUAKE = { speed: 12, reach: 10, damage: 10 };

const way = new Vector3();

export function orcWindup(move: number): number {
  const v = FOES4.v;
  return move === COMBO ? v.comboWindup : move === LEAP ? v.orcLeapWindup : RIPOSTE_WINDUP;
}

export function updateSkullOrc(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover': {
      const swings = e.move === COMBO ? Math.round(v.comboSwings) : e.move === RIPOSTE ? 1 : 0;
      if (e.shots < swings && e.t >= e.shots * v.comboGap) {
        e.shots++;
        swing(e, index, player, w, e.move === RIPOSTE ? 1.4 : 1);
      }
      if (e.t >= Math.max(0, swings - 1) * v.comboGap + 0.7) {
        setPhase(e, 'chase');
        e.cooldown = v.orcPause;
      }
      break;
    }
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.cooldown <= 0) {
        e.move = dist - radiusOf(e) <= v.clubReach + 2 ? COMBO : w.rng() < 0.6 ? LEAP : COMBO;
        setPhase(e, 'windup');
        w.events.push('orcWindup', e.move, e.pos.x, e.pos.y + s.height * 0.7, e.pos.z);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(e) + STAND_OFF)) break;
      walk(e, way.x, way.z, s.speed * dt, w.nav.large);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * (e.move === LEAP ? 1 : 0.6) * dt);
      if (e.t < orcWindup(e.move)) break;
      e.shots = 0;
      if (e.move === LEAP) {
        e.aim.y = 0;
        if (freeSpotNear(w.nav.large, player.pos.x, player.pos.z, e.aim)) {
          e.aim.y = e.pos.y;
          e.from.copy(e.pos);
          setPhase(e, 'leap');
          w.events.push('orcLeap', index, e.pos.x, e.pos.y + 1, e.pos.z);
          break;
        }
      }
      setPhase(e, 'recover');
      break;
    case 'leap': {
      const k = Math.min(1, e.t / v.orcLeapAir);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
      e.pos.y = e.from.y + 4 * LEAP_ARC * k * (1 - k);
      if (k < 1) break;
      e.pos.copy(e.aim);
      walk(e, 0, 0, 0, w.nav.large);
      slam(e, index, player, w);
      e.move = LEAP;
      setPhase(e, 'recover');
      break;
    }
    default:
      break;
  }
}

/** Its guard turned enough blows in a row: it strikes back now. */
export function riposte(e: Enemy, index: number, w: Pick<EnemyWorld, 'events'>) {
  e.move = RIPOSTE;
  setPhase(e, 'windup');
  w.events.push('orcRiposte', index, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.7, e.pos.z);
}

/** A swing of its club: a step at you, and on you if you're in front within its reach. */
function swing(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, hard: number) {
  const v = FOES4.v;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  const step = Math.min(STEP, Math.max(0, dist - radiusOf(e) - 1));
  if (step > 0) walk(e, dx / dist, dz / dist, step, w.nav.large);
  w.events.push('orcSwing', index, e.pos.x - Math.sin(e.facing) * radiusOf(e), e.pos.y + 1.2, e.pos.z - Math.cos(e.facing) * radiusOf(e));
  const left = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(e, player.pos.x, player.pos.z) - e.facing), Math.cos(yawTo(e, player.pos.x, player.pos.z) - e.facing)));
  if (left > v.clubReach + radiusOf(e) || off > ARC || player.pos.y - e.pos.y > 2.5 || !damagePlayer(player, v.clubDamage * hard, e.kind)) return;
  player.vel.x += (left > 1e-3 ? dx / left : 1) * 9;
  player.vel.z += (left > 1e-3 ? dz / left : 0) * 9;
  player.vel.y = Math.max(player.vel.y, 4);
  player.grounded = false;
}

/** Its leap comes down: close by you're hurt; a quake ring rolls out (jump it). */
function slam(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  w.events.push('orcSlam', index, e.pos.x, e.pos.y, e.pos.z);
  startQuake(w.quakes, e.pos.x, e.pos.y, e.pos.z, QUAKE.speed, QUAKE.reach, QUAKE.damage, BOSS.v.quakeClear, e.kind);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > v.orcLeapReach + radiusOf(e) || player.pos.y - e.pos.y > 2.5 || !damagePlayer(player, v.orcLeapDamage, e.kind)) return;
  player.vel.x += (d > 1e-3 ? dx / d : 1) * 10;
  player.vel.z += (d > 1e-3 ? dz / d : 0) * 10;
  player.vel.y = Math.max(player.vel.y, 6);
  player.grounded = false;
}
