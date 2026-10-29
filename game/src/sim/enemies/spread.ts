// Update 0.1.15 — spreading out (the designer, after the turns: "they still move in swarm"). Every enemy follows the
// same way to you, so a group that comes in together ran at you shoulder to shoulder. Now each has its own angle round
// you: once a tick, their angles are laid out in the order they stand, at least the spread angle apart (less when there
// are too many to fit round you), each group centred where it is. Coming at you, on open ground (no wall between), each
// one also slides sideways onto its angle, so a group fans out as it closes in, instead of arriving as one. Only as far
// apart as they need: a group coming from in front of you stays in front, and one with no one near keeps its own moves
// (a spitter's circling). One with its turn to attack goes straight in once it's close. Bosses and perched enemies keep
// their own ways. Pure.
import { CROWD } from '../../tuning/crowd';
import { freeAt, lineClear } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { ENEMY_POOL, Enemy, EnemyWorld, isLive, walk } from './enemy';
import { ENEMY_STATS } from './kinds';
import { waitRing } from './tokens';

/** It looks this far ahead (m) before sliding into a wall. */
const LOOK = 0.8;
/** With its turn, it stops sliding this close (m beyond its waiting ring) and comes straight in. */
const IN = 1;

const members: number[] = [];
const bearing = new Float64Array(ENEMY_POOL);
const byBearing = (a: number, b: number) => bearing[a] - bearing[b] || a - b;
/** The pools of the layout: each one's sum and size. */
const poolSum = new Float64Array(ENEMY_POOL);
const poolSize = new Int32Array(ENEMY_POOL);
const TAU = Math.PI * 2;

/** Its angle round the player (rad): 0 is straight down +z from the player, like a yaw's. */
const bearingOf = (e: Enemy, player: PlayerState) => Math.atan2(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Who takes part: fighting, not a boss, not perched, within the spread's range. */
function spreads(e: Enemy, player: PlayerState): boolean {
  if (!isLive(e) || e.phase === 'held' || e.perch > 0 || ENEMY_STATS[e.kind]().boss) return false;
  return Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) <= CROWD.v.spreadRange;
}

/** Once a tick: every one taking part gets how far round you its angle lies (`e.fan`). In the order they stand round you, at least `gap`
 *  apart, as close to where each stands as can be (the least squares: neighbours too close are pooled, the pool laid
 *  out round its middle). */
export function spreadSlots(enemies: Enemy[], player: PlayerState) {
  members.length = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!spreads(e, player)) {
      e.fan = NaN;
      continue;
    }
    bearing[i] = bearingOf(e, player);
    members.push(i);
  }
  const n = members.length;
  if (n === 0) return;
  members.sort(byBearing);
  // Laid out from just after the widest empty arc round you, so no group is cut in two where the angles wrap.
  let start = 0;
  let widest = -1;
  for (let k = 0; k < n; k++) {
    const next = k + 1 < n ? bearing[members[k + 1]] : bearing[members[0]] + TAU;
    if (next - bearing[members[k]] > widest) {
      widest = next - bearing[members[k]];
      start = (k + 1) % n;
    }
  }
  const gap = Math.min((CROWD.v.spread * Math.PI) / 180, TAU / n);
  // Each one's angle less k gaps must never fall from one to the next: pool any that do (each pool at its mean).
  let pools = 0;
  for (let k = 0; k < n; k++) {
    const at = start + k;
    poolSum[pools] = bearing[members[at % n]] + (at >= n ? TAU : 0) - k * gap;
    poolSize[pools] = 1;
    pools++;
    while (pools > 1 && poolSum[pools - 2] / poolSize[pools - 2] > poolSum[pools - 1] / poolSize[pools - 1]) {
      poolSum[pools - 2] += poolSum[pools - 1];
      poolSize[pools - 2] += poolSize[pools - 1];
      pools--;
    }
  }
  let k = 0;
  for (let p = 0; p < pools; p++) {
    const mean = poolSum[p] / poolSize[p];
    for (let c = 0; c < poolSize[p]; c++, k++) {
      const i = members[(start + k) % n];
      enemies[i].fan = wrap(mean + k * gap - bearing[i]);
    }
  }
}

/** Coming at you (`chase`), on open ground: it slides sideways round you towards its angle (as it was this tick's start:
 *  its own moves aren't undone). */
export function fanOut(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  if (e.phase !== 'chase' || Number.isNaN(e.fan) || player.dead) return;
  const s = ENEMY_STATS[e.kind]();
  const g = w.nav[s.size];
  const r = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
  const d = e.fan;
  if (r < 1e-3 || Math.abs(d) < 1e-3 || (e.token && r < waitRing(e.kind) + IN) || !lineClear(g, e.pos.x, e.pos.z, player.pos.x, player.pos.z)) return;
  const b = bearingOf(e, player);
  // Round the circle you're at the middle of, the way its angle lies.
  const tx = Math.cos(b) * Math.sign(d);
  const tz = -Math.sin(b) * Math.sign(d);
  if (!freeAt(g, e.pos.x + tx * LOOK, e.pos.z + tz * LOOK)) return;
  walk(e, tx, tz, Math.min(Math.abs(d) * r, Math.min(s.speed, CROWD.v.spreadSpeed) * dt), g);
}
