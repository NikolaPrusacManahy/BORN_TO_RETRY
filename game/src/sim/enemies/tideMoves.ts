// Update 0.3.29 — Tidebreaker's moves across the room (tidebreaker.ts): its moon leap (up and down where you stood; its
// landing hurts round it on the ground, sends a ring out, snaps the pillars near and shakes rock down near you), its
// hurl (the boulder it ripped up, or the pillar in its hands: lobbed high where you'll be, smashing where it lands) and
// the rock it calls down (the meteors' fall brings it: sim/dungeon/meteors.ts). (Update 0.3.30 — its shell roll gone:
// the designer: "remove the spinning attack" (its shell roll).) Pure.
import { Vector3 } from 'three';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { BOSS } from '../../tuning/boss';
import { dropBomb } from '../combat/bombs';
import { startQuake } from '../combat/quakes';
import { breakAround } from '../combat/pillars';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';
import { paceOf, RING_SPEED, wrecks } from './tideShared';

/** Thrown by its landing (m/s along, up); its hurl leaves this high on it (share of its height), aims this long ahead of
 *  you (s). */
const LAND_THROW = [11, 9] as const;
const HAND = 0.85;
const LEAD = 0.45;
/** Its leap's landing snaps pillars this far out (m, past its body). */
const SNAPS = 2.5;

const spot = new Vector3();
const from = new Vector3();

/** `n` rock called down round (x, z), within `spread`, the first `delay` s from now and the rest after (the ground's). */
export function callRocks(w: EnemyWorld, x: number, z: number, n: number, spread: number, delay: number) {
  const rocks = w.ground?.rocks;
  if (!rocks) return;
  for (let i = 0; i < n; i++) {
    const a = w.rng() * Math.PI * 2;
    const r = i === 0 && n > 1 ? 0 : spread * Math.sqrt(w.rng());
    rocks.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, delay: delay + i * 0.22 });
  }
}

/** Up, aimed at where you stand now (a free spot near it). */
export function leapAt(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  spot.set(0, 0, 0);
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, spot)) return setPhase(d, 'recover');
  d.from.copy(d.pos);
  d.aim.set(spot.x, d.pos.y, spot.z);
  d.facing = yawTo(d, spot.x, spot.z);
  setPhase(d, 'leap');
  w.events.push('tideLeap', index, spot.x, d.pos.y, spot.z);
}

/** Up and over to where you stood; landing, it hurts you near (on the ground), rings out, snaps the pillars near and
 *  shakes rock down near you. */
export function fly(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = TIDEBREAKER.v;
  const k = Math.min(1, (d.t * paceOf(d)) / v.leapTime);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = d.from.y + (d.aim.y - d.from.y) * k + 4 * v.leapHeight * k * (1 - k);
  if (k < 1) return;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  setPhase(d, 'recover');
  w.events.push('tideLand', v.landRing, d.pos.x, d.pos.y, d.pos.z);
  startQuake(w.quakes, d.pos.x, d.pos.y, d.pos.z, RING_SPEED, v.landRing, v.ringDamage, BOSS.v.quakeClear, 'tidebreaker');
  const world = wrecks(w);
  if (world) breakAround(world, d.pos.x, d.pos.z, radiusOf(d) + SNAPS);
  callRocks(w, player.pos.x, player.pos.z, Math.round(v.landRocks), 6, 0.5);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (!player.dead && dist <= v.landReach + radiusOf(d) && player.pos.y - d.pos.y < 0.6 && damagePlayer(player, v.landDamage, 'tidebreaker')) throwYou(player, d, dx, dz, dist, LAND_THROW[0], LAND_THROW[1]);
}

/** Its hurl: the pillar in its hands if it has one (value: which), else the boulder, lobbed where you'll be. */
export function hurl(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = TIDEBREAKER.v;
  const pillar = d.deeds - 1;
  const fall = pillar >= 0 ? v.pillarFall : v.boulderFall;
  spot.set(player.pos.x + player.vel.x * fall * LEAD, 0, player.pos.z + player.vel.z * fall * LEAD);
  if (!freeSpotNear(w.nav.small, spot.x, spot.z, spot)) spot.set(player.pos.x, 0, player.pos.z);
  spot.y = 0;
  from.set(d.pos.x, d.pos.y + v.tideHeight * HAND, d.pos.z);
  if (pillar >= 0) dropBomb(w.bombs, from, spot, fall, v.pillarReachHit, v.pillarDamage, 14, 'tidebreaker', 'pillar');
  else dropBomb(w.bombs, from, spot, fall, v.boulderReach, v.boulderDamage, 12, 'tidebreaker', 'boulder');
  d.deeds = 0;
  w.events.push('tideHurl', pillar, spot.x, 0, spot.z);
}
