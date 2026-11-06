// Update 0.3.71 — a premium swing of the Playable Demon's blade (the designer: "swing animation needs premium treatment"). A
// swing used to run one curve from the click; now it has a body. It winds up, from wherever the blade was, drawn back
// slowly into its cocked pose; it explodes through, gathering speed, fastest as it meets what it hits (the rules' contact:
// sim/combat/bladeSwing.ts, the same tuning, so the hit lands as the blade arrives); its weight carries it on, slowing;
// and it heaves back to ready, a little past and settling. The shoulders and the view turn with it (`lean`), and the blade
// burns brighter through the strike (`flare`).
import { Vector3 } from 'three';
import { bladeBack, bladeFollow, bladeStrike, bladeWindup } from '../../sim/combat/bladeSwing';
import type { SwordPose } from './armsRig';
import { emptySword, mixSword, slashPose } from './swordPoses';

export interface BladeArc {
  /** Which (0 slash, 1 backslash, 2 overhead, 3 Ember Wave, 4 the throw, 5 Last Verdict). */
  step: number;
  /** Cocked first, on through its contact, to where its weight carries it. */
  keys: readonly SwordPose[];
  /** How far along them it meets what it hits (0 … 1). */
  hit: number;
  /** How the shoulders are turned (x up, y left, z rolled anticlockwise; rad): cocked, and as it goes through. */
  cocked: Vector3;
  through: Vector3;
  /** Update 0.3.74 — it goes back the way it came, then to ready (none: straight to ready). */
  retrace?: boolean;
}

export type ArcPhase = 'wind' | 'strike' | 'follow' | 'back' | 'done';

const smooth = (x: number) => x * x * (3 - 2 * x);
/** Back to ready: a heave, a little past, and settling. */
const settle = (x: number) => (x < 0.7 ? 1.05 * smooth(x / 0.7) : 1.05 - 0.05 * smooth((x - 0.7) / 0.3));

const end = emptySword();
/** Of a return that retraces, the share spent going back along its keys. */
const RETRACE = 0.6;

/** The arc `t` seconds in, from the pose it began in, to `ready`. Writes the pose and the shoulders' `lean` (from `leanFrom`).
 *  Returns its phase, and how hot the blade burns (`glow.k`, 0 … 1). */
export function arcAt(a: BladeArc, t: number, from: SwordPose, ready: SwordPose, out: SwordPose, lean: Vector3, leanFrom: Vector3, glow: { k: number }): ArcPhase {
  const windup = bladeWindup(a.step);
  const strike = Math.min(bladeStrike(a.step), windup * 0.9);
  const cock = windup - strike;
  const follow = bladeFollow(a.step);
  glow.k = 0;
  if (t < cock) {
    const x = smooth(t / cock);
    mixSword(from, a.keys[0], x, out);
    lean.lerpVectors(leanFrom, a.cocked, x);
    return 'wind';
  }
  if (t < windup) {
    const x = (t - cock) / strike;
    // Gathering speed: fastest at contact.
    slashPose(a.keys, a.hit * x * x, out);
    lean.lerpVectors(a.cocked, a.through, x * x);
    glow.k = x;
    return 'strike';
  }
  if (t < windup + follow) {
    const y = (t - windup) / follow;
    // Its weight carrying it on: as fast as it came, slowing.
    slashPose(a.keys, a.hit + (1 - a.hit) * (1 - (1 - y) ** 3), out);
    lean.copy(a.through);
    glow.k = 1 - y;
    return 'follow';
  }
  const r = (t - windup - follow) / bladeBack(a.step);
  if (r >= 1) {
    lean.set(0, 0, 0);
    return 'done';
  }
  slashPose(a.keys, 1, end);
  if (a.retrace && r < RETRACE) slashPose(a.keys, 1 - smooth(r / RETRACE), out);
  else if (a.retrace) mixSword(a.keys[0], ready, settle((r - RETRACE) / (1 - RETRACE)), out);
  else mixSword(end, ready, settle(r), out);
  lean.copy(a.through).multiplyScalar(1 - smooth(r));
  return 'back';
}
