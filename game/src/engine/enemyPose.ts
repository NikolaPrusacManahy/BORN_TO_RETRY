// Update 0.3.26 — how far a dead body has sunk into the floor (out of enemiesView.ts, which had reached its size).
// Update 0.2.28 — a dead one on the ground sinks into the floor over the last part of its time (its height, by then):
// not a boss's, a flier's or a fish's. Pure.
import type { Enemy } from '../sim/enemies/enemy';
import { ENEMY_STATS, flies } from '../sim/enemies/kinds';
import { SWIMS } from '../sim/enemies/kinds6';

/** It starts sinking this share of its time in. */
const SINK_FROM = 0.45;

export function sinkOf(e: Enemy): number {
  if (e.phase !== 'dead' || flies(e.kind) || SWIMS.has(e.kind)) return 0;
  const s = ENEMY_STATS[e.kind]();
  if (s.boss) return 0;
  const k = Math.max(0, Math.min(1, (e.t - s.deathTime * SINK_FROM) / (s.deathTime * (1 - SINK_FROM))));
  return k * k * s.height;
}
