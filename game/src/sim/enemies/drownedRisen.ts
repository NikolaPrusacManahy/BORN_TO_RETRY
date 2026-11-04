// Update 0.2.10 — the Drowned King's moves risen (phase 2: up for good, it commands the water; drownedKing.ts picks them
// and warns). Its tidal wall: a wall of water too high to jump rises at it and rolls across the room with one gap in it
// (somewhere either side of you: get to it). Its surf: it rides a wave straight at you, turning after you a little; into
// a wall or a column it's stunned (the Demon's charge with its own numbers). Its bites, close up, twice. Its geysers: a
// row of them, each where you are as it's called. Pure.
import { Vector3 } from 'three';
import { DROWNED } from '../../tuning/drowned';
import { dropBomb } from '../combat/bombs';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { ChargeSpec } from './charge';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, yawTo } from './enemy';

/** Its wall stands this high (m: no jump clears it) and this thick (m). */
export const TIDE_HIGH = 3;
const TIDE_THICK = 0.8;
/** Its wall, its bite: how hard they throw you (along, then up: m/s). */
const TIDE_THROW = [12, 7] as const;
const BITE_THROW = [8, 5] as const;
/** Its bite's arc in front (rad); higher over it than this (m), its jaws miss you. */
const ARC = 1.1;
const OVER = 3;
/** A geyser's push out (m/s). */
const GEYSER_SHOVE = 3;

const SURF: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };
const spot = new Vector3();

/** Its wall rises: it'll roll from it towards where you are, its gap Tidal wall gap off at most to either side of your
 *  line (seeded). Enemy.from: where it rolls from; Enemy.aim: its way (flat, length 1); Enemy.near: its gap's middle
 *  along the wall (m, + to the wall's right: `tideAcross`). */
export function raiseTide(k: Enemy, player: PlayerState, w: EnemyWorld) {
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const d = Math.hypot(dx, dz);
  k.from.set(k.pos.x, 0, k.pos.z);
  if (d > 1e-3) k.aim.set(dx / d, 0, dz / d);
  else k.aim.set(-Math.sin(k.facing), 0, -Math.cos(k.facing));
  k.near = (w.rng() * 2 - 1) * DROWNED.v.tideSpread;
  k.struck = false;
}

/** How far along its way a spot is from where its wall rolls from (m). */
export const tideAlong = (k: Enemy, x: number, z: number) => (x - k.from.x) * k.aim.x + (z - k.from.z) * k.aim.z;
/** How far along its wall a spot is from its line (m: + to the wall's right). */
export const tideAcross = (k: Enemy, x: number, z: number) => (x - k.from.x) * -k.aim.z + (z - k.from.z) * k.aim.x;
/** Its wall's front, rolling (m from where it rolls from). */
export const tideFront = (k: Enemy) => radiusOf(k) + DROWNED.v.tideSpeed * k.t;

/** One tick of its wall rolling: passing over you outside its gap (and under its top), you're hurt and thrown along
 *  it (once a wall). True once it's rolled its reach. */
export function stepTide(k: Enemy, player: PlayerState, dt: number): boolean {
  const v = DROWNED.v;
  const front = tideFront(k);
  const s = tideAlong(k, player.pos.x, player.pos.z);
  const inGap = Math.abs(tideAcross(k, player.pos.x, player.pos.z) - k.near) <= v.tideGap / 2;
  if (!k.struck && !player.dead && s <= front && s >= front - TIDE_THICK - v.tideSpeed * dt && !inGap && player.pos.y < TIDE_HIGH) {
    k.struck = true;
    if (damagePlayer(player, v.tideDamage, k.kind)) throwYou(player, k, k.aim.x, k.aim.z, 1, TIDE_THROW[0], TIDE_THROW[1]);
  }
  return front >= v.tideReach;
}

/** Its surf's numbers as the knobs say now (one object, refilled). */
export function surfSpec(): ChargeSpec {
  const v = DROWNED.v;
  SURF.speed = v.surfSpeed;
  SURF.range = v.surfRange;
  SURF.damage = v.surfDamage;
  SURF.shove = v.surfShove;
  SURF.height = v.kingHeight;
  return SURF;
}

/** Off it surfs, the way it faces. */
export function startSurf(k: Enemy, index: number, w: EnemyWorld) {
  k.from.copy(k.pos);
  k.aim.set(-Math.sin(k.facing), 0, -Math.cos(k.facing));
  k.struck = false;
  setPhase(k, 'charge');
  w.events.push('drownedSurf', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** Surfing, it turns its way after you (Surf steering). */
export function steerSurf(k: Enemy, player: PlayerState, dt: number) {
  const want = yawTo(k, player.pos.x, player.pos.z);
  const now = Math.atan2(-k.aim.x, -k.aim.z);
  const diff = Math.atan2(Math.sin(want - now), Math.cos(want - now));
  const step = DROWNED.v.surfSteer * dt;
  const turned = now + Math.max(-step, Math.min(step, diff));
  k.aim.set(-Math.sin(turned), 0, -Math.cos(turned));
  k.facing = turned;
}

/** Its jaws snap shut in front of it. */
export function bite(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DROWNED.v;
  const r = radiusOf(k);
  w.events.push('drownedBite', index, k.pos.x - Math.sin(k.facing) * r, k.pos.y + v.kingHeight * 0.35, k.pos.z - Math.cos(k.facing) * r);
  if (player.dead) return;
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(k, player.pos.x, player.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - k.facing), Math.cos(toward - k.facing)));
  if (dist > v.biteReach + r || off > ARC || player.pos.y - k.pos.y > OVER) return;
  if (damagePlayer(player, v.biteDamage, k.kind)) throwYou(player, k, dx, dz, dist, BITE_THROW[0], BITE_THROW[1]);
}

/** Calling its geysers: one where you are every Geyser gap, Geysers of them, each ringing the floor before it bursts.
 *  True once the last is called. */
export function stepGeysers(k: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = DROWNED.v;
  const count = Math.round(v.geysers);
  while (k.shots < count && k.t >= k.shots * v.geyserGap) {
    spot.set(player.pos.x, 0, player.pos.z);
    dropBomb(w.bombs, spot, spot, v.geyserWarn, v.geyserRadius, v.geyserDamage, GEYSER_SHOVE, k.kind, 'geyser');
    k.shots++;
  }
  return k.shots >= count;
}
