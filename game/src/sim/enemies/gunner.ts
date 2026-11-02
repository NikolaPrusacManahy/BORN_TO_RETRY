// Update 0.3.18 — floor 8's Gunner (Fernando the Flamingo, on foot; the plan: "Flamingo — range"). It keeps Gunner
// keeps off to Gunner range from you, where it can see you, sidestepping; with its turn (a ranged one's: no more than
// two shoot at once) its gun glows (Gunner aim), then it fires a burst of slow blaster bolts at your chest, one every
// Gunner bolt gap: step aside. Then it moves on (Gunner every). Cornered (you within 3 m), it kicks you off (brawler.ts)
// and backs away. Pure.
import { Vector3 } from 'three';
import { FOES_MOON } from '../../tuning/foesMoon';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { keepRing } from './moves';
import { armed } from './tokens';

const KICK: Brawl = {
  reach: () => 2.2,
  windup: () => 0.45,
  damage: () => FOES_MOON.v.gunnerKick,
  turn: 8,
  windupTurn: 4,
  arc: 110,
  recover: 0.5,
  shove: 11,
  windupEvent: 'gunnerWindup',
  strikeEvent: 'gunnerKick',
};
/** Its move (`move`) firing a burst; you this near, it kicks; its gun is this high (m). */
export const BURST = 1;
const CORNER = 3;
export const GUN = 1.25;

const way = new Vector3();
const from = new Vector3();
const dir = new Vector3();

export function updateGunner(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.gunner();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.move === BURST && (e.phase === 'windup' || e.phase === 'charge')) return burst(e, index, player, w, dt);
  if (e.phase !== 'chase' || player.dead || dist < CORNER) {
    brawl(e, index, player, w, dt, KICK, true);
    return;
  }
  const sees = inLine(e, player, w.nav.small, 3);
  if (e.cooldown <= 0 && dist <= v.gunnerFar && sees && armed(e)) {
    e.move = BURST;
    e.shots = 0;
    setPhase(e, 'windup');
    w.events.push('gunnerAim', index, e.pos.x, e.pos.y + GUN, e.pos.z);
    return;
  }
  // Too close, it backs off; too far (past the middle of its range) or out of sight, it comes round to see you; else it
  // sidesteps where it is.
  if (dist < v.gunnerNear) keepRing(e, player, w, 'small', s.speed, v.gunnerNear, 8, dt);
  else if (dist > (v.gunnerNear + v.gunnerFar) / 2 + 1 || !sees) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
    if (chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
  } else keepRing(e, player, w, 'small', s.speed * 0.8, 0, 8, dt);
}

/** Its gun glowing, then its bolts, one a gap, each at your chest as you are then. */
function burst(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 10 * dt);
  if (e.phase === 'windup') {
    if (e.t < v.gunnerAim) return;
    setPhase(e, 'charge');
    e.t = v.gunnerGap;
  }
  if (e.t < v.gunnerGap) return;
  e.t = 0;
  if (!player.dead) {
    from.set(e.pos.x - Math.sin(e.facing) * 0.6, e.pos.y + GUN, e.pos.z - Math.cos(e.facing) * 0.6);
    dir.set(player.pos.x - from.x, player.pos.y + AIM_HEIGHT - from.y, player.pos.z - from.z).normalize();
    if (fireOrb(w.orbs, from, dir, v.boltSpeed, v.boltDamage, 'gunner', 'laser')) w.events.push('gunnerShot', index, from.x, from.y, from.z);
  }
  if (++e.shots < Math.round(v.gunnerShots)) return;
  e.move = 0;
  e.cooldown = v.gunnerEvery;
  setPhase(e, 'recover');
}
