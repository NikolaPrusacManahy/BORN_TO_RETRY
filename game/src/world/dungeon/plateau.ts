// Update 0.3.56 — the Frost Roc's room (the designer: "each boss their designed room"; the Boss Design Bible: "a mountain plateau
// with breakable rock pillars"). A boss room's size, its middle clear; sixteen pillars to tear out, shelter at and lose, beds of snow
// with trees and sheets of ice about its edges. The cliff on a side with no doorway, a cornice hanging from it: what its Mountain
// Fall tears down (engine/norse/plateauView.ts draws the peaks and the cliff; norse/rocFx.ts the cornice). Pure.
import type { RocBody } from '../../sim/enemies/rocBody';
import { quarter } from './fightRooms';
import { cellAt, type FloorPlan, type Side } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const PLATEAU_ROOM: RoomTemplate = {
  id: 'the frozen plateau',
  kind: 'boss',
  rows: quarter([
    'nnn............',
    'nFn......nn....',
    'nn.......n.....',
    '....C......E...',
    '...............',
    '...II.......C..',
    '...III.........',
    '...............',
    '.n...C.........',
    'nn.........E...',
    '...............',
    '..C.......II...',
    '..........II...',
    'nF.............',
    '..n............',
  ]),
};

const WAY: Record<Side, { x: number; z: number }> = { n: { x: 0, z: -1 }, s: { x: 0, z: 1 }, e: { x: 1, z: 0 }, w: { x: -1, z: 0 } };
/** How far past its wall the cliff stands (cells), what's there counted over. */
const BEHIND = 12;

/** The way to its cliff from its middle: a side with no doorway, with the least of the floor behind it. */
export function cliffWay(plan: FloorPlan): { x: number; z: number } {
  const r = plan.rooms.find((q) => q.kind === 'boss');
  if (!r) return WAY.n;
  const doors: Side[] = [...r.doors];
  if (plan.wayOut && !doors.includes(plan.wayOut.side)) doors.push(plan.wayOut.side);
  let best: Side = 'n';
  let least = Infinity;
  for (const side of ['n', 'e', 's', 'w'] as const) {
    if (doors.includes(side)) continue;
    let used = 0;
    for (let along = 0; along < r.layout.w; along += 2) {
      for (let out = 1; out <= BEHIND; out++) {
        const col = side === 'w' ? r.x0 - out : side === 'e' ? r.x0 + r.layout.w - 1 + out : r.x0 + along;
        const row = side === 'n' ? r.z0 - out : side === 's' ? r.z0 + r.layout.h - 1 + out : r.z0 + along;
        if (cellAt(plan, col, row) !== 'void') used++;
      }
    }
    if (used < least) [best, least] = [side, used];
  }
  return WAY[best];
}

/** It knows where its cliff is. */
export function setCliff(body: RocBody, plan: FloorPlan) {
  const c = cliffWay(plan);
  body.cliffX = c.x;
  body.cliffZ = c.z;
}
