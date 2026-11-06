// Update 0.2.9 — the lobby's measurements: the hall, its main gate, and where its areas and stations are (the
// collision is hall.ts's, the look hallDressing.ts's, what stands on the floor furniture.ts's). Pure data.
// Update 0.3.21 — the manor (the designer: "come back to the old one but you visually upgrade it … like it looks like an
// explorable manor and we have database of enemies still like upstairs"; the plan MD/LOBBY_MANOR_PLAN.md), in the
// dungeon kit's 2 m bricks. Game axes: x east, z south, yaw 0 faces north. You start in front of the floor paintings at
// the south end, facing north:
//   the great hall: the main gate in the north wall, the grand stairs along the side walls climbing north to a landing
//     in each north corner; the characters on their dais along the west wall, the difficulty's altars and the Fate
//     Cards' stand along the east wall, the crystal's dais in the middle, the ten floor paintings on the south wall;
//   the west wing: the dining hall (north) and the weapons gallery (south, through the hall's arch) below, the bestiary
//     above (the designer, of the first build: "for room on the left downstairs that display all weapon … like a
//     gallery"; "In the rooms upstairs, I think you can make it bigger and give more space on the red carpet");
//   the east wing: the library (north) and the items gallery (south) below ("the right side downstair is objects that
//     aren't weapons, ring, health, armour"), the cards gallery above ("upstairs right is the Cards gallery").

/** A brick (m: a wall's piece, a row's height), and a wall's depth. */
export const BRICK = 2;
export const WALL_DEPTH = 0.44;

/** The great hall's inside: x ±halfW, z ±halfD (m); its walls' height (five bricks), their collision's (up into the
 *  roof), and the underside of the roof's beams. */
export const HALL = { halfW: 15, halfD: 22, wallH: 10, wallTop: 12, beamsAt: 9.83 } as const;

/** Each wing (the west's; the east's mirrored): from the hall's wall out (x, as distances from the middle), north to
 *  south (z); the wall between its two ground-floor rooms (z), and its upper floor's height (the bestiary's floor, m). */
export const WING = { x0: 15, x1: 33, z0: -22, z1: 10, split: -8, upper: 6 } as const;

/** The main gate in the north wall: the gateway's half width and height (m), where its portcullis stands (z), and the
 *  arch's outer half width (its masonry either side of the gateway). */
export const GATE = { halfW: 2.8, height: 6.2, barsZ: -22.7, archHalfW: 5 } as const;
/** Walking this far into the gateway (z under this, within the gateway's width) goes through the gate. */
export const GATE_LINE = -21.6;

/** A grand stair along each side wall (the west's; the east's mirrored): its middle and width (x), its foot (z) and its
 *  three flights (each a brick up, `run` long), climbing north to the landing in the corner (z from `top` to the north
 *  wall) at the wing's upper floor. */
export const STAIR = { x: -13.5, w: 3, foot: -10, run: 3, flights: 3, top: -19 } as const;

/** The doorway from each landing into the bestiary (in the hall's side wall; z: its middle), and the arch from the
 *  great hall into each wing's south room (z: its middle). */
export const LANDING_DOOR_Z = -21;
export const WING_ARCH_Z = -4;

/** The characters' dais along the west wall: its east edge (x), its ends (z) and its height (m: one step). */
export const DAIS = { x0: -11, z0: 8, z1: 20, h: 0.35 } as const;
/** Where each character stands on it (in the roster's order, south to north: left to right as you face them). */
// (Update 0.3.70 — the Demon last. Update 0.3.80 — four, spread along the same stretch: the Fallen King and William Rich gone.)
export const FIGURES: readonly { x: number; z: number }[] = [18.8, 15.6, 12.4, 9.2].map((z) => ({ x: -13, z }));

/** The difficulties' altars along the east wall (in the difficulties' order, north to south: left to right as you face
 *  them), and how tall an altar is (m). (The designer: "a bit on the left I would say, for the difficulty tables and
 *  card": nearer the middle, clear of the paintings' corner.) */
export const ALTARS: readonly { x: number; z: number }[] = [3, 7.5, 12].map((z) => ({ x: 12.6, z }));
export const ALTAR_H = 1.16;

/** Update 0.2.17 — the Fate Cards' stand (Update 0.3.21: after the altars, along the east wall): a small table with a
 *  big card floating over it; where the card floats (m). */
export const CARD_STAND = { x: 12.6, z: 16 } as const;
export const CARD_FLOAT = 1.75;

/** The crystal's dais in the middle of the hall: its middle, its two steps' half sizes and height (m). */
export const CRYSTAL_DAIS = { x: 0, z: 2, outer: 4, inner: 2, step: 0.35 } as const;
/** The crystal floats over its pedestal this high (m). */
export const CRYSTAL_Y = 3.4;

/** The floor paintings on the south wall: each one's middle (x: floor 1 to 10 left to right as you face them, east to
 *  west), its middle's height and its size (m). */
export const PAINTINGS: readonly number[] = Array.from({ length: 10 }, (_, k) => 12.6 - 2.8 * k);
export const PAINTING = { y: 3.2, w: 2.2, h: 1.6 } as const;

/** Update 0.2.9 (the designer: "closed roof") — the roof's timber beams across the hall (their z), and the chandeliers
 *  hanging from some of them (their rings' middles): over the carpet and the crystal's dais. */
export const BEAMS: readonly number[] = [-18, -14, -10, -6, -2, 2, 6, 10, 14, 18];
export const CHANDELIERS: readonly { x: number; y: number; z: number }[] = [
  { x: 0, y: 6.4, z: -14 },
  { x: 0, y: 6.8, z: 2 },
  { x: 0, y: 6.4, z: 14 },
  { x: -7, y: 6.6, z: -2 },
  { x: 7, y: 6.6, z: -2 },
];

/** Where you stand when you come in, and when you turn back from the gate (feet, facing north). */
export const LOBBY_START = { x: 0, y: 0, z: 18.5, yaw: 0 } as const;
export const GATE_BACK = { x: 0, y: 0, z: -16, yaw: 0 } as const;
