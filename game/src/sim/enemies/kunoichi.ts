// Update 0.3.33 — floor 8's Kunoichi (the More-enemies pack's ninja woman, a kunai made in code; the Universal Animation
// Library's wall runs and ninja jumps: MD/FLOOR8_SHRINE_PLAN.md). From a way off, with a wall beside her, she's up it
// and running along it (her body across it: engine/shrine/shrinePose.ts), then off it in a leap down on you; with no
// wall, she crouches and leaps; both come down where you were going, a blow all round her landing (jump it, or dash
// out). From range she throws two kunai; up close a hook or a kick. She side-steps blows a good deal. Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { fireOrb } from '../combat/orbs';
import type { CombatState } from '../combat/state';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { freeAt, NavGrid } from '../../world/navGrid';
import { Enemy, EnemyWorld, inLine, setPhase, walk } from './enemy';
import { martial, martialDodges, Style } from './martial';
import { beginLeap, leapStep } from './ninjaLeap';
import { HOOK, KICK, KUNAI, LAND, LEAP, WALLRUN_L, WALLRUN_R } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE.v;
/** She crouches this long before a leap from the floor (s); a wall this near beside her she can run (m); she's off it
 *  when you're this little ahead of her along it (m). */
export const CROUCH = 0.38;
const WALL_NEAR = [1.2, 2] as const;
const ALONG = 2;

const from = new Vector3();
const dir = new Vector3();

/** Two kunai at you, a little apart. */
function kunai(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + 1.4, e.pos.z - Math.cos(e.facing) * 0.4);
  for (const k of [-1, 1]) {
    dir.set(player.pos.x + Math.cos(e.facing) * k * 0.5 - from.x, player.pos.y + BODY.height * 0.55 - from.y, player.pos.z - Math.sin(e.facing) * k * 0.5 - from.z).normalize();
    fireOrb(w.orbs, from, dir, 22, v().kunai, e.kind, 'kunai');
  }
  w.events.push('kunaiThrow', index, from.x, from.y, from.z);
}

export const KUNOICHI: Style = {
  stance: [3.5, 6.5],
  pace: 1.2,
  every: [0.5, 1.2],
  dodge: () => v().kunoichiDodge,
  strikes: [
    { move: KUNAI, from: 5, to: 12, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.35, weight: 1.2, event: 'kunaiThrow', fire: kunai },
    { move: HOOK, from: 0, to: 2.6, reach: 1.8, arc: 70, damage: () => v().punch, shove: 7, lunge: 3.5, lungeTo: 0.5, recover: 0.35, event: 'karateStrike' },
    { move: KICK, from: 1.4, to: 3.3, reach: 2.3, arc: 45, damage: () => v().kick, shove: 13, lunge: 3, lungeTo: 0.45, recover: 0.5, event: 'karateKick' },
    // (Her landing: never picked.)
    { move: LAND, from: 99, to: 0, reach: v().leapReach, arc: 180, damage: () => v().leapHit, shove: 10, lift: 5, recover: 0.5, event: 'martialBlow' },
  ],
};
const LANDING = KUNOICHI.strikes.find((s) => s.move === LAND)!;

/** A wall beside her she can run along toward you: its way out from the wall, and the way along it to run (null: none). */
function wallBeside(e: Enemy, nav: NavGrid, player: PlayerState, out: { nx: number; nz: number; ax: number; az: number }): boolean {
  const tx = player.pos.x - e.pos.x;
  const tz = player.pos.z - e.pos.z;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (!WALL_NEAR.some((d) => !freeAt(nav, e.pos.x + dx * d, e.pos.z + dz * d))) continue;
    // Along it, the way that takes her toward you.
    const ax = -dz;
    const az = dx;
    const s = ax * tx + az * tz >= 0 ? 1 : -1;
    if (!freeAt(nav, e.pos.x + ax * s * 1.5, e.pos.z + az * s * 1.5)) continue;
    Object.assign(out, { nx: -dx, nz: -dz, ax: ax * s, az: az * s });
    return true;
  }
  return false;
}

const wall = { nx: 0, nz: 0, ax: 0, az: 0 };

export function updateKunoichi(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  if (e.phase === 'charge' && (e.move === WALLRUN_L || e.move === WALLRUN_R)) return wallRun(e, index, player, w, dt);
  if (e.phase === 'leap' && e.move === LEAP) return leapStep(e, index, w, v().leapTime, LANDING);
  if (e.phase === 'windup' && e.move === LEAP) {
    if (e.t >= CROUCH) beginLeap(e, index, player, w, v().leapTime, 'ninjaLeap');
    return;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'chase' && armed(e) && e.cooldown <= 0 && !player.dead && dist >= 5 && dist <= 14 && inLine(e, player, w.nav.small, 2)) {
    // Up a wall and along it, or a leap from the floor.
    if (wallBeside(e, w.nav.small, player, wall) && w.rng() < 0.75) {
      e.aim.set(wall.ax, 0, wall.az);
      e.from.set(wall.nx, 0, wall.nz);
      e.facing = Math.atan2(-wall.ax, -wall.az);
      // (The wall on her right or her left as she runs.)
      const right = -wall.nx * Math.cos(e.facing) + wall.nz * Math.sin(e.facing);
      e.move = right > 0 ? WALLRUN_R : WALLRUN_L;
      setPhase(e, 'charge');
      w.events.push('wallRun', index, e.pos.x, e.pos.y + 1, e.pos.z);
      return;
    }
    if (dist >= 6 && dist <= 11 && w.rng() < 0.45) {
      e.move = LEAP;
      setPhase(e, 'windup');
      return;
    }
  }
  martial(e, index, player, w, dt, KUNOICHI, armed(e));
}

/** Along the wall, fast; off it at you once you're beside her (or she runs out of wall, or time). */
function wallRun(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const step = v().wallRunSpeed * dt;
  const x = e.pos.x;
  const z = e.pos.z;
  walk(e, e.aim.x, e.aim.z, step, w.nav.small);
  const ahead = (player.pos.x - e.pos.x) * e.aim.x + (player.pos.z - e.pos.z) * e.aim.z;
  if (e.t >= v().wallRunFor || ahead < ALONG || Math.hypot(e.pos.x - x, e.pos.z - z) < step * 0.5 || player.dead) {
    e.cooldown = 1.5;
    beginLeap(e, index, player, w, v().leapTime, 'wallLeap');
  }
}

export const kunoichiDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => martialDodges(state, i, dirX, dirZ, KUNOICHI);
