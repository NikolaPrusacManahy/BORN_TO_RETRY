// Update 0.2.9 — the lobby's collision (the designer: "a fully main lobby where your character can move around … a big
// closed dungeon area with tables and chairs and decorations … a big main gate that leads to the actual game"): one
// closed hall (spots.ts) under its roof, the main gate's portcullis shut in its gateway, the
// characters' dais and the characters on it, and the furniture (furniture.ts, the same list its look comes from).
import { Arena, ArenaBox, boxAt } from '../arena';
import { FURNITURE } from './furniture';
import { DAIS, FIGURES, GATE, HALL, LOBBY_START } from './spots';

/** A character on the dais stands in this (width, height, depth: m). */
const FIGURE_BOX: [number, number, number] = [0.7, 1.9, 0.7];

function boxes(): ArenaBox[] {
  const { halfW: w, halfD: d, wallTop: top } = HALL;
  const g = GATE;
  const out: ArenaBox[] = [
    // The floor, on under the gate to the dark beyond it.
    boxAt(-w - 2, -1, -d - 10, 2 * w + 4, 1, 2 * d + 12, 'floor'),
    boxAt(-w - 2, 0, -d - 2, 2, top, 2 * d + 4, 'wall'),
    boxAt(w, 0, -d - 2, 2, top, 2 * d + 4, 'wall'),
    boxAt(-w - 2, 0, d, 2 * w + 4, top, 2, 'wall'),
    // The north wall either side of the gateway, over it, and the portcullis shut in it.
    boxAt(-w - 2, 0, -d - 2, w + 2 - g.halfW, top, 2, 'wall'),
    boxAt(g.halfW, 0, -d - 2, w + 2 - g.halfW, top, 2, 'wall'),
    boxAt(-g.halfW, g.height, -d - 2, 2 * g.halfW, top - g.height, 2, 'wall'),
    boxAt(-g.halfW, 0, g.barsZ - 0.15, 2 * g.halfW, g.height, 0.3, 'wall'),
    // The roof, at its beams.
    boxAt(-w - 2, HALL.beamsAt, -d - 2, 2 * w + 4, 1, 2 * d + 4, 'wall'),
    boxAt(DAIS.x0, 0, DAIS.z0, w - DAIS.x0, DAIS.h, DAIS.z1 - DAIS.z0, 'block'),
  ];
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
