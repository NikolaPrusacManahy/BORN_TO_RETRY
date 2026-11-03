// Update 0.2.9 — the lobby's collision (the designer: "a fully main lobby where your character can move around … a big
// closed dungeon area with tables and chairs and decorations … a big main gate that leads to the actual game"): one
// closed hall (spots.ts) under its roof, the main gate's portcullis shut in its gateway, the characters' dais and the
// characters on it, and the furniture (furniture.ts, the same list its look comes from).
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): its walls from the same lines as their bricks (manorWalls.ts:
// open where the gate, the arches and the landings' doorways are), the great arch's masonry, the roof over it all; the
// wings' upper floors (the bestiary) and the landings; each grand stair a ramp, with the brick base under it, its rail
// along the hall's side and the landing's fence; the daises; and everything solid that stands on the floors.
import { Arena, ArenaBox, boxAt, rampZ } from '../arena';
import { FURNITURE } from './furniture';
import { manorWalls, wallBoxes } from './manorWalls';
import { BRICK, CRYSTAL_DAIS, DAIS, FIGURES, GATE, HALL, LOBBY_START, STAIR, WALL_DEPTH, WING } from './spots';

/** A character on the dais stands in this (width, height, depth: m). */
const FIGURE_BOX: [number, number, number] = [0.7, 1.9, 0.7];
/** The great arch reaches this far behind the north wall's face and this high (m). */
const ARCH = { back: 1.4, top: 8 } as const;
/** The stairs' rail and the landings' fence stand this high over their treads (m). */
const RAIL = 1.1;
const TILE = 0.25;

function boxes(): ArenaBox[] {
  const { halfW: w, halfD: d } = HALL;
  const x1 = WING.x1 + 2;
  const out: ArenaBox[] = [
    // The floor, on under the gate; the roof over everything.
    boxAt(-x1, -1, -d - 8, 2 * x1, 1, 2 * d + 10, 'floor'),
    boxAt(-x1, HALL.wallH + 0.43, -d - 2, 2 * x1, 1, 2 * d + 4, 'wall'),
    // The great arch's masonry either side of the gateway and over it, and the portcullis shut in it.
    boxAt(-GATE.archHalfW, 0, -d - ARCH.back, GATE.archHalfW - GATE.halfW, ARCH.top, ARCH.back, 'wall'),
    boxAt(GATE.halfW, 0, -d - ARCH.back, GATE.archHalfW - GATE.halfW, ARCH.top, ARCH.back, 'wall'),
    boxAt(-GATE.halfW, GATE.height, -d - ARCH.back, 2 * GATE.halfW, ARCH.top - GATE.height, ARCH.back, 'wall'),
    boxAt(-GATE.halfW, 0, GATE.barsZ - 0.15, 2 * GATE.halfW, GATE.height, 0.3, 'wall'),
    // The characters' dais.
    boxAt(-w, 0, DAIS.z0, DAIS.x0 + w, DAIS.h, DAIS.z1 - DAIS.z0, 'block'),
  ];
  for (const l of manorWalls()) out.push(...wallBoxes(l));
  const c = CRYSTAL_DAIS;
  out.push(boxAt(c.x - c.outer, 0, c.z - c.outer, 2 * c.outer, c.step, 2 * c.outer, 'block'));
  out.push(boxAt(c.x - c.inner, c.step, c.z - c.inner, 2 * c.inner, c.step, 2 * c.inner, 'block'));
  const s = STAIR;
  for (const side of [-1, 1]) {
    // The wing's upper floor and the landing.
    const [wx0, wx1] = side < 0 ? [-WING.x1, -WING.x0] : [WING.x0, WING.x1];
    out.push(boxAt(wx0, WING.upper - TILE, WING.z0, wx1 - wx0, TILE, WING.z1 - WING.z0, 'floor'));
    const lx0 = side < 0 ? -w : w - s.w;
    out.push(boxAt(lx0, WING.upper - TILE, -d, s.w, TILE, s.top + d, 'floor'));
    // The stair, its base on the hall's side (a step for each flight, the landing's height under the landing), its
    // rail, the landing's fence.
    out.push(rampZ(side * -s.x, s.foot, 0, s.top, WING.upper, s.w, 0.4));
    const inner = side * (w - s.w + WALL_DEPTH / 2);
    const bx = inner - WALL_DEPTH / 2;
    for (let k = 1; k < s.flights; k++) out.push(boxAt(bx, 0, s.foot - s.run * (k + 1), WALL_DEPTH, k * BRICK, s.run, 'wall'));
    out.push(boxAt(bx, 0, -d, WALL_DEPTH, WING.upper, s.top + d, 'wall'));
    out.push(rampZ(inner, s.foot, RAIL, s.top, WING.upper + RAIL, 0.3, RAIL));
    out.push(boxAt(inner - 0.15, WING.upper, -d, 0.3, RAIL, s.top + d, 'wall'));
  }
  const [fw, fh, fd] = FIGURE_BOX;
  for (const f of FIGURES) out.push(boxAt(f.x - fw / 2, DAIS.h, f.z - fd / 2, fw, fh, fd, 'block'));
  for (const f of FURNITURE) {
    if (!f.solid) continue;
    const [sw, sh, sd] = f.solid;
    // A quarter turn swaps its width and depth.
    const across = Math.abs(Math.sin(f.rot)) > 0.7;
    out.push({ x: f.x, y: f.y + sh / 2, z: f.z, w: across ? sd : sw, h: sh, d: across ? sw : sd, kind: 'block' });
  }
  return out;
}

export const LOBBY_HALL: Arena = {
  name: 'Lobby',
  boxes: boxes(),
  pads: [],
  playerStart: { ...LOBBY_START },
  spawns: [],
  dummies: [],
  turrets: [],
};
