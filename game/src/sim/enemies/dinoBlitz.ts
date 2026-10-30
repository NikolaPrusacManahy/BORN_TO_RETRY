// Update 0.2.8 — the Velociraptor's blitz (below Velociraptor blitz at; the designer: "move sets that were not in the
// game yet", Claude's proposal). It drops low, then blurs at you in zig-zags (Blitz legs) with two afterimages running
// beside it, the three fanning out to end round where you stood; only it casts a shadow (the afterimages are
// engine/boss/raptorFx.ts's, on blitzSpot's lanes). There it slashes, Blitz slash gap apart; hit it (not an
// afterimage: they're only pictures) before they're done and it's stunned. Enemy.near: its lane (−1, 0, +1);
// Enemy.shots: slashes so far. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';

/** How far each image zig-zags off its line (m); how far from where you stood they end (m, past its body); the widest
 *  angle between their ends round you (rad). */
const ZIG = 1.8;
const END_OFF = 1.4;
const FAN_MAX = 1.4;
/** A slash's shove (m/s). */
const SLASH_SHOVE = 5;
/** Slashes don't reach this far over its feet (m). */
const SLASH_HIGH = 3.5;

const at = new Vector3();

/** Seconds its run takes. */
export const blitzRun = () => Math.max(1, Math.round(DINO.v.blitzLegs)) * DINO.v.blitzLeg;

/** Where the image in `lane` (−1, 0, +1) is `k` (0..1) of the way through the run (y: its feet). Enemy.from: where it
 *  set off; Enemy.aim: where you stood. */
export function blitzSpot(d: Enemy, lane: number, k: number, out: Vector3): Vector3 {
  const v = DINO.v;
  const r = radiusOf(d) + END_OFF;
  // (Their ends Blitz afterimages apart round you.)
  const way = Math.atan2(d.from.x - d.aim.x, d.from.z - d.aim.z) + lane * Math.min(FAN_MAX, v.blitzSpread / r);
  const ex = d.aim.x + Math.sin(way) * r;
  const ez = d.aim.z + Math.cos(way) * r;
  const lx = ex - d.from.x;
  const lz = ez - d.from.z;
  const len = Math.hypot(lx, lz) || 1;
  // Side to side, a leg at a time (none at either end), each image its own way.
  const legs = Math.max(1, Math.round(v.blitzLegs));
  const side = ZIG * Math.sin(Math.PI * k * legs) * (lane === 0 ? 1 : -lane);
  return out.set(d.from.x + lx * k + (-lz / len) * side, d.from.y, d.from.z + lz * k + (lx / len) * side);
}

/** Off it blurs: at where you stand, in a lane of its three (seeded). */
export function startBlitz(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  d.from.copy(d.pos);
  d.aim.set(player.pos.x, d.pos.y, player.pos.z);
  d.near = Math.min(1, Math.floor(w.rng() * 3) - 1);
  d.shots = 0;
  d.flash = 0;
  setPhase(d, 'charge');
  w.events.push('dinoBlitz', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** Hit (the real one) mid-blitz. */
export const blitzHit = (d: Enemy) => d.flash > 0;

/** One tick of the run, along its lane; at its end it slashes ('recover'). */
export function stepBlitz(d: Enemy, w: EnemyWorld) {
  const k = Math.min(1, d.t / blitzRun());
  blitzSpot(d, d.near, k, at);
  if (Math.hypot(at.x - d.pos.x, at.z - d.pos.z) > 1e-3) d.facing = yawTo(d, at.x, at.z);
  d.pos.x = at.x;
  d.pos.z = at.z;
  walk(d, 0, 0, 0, w.nav.large);
  if (k < 1) return;
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  d.shots = 0;
  setPhase(d, 'recover');
}

/** Its slashes, Blitz slash gap apart, each hurting you in Blitz slash reach (one after another: no breath between). */
export function blitzSlashes(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  if (d.shots >= Math.round(v.blitzSlashes) || d.t < (d.shots + 1) * v.blitzSlashGap) return;
  d.shots++;
  d.facing = yawTo(d, player.pos.x, player.pos.z);
  const r = radiusOf(d);
  w.events.push('dinoSlash', d.shots, d.pos.x - Math.sin(d.facing) * r, d.pos.y + v.dinoHeight * 0.45, d.pos.z - Math.cos(d.facing) * r);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (player.dead || dist > v.blitzReach + r || player.pos.y - d.pos.y > SLASH_HIGH) return;
  if (player.invuln <= 0) player.hurtTime = 0;
  if (damagePlayer(player, v.blitzDamage, d.kind)) throwYou(player, d, dx, dz, dist, SLASH_SHOVE, 2);
}

/** All its slashes are done. */
export const slashesDone = (d: Enemy) => d.shots >= Math.round(DINO.v.blitzSlashes);
