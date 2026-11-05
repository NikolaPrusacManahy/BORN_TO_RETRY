// Update 0.3.50 — the Dragon's room (the designer: "each boss their designed room … dragon, maybe shift the arena a bit";
// the Boss Design Bible: "a ruined castle courtyard with 4 stone pillars"). A boss room's size, its middle open for its core
// and its dive. A tower in each corner, curtain walls taller than a room's with battlements along their top, a low ruin
// behind each of the 4 pillars (somewhere to shelter from its blast), only those 4 standing as pillars (they alone stop it), beds of ash with charred trees in them, rubble at the
// foot of the stone, the paving scorched. Its towers' crowns are the show's (engine/boss/dragonShowView.ts). Pure.
import type { Rng } from '../../core/rng';
import type { Put } from './dressExtras';
import { quarter } from './fightRooms';
import { CELL, cellAt, cellX, cellZ, FloorPlan, Side } from './floorPlan';
import type { Mark } from './gardenDressing';
import type { RoomTemplate } from './rooms';
import type { DungeonStyle } from './styleTypes';

export const COURTYARD_ROOM: RoomTemplate = {
  id: 'the burnt courtyard',
  kind: 'boss',
  rows: quarter([
    '####...........',
    '####...........',
    '####.....,,....',
    '####.....,R,.E.',
    '..........,,...',
    '......ppP...pp.',
    '......p........',
    '...J..P........',
    '........C......',
    '...............',
    '.,,............',
    ',R,............',
    '.,,..p.........',
    '..E..p.........',
    '...............',
  ]),
};

/** A corner tower's side (cells). */
export const TOWER_CELLS = 4;

/** The middles of its four towers (m), from the room's whole size. */
export function towerMids(end: { min: { x: number; z: number }; max: { x: number; z: number } }): { x: number; z: number }[] {
  const off = (TOWER_CELLS * CELL) / 2;
  return [
    { x: end.min.x + off, z: end.min.z + off },
    { x: end.max.x - off, z: end.min.z + off },
    { x: end.max.x - off, z: end.max.z - off },
    { x: end.min.x + off, z: end.max.z - off },
  ];
}

const FACING: Record<Side, number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const DIRS: [number, number, Side][] = [
  [0, 1, 's'],
  [0, -1, 'n'],
  [1, 0, 'e'],
  [-1, 0, 'w'],
];
/** A merlon: every other wall piece along the top, this share of a piece high. */
const MERLON = 0.55;
/** The odds of a scorch on a cell of paving, and of rubble on one at the foot of stone. */
const SCORCH = 0.16;
const RUBBLE = 0.5;
const ROCKS = ['kit_p2_Rock1', 'kit_p2_Rock2', 'kit_p2_Rock3', 'kit_p2_Rock4', 'kit_p2_Rock5'];
const WALL_PIECE = 2;

/** Its battlements, its towers' tops, its rubble and scorches. */
export function dressCourtyard(K: DungeonStyle, plan: FloorPlan, rng: Rng, put: Put, scorch: Mark[]) {
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!r || !K.bossWalls || !K.bossTowers) return;
  const { w, h } = r.layout;
  const depth = K.wallDepth;
  const top = K.bossWalls * WALL_PIECE;
  // Merlons along the ring, every other piece: not over a doorway, nor where a tower stands.
  for (let row = r.z0 - 1; row <= r.z0 + h; row++) {
    for (let col = r.x0 - 1; col <= r.x0 + w; col++) {
      if (cellAt(plan, col, row) !== 'wall' || (col + row) % 2 !== 0) continue;
      for (const [dc, dr, side] of DIRS) {
        if (cellAt(plan, col + dc, row + dr) === 'wall') continue;
        const inside = col + dc >= r.x0 && col + dc < r.x0 + w && row + dr >= r.z0 && row + dr < r.z0 + h;
        const ring = col < r.x0 || col >= r.x0 + w || row < r.z0 || row >= r.z0 + h;
        if (!inside || !ring) continue;
        put(K.wall, cellX(col) + dc * (CELL / 2 - depth / 2), top + 0.1, cellZ(row) + dr * (CELL / 2 - depth / 2), FACING[side], 1, MERLON, 1);
      }
    }
  }
  for (let row = r.z0; row < r.z0 + h; row++) {
    for (let col = r.x0; col < r.x0 + w; col++) {
      const c = cellAt(plan, col, row);
      const x = cellX(col);
      const z = cellZ(row);
      // A tower's top: paved, under its crown.
      if (c === 'wall') {
        put(K.floor, x, K.bossTowers * WALL_PIECE + K.floorY + 0.05, z);
        continue;
      }
      if (c !== 'floor') continue;
      if (rng() < SCORCH) scorch.push({ x: x + (rng() - 0.5) * CELL * 0.5, z: z + (rng() - 0.5) * CELL * 0.5, rot: rng() * Math.PI * 2, s: 2.4 + rng() * 2.6 });
      // Rubble where stone meets the floor: the ruins' feet, the towers'.
      const beside = DIRS.some(([dc, dr]) => {
        const n = cellAt(plan, col + dc, row + dr);
        return (n === 'wall' && col + dc >= r.x0 && col + dc < r.x0 + w && row + dr >= r.z0 && row + dr < r.z0 + h) || n === 'ledge' || n === 'highLedge';
      });
      if (!beside || rng() >= RUBBLE) continue;
      const s = 0.8 + rng() * 0.9;
      put(ROCKS[Math.floor(rng() * ROCKS.length)], x + (rng() - 0.5) * CELL * 0.6, 0, z + (rng() - 0.5) * CELL * 0.6, rng() * Math.PI * 2, s, s, s);
    }
  }
}

