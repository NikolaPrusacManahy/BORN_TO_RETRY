// Update 0.3.15 — Mako, floor 6's big shark (a mini boss; the designer: "mini boss is the big shark"; the Pirate Kit's
// Mako, its cleaver). On its feet its cleaver (brawler.ts) for Mako stays up; then, on sand, it dives in (out of reach of
// every blow) and swims through the sand at you, only its fin showing (the view's), fast (Mako sand swim); under you
// the sand churns (Mako rise: step off it) and it erupts, biting (Mako bite: thrown up). On boards it can't dive: it
// charges you down instead (Mako charge). Only a hard hit staggers it. (Floor 4's Cactoros come up behind you in a ring
// of spines; Mako hunts you head-on, its fin in plain sight.) Pure.
import { Vector3 } from 'three';
import { FOES_COVE_B } from '../../tuning/foesCoveB';
import { over } from '../dungeon/ground';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { BURIED } from './cactoro';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const CLEAVER: Brawl = {
  reach: () => FOES_COVE_B.v.makoReach,
  windup: () => FOES_COVE_B.v.makoWindup,
  damage: () => FOES_COVE_B.v.makoDamage,
  turn: 7,
  windupTurn: 3,
  arc: 90,
  recover: 0.65,
  shove: 10,
  windupEvent: 'makoWindup',
  strikeEvent: 'makoStrike',
};
/** Its moves (`move`): rising out of the sand. Under it gives up hunting after this long (s) and comes up where it is;
 *  close enough under you (m); it bites this near the spot (m), throwing you up this fast (m/s); a charge lasts this long
 *  at most (s) and runs you down this near (m); its rest after one (s). */
export const RISING = 1;
const HUNT_FOR = 4.5;
const UNDER_YOU = 1;
export const BITE = 2;
const THROWN = 9;
const CHARGE_FOR = 1.4;
const RUN_DOWN = 1.3;
const SHOVE = 11;

const way = new Vector3();

export function updateMako(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE_B.v;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'burrow') return swim(e, index, player, w, dt, dist);
  if (e.phase === 'windup' && e.move === RISING) {
    if (e.t < v.makoRise) return;
    e.pos.y = e.prev.y = 0;
    e.move = 0;
    e.near = 0;
    w.events.push('makoBite', index, e.pos.x, 1, e.pos.z);
    const d = Math.hypot(player.pos.x - e.aim.x, player.pos.z - e.aim.z);
    if (!player.dead && d < BITE && player.pos.y < 1.5 && damagePlayer(player, v.makoBite, 'mako')) {
      player.vel.y = Math.max(player.vel.y, THROWN);
      player.grounded = false;
    }
    setPhase(e, 'recover');
    return;
  }
  if (e.phase === 'charge') return charge(e, player, dt, w, dist);
  if (e.phase === 'chase' || e.phase === 'recover') e.near += dt;
  if (e.phase === 'chase' && !player.dead && e.near >= v.makoUp && armed(e)) {
    e.near = 0;
    // On sand it dives; on boards (or anything up off the ground) it charges.
    if (e.pos.y < 0.3 && !over(w.ground?.boards ?? [], e.pos.x, e.pos.z)) {
      w.events.push('makoDive', index, e.pos.x, 0.3, e.pos.z);
      e.pos.y = e.prev.y = BURIED;
      setPhase(e, 'burrow');
    } else {
      // (Its way, straight at you: kept in `from`.)
      e.facing = yawTo(e, player.pos.x, player.pos.z);
      e.from.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
      e.struck = false;
      setPhase(e, 'charge');
      w.events.push('makoCharge', index, e.pos.x, 1, e.pos.z);
    }
    return;
  }
  brawl(e, index, player, w, dt, CLEAVER, armed(e));
}

/** Through the sand at you (round walls); under you, or after a while, the sand churns where it'll come up. */
function swim(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, dist: number) {
  const v = FOES_COVE_B.v;
  if (!player.dead && dist > UNDER_YOU) {
    const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
    if (how !== 'none') {
      walk(e, way.x, way.z, Math.min(dist, v.makoSwim * dt), w.nav.large);
      e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), 8 * dt);
    }
    e.pos.y = e.prev.y = BURIED;
  }
  if (dist > UNDER_YOU && e.t < HUNT_FOR && !player.dead) return;
  e.aim.set(e.pos.x, 0, e.pos.z);
  e.move = RISING;
  setPhase(e, 'windup');
  w.events.push('makoRise', index, e.aim.x, 0.05, e.aim.z);
}

/** Running you down in a straight line (`from`: its way), to a wall or the end of it. */
function charge(e: Enemy, player: PlayerState, dt: number, w: EnemyWorld, dist: number) {
  const v = FOES_COVE_B.v;
  const x = e.pos.x;
  const z = e.pos.z;
  walk(e, e.from.x, e.from.z, v.makoCharge * dt, w.nav.large);
  const stuck = Math.hypot(e.pos.x - x, e.pos.z - z) < v.makoCharge * dt * 0.3;
  if (!e.struck && !player.dead && dist < RUN_DOWN + ENEMY_STATS.mako().radius && Math.abs(player.pos.y - e.pos.y) < 2) {
    e.struck = true;
    if (damagePlayer(player, v.makoChargeDamage, 'mako')) {
      player.vel.x += e.from.x * SHOVE;
      player.vel.z += e.from.z * SHOVE;
      player.vel.y = Math.max(player.vel.y, 4);
      player.grounded = false;
    }
  }
  if (stuck || e.t >= CHARGE_FOR) setPhase(e, 'recover');
}
