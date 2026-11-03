// Update 0.3.33 — floor 8's Sand Ninjas (the More-enemies pack's two in sand-coloured garb; the Universal Animation
// Library's throws, its scattering, its roll: MD/FLOOR8_SHRINE_PLAN.md). They keep off a way, low and side-stepping; now
// and then one lobs a smoke bomb at you (it bursts into a cloud you can't see through: combat/smoke.ts) and runs in out
// of it with a hook; or scatters caltrops across the floor between you (they cut you and slow you); crowd one and it
// rolls away from you. Up close, a jab or a hook. Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { scatterCaltrops, throwSmoke } from '../combat/smoke';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { martial, martialDodges, strikeTime, Style } from './martial';
import { CALTROPS, HOOK, JAB, ROLL, SMOKE } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE.v;
/** Its bomb flies this long a metre (s), at most this long; caltrops land this share of the way to you; it rolls away
 *  from you this near (m), at most this often (s). */
const FLIGHT = 0.07;
const FLIGHT_MAX = 1;
const CALTROPS_AT = 0.6;
const ROLL_NEAR = 2.8;
const ROLL_EVERY = 2;

/** Each one's own timers (s), kept in its aim (it never leaps): x its next smoke bomb, y its next caltrops, z its next
 *  roll; set at its first tick (its stage 1 then). */
function timers(e: Enemy, rng: () => number) {
  if (e.stage === 0) {
    e.aim.set(2 + 3 * rng(), 1 + 3 * rng(), 0);
    e.stage = 1;
  }
  return e.aim;
}

const from = new Vector3();
const to = new Vector3();

function smoke(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  if (!w.ground) return;
  from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + 1.7, e.pos.z - Math.cos(e.facing) * 0.4);
  to.set(player.pos.x, 0, player.pos.z);
  throwSmoke(w.ground.smoke, from, to, Math.min(FLIGHT_MAX, from.distanceTo(to) * FLIGHT));
  e.aim.x = v().smokeEvery;
  w.events.push('smokeThrow', index, from.x, from.y, from.z);
}

function caltrops(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  if (!w.ground) return;
  const x = e.pos.x + (player.pos.x - e.pos.x) * CALTROPS_AT;
  const z = e.pos.z + (player.pos.z - e.pos.z) * CALTROPS_AT;
  scatterCaltrops(w.ground.smoke, x, z, v().caltropsSize, v().caltropsLast);
  e.aim.y = v().caltropsEvery;
  w.events.push('caltropsScatter', index, x, 0.1, z);
}

export const SAND: Style = {
  stance: [4, 7.5],
  pace: 1.1,
  every: [0.6, 1.4],
  dash: { from: 3.5, to: 7, then: HOOK },
  dodge: () => 0.15,
  strikes: [
    { move: SMOKE, from: 5, to: 13, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.4, weight: 3, event: 'smokeThrow', fire: smoke, ready: (e) => e.stage > 0 && e.aim.x <= 0 },
    { move: CALTROPS, from: 2.5, to: 8, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.4, weight: 3, event: 'caltropsScatter', fire: caltrops, ready: (e) => e.stage > 0 && e.aim.y <= 0 },
    { move: JAB, from: 0, to: 2.8, reach: 1.8, arc: 50, damage: () => v().punch * 0.8, shove: 5, lunge: 4, lungeTo: 0.3, recover: 0.35, event: 'karateStrike' },
    { move: HOOK, from: 0, to: 2.6, reach: 1.8, arc: 70, damage: () => v().punch, shove: 7, lunge: 3, lungeTo: 0.5, recover: 0.4, event: 'karateStrike' },
  ],
};
/** Its roll away from you: this fast (m/s), through this share of the clip. (Not an attack: no turn taken.) */
const ROLL_SPEED = 5.5;
const ROLL_GOES = 0.7;

export function updateSandNinja(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const t = timers(e, w.rng);
  t.x -= dt;
  t.y -= dt;
  t.z -= dt;
  // Crowded: away in a roll (facing away, forward through it).
  if (e.phase === 'recover' && e.move === ROLL) {
    const dur = strikeTime(ROLL, SAND.pace);
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z) + Math.PI, 12 * dt);
    if (e.t < dur * ROLL_GOES) walk(e, -Math.sin(e.facing), -Math.cos(e.facing), ROLL_SPEED * dt, w.nav.small);
    if (e.t >= dur) {
      e.move = 0;
      setPhase(e, 'chase');
    }
    return;
  }
  if (e.phase === 'chase' && t.z <= 0 && !player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < ROLL_NEAR) {
    t.z = ROLL_EVERY;
    e.move = ROLL;
    setPhase(e, 'recover');
    w.events.push('sandRoll', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
    return;
  }
  martial(e, index, player, w, dt, SAND, armed(e));
}

export const sandDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => martialDodges(state, i, dirX, dirZ, SAND);
