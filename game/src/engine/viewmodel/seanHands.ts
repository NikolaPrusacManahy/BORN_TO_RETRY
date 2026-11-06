// Update 0.3.82 — Gravity Sean's open hands (enemy_bibles/Born to Retry — Gravity Sean.docx). The fists are the fists' rules; these are what he does with gravity. Right hand out, fingers
// spread, the palm pushing at what it holds (Grab and Fling); and a push as it goes. Update 0.3.83 — both palms gathering low (Black Hole's charge), both thrust out while it runs;
// the right arm up, the palm to the sky (Meteor). Fist targets as the guard's; the wrist kept within 40° (test-sean-grab.ts, test-sean-ultimates.ts).
import type { SeanHand } from '../../sim/combat/gravityMeter';
import type { ArmPose, ArmsRig } from './armsRig';
import { pose, viewToModel } from './armsMath';
import type { Side } from './guard';

interface Key {
  fist: [number, number, number];
  knuckles: [number, number, number];
  back: [number, number, number];
}

/** In the arms camera's view (x right, y up, −z ahead; m), as the Key Palm's are; which way the knuckles point, which way the back of the hand faces. */
const REACH: Key = { fist: [0.19, -0.05, -0.38], knuckles: [-0.18, 0.74, -0.65], back: [0.02, 0.66, 0.75] };
const GATHER_R: Key = { fist: [0.12, -0.12, -0.33], knuckles: [-0.34, 0.47, -0.82], back: [0.84, 0.54, 0] };
const RAISE_R: Key = { fist: [0.2, -0.03, -0.38], knuckles: [-0.12, 0.76, -0.64], back: [0.03, 0.64, 0.77] };
const SKY_R: Key = { fist: [0.17, 0.02, -0.33], knuckles: [-0.06, 0.93, -0.36], back: [0, 0.36, 0.93] };
const KEYS: Record<Exclude<SeanHand, 'none'>, { R: Key; both: boolean }> = {
  reach: { R: REACH, both: false },
  gather: { R: GATHER_R, both: true },
  raise: { R: RAISE_R, both: true },
  sky: { R: SKY_R, both: false },
};
/** How fast the hands come and go (per second); a throw's push: how far (m) and how long (s). */
const RATE = 12;
const PUSH = 0.1;
const PUSH_FOR = 0.18;

export class SeanHands {
  private want: SeanHand = 'none';
  private last: Exclude<SeanHand, 'none'> = 'reach';
  /** 0 … 1: how far each hand's come to it. */
  readonly weight: Record<Side, number> = { L: 0, R: 0 };
  private push = 0;
  private readonly out = pose();

  set(hand: SeanHand) {
    this.want = hand;
    if (hand !== 'none') this.last = hand;
  }

  /** How far both palms have come in, gathering (0 … 1): Black Hole's. */
  get gathering(): number {
    return this.last === 'gather' ? this.weight.L : 0;
  }

  /** Right hand: a throw's shove, out along the arm. */
  shove() {
    this.push = PUSH_FOR;
    this.last = 'reach';
  }

  update(dt: number) {
    this.push = Math.max(0, this.push - dt);
    const on = this.want !== 'none' || this.push > 0;
    const both = on && KEYS[this.last].both;
    const k = 1 - Math.exp(-RATE * dt);
    this.weight.R += ((on ? 1 : 0) - this.weight.R) * k;
    this.weight.L += ((both ? 1 : 0) - this.weight.L) * k;
    if (this.weight.R < 0.002) this.weight.R = 0;
    if (this.weight.L < 0.002) this.weight.L = 0;
  }

  /** This arm's pose (model space). */
  pose(rig: ArmsRig, side: Side): ArmPose {
    const key = KEYS[this.last].R;
    const flip = side === 'L' ? -1 : 1;
    const t = this.out;
    const shove = side === 'R' && this.push > 0 ? Math.sin((this.push / PUSH_FOR) * Math.PI) * PUSH : 0;
    t.fist.set(key.fist[0] * flip, key.fist[1], key.fist[2] - shove);
    t.knuckles.set(key.knuckles[0] * flip, key.knuckles[1], key.knuckles[2]);
    t.back.set(key.back[0] * flip, key.back[1], key.back[2]);
    viewToModel(t.fist, rig.eye);
    viewToModel(t.knuckles, null);
    viewToModel(t.back, null);
    t.knuckles.normalize();
    t.back.normalize();
    return t;
  }

  reset() {
    this.want = 'none';
    this.weight.L = this.weight.R = 0;
    this.push = 0;
  }
}
