// Update 0.1.6 — the fingers posed live (the designer: "the way the fist is closed isn't proper"). The arms were cut with
// every finger joint bent the same 1.4 rad about one axis and the thumb turned once (cut_arms.py bakes it as the rest
// pose): fingers like even hooks, the thumb along the side. Now every joint is set here from a shape, and shapes blend:
// - the punching fist: the knuckles bent square, the middle joints most, the tips tucked into the palm, the little
//   finger tucked furthest, the thumb folded across the index and middle fingers;
// - the grip round a handle of a given thickness: each finger closed until it meets the handle (worked out once per
//   thickness from the hand's own bones), the thumb closed over it;
// - the open hand.
// Where a held weapon sits (armsRig's hold: the baked fist's hole) doesn't move: the grip wraps round it.
import * as THREE from 'three';
import type { Side } from './guard';

/** Per finger (index, middle, ring, little), per joint (the knuckle, the middle joint, the tip joint). */
export const JOINTS = 12;

/** A hand's shape: each finger joint's curl (rad: 0 straight, + towards the palm) and the two thumb joints' turn from
 *  the baked tuck (x, y, z rad each, as the left hand has them; mirrored on the right). */
export interface HandShape {
  curl: number[];
  thumb: number[];
}

/** cut_arms.py's curl, per joint (rad): the rest pose. */
export const BAKED_CURL = 1.4;
/** The thumb's baked tuck about z (rad): turned back out, it's straight. */
const THUMB_TUCK = 0.9;

const shape = (curl: number[], thumb: number[]): HandShape => ({ curl, thumb });

/** Straight fingers, the thumb out. */
export const OPEN = shape(new Array(JOINTS).fill(0), [0, 0, -THUMB_TUCK, 0, 0, -THUMB_TUCK]);

/** The punching fist (the designer's photos): knuckle, middle joint, tip for each finger; the thumb folded across the
 *  front of the index and middle fingers (picked from close-ups of a dozen turns: tools/hand-shots.ts). */
export const PUNCH = shape(
  [1.45, 1.75, 1.0, 1.5, 1.75, 1.0, 1.55, 1.78, 1.0, 1.6, 1.8, 1.0],
  [0.2, -1.0, 0, 0.5, -0.2, 0],
);

/** Round a handle the tip joint bends this much of the middle joint's bend. */
const TIP_SHARE = 0.75;
/** The knuckle's bend is tried up to a rig's most (HandFit.most) in this step; the middle joint's up to its, found by
 *  halving (to a 2⁸th of it). Worked out at load: ~80 ms for both hands. */
const KNUCKLE_STEP = 0.1;
const HALVINGS = 8;
/** The grip's thumb: closed over the handle. */
export const GRIP_THUMB = [0.2, -1.0, 0, 0.5, -0.2, 0];
/** How far the handle leans across the palm from the knuckles' line towards them (rad: armsRig.holdMatrix's tilt, 15°
 *  in a hammer grip to 65° in a fencer's, changing through a swing): the grips are worked out at these leans… */
const TILTS = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2];
/** …and these handle thicknesses (radius, m); between them they're blended. */
const RADII = [0.008, 0.012, 0.016, 0.02, 0.024];

/** Update 0.3.70 — how a rig's hand closes. A thumb's axes are its rig's own, so its turns from the baked tuck are too
 *  (closed in a punch, closed on a handle, out); so are how thick its fingers are and how deep in the fist a handle sits. */
export interface HandFit {
  punch: readonly number[];
  grip: readonly number[];
  open: readonly number[];
  /** Half a finger's thickness (m): its bone line wraps this far outside the handle. */
  finger: number;
  /** A handle's place from the middle of the baked fingers (m): back towards the wrist, in towards the palm. */
  hole: { wrist: number; palm: number };
  /** The most a finger bends round a handle (rad). */
  most: { knuckle: number; middle: number };
  /** Update 0.3.73 — where its punch ends, if not at the crosshair: how far ahead of the eye, under it, and to its own side (m). */
  strike?: { ahead: number; drop: number; side: number };
}
export const QUATERNIUS_HAND: HandFit = { punch: PUNCH.thumb, grip: GRIP_THUMB, open: OPEN.thumb, finger: 0.004, hole: { wrist: 0, palm: 0 }, most: { knuckle: 1.7, middle: 1.9 } };
/** The Playable Demon's (a Universal Animation Library rig: cut_arms.py solves its tuck over the fingers, right as baked;
 *  thick gauntlet fingers, closing a loop about 5 × 9 cm that its big hilt fills: the handle goes in the loop's middle). */
