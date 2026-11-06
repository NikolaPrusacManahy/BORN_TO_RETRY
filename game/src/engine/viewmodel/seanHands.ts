// Update 0.3.82 — Gravity Sean's hands, when they aren't the fists' (enemy_bibles/Born to Retry — Gravity Sean.docx). Right hand out, fingers spread, the palm pushing at what it holds (Grab); and a push as it
// goes. Update 0.3.83 — the right arm up, the palm to the sky (Meteor). Update 0.3.84 — palm up with Black Hole on it; a fist drawn back and driven out (Shockwave Punch). Fist targets as the guard's; the wrist
// kept within 40° (tests).
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
const RAISE_R: Key = { fist: [0.2, -0.03, -0.38], knuckles: [-0.12, 0.76, -0.64], back: [0.03, 0.64, 0.77] };
const SKY_R: Key = { fist: [0.17, 0.02, -0.33], knuckles: [-0.06, 0.93, -0.36], back: [0, 0.36, 0.93] };
const PALM_R: Key = { fist: [0.17, -0.11, -0.34], knuckles: [-0.3, 0.32, -0.9], back: [0.72, -0.62, -0.46] };
const WIND_R: Key = { fist: [0.3, -0.16, -0.28], knuckles: [0.25, 0.42, -0.87], back: [0.68, 0.57, 0.47] };
/** The fist at the end of Shockwave Punch: straight out at what you're aiming at. */
const STRIKE_R: Key = { fist: [0.14, -0.08, -0.56], knuckles: [-0.27, 0.37, -0.89], back: [0.67, 0.74, 0.11] };
const KEYS: Record<Exclude<SeanHand, 'none'>, { R: Key; both: boolean; closed: boolean }> = {
  reach: { R: REACH, both: false, closed: false },
  palm: { R: PALM_R, both: false, closed: false },
  wind: { R: WIND_R, both: false, closed: true },
  raise: { R: RAISE_R, both: true, closed: false },
  sky: { R: SKY_R, both: false, closed: false },
};
/** How fast the hands come and go (per second); a throw's push: how far (m) and how long (s). */
const RATE = 12;
const PUSH = 0.1;
const PUSH_FOR = 0.18;
/** Shockwave Punch: how long the fist stays out (s), and how fast it gets there and is drawn back (per second). */
const STRIKE_FOR = 0.34;
const STRIKE_RATE = 46;
const WIND_RATE = 34;

export class SeanHands {
  private want: SeanHand = 'none';
  private last: Exclude<SeanHand, 'none'> = 'reach';
  /** 0 … 1: how far each hand's come to it. */
  readonly weight: Record<Side, number> = { L: 0, R: 0 };
  /** 0 … 1: how open the right hand is. */
  open = 0;
  private push = 0;
  private striking = 0;
  private readonly out = pose();

  set(hand: SeanHand) {
    this.want = hand;
    if (hand !== 'none') this.last = hand;
  }

  /** How far his hand's come up to hold Black Hole (0 … 1). */
  get holding(): number {
    return this.last === 'palm' && this.want === 'palm' ? this.weight.R : 0;
  }

  /** Right hand: a throw's shove, out along the arm. */
  shove() {
    this.push = PUSH_FOR;
  }

  /** Shockwave Punch goes: the fist drawn back is driven out. */
  strike() {
    this.striking = STRIKE_FOR;
  }

  update(dt: number) {
    this.push = Math.max(0, this.push - dt);
    this.striking = Math.max(0, this.striking - dt);
    const on = this.want !== 'none' || this.push > 0 || this.striking > 0;
    const both = on && this.striking <= 0 && KEYS[this.last].both;
    const closed = this.striking > 0 || KEYS[this.last].closed;
    const fast = this.striking > 0 ? STRIKE_RATE : this.want === 'wind' ? WIND_RATE : RATE;
    const k = 1 - Math.exp(-fast * dt);
    this.weight.R += ((on ? 1 : 0) - this.weight.R) * k;
    this.weight.L += ((both ? 1 : 0) - this.weight.L) * (1 - Math.exp(-RATE * dt));
    this.open += ((on && !closed ? 1 : 0) - this.open) * k;
    if (this.weight.R < 0.002) this.weight.R = 0;
    if (this.weight.L < 0.002) this.weight.L = 0;
    if (this.open < 0.002) this.open = 0;
  }

  /** This arm's pose (model space). */
  pose(rig: ArmsRig, side: Side): ArmPose {
    const key = this.striking > 0 ? STRIKE_R : KEYS[this.last].R;
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
    this.open = 0;
    this.push = 0;
    this.striking = 0;
  }
}
