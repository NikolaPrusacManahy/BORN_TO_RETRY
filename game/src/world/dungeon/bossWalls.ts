// Update 0.3.13 — the boss room before its walls slide back (moved out of assemble.ts, which had reached its size; no
// change): BOSS_START_W × BOSS_START_D cells against the wall you come in by. Pure.
import type { Rect } from './assemble';
import { CELL, Side } from './floorPlan';

/** The boss room before its walls slide back: this many cells across the entrance wall, and deep. */
export const BOSS_START_W = 16;
export const BOSS_START_D = 14;

/** The boss room's inside before its walls slide back. */
export function bossStart(end: Rect, entrance: Side): Rect {
  const across = (BOSS_START_W * CELL) / 2;
  const deep = BOSS_START_D * CELL;
  const mx = (end.min.x + end.max.x) / 2;
  const mz = (end.min.z + end.max.z) / 2;
  switch (entrance) {
    case 'n':
      return { min: { x: mx - across, z: end.min.z }, max: { x: mx + across, z: end.min.z + deep } };
    case 's':
      return { min: { x: mx - across, z: end.max.z - deep }, max: { x: mx + across, z: end.max.z } };
    case 'w':
      return { min: { x: end.min.x, z: mz - across }, max: { x: end.min.x + deep, z: mz + across } };
    case 'e':
      return { min: { x: end.max.x - deep, z: mz - across }, max: { x: end.max.x, z: mz + across } };
  }
}

/** Update 0.3.31 — a boss room's side (cells; BOSS_ROOM's), and a bigger one's middle stage as its walls slide back: a
 *  boss room's size against the wall you come in by (null: not bigger). */
export const BOSS_SIDE = 30;
export function bossMid(end: Rect, entrance: Side): Rect | null {
  const side = BOSS_SIDE * CELL;
  if (end.max.x - end.min.x <= side + CELL && end.max.z - end.min.z <= side + CELL) return null;
  const mx = (end.min.x + end.max.x) / 2;
  const mz = (end.min.z + end.max.z) / 2;
  const h = side / 2;
  switch (entrance) {
    case 'n':
      return { min: { x: mx - h, z: end.min.z }, max: { x: mx + h, z: end.min.z + side } };
    case 's':
      return { min: { x: mx - h, z: end.max.z - side }, max: { x: mx + h, z: end.max.z } };
    case 'w':
      return { min: { x: end.min.x, z: mz - h }, max: { x: end.min.x + side, z: mz + h } };
    case 'e':
      return { min: { x: end.max.x - side, z: mz - h }, max: { x: end.max.x, z: mz + h } };
  }
}