// (Update 0.3.73 — its punch rises to the middle of the view, the elbow low. Its vambrace flares so wide that a straight one hides the fist behind it.)
export const DEMON_HAND: HandFit = { punch: [0, 0, 0, 0, 0, 0], grip: [0, 0, 0, 0, 0, 0], open: [0, 0, 0, 0, 0, 0], finger: 0.008, hole: { wrist: 0.01, palm: 0.015 }, most: { knuckle: 1.7, middle: 1.65 }, strike: { ahead: 0.44, drop: 0, side: 0.02 } };

interface Joint {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
}

const turn = new THREE.Quaternion();
const euler = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0);
const p3 = new THREE.Vector3();
const p4 = new THREE.Vector3();
const tip = new THREE.Vector3();
const mid = new THREE.Vector3();
const rel = new THREE.Vector3();

/** One hand's finger bones, and its grips worked out at load. */
export class HandBones {
  /** Per lean in TILTS, per radius in RADII, the grip's 12 curls. */
  private readonly grips: number[][][];
  private readonly live = shape(new Array(JOINTS).fill(0), new Array(6).fill(0));
  private readonly gripNow = shape(new Array(JOINTS).fill(0), GRIP_THUMB.slice());

  /** `fingers`: 12 joints (index…little × knuckle, middle, tip), `thumbs` 2; `openSign`: which way about x straightens a
   *  finger; `hole`, `through`, `up`: the baked fist's hole, the way through it and the way to the knuckles (the rest
   *  model space, the arms at rest). */
  constructor(
    private readonly side: Side,
    private readonly fingers: Joint[],
    private readonly thumbs: Joint[],
    private readonly openSign: number,
    hole: THREE.Vector3,
    through: THREE.Vector3,
    up: THREE.Vector3,
    private readonly fit: HandFit = QUATERNIUS_HAND,
  ) {
    this.grips = TILTS.map((t) => {
      const axis = through.clone().multiplyScalar(Math.cos(t)).addScaledVector(up, Math.sin(t)).normalize();
      return RADII.map((r) => this.solveGrip(r, hole, axis));
    });
    this.set(PUNCH);
  }

  /** Sets every joint to `s`. */
  set(s: HandShape) {
    for (let i = 0; i < JOINTS; i++) this.fingers[i].bone.quaternion.copy(this.fingers[i].rest).multiply(turn.setFromAxisAngle(X, this.openSign * (BAKED_CURL - s.curl[i])));
    const m = this.side === 'L' ? 1 : -1;
    for (let j = 0; j < 2; j++) {
      euler.set(s.thumb[j * 3], s.thumb[j * 3 + 1] * m, s.thumb[j * 3 + 2] * m);
      this.thumbs[j].bone.quaternion.copy(this.thumbs[j].rest).multiply(turn.setFromEuler(euler));
    }
  }

  /** The hand closed (into the punching fist, or round a handle of radius `grip` m leaning `tilt` rad in the fist by
   *  `hold`, 0 … 1), then opened by `open` (0 … 1). */
  pose(open: number, grip = 0, hold = 0, tilt = 0.4) {
    const s = this.live;
    const held = hold > 0 && grip > 0;
    const g = held ? this.grip(grip, tilt) : PUNCH;
    const t = this.fit;
    for (let i = 0; i < JOINTS; i++) s.curl[i] = lerp(lerp(PUNCH.curl[i], g.curl[i], hold), OPEN.curl[i], open);
    for (let i = 0; i < 6; i++) s.thumb[i] = lerp(lerp(t.punch[i], held ? t.grip[i] : t.punch[i], hold), t.open[i], open);
    this.set(s);
  }

