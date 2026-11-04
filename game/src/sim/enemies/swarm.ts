// Update 0.3.42 — The Swarm, the Venom Garden's boss (the designer: "try floor 2 Boss 'The Swarm'"; spec
// MD/the-knot-3d-boss.md): its worms (swarmBody.ts) live round its eye, which drifts at you and keeps close. Every so often
// the worms on your side wind up (their tips glow and draw back: the tell), then whip at where you stood, each hurting
// you once if it reaches you, then coil back. Its worms step every other tick (60 a second, the spec's rate). Dead, its
// worms drop off in a wave and its eye shows as every boss's (bossDoom.ts). Spew, its charge, the worm rain, swallowing
// and its phases come next. Pure.
import { Vector3 } from 'three';
import { SWARM } from '../../tuning/swarm';
import { damagePlayer } from '../player/health';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { doomBoss } from './bossDoom';
import { chaseDir } from './chase';
import { type Enemy, type EnemyWorld, walk } from './enemy';
import { DEAD, LASH, livingWorm, MASS, RECOIL, seedSwarm, stepSwarm, WINDUP, type SwarmBody } from './swarmBody';
import { swarmEyeHeight } from './swarmHits';

/** A lash's aim is where you stood, off by up to this (m), and at your chest. */
const AIM_OFF = 0.4;
const CHEST = 1.1;
/** Dead, its worms drop off over this long (s). */
const DROP_OFF = 1.4;

const way = new Vector3();

/** One tick of The Swarm (its eye `e`). */
export function updateSwarm(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const s = e.swarm;
  if (!s) return;
  const v = SWARM.v;
  if (!s.seeded) seedSwarm(s, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z, w.rng);
  e.vel.set(0, 0, 0);
  const dist = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.z - e.pos.z) ** 2);
  if (e.phase !== 'intro' && !player.dead) {
    // It drifts at you and keeps close.
    if (dist > v.keepNear) {
      chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
      walk(e, way.x, way.z, Math.min(v.speed * dt, dist - v.keepNear), w.nav.large);
    }
    e.cooldown -= dt;
    if (e.cooldown <= 0 && dist <= v.lashReach + s.extent) {
      e.cooldown = v.lashEvery;
      windUp(s, player, w, index);
    }
  }
  lashes(s, player, w, index);
  step(e, s, player, w, dt);
}

/** The worms on your side wind up: as many as Lashing worms, their heads nearest you. */
function windUp(s: SwarmBody, player: PlayerState, w: EnemyWorld, index: number) {
  const v = SWARM.v;
  let tx = player.pos.x - s.cx;
  let tz = player.pos.z - s.cz;
  const tl = Math.sqrt(tx * tx + tz * tz) || 1;
  tx /= tl;
  tz /= tl;
  const n = s.beads;
  let left = Math.round(v.lashCount);
  // The heads facing you most, one at a time (a few, so a scan each).
  while (left > 0) {
    let best = -1;
    let bestDot = -Infinity;
    for (let k = 0; k < s.worms; k++) {
      if (s.state[k] !== MASS) continue;
      const i = k * n;
      const hx = s.x[i] - s.cx;
      const hz = s.z[i] - s.cz;
      const hl = Math.sqrt(hx * hx + hz * hz) || 1;
      const dot = (hx * tx + hz * tz) / hl;
      if (dot > bestDot) {
        bestDot = dot;
        best = k;
      }
    }
    if (best < 0) break;
    s.state[best] = WINDUP;
    s.t[best] = 0;
    s.struck[best] = 0;
    left--;
  }
  if (left < Math.round(v.lashCount)) w.events.push('swarmWindup', index, s.cx, s.cy + SWARM.v.eye, s.cz);
}

/** Each lashing worm's state on, and a lashing head that reaches you hurts you (once a lash). */
function lashes(s: SwarmBody, player: PlayerState, w: EnemyWorld, index: number) {
  const v = SWARM.v;
  const n = s.beads;
  let whipped = false;
  for (let k = 0; k < s.worms; k++) {
    const st = s.state[k];
    if (st === WINDUP && s.t[k] >= v.lashWindup) {
      s.state[k] = LASH;
      s.t[k] = 0;
      s.aimX[k] = player.pos.x + (w.rng() - 0.5) * 2 * AIM_OFF;
      s.aimY[k] = player.pos.y + CHEST;
      s.aimZ[k] = player.pos.z + (w.rng() - 0.5) * 2 * AIM_OFF;
      whipped = true;
    } else if (st === LASH) {
      if (s.t[k] >= v.lashTime) {
        s.state[k] = RECOIL;
        s.t[k] = 0;
        continue;
      }
      if (s.struck[k] || player.dead) continue;
      // Its head (and the next bead) against your body.
      for (let b = 0; b < 2; b++) {
        const i = k * n + b;
        const dy = Math.max(player.pos.y + BODY.radius, Math.min(s.y[i], player.pos.y + 1.8 - BODY.radius)) - s.y[i];
        const dx = player.pos.x - s.x[i];
        const dz = player.pos.z - s.z[i];
        const reach = s.r[i] + BODY.radius;
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        s.struck[k] = 1;
        if (damagePlayer(player, v.lashDamage, 'swarm')) w.events.push('swarmBite', index, s.x[i], s.y[i], s.z[i]);
        break;
      }
    } else if (st === RECOIL && s.t[k] >= v.recoil) {
      s.state[k] = MASS;
      s.t[k] = 0;
    }
  }
  if (whipped) w.events.push('swarmLash', index, s.cx, s.cy + SWARM.v.eye, s.cz);
}

/** Its worms on a tick (every other: 60 a second, twice as long), and what died this tick told. */
function step(e: Enemy, s: SwarmBody, player: PlayerState, w: EnemyWorld, dt: number) {
  s.tick++;
  if ((s.tick & 1) === 0) stepSwarm(s, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z, player.pos.x, player.pos.z, w.nav.small, dt * 2);
  for (let k = 0; k < s.goreN; k++) w.events.push('swarmGore', 0, s.gore[k * 3], s.gore[k * 3 + 1], s.gore[k * 3 + 2]);
  s.goreN = 0;
  if (s.eyeHit > 0) w.events.push('swarmEye', 0, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
  s.eyeHit = 0;
}

/** Dead: its worms drop off the heap in a wave (one by one over Drop off), then its eye's show is every boss's. */
export function doomSwarm(e: Enemy, index: number, w: EnemyWorld, dt: number) {
  const s = e.swarm;
  if (s?.seeded) {
    const due = Math.min(1, e.t / DROP_OFF) * s.worms;
    for (let k = 0; k < due; k++) {
      if (!livingWorm(s, k)) continue;
      s.state[k] = DEAD;
      s.t[k] = 0;
    }
    s.tick++;
    if ((s.tick & 1) === 0) stepSwarm(s, s.cx, s.cy, s.cz, s.cx, s.cz, w.nav.small, dt * 2);
  }
  doomBoss(e, index, w);
}

/** The worms still in its heap. */
export const swarmAlive = (e: Enemy) => (e.swarm?.seeded ? e.swarm.alive : 0);
