// Update 0.2.9 — no sky at the walls' feet (the designer's screenshots: a pale line along the bottom of walls, at their
// corners and down the corridors, on every floor). Under the floor's level, right behind every brick face of a wall or a
// ledge, and behind the faces lining a lava pit, something solid and dark must stand (the cores and their feet): the
// slab under the floor stops at the walls, so whatever isn't filled there shows the sky. Floors 1–4 (brick, stone,
// desert), a few seeds each; and the lobby.
import { check, section } from './harness';
import { buildDungeon, HEIGHT, LAVA_DEPTH } from '../src/world/dungeon/assemble';
import { CORE_INSET, dress } from '../src/world/dungeon/dressing';
import { CELL, cellAt, cellX, cellZ, GRID, planFloor } from '../src/world/dungeon/floorPlan';
import type { ArenaBox } from '../src/world/arena';
import type { Cell } from '../src/world/dungeon/rooms';
import { HALL } from '../src/world/lobby/spots';
import { dressHall } from '../src/world/lobby/hallDressing';

const within = (b: ArenaBox, x: number, y: number, z: number) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2 && Math.abs(z - b.z) <= b.d / 2;
const solidAt = (cores: ArenaBox[], x: number, y: number, z: number) => cores.some((b) => within(b, x, y, z));
const solid = (c: Cell) => c === 'wall' || c === 'ledge' || c === 'highLedge';
/** How high a wall's or ledge's top is (0: ground). */
const top = (c: Cell) => (solid(c) ? HEIGHT[c]! : 0);
const ground = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'dark' && c !== 'door';
const SIDES: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

section('Seams — no sky at the walls’ feet');
for (const floor of [1, 2, 3, 4]) {
  let feet = 0;
  let open = 0;
  let pits = 0;
  let pitOpen = 0;
  const where: string[] = [];
  for (const seed of [1, 7, 23]) {
    const plan = buildDungeon(planFloor(seed, floor)).plan;
    const cores = dress(plan).cores;
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const c = cellAt(plan, col, row);
        for (const [dc, dr] of SIDES) {
          const n = cellAt(plan, col + dc, row + dr);
          // A wall's or ledge's face onto lower ground: just behind it (3 cm into the cell), under the floor's level,
          // along the side's length.
          if (solid(c) && ground(n) && top(n) < top(c)) {
            for (const t of [-0.45, 0, 0.45]) {
              for (const y of [-0.05, -0.3, -0.6]) {
                const x = cellX(col) + dc * (CELL / 2 - 0.03) + (dr ? t * CELL : 0);
                const z = cellZ(row) + dr * (CELL / 2 - 0.03) + (dc ? t * CELL : 0);
                feet++;
                if (!solidAt(cores, x, y, z)) {
                  open++;
                  if (where.length < 4) where.push(`seed ${seed} cell ${col},${row} side ${dc},${dr} y ${y}`);
                }
              }
            }
          }
          // A floor cell's face down into a lava pit: behind it, down to the lava.
          if (ground(c) && c !== 'lava' && !solid(c) && n === 'lava') {
            for (const y of [-0.5, -1, -LAVA_DEPTH + 0.05]) {
              const x = cellX(col) + dc * (CELL / 2 - CORE_INSET - 0.05);
              const z = cellZ(row) + dr * (CELL / 2 - CORE_INSET - 0.05);
              pits++;
              if (!solidAt(cores, x, y, z)) pitOpen++;
            }
          }
        }
      }
    }
  }
  check(`floor ${floor}: behind every wall’s and ledge’s foot, under the floor, it’s solid (${feet} spots)`, feet > 0 && open === 0, `${open} open: ${where.join('; ')}`);
  if (pits) check(`floor ${floor}: behind a pit’s faces, down to the lava, it’s solid (${pits} spots)`, pitOpen === 0, `${pitOpen} open`);
}

section('Seams — the lobby');
{
  const d = dressHall();
  const { halfW: w, halfD: d0 } = HALL;
  const spots: [number, number][] = [];
  for (let t = -0.9; t <= 0.9; t += 0.3) spots.push([-w - 0.03, t * d0], [w + 0.03, t * d0], [t * w, d0 + 0.03], [t * w, -d0 - 0.03]);
  const open = spots.filter(([x, z]) => !solidAt(d.cores, x, -0.3, z));
  check('behind the hall’s walls, under the floor, it’s solid all round', open.length === 0, `${open.length} open`);
}