  /** The grip round a handle of radius `r` leaning `tilt` (blended between the ones worked out). */
  grip(r: number, tilt: number): HandShape {
    const [i, ki] = cell(RADII, r);
    const [t, kt] = cell(TILTS, tilt);
    const a = this.grips[t];
    const b = this.grips[t + 1];
    for (let j = 0; j < JOINTS; j++) this.gripNow.curl[j] = lerp(lerp(a[i][j], a[i + 1][j], ki), lerp(b[i][j], b[i + 1][j], ki), kt);
    return this.gripNow;
  }

  /** Each finger closed round a handle of radius `r` through `hole` along `through` until it meets it: the most curl
   *  that keeps its joints and tip `r` + a finger's half-thickness off the handle's line. */
  private solveGrip(r: number, hole: THREE.Vector3, through: THREE.Vector3): number[] {
    const out = new Array(JOINTS).fill(0);
    const s = shape(out, OPEN.thumb.slice());
    /** Finger `f` bent `knuckle` and `middle` (the tip a share of it) clears the handle: its far joints and tip are all
     *  outside it. */
    const clears = (f: number, knuckle: number, middle: number) => {
      out[f * 3] = knuckle;
      out[f * 3 + 1] = middle;
      out[f * 3 + 2] = middle * TIP_SHARE;
      this.set(s);
      this.fingers[f * 3].bone.updateWorldMatrix(true, true);
      this.fingers[f * 3 + 1].bone.getWorldPosition(p3);
      this.fingers[f * 3 + 2].bone.getWorldPosition(p4);
      tip.subVectors(p4, p3).multiplyScalar(0.9).add(p4);
      mid.addVectors(p3, p4).multiplyScalar(0.5);
      return Math.min(off(p3, hole, through), off(p4, hole, through), off(tip, hole, through), off(mid, hole, through)) >= r + this.fit.finger;
    };
    for (let f = 0; f < 4; f++) {
      // Each knuckle bend, and for it the most middle-joint bend that still clears the handle: the pair that closes the
      // finger furthest round it without passing through. (Bent as one, a finger whose knuckle sits close to the
      // handle, the index where the handle leans up to it, could only stay open; bent at its knuckle first, it wraps.)
      let best = 0;
      let bestK = 0;
      let bestM = 0;
      const { knuckle: MAX_KNUCKLE, middle: MAX_MIDDLE } = this.fit.most;
      for (let k = MAX_KNUCKLE; k >= -1e-9; k -= KNUCKLE_STEP) {
        if (!clears(f, k, 0)) continue;
        // The most middle-joint bend that clears: it clears less the more it bends.
        let lo = 0;
        let hi = MAX_MIDDLE;
        if (clears(f, k, hi)) lo = hi;
        else
          for (let i = 0; i < HALVINGS; i++) {
            const m = (lo + hi) / 2;
            if (clears(f, k, m)) lo = m;
            else hi = m;
          }
        const m = lo;
        if (k + m > best + 1e-9) {
          best = k + m;
          bestK = k;
          bestM = m;
        }
      }
      out[f * 3] = bestK;
      out[f * 3 + 1] = bestM;
      out[f * 3 + 2] = bestM * TIP_SHARE;
    }
    this.set(PUNCH);
    this.fingers[0].bone.parent?.updateWorldMatrix(false, true);
    return out.slice();
  }
}

/** How far `p` is from the line through `at` along `dir` (length 1). */
function off(p: THREE.Vector3, at: THREE.Vector3, dir: THREE.Vector3): number {
  rel.subVectors(p, at);
  return rel.addScaledVector(dir, -rel.dot(dir)).length();
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Where `x` falls in the rising `xs`: the cell's first index and how far across it (0 … 1, held at the ends). */
function cell(xs: readonly number[], x: number): [number, number] {
  let i = 0;
  while (i < xs.length - 2 && x > xs[i + 1]) i++;
  return [i, Math.max(0, Math.min(1, (x - xs[i]) / (xs[i + 1] - xs[i])))];
}
