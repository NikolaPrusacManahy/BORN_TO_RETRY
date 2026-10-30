// Update 0.2.9 — the lobby's measurements: the hall, its main gate, and where its areas and stations are (the
// collision is hall.ts's, the look hallDressing.ts's, what stands on the floor furniture.ts's). Pure data.
// Game axes: x east, z south, yaw 0 faces north. You start at the south end facing north, down a red carpet:
//   a closed roof on timber beams, chandeliers hanging over the carpet and the tables;
//   north wall: the main gate (a portcullis in a great arch, the dark beyond), your difficulty and character over it;
//   west wall: the three difficulties, each an altar under its name; east wall: the characters on a low dais;
//   south wall, behind you: the credits; between: two feast tables either side of the carpet.

/** The hall's inside: x ±halfW, z ±halfD (m); its walls' height (five 2 m bricks), their collision's (up into the roof),
 *  and the underside of the roof's beams. */
export const HALL = { halfW: 15, halfD: 22, wallH: 10, wallTop: 12, beamsAt: 9.83 } as const;

/** The main gate in the north wall: the gateway's half width and height (m), where its portcullis stands (z), and the
 *  arch's outer half width (its masonry either side of the gateway). */
export const GATE = { halfW: 2.8, height: 6.2, barsZ: -22.7, archHalfW: 5 } as const;
/** Walking this far into the gateway (z under this, within the gateway's width) goes through the gate. */
export const GATE_LINE = -21.6;

/** The characters' dais against the east wall: its west edge (x), its ends (z) and its height (m: one step). */
export const DAIS = { x0: 11, z0: -11, z1: 7, h: 0.35 } as const;
/** Where each character stands on it (in the roster's order, north to south: left to right as you face them). */
export const FIGURES: readonly { x: number; z: number }[] = [-9, -4.5, 0, 4.5].map((z) => ({ x: 13, z }));

/** The difficulties' altars along the west wall (in the difficulties' order, south to north: left to right as you face
 *  them), and how tall an altar is (m). */
export const ALTARS: readonly { x: number; z: number }[] = [4, -2, -8].map((z) => ({ x: -12.6, z }));
export const ALTAR_H = 1.16;

/** Update 0.2.9 (the designer: "closed roof") — the roof's timber beams across the hall (their z), and the chandeliers
 *  hanging from some of them (their rings' middles): three down the carpet, one over each feast table. */
export const BEAMS: readonly number[] = [-18, -14, -10, -6, -2, 2, 6, 10, 14, 18];
export const CHANDELIERS: readonly { x: number; y: number; z: number }[] = [
  { x: 0, y: 6.4, z: -14 },
  { x: 0, y: 6.4, z: -2 },
  { x: 0, y: 6.4, z: 10 },
  { x: -6.2, y: 5.6, z: 6 },
  { x: 6.2, y: 5.6, z: 6 },
];

/** The credits' boards on the south wall: their middles (x), in the credits' order (left to right as you face them). */
export const CREDIT_BOARDS: readonly number[] = [5.2, 0, -5.2];

/** Where you stand when you come in, and when you turn back from the gate (feet, facing north). */
export const LOBBY_START = { x: 0, y: 0, z: 17, yaw: 0 } as const;
export const GATE_BACK = { x: 0, y: 0, z: -16, yaw: 0 } as const;
