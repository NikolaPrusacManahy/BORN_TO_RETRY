// Update 0.3.49 — the Dragon's ultimate, Inferno Core (the Boss Design Bible): it comes down in the room's middle (where it
// rose: Enemy.from), facing you, its chest open on a glowing core; the ground shakes, the music cuts, the core swells.
// Blows on its front go to the core, not its health. Enough in Core window: the core breaks, and it's stunned a long while
// (hits do more). Not enough: the whole room's blast. A pillar between you and it saves you, and goes; otherwise, heavy
// damage. Enemy.move: CORE coming down and charging, BLAST after; Enemy.shots: 1 once the blast has done its work;
// Enemy.blink: till the next rumble. Pure.
import { DRAGON } from '../../tuning/dragon';
import { pillarBetween, pillarsIn, PillarWorld, snapPillar } from '../combat/pillars';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BLAST, CORE, throwOff } from './dragonMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { openUltimate, stepUltimate } from './ultimate';

/** What the screen says. */
export const CORE_CUE = 'BREAK THE CORE';
/** The ground shakes this often while it charges (s). */
const RUMBLE = 0.5;
/** The blast lasts this long (s): a dash's moment doesn't slip all of it. */
export const BLAST_FOR = 0.35;
/** A pillar shields you if the line to you passes this close to its side (m). */
const SHIELD = 0.1;

/** Where its core is, for the blows and the blast: its middle, this high. */
export const CORE_UP = 0.5;

/** It goes for the middle. */
export function startCore(d: Enemy) {
  d.move = CORE;
  setPhase(d, 'dive');
}

/** One tick of it coming down in the middle. Returns true the tick it lands (its window opens). */
export function stepCoreLanding(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  const k = Math.min(1, dt / Math.max(dt, v.coreGlide - d.t));
  d.pos.x += (d.from.x - d.pos.x) * k;
  d.pos.y += -d.pos.y * k;
  d.pos.z += (d.from.z - d.pos.z) * k;
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.dragonTurn * 2 * dt);
  if (k < 1) return false;
  d.pos.set(d.from.x, 0, d.from.z);
  d.vel.set(0, 0, 0);
  d.facing = yawTo(d, player.pos.x, player.pos.z);
  d.blink = 0;
  setPhase(d, 'blast');
  openUltimate(d.ult, CORE_CUE, v.coreWindow, v.coreHp, (v.coreArc * Math.PI) / 180);
  w.events.push('dragonCore', index, d.pos.x, v.dragonHeight * CORE_UP, d.pos.z);
  return true;
}

/** One tick of its charge. Cancelled: it's stunned; failed: the blast. */
export function stepCore(d: Enemy, index: number, w: EnemyWorld, dt: number) {
  const v = DRAGON.v;
  d.blink -= dt;
  if (d.blink <= 0) {
    d.blink = RUMBLE;
    w.events.push('dragonRumble', 1 - d.ult.left / d.ult.window, d.pos.x, 0.1, d.pos.z);
  }
  const s = stepUltimate(d.ult, dt);
  if (s === 'open') return;
  if (s === 'cancelled') {
    setPhase(d, 'stun');
    w.events.push('dragonCoreBroken', index, d.pos.x, v.dragonHeight * CORE_UP, d.pos.z);
    return;
  }
  d.move = BLAST;
  d.shots = 0;
  setPhase(d, 'recover');
  w.events.push('dragonBurst', index, d.pos.x, 0.1, d.pos.z);
}

/** The blast's moment: a pillar between you takes it, and goes; or you do. */
export function stepBlast(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  if (d.shots > 0 || d.t > BLAST_FOR || player.dead) return;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const pillars = pillarsIn(w);
  const shield = pillars.length ? pillarBetween(pillars, d.pos.x, d.pos.z, player.pos.x, player.pos.z, SHIELD) : -1;
  if (shield >= 0) {
    d.shots = 1;
    snapPillar(w as unknown as PillarWorld, shield, yawTo(d, pillars[shield].x, pillars[shield].z));
    return;
  }
  if (!damagePlayer(player, v.coreDamage, d.kind)) return;
  d.shots = 1;
  throwOff(player, dx, dz, dist, d, v.coreShove, 8);
}
