// Update 0.3.29 — Tidebreaker's wrecking (tidebreaker.ts; the designer: "full destructions, maybe they can grab a pillar
// … can shake the whole place"): it goes for a pillar near it, kneels and tears it out of the floor (its stump left),
// swings it down at you and hurls it (tidebreaker.ts, tideMoves.ts); raging, its quake: its anchor brought down on the
// floor, rings rolling out one after another (jump each), every pillar near it snapping, rock shaken down all round
// you. Pure.
import { Vector3 } from 'three';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { BOSS } from '../../tuning/boss';
import { startQuake } from '../combat/quakes';
import { breakAround, standingNear, uprootPillar } from '../combat/pillars';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { callRocks } from './tideMoves';
import { paceOf, PILLAR, RING_SPEED, SWING, warn, wrecks } from './tideShared';

/** It gives up on a pillar after this long walking to it (s); it kneels this near it (m, past its side); its quake's
 *  rings this far apart (s); its rock falls this far round you (m). */
const GIVE_UP = 4;
const BESIDE = 0.9;
const RING_GAP = 0.6;
const SPREAD = 14;

const way = new Vector3();

/** Off to the pillar nearest it, if one stands near enough (false: none). */
export function goForPillar(d: Enemy, w: EnemyWorld): boolean {
  const world = wrecks(w);
  const i = world ? standingNear(world, d.pos.x, d.pos.z, TIDEBREAKER.v.pillarReach) : -1;
  if (!world || i < 0) return false;
  const p = world.pillars[i];
  d.move = PILLAR;
  d.shots = i;
  // (To its near side: its own cells block the way to its middle.)
  const dx = d.pos.x - p.x;
  const dz = d.pos.z - p.z;
  const dd = Math.hypot(dx, dz) || 1;
  const off = p.half + radiusOf(d) + BESIDE * 0.5;
  d.aim.set(p.x + (dx / dd) * off, 0, p.z + (dz / dd) * off);
  setPhase(d, 'charge');
  w.events.push('tideWindup', PILLAR, p.x, p.h, p.z);
  return true;
}

/** Walking to its pillar; beside it, it kneels to tear it out (it gives up on one broken meanwhile, or too far). */
export function approach(d: Enemy, w: EnemyWorld, dt: number) {
  const world = wrecks(w);
  const p = world?.pillars[d.shots];
  if (!world || !p || p.broken || d.t > GIVE_UP) return setPhase(d, 'recover');
  const dist = Math.hypot(p.x - d.pos.x, p.z - d.pos.z);
  way.set(d.aim.x - d.pos.x, 0, d.aim.z - d.pos.z);
  if (dist <= radiusOf(d) + p.half + BESIDE || way.length() < 0.5) {
    d.facing = yawTo(d, p.x, p.z);
    return warn(d, PILLAR, w);
  }
  way.normalize();
  d.facing = turn(d.facing, Math.atan2(-way.x, -way.z), TIDEBREAKER.v.tideTurn * 1.5 * dt);
  // (Update 0.3.30 — the designer: "make him run x2 faster".)
  walk(d, way.x, way.z, TIDEBREAKER.v.tideSpeed * TIDEBREAKER.v.pillarRun * paceOf(d) * dt, w.nav.large);
}

/** Its pillar torn out of the floor: in its hands, and swung at you next (one snapped meanwhile: it stands). */
export function ripPillar(d: Enemy, w: EnemyWorld) {
  const world = wrecks(w);
  const p = world?.pillars[d.shots];
  if (!world || !p || p.broken) return setPhase(d, 'recover');
  uprootPillar(world, d.shots);
  d.deeds = d.shots + 1;
  warn(d, SWING, w);
}

/** Its quake: the first ring, every pillar near snapping, rock shaken down round you. */
export function startQuakeMove(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = TIDEBREAKER.v;
  w.events.push('tideQuake', Math.round(v.quakeRings), d.pos.x, d.pos.y, d.pos.z);
  ring(d, w);
  const world = wrecks(w);
  if (world) breakAround(world, d.pos.x, d.pos.z, v.quakeBreaks);
  callRocks(w, player.pos.x, player.pos.z, Math.round(v.quakeRocks), SPREAD, 0.4);
  d.shots = 1;
  setPhase(d, 'charge');
}

/** Its quake's rings, one after another; then it stands. */
export function quake(d: Enemy, w: EnemyWorld) {
  const rings = Math.round(TIDEBREAKER.v.quakeRings);
  const gap = RING_GAP / paceOf(d);
  if (d.shots < rings && d.t >= d.shots * gap) {
    d.shots++;
    ring(d, w);
    w.events.push('tideQuake', 0, d.pos.x, d.pos.y, d.pos.z);
  }
  if (d.shots >= rings && d.t >= rings * gap) setPhase(d, 'recover');
}

function ring(d: Enemy, w: EnemyWorld) {
  const v = TIDEBREAKER.v;
  startQuake(w.quakes, d.pos.x, d.pos.y, d.pos.z, RING_SPEED, v.quakeReach, v.ringDamage, BOSS.v.quakeClear, 'tidebreaker');
}
