// Update 0.3.29 — Tidebreaker's moves across the room (tidebreaker.ts): its moon leap (up and down where you stood; its
// landing hurts round it on the ground, sends a ring out, snaps the pillars near and shakes rock down near you), its
// hurl (the boulder it ripped up, or the pillar in its hands: lobbed high where you'll be, smashing where it lands), its
// shell roll (at you, through the pillars in its way, off the walls back at you, once into you each pass; then it
// reels, dizzy) and the rock it calls down (the meteors' fall brings it: sim/dungeon/meteors.ts). Pure.
import { Vector3 } from 'three';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { BOSS } from '../../tuning/boss';
import { dropBomb } from '../combat/bombs';
import { startQuake } from '../combat/quakes';
import { breakAround, snapPillar } from '../combat/pillars';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';
import { OVER, paceOf, RING_SPEED, wrecks } from './tideShared';

/** Thrown by its landing and its roll (m/s along, up); its hurl leaves this high on it (share of its height), aims
 *  this long ahead of you (s); a pillar this near its shell's path is smashed (m past its side); slower than this share
 *  of its speed it's met a wall. */
const LAND_THROW = [11, 9] as const;
const ROLL_THROW = [17, 8] as const;
const HAND = 0.85;
const LEAD = 0.45;
const CLIP = 0.6;
const STOPPED = 0.5;
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

/** Curled in its shell, off at you. */
export function startRoll(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  d.aim.set(player.pos.x - d.pos.x, 0, player.pos.z - d.pos.z).normalize();
  d.facing = yawTo(d, player.pos.x, player.pos.z);
  d.near = TIDEBREAKER.v.rollSpeed * paceOf(d);
  d.shots = 0;
  d.struck = false;
  setPhase(d, 'charge');
  w.events.push('tideRoll', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** Rolling: on along its way, through the pillars in it; into you once a pass; off a wall back at you, till its
 *  bounces are spent (or it's rolled its time): then it reels, dizzy. */
export function roll(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = TIDEBREAKER.v;
  const r = radiusOf(d);
  const world = wrecks(w);
  if (world) {
    world.pillars.forEach((p, i) => {
      if (p.broken) return;
      const ax = p.x - d.pos.x;
      const az = p.z - d.pos.z;
      const along = ax * d.aim.x + az * d.aim.z;
      if (along < 0 || along > r + p.half + CLIP + d.near * dt || Math.abs(ax * d.aim.z - az * d.aim.x) > r + p.half) return;
      snapPillar(world, i, Math.atan2(-d.aim.x, -d.aim.z));
      w.events.push('tideCrash', index, p.x, 1.5, p.z);
    });
  }
  const step = d.near * dt;
  const x = d.pos.x;
  const z = d.pos.z;
  walk(d, d.aim.x, d.aim.z, step, w.nav.large);
  d.facing = Math.atan2(-d.aim.x, -d.aim.z);
  const moved = Math.hypot(d.pos.x - x, d.pos.z - z);
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!d.struck && !player.dead && dist <= r + 0.8 && player.pos.y - d.pos.y < OVER) {
    d.struck = true;
    if (damagePlayer(player, v.rollDamage, 'tidebreaker')) throwYou(player, d, d.aim.x, d.aim.z, 1, ROLL_THROW[0], ROLL_THROW[1]);
  }
  const bounces = Math.round(v.rollBounces) + (d.stage >= 2 ? 2 : 0);
  if (moved < step * STOPPED || d.t >= v.rollFor) {
    if (d.shots >= bounces || d.t >= v.rollFor) {
      setPhase(d, 'stun');
      w.events.push('tideDizzy', index, d.pos.x, d.pos.y + v.tideHeight, d.pos.z);
      return;
    }
    // Off the wall, back at you.
    d.shots++;
    d.struck = false;
    d.aim.set(player.pos.x - d.pos.x, 0, player.pos.z - d.pos.z);
    if (d.aim.lengthSq() < 1e-6) d.aim.set(-d.aim.z || 1, 0, d.aim.x);
    d.aim.normalize();
    w.events.push('tideBounce', index, d.pos.x, d.pos.y + 1, d.pos.z);
  }
}
