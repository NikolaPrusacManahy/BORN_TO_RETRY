// M1 — the gray-box Feel Lab: about 60 × 60 m with something for every move.
// The floor's top is y = 0; x and z run from -30 to 30. The player starts at the south edge facing north (-z).
import { Arena, boxAt, rampZ } from '../arena';

export const FEEL_LAB: Arena = {
  name: 'Feel Lab',
  boxes: [
    boxAt(-30, -1, -30, 60, 1, 60, 'floor'),
    // Outer walls, 12 m tall.
    boxAt(-31, -1, -31, 62, 13, 1, 'wall'),
    boxAt(-31, -1, 30, 62, 13, 1, 'wall'),
    boxAt(-31, -1, -30, 1, 13, 60, 'wall'),
    boxAt(30, -1, -30, 1, 13, 60, 'wall'),
    // Four pillars to dash around.
    boxAt(-11, 0, -11, 2, 8, 2, 'block'),
    boxAt(9, 0, -11, 2, 8, 2, 'block'),
    boxAt(-11, 0, 9, 2, 8, 2, 'block'),
    boxAt(9, 0, 9, 2, 8, 2, 'block'),
    // West: a wall-jump shaft (3 m gap, 14 m tall) and a landing platform at the top.
    boxAt(-24, 0, 2, 1, 14, 10, 'wall'),
    boxAt(-20, 0, 2, 1, 14, 10, 'wall'),
    boxAt(-25, 13, 12, 7, 1, 6, 'accent'),
    // North-east: a 4 m plateau with a ramp up to it, for slide-jumps.
    boxAt(11, 0, -25, 14, 4, 14, 'block'),
    rampZ(18, 0, 0, -11, 4, 6),
    // East: a drop tower (8 m) with a jump pad in front, for slams.
    boxAt(10, 0, 14, 4, 8, 4, 'block'),
    // East: a low tunnel (1.3 m) you can only slide through.
    boxAt(18, 1.3, 2, 4, 0.4, 6, 'accent'),
    boxAt(17.5, 0, 2, 0.5, 1.7, 6, 'block'),
    boxAt(22, 0, 2, 0.5, 1.7, 6, 'block'),
    // South-west: three 0.35 m steps (walked up without jumping).
    boxAt(-14, 0, 20, 2, 0.35, 3, 'block'),
    boxAt(-12, 0, 20, 2, 0.7, 3, 'block'),
    boxAt(-10, 0, 20, 2, 1.05, 3, 'block'),
    // North-west: a wall-run lane (Update 0.0.3) — three 8 m panels on alternating sides, 6 m apart, for chained
    // wall runs heading north. The outer west wall works for long single runs.
    boxAt(-28, 0, -10, 1, 6, 8, 'accent'),
    boxAt(-21, 0, -19, 1, 6, 8, 'accent'),
    boxAt(-28, 0, -28, 1, 6, 8, 'accent'),
    // Cover.
    boxAt(-6, 0, -4, 3, 1.2, 1.5, 'block'),
    boxAt(4, 0, -20, 2, 2.5, 2, 'block'),
    boxAt(-18, 0, -18, 4, 1, 4, 'block'),
    boxAt(-4, 0, -26, 6, 3, 1, 'block'),
    // M1 step 8 — a spike strip east of the start, to test health: touching it hurts and pops you up.
    boxAt(16, 0, 13, 6, 0.25, 4, 'hazard'),
  ],
  pads: [{ x: 12, y: 0, z: 10.5, radius: 1.2, launch: 24 }],
  playerStart: { x: 0, y: 0, z: 24, yaw: 0 },
  spawns: [
    { x: -26, y: 0, z: -6 },
    { x: 26, y: 0, z: -4 },
    { x: 0, y: 0, z: -27 },
    { x: -26, y: 0, z: 26 },
    { x: 26, y: 0, z: 26 },
    { x: -14, y: 0, z: -26 },
    { x: 26, y: 0, z: 12 },
    { x: -8, y: 0, z: 10 },
  ],
  // A row of four dummies in front of the start. The orb turret (it was here for the parry) is out of the lab
  // until the parry returns; it went at { x: 0, y: 0, z: -8 }.
  dummies: [
    { x: -6, y: 0, z: 17 },
    { x: -2, y: 0, z: 17 },
    { x: 2, y: 0, z: 17 },
    { x: 6, y: 0, z: 17 },
  ],
  turrets: [],
  // M2 — a sword on a stand just right of the start; grunts come from the spawn points above.
  stands: [{ x: 3, y: 0, z: 21.5 }],
};
