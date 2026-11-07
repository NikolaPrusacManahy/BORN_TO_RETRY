// Update 0.5.4 — floor 10's Bone Axeman (the Bestiary pack's Skeleton A: a horned helm, armour, a great axe; the Universal Animation Library's
// heavy sword clips swung with it: MD/FLOOR10_HELL_PLAN.md). Slow and heavy: it walks at you and stands its ground, turning to you only so
// fast (you can get round it), and only a hard blow makes it flinch. In front of it: its overhead chop (open after), or from further off its
// leap into the floor, splitting it in a line of fire straight out in front of it (shown on the floor all through its leap: step off it, or
// jump it); behind it or beside it, its spin, all round it. Pure.
import { Vector3 } from 'three';
import { FOES_HELL } from '../../tuning/foesHell';
import { BURN_EVERY, onLine, splitFloor } from '../combat/hellfire';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeAt, hasCells } from '../../world/navGrid';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, turn, walk, yawTo } from './enemy';
import { CHOP, GUARD, SPIN, SPLIT_FLOOR, STAND } from './hellShared';
import { ENEMY_STATS } from './kinds';
import { martial, Style } from './martial';
import { armed } from './tokens';

const v = () => FOES_HELL.v;
/** Its line starts this far in front of it (m: where its axe meets the floor), and is found clear of walls in steps of this (m). */
const AXE_OUT = 0.7;
const STEP = 0.25;

const way = new Vector3();

/** How far round from its front you are (rad: 0 dead ahead, π right behind it). */
export const offFront = (e: Enemy, player: PlayerState) => {
  const toward = yawTo(e, player.pos.x, player.pos.z);
  return Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
};
const within = (deg: number) => (e: Enemy, player: PlayerState) => offFront(e, player) <= (deg * Math.PI) / 180;
const behind = (e: Enemy, player: PlayerState) => offFront(e, player) >= (75 * Math.PI) / 180;

/** A heavy's stance (the Bone Axeman's, the Bone Guard's): from afar, walking at you (till it's `far` off; again once you're 0.6 m past it);
 *  near, planted, turning to you only `turnRate` fast (rad/s), `hold` its move standing there (its axe ready; its guard up). Its blows reach
 *  that far. */
export function plod(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number, dist: number, toward: number, far: number, turnRate: number, hold: number) {
  const s = ENEMY_STATS[e.kind]();
  const grid = s.size === 'large' ? 'large' : 'small';
  const planted = e.move === STAND || e.move === GUARD;
  if (dist > far + (planted ? 0.6 : 0) || !inLine(e, player, w.nav[grid], s.height * 0.75)) {
    e.move = 0;
    const how = chaseDir(w.flow[grid], w.nav[grid], e.pos, player.pos.x, player.pos.z, way);
    if (how === 'none') return;
    e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), 6 * dt);
    walk(e, way.x, way.z, s.speed * dt, w.nav[grid]);
    return;
  }
  e.move = hold;
  e.facing = turn(e.facing, toward, turnRate * dt);
}

/** How far its line of fire runs out in front of it, from where its axe meets the floor up to the first wall (m). */
export function splitLength(e: Enemy, w: EnemyWorld): number {
  const g = w.nav.small;
  const fx = -Math.sin(e.facing);
  const fz = -Math.cos(e.facing);
  const x0 = e.pos.x + fx * AXE_OUT;
  const z0 = e.pos.z + fz * AXE_OUT;
  let len = 0;
  while (len < v().splitLong && (!hasCells(g) || freeAt(g, x0 + fx * (len + STEP), z0 + fz * (len + STEP)))) len += STEP;
  return Math.min(len, v().splitLong);
}

/** Its axe meets the floor: the line bursts into fire, and you on it are burned and thrown up. */
function split(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  if (!w.ground) return;
  const fx = -Math.sin(e.facing);
  const fz = -Math.cos(e.facing);
  const ax = e.pos.x + fx * AXE_OUT;
  const az = e.pos.z + fz * AXE_OUT;
  const long = splitLength(e, w);
  const fire = w.ground.hellfire;
  const line = splitFloor(fire, ax, az, ax + fx * long, az + fz * long, e.pos.y);
  w.events.push('axeSplit', long, ax, e.pos.y + 0.1, az);
  if (player.dead || !onLine(line, player)) return;
  fire.burn = BURN_EVERY;
  if (!damagePlayer(player, v().splitHit, e.kind)) return;
  player.vel.y = Math.max(player.vel.y, 7);
  player.grounded = false;
  w.events.push('splitBurn', 1, player.pos.x, player.pos.y + 0.2, player.pos.z);
  void index;
}

export const BONE_AXEMAN: Style = {
  stance: [0, 2.4],
  pace: 0.95,
  every: [1, 1.8],
  stand: (e, player, w, dt, dist, toward) => plod(e, player, w, dt, dist, toward, BONE_AXEMAN.stance[1], v().axemanTurn, STAND),
  strikes: [
    { move: CHOP, from: 0, to: 3, reach: 2.4, arc: 45, damage: () => v().axeChop, shove: 10, lunge: 2, lungeTo: 0.6, recover: 0.75, weight: 1.5, event: 'axeChop', when: within(55) },
    { move: SPLIT_FLOOR, from: 3, to: 8, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.8, weight: 1.2, event: 'axeSplitWarn', straight: true, fire: split, when: within(18) },
    { move: SPIN, from: 0, to: 3, reach: 2.5, arc: 180, damage: () => v().axeSpin, shove: 12, lift: 4, recover: 0.6, event: 'axeSpin', straight: true, when: behind },
  ],
};

export function updateBoneAxeman(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  martial(e, index, player, w, dt, BONE_AXEMAN, armed(e));
  // (Its line, through its leap: how far it'll run, for the floor to show it.)
  if (e.phase === 'windup' && e.move === SPLIT_FLOOR) e.aim.set(splitLength(e, w), 0, 0);
}
