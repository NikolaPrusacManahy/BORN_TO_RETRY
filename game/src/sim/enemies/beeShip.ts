// Update 0.3.18 — floor 8's first mini boss, Barbara the Bee's ship (the designer: "Mini boss - One spaceship"). It
// circles the room high and makes passes over you, its twin lasers firing down its line (Bee ship lasers). After Bombing
// every passes, a bombing run: its line marked on the ground (Bombing warning), then it flies it dropping Bombs down it.
// Then it drops low and hangs there cooling (Bee ship cool-down: the time to hit it: it's stunned, hits do more), and
// climbs back. Its passes' lines show as the Strafer's do. Only a hard hit staggers it. Pure.
import { Vector3 } from 'three';
import { FOES_MOON_B } from '../../tuning/foesMoonB';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import { fireOrb } from '../combat/orbs';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';

/** It circles this high (m), this far off (m); its passes run this low (m) and this far past you (m), this much faster;
 *  its bombing run this high (m); cooling it hangs this low (m); between moves it circles this long (s). Its moves
 *  (`move`): a pass, a bombing run. */
const ALT = 7;
const RING = 12;
const PASS_ALT = 3.4;
const PAST = 10;
const FAST = 1.6;
const BOMB_ALT = 6;
const LOW = 1.4;
const BETWEEN = 1.8;
export const PASS = 1;
export const BOMBING = 2;
/** Its twin guns this far either side of its middle (m); a bomb falls this long (s). */
const GUNS = 0.9;
const BOMB_FALL = 0.8;

const mid = new Vector3();
const dir = new Vector3();
const to = new Vector3();
const gun = new Vector3();

export function updateBeeShip(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES_MOON_B.v;
  const s = ENEMY_STATS.beeShip();
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      return;
    case 'stun':
      // Cooling, low: then up again.
      keepHeight(e, LOW, dt);
      e.facing = turn(e.facing, toward, 2 * dt);
      if (e.t >= v.coolLow) {
        e.cooldown = BETWEEN;
        setPhase(e, 'chase');
      }
      return;
    case 'chase': {
      keepHeight(e, ALT, dt);
      circle(e, player, w, s.speed * 0.7, RING * 0.6, toward, dt);
      if (player.dead || e.cooldown > 0 || Math.abs(e.pos.y - ALT) > 1.5 || !seesInAir(e, player, world)) return;
      // A pass, or after enough of them, a bombing run; either down a line across you.
      e.move = e.shots >= Math.round(v.bombingEvery) ? BOMBING : PASS;
      e.from.set(e.pos.x, 0, e.pos.z);
      dir.set(player.pos.x - e.pos.x, 0, player.pos.z - e.pos.z).normalize();
      e.aim.set(player.pos.x + dir.x * PAST, 0, player.pos.z + dir.z * PAST);
      e.near = 0;
      setPhase(e, 'windup');
      w.events.push(e.move === BOMBING ? 'beeBombLine' : 'strafeLine', index, e.from.x, 0, e.from.z);
      return;
    }
    case 'windup':
      keepHeight(e, e.move === BOMBING ? BOMB_ALT : PASS_ALT, dt);
      e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 6 * dt);
      if (e.t >= (e.move === BOMBING ? v.bombLine : 0.6)) setPhase(e, 'dive');
      return;
    case 'dive':
      return run(e, index, w, dt);
  }
}

/** Down its line: its lasers (a pass) or its bombs (a run), evenly along it. */
function run(e: Enemy, index: number, w: EnemyWorld, dt: number) {
  const v = FOES_MOON_B.v;
  const bombing = e.move === BOMBING;
  keepHeight(e, bombing ? BOMB_ALT : PASS_ALT, dt);
  dir.set(e.aim.x - e.pos.x, 0, e.aim.z - e.pos.z);
  const left = dir.length();
  const step = Math.min(left, ENEMY_STATS.beeShip().speed * FAST * dt);
  if (left > 1e-3) e.pos.addScaledVector(dir.divideScalar(left), step);
  e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 6 * dt);
  const total = Math.max(1e-3, Math.hypot(e.aim.x - e.from.x, e.aim.z - e.from.z));
  const along = 1 - (left - step) / total;
  const n = Math.round(bombing ? v.bombs : v.beeShipShots);
  middle(e, mid);
  while (e.near < n && along >= (e.near + 0.5) / n) {
    e.near++;
    if (bombing) {
      to.set(e.from.x + (e.aim.x - e.from.x) * along, 0, e.from.z + (e.aim.z - e.from.z) * along);
      if (dropBomb(w.bombs, mid, to, BOMB_FALL, v.bombReach, v.bombDamage, 8, 'beeShip', 'fire')) w.events.push('beeBombDrop', index, mid.x, mid.y, mid.z);
      continue;
    }
    // Its twin guns, either side, down onto its line a little ahead.
    for (const side of [-1, 1]) {
      gun.set(mid.x - dir.z * GUNS * side, mid.y, mid.z + dir.x * GUNS * side);
      to.set(mid.x + dir.x * 2 - dir.z * GUNS * side, 0.2, mid.z + dir.z * 2 + dir.x * GUNS * side).sub(gun).normalize();
      fireOrb(w.orbs, gun, to, 22, v.beeShipShot, 'beeShip', 'laser');
    }
    w.events.push('beeShipShot', index, mid.x, mid.y, mid.z);
  }
  if (left - step > 0.05) return;
  if (bombing) {
    // Run done: down low, cooling.
    e.shots = 0;
    e.move = 0;
    setPhase(e, 'stun');
    w.events.push('beeShipLow', index, mid.x, mid.y, mid.z);
    return;
  }
  e.shots++;
  e.move = 0;
  e.cooldown = BETWEEN;
  setPhase(e, 'chase');
}
