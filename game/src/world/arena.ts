// M1 — an arena as plain data: boxes (some tilted into ramps), jump pads, the player start and enemy spawns.
// physics/ builds colliders from it and engine/ builds meshes from it, so the two always match.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

/** M1 step 8 — 'hazard': spikes; solid like a block, and touching its top hurts (sim/player/hazards.ts). */
// Update 0.0.20 — 'lava': a pit's bottom (solid; landing on it burns you and throws you back out: sim/dungeon/lava.ts).
export type BoxKind = 'floor' | 'wall' | 'block' | 'ramp' | 'accent' | 'hazard' | 'lava';

export interface ArenaBox {
  /** Centre (m). */
  x: number;
  y: number;
  z: number;
  /** Full size (m). */
  w: number;
  h: number;
  d: number;
  /** Rotation as a quaternion [x, y, z, w]; none = axis-aligned. */
  quat?: [number, number, number, number];
  kind: BoxKind;
}

export interface JumpPad {
  x: number;
  /** Height of the pad's top surface. */
  y: number;
  z: number;
  radius: number;
  /** Upward speed it gives (m/s). */
  launch: number;
}

export interface Spot {
  x: number;
  y: number;
  z: number;
}

export interface Arena {
  name: string;
  boxes: ArenaBox[];
  pads: JumpPad[];
  /** Feet position and facing (yaw 0 faces -z). */
  playerStart: { x: number; y: number; z: number; yaw: number };
  spawns: Spot[];
  /** M1 step 6 — training dummies (base positions). */
  dummies: Spot[];
  /** M1 step 6 — orb turrets (base positions). */
  turrets: Spot[];
  /** M2 — stands holding a weapon (the lab's sword); it's back a moment after you take it. */
  stands?: Spot[];
  /** Update 0.3.9 — the pillars (a dungeon's columns): middle, half side, height (m). The pillar finisher breaks them.
   *  Update 0.3.10 — and its box (an index into `boxes`; −1: none). */
  pillars?: { x: number; z: number; half: number; h: number; box: number }[];
}

/** M1 step 8 — the arena's hazard boxes (spike strips). */
export function hazardsOf(arena: Arena): ArenaBox[] {
  return arena.boxes.filter((b) => b.kind === 'hazard');
}

/** Update 0.0.20 — the arena's lava (pit bottoms). */
export function lavaOf(arena: Arena): ArenaBox[] {
  return arena.boxes.filter((b) => b.kind === 'lava');
}

/** An axis-aligned box from its min corner and size, which is easier to lay out than a centre. */
export function boxAt(minX: number, minY: number, minZ: number, w: number, h: number, d: number, kind: BoxKind): ArenaBox {
  return { x: minX + w / 2, y: minY + h / 2, z: minZ + d / 2, w, h, d, kind };
}

/**
 * A ramp whose top surface runs from (x, y0, z0) to (x, y1, z1) along the z axis, `width` wide and
 * `thickness` thick. A little extra length tucks its ends into the ground and the ledge it meets.
 */
export function rampZ(x: number, z0: number, y0: number, z1: number, y1: number, width: number, thickness = 0.5): ArenaBox {
  const run = z1 - z0;
  const rise = y1 - y0;
  const len = Math.hypot(run, rise) + 0.6;
  // Tilting about x by +a turns local +z towards -y: a ramp rising towards -z tilts by +a, towards +z by -a.
  const angle = Math.atan2(rise, Math.abs(run)) * (run < 0 ? 1 : -1);
  const q = new Quaternion().setFromEuler(new Euler(angle, 0, 0));
  // The box's centre sits half a thickness below the middle of the top surface, along the surface normal.
  const ny = Math.cos(angle);
  const nz = Math.sin(angle);
  return {
    x,
    y: (y0 + y1) / 2 - (ny * thickness) / 2,
    z: (z0 + z1) / 2 - (nz * thickness) / 2,
    w: width,
    h: thickness,
    d: len,
    quat: [q.x, q.y, q.z, q.w],
    kind: 'ramp',
  };
}

/** Update 0.3.53 — a ramp whose top surface runs from `a` to `b`, any way round (the Bone King's arm), `width` wide and
 *  `thickness` thick; a little extra length tucks its ends in. */
export function rampBetween(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, width: number, thickness = 0.5): ArenaBox {
  const along = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = along.length() + 0.6;
  along.normalize();
  const side = new Vector3().crossVectors(along, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(side, along).normalize();
  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, up, along.clone().negate()));
  return {
    x: (a.x + b.x) / 2 - (up.x * thickness) / 2,
    y: (a.y + b.y) / 2 - (up.y * thickness) / 2,
    z: (a.z + b.z) / 2 - (up.z * thickness) / 2,
    w: width,
    h: thickness,
    d: len,
    quat: [q.x, q.y, q.z, q.w],
    kind: 'ramp',
  };
}
