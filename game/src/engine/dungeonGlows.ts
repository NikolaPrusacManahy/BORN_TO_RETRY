// Update 0.3.0 — what shines on a floor, for the halos (halos.ts): lava and sludge in the pits (every few cells, the
// glow breathing), floor 3's crystals and glowing mushrooms, candles and candelabra. Never the torches (the designer:
// "remove the glow on fire torches"). Worked out once when the floor is drawn.
import { LAVA_DEPTH, type DungeonLevel } from '../world/dungeon/assemble';
import type { Dressing } from '../world/dungeon/dressing';
import { KEEP_PIECES } from '../world/dungeon/keepDressing';
import { HALOS } from './halos';

interface Glow {
  x: number;
  y: number;
  z: number;
  size: number;
  hex: number;
  strength: number;
  /** It breathes (lava). */
  breathes: boolean;
}

const CANDLE = 'kit_p2_Candle';

export class DungeonGlows {
  private readonly glows: Glow[] = [];
  private time = 0;

  constructor(dressing: Dressing, level: DungeonLevel) {
    const pit = dressing.style.pit;
    dressing.lava.forEach((c, i) => {
      if (i % 3 === 0) this.glows.push({ x: c.x, y: -LAVA_DEPTH + 0.7, z: c.z, size: 4.5, hex: pit ? pit.hot : 0xff7a20, strength: pit ? 0.25 : 0.4, breathes: true });
    });
    for (const r of level.rooms) for (const c of r.lairs.crystals) this.glows.push({ x: c.x, y: 1.3, z: c.z, size: 3.4, hex: 0xa070ff, strength: 0.45, breathes: false });
    dressing.marks.shrooms.forEach((s, i) => {
      if (i % 3 === 0) this.glows.push({ x: s.x, y: 0.35 * s.s, z: s.z, size: 1.6 * s.s, hex: 0xb98cff, strength: 0.45, breathes: false });
    });
    for (const p of dressing.pieces) {
      if (p.piece === KEEP_PIECES.candelabrum) this.glows.push({ x: p.x, y: 1.84 * p.sy, z: p.z, size: 1.3, hex: 0xffc070, strength: 0.5, breathes: false });
      else if (p.piece === CANDLE) this.glows.push({ x: p.x, y: 0.75 * p.sy, z: p.z, size: 0.7, hex: 0xffc070, strength: 0.5, breathes: false });
    }
  }

  update(dt: number) {
    this.time += dt;
    for (const g of this.glows) HALOS.add(g.x, g.y, g.z, g.size, g.hex, g.breathes ? g.strength * (0.8 + 0.2 * Math.sin(this.time * 1.7 + g.x)) : g.strength);
  }

  /** How many there are (for tests). */
  get count() {
    return this.glows.length;
  }
}
