// Update 0.2.8 — the Velociraptor's hunt (the designer: "move sets that were not in the game yet", Claude's proposal,
// "Build all of them"). Its charge's warning: a real one scrapes the sand twice; a feint doesn't, and instead of
// charging it stops dead and pounces where you went. Its sand kick: it turns its back to you and scrapes, then kicks
// sand behind it: caught in it (in reach, in its cone, no wall between), your view is blurred with sand and it charges.
// Its wall launch: it sprints to the nearest wall or column in reach, claws its way up (scraping the stone: your
// warning) and dives at you off it. Pure.
import { DINO } from '../../tuning/dino';
import { wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { dinoPace, startPounce } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';

/** A real charge's scrapes come at these shares of its warning. */
const SCRAPES = [0.3, 0.65];
/** Its sand kick: it turns its back to you this fast (rad/s), over this share of the warning, then holds still. */
const KICK_TURN = 10;
const KICK_AIMS = 0.6;
/** Sand flying higher than this over its feet (m) misses you. */
const KICK_HIGH = 4;
/** It looks for a wall this many ways round it, none nearer than this (m); a sprint lasts this long at most (s). */
const WALL_WAYS = 16;
const WALL_NEAR = 4;
const SPRINT_MAX = 2.5;

/** Its charge's warning, each tick: a real one scrapes the sand twice (Enemy.near 1: a feint, no scrapes). */
export function scrapes(d: Enemy, w: EnemyWorld, windup: number) {
  if (d.near > 0) return;
  while (d.shots < SCRAPES.length && d.t >= SCRAPES[d.shots] * windup) {
    d.shots++;
    w.events.push('dinoScrape', d.shots, d.pos.x, d.pos.y, d.pos.z);
  }
}

/** Its sand kick's warning: it turns its back to you, then holds. */
export function kickTurn(d: Enemy, player: PlayerState, windup: number, dt: number) {
  if (d.t < windup * KICK_AIMS) d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z) + Math.PI, KICK_TURN * dt);
}

/** The kick: sand flies out behind it. Caught (in reach, in its cone, no wall between; a dash gets you through), your
 *  view's blurred with sand and you're hurt a little. True if it caught you. */
export function sandKick(d: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = DINO.v;
  const back = d.facing + Math.PI;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(d, player.pos.x, player.pos.z) - back), Math.cos(yawTo(d, player.pos.x, player.pos.z) - back)));
  const caught =
    !player.dead &&
    player.invuln <= 0 &&
    dist <= v.kickReach + radiusOf(d) &&
    off <= (v.kickCone * Math.PI) / 180 &&
    player.pos.y - d.pos.y <= KICK_HIGH &&
    !wallBetween(w.nav.small, d.pos.x, d.pos.z, player.pos.x, player.pos.z);
  const r = radiusOf(d);
  w.events.push('dinoKick', caught ? 1 : 0, d.pos.x - Math.sin(back) * r, d.pos.y + 0.6, d.pos.z - Math.cos(back) * r);
  if (!caught) return false;
  player.blind = v.kickBlind;
  damagePlayer(player, v.kickDamage, d.kind);
  return true;
}

/** Off it sprints for the nearest wall or column in Wall launch reach (not one right by it); its spot there is Enemy.aim.
 *  False if there's none. */
export function startWallRun(d: Enemy, index: number, w: EnemyWorld): boolean {
  const v = DINO.v;
  const nav = w.nav.large;
  let best = Infinity;
  let yaw = 0;
  for (let i = 0; i < WALL_WAYS; i++) {
    const y = (i / WALL_WAYS) * Math.PI * 2;
    const fx = -Math.sin(y);
    const fz = -Math.cos(y);
    if (!wallBetween(nav, d.pos.x, d.pos.z, d.pos.x + fx * v.wallReach, d.pos.z + fz * v.wallReach)) continue;
    let lo = 0;
    let hi = v.wallReach;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(nav, d.pos.x, d.pos.z, d.pos.x + fx * mid, d.pos.z + fz * mid)) hi = mid;
      else lo = mid;
    }
    if (lo >= WALL_NEAR && lo < best) {
      best = lo;
      yaw = y;
    }
  }
  if (best === Infinity) return false;
  d.aim.set(d.pos.x - Math.sin(yaw) * best, d.pos.y, d.pos.z - Math.cos(yaw) * best);
  d.facing = yaw;
  setPhase(d, 'charge');
  w.events.push('dinoSprint', index, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of its sprint to the wall; there, it claws its way up ('sky'). */
export function stepWallRun(d: Enemy, index: number, w: EnemyWorld, dt: number) {
  const dx = d.aim.x - d.pos.x;
  const dz = d.aim.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.min(dist, DINO.v.wallSpeed * dinoPace(d) * dt);
  const x = d.pos.x;
  const z = d.pos.z;
  if (dist > 1e-3) walk(d, dx / dist, dz / dist, step, w.nav.large);
  // There once it's at its spot, or the wall stops it short (or it's run long enough).
  const moved = Math.hypot(d.pos.x - x, d.pos.z - z);
  if (dist > step + 0.05 && moved > step * 0.5 && d.t < SPRINT_MAX) return;
  d.from.copy(d.pos);
  setPhase(d, 'sky');
  const r = radiusOf(d);
  w.events.push('dinoClaws', index, d.pos.x - Math.sin(d.facing) * r, d.pos.y + 1.5, d.pos.z - Math.cos(d.facing) * r);
}

/** On the wall: up it, claws scraping; then off it, diving at you. */
export function stepClimb(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  const k = Math.min(1, d.t / v.wallClimb);
  d.pos.y = d.from.y + v.wallHigh * Math.sin((k * Math.PI) / 2);
  if (k < 1) return;
  // (Nowhere to land: it drops off the wall.)
  if (!startPounce(d, player, w, d.from.y)) setPhase(d, 'recover');
}
