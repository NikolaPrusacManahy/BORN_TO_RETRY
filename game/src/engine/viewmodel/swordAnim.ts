// M2 — what the sword arm is doing: held ready (drawing back to point the tip at the crosshair while a pierce
// charges), slashing, piercing (a straight thrust along the aim) and throwing (drawn back, thrust, let go). Works in
// the arms camera's view (swordPoses.ts).
// Update 0.0.10 (the designer: the first slash looked atrocious) — a slash runs along one path, from ready, through
// the middle of the view, to low on the left, then straight back to ready (the designer: resting there read as a
// freeze). The arms pick the way: from the right half of the path a forehand, from the left half (a slash before it's
// back) a backhand to ready. Hit-stop freezes a swing at its contact (half-way), not at its start, since the hit
// lands on the click.
// Update 0.1.5 — any one-handed or two-handed weapon's moves: the weapon in hand picks its own set (weaponMoves.ts: the
// sword's, the Gold Axe's hacks and cocked throw, the Hammer's heavy swings and smash); this plays it.
import { Vector3 } from 'three';
import { bladeBack, bladeFollow, bladeStrike, bladeWindup, VERDICT } from '../../sim/combat/bladeSwing';
import { DEMON } from '../../tuning/demon';
import { WEAPONS } from '../../tuning/weapons';
import type { SwordPose } from './armsRig';
import { arcAt, type ArcPhase } from './bladeArcs';
import { copySword, emptySword, mixSword, slashPose } from './swordPoses';
import { MoveSet, SWORD_MOVES } from './weaponMoves';

// Update 0.1.9 — a toss (the Dual Daggers' volley): the charged blow's path, quicker, a dagger gone from the hand till
// it's half-way back, and no wait for a hit.
// Update 0.3.70 — a guard (the Playable Demon's right click, its blade its parry): up to the charged blow's pose and back.
// Update 0.3.71 — an arc: one of the Demon's Blazing Arc (bladeArcs.ts plays it), on the game's clock, hit-stop and all.
// Update 0.3.72 — its block, held as long as you hold it; its lunge's thrust; the sword going into the floor.
export type SwordMove = 'ready' | 'forehand' | 'backhand' | 'pierce' | 'throw' | 'toss' | 'guard' | 'arc' | 'thrust' | 'plant';

/** A new move takes over from wherever the sword was over this long (s). */
const BLEND = 0.04;
/** Of a throw's wind-up, the part spent drawing back (the rest is the thrust that lets go). */
const THROW_DRAW = 0.6;
/** A guard goes up over this long, and back over this long (s). */
const GUARD_UP = 0.07;
const GUARD_DOWN = 0.22;
/** Update 0.3.72 — a thrust goes out over this long, and back over this; the sword goes into the floor and comes back. */
const THRUST_OUT = 0.04;
const THRUST_BACK = 0.26;
const PLANT_IN = 0.08;
const PLANT_BACK = 0.36;
/** A slash reaches its contact (the middle of the path) this far through its swing's ease. */
const CONTACT = 0.5;

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x * x * x;
const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const scratch = emptySword();

export class SwordAnim {
  private move: SwordMove = 'ready';
  private t = 0;
  /** Where along the slash path (0 ready … 1 the rest on the left) a slash began, and where the sword is now. */
  private pathFrom = 0;
  private pathNow = 0;
  /** The pose when this move began (blended out of), and the last pose shown. */
  private readonly from = emptySword();
  private readonly last = copySword(SWORD_MOVES.ready, emptySword());
  /** The weapon in hand's moves. */
  moves: MoveSet = SWORD_MOVES;
  /** Update 0.3.71 — how an arc's shoulders are turned (rad; x up, y left, z rolled), as it began, its phase, its glow. */
  readonly lean = new Vector3();
  private readonly leanFrom = new Vector3();
  private arcStep = 0;
  private phase: ArcPhase = 'done';
  private readonly glow = { k: 0 };
  /** Update 0.3.72 — right click held; falling in a dive, the sword held point down. */
  private blocking = false;
  private plantHeld = false;

  /** A weapon taken in hand: its moves from now on. */
  use(moves: MoveSet) {
    this.moves = moves;
  }

  start(move: SwordMove) {
    this.move = move;
    this.t = 0;
    this.pathFrom = this.pathNow;
    copySword(this.last, this.from);
  }

  /** Update 0.3.71 — one of the Demon's Blazing Arc starts, from wherever the blade is. */
  arc(step: number) {
    this.arcStep = step;
    this.leanFrom.copy(this.lean);
    this.start('arc');
  }

  /** Update 0.3.72 — the block: up as you press it, and held till you let go. */
  block(on: boolean) {
    if (on && this.move !== 'guard') this.start('guard');
    this.blocking = on;
  }

  /** Update 0.3.72 — Hellfire Lunge. */
  thrust() {
    this.start('thrust');
  }

  /** Update 0.3.72 — the sword point down: held while `falling` (a dive), else for the moment it's in the floor. */
  plant(falling: boolean) {
    this.plantHeld = falling;
    if (this.move !== 'plant') this.start('plant');
  }

  /** The dive's over: it stays in the floor only its moment. */
  landed() {
    this.plantHeld = false;
  }

  /** How hot the blade burns through an arc or a thrust (0 … 1), and whether it's cutting the air. */
  get flare(): number {
    if (this.move === 'thrust') return this.t < THRUST_OUT + DEMON.v.lungeTime ? 1 : 0;
    return this.move === 'arc' ? Math.max(this.glow.k, this.grown) : 0;
  }

  /** Update 0.3.73 — in Last Verdict's swing. */
  get inVerdict(): boolean {
    return this.move === 'arc' && this.arcStep === VERDICT;
  }

  /** Update 0.3.73 — how far grown the blade is for Last Verdict (0 … 1): as it rises; shrinking again as it comes back. */
  get grown(): number {
    if (this.move !== 'arc' || this.arcStep !== VERDICT) return 0;
    const windup = bladeWindup(VERDICT);
    const rise = windup - Math.min(bladeStrike(VERDICT), windup * 0.9);
    if (this.t < rise) return smooth(this.t / rise);
    const after = this.t - windup - bladeFollow(VERDICT);
    return after <= 0 ? 1 : 1 - smooth(clamp01(after / (bladeBack(VERDICT) * 0.6)));
  }

  get slicing(): boolean {
    // (A thrust leaves none as it goes out: the arm's only getting there. It's still in the arms' frame after, so nothing to burn.)
    return this.move === 'arc' && (this.phase === 'strike' || this.phase === 'follow');
  }

  /** A slash: back across if the sword rests on the left, otherwise a forehand. */
  slash() {
    this.start(this.pathNow > 0.5 ? 'backhand' : 'forehand');
  }

  /** Back to ready with no blend (a new weapon in hand, a reset). */
  reset() {
    this.move = 'ready';
    this.t = 1;
    this.pathNow = 0;
    this.lean.set(0, 0, 0);
    copySword(this.moves.ready, this.last);
  }

  get current(): SwordMove {
    return this.move;
  }

  /** Where along the slash path the sword is (0 ready … 1 resting on the left). */
  /** Update 0.1.9 — a toss has just let its dagger go: the hand is empty until it's half-way back (it draws another). */
  get empty(): boolean {
    const m = this.moves;
    return this.move === 'toss' && this.t < m.out() + m.hold() + m.back() * 0.5;
  }

  /** Update 0.1.9 — how far a toss's fingers have opened (0 … 1): out as the dagger leaves, shut round a new one by
   *  half-way back. */
  get letGo(): number {
    if (this.move !== 'toss') return 0;
    const m = this.moves;
    const out = Math.max(1e-3, m.out());
    if (this.t < out) return this.t / out;
    const k = (this.t - out - m.hold()) / Math.max(1e-3, m.back() * 0.5);
    return k <= 0 ? 1 : Math.max(0, 1 - k);
  }

  get path(): number {
    return this.pathNow;
  }

  /** `gameDt` stops in hit-stop; until a swing reaches its contact it runs on `realDt`, so it freezes on impact. */
  update(gameDt: number, realDt: number) {
    // (Update 0.3.71 — an arc's hit lands at its contact, by the same clock.)
    if (this.move === 'arc') {
      this.t += gameDt;
      return;
    }
    this.lean.multiplyScalar(Math.exp(-14 * gameDt));
    this.t += this.t < this.contact() ? realDt : gameDt;
    // (Update 0.3.72 — held up, or falling point down: it stays.)
    if (this.move === 'guard' && this.blocking) this.t = Math.min(this.t, GUARD_UP);
    if (this.move === 'plant' && this.plantHeld) this.t = Math.min(this.t, PLANT_IN);
  }

  /** Seconds into this move at which it meets what it hits (0: nothing to wait for). */
  private contact(): number {
    if (this.move === 'forehand' || this.move === 'backhand') return this.moves.swing() * (1 - Math.cbrt(1 - CONTACT));
    if (this.move === 'pierce') return this.moves.out();
    return 0;
  }

  /** This frame's pose (view space). `charge`: how far a pierce is charged, 0..1. */
  pose(charge: number, out: SwordPose): SwordPose {
    this.target(charge, out);
    // (Update 0.3.71 — an arc's wind-up is its own blend.)
    const blend = this.move === 'arc' || this.move === 'thrust' || this.move === 'plant' ? 0 : this.move === 'throw' ? WEAPONS.v.throwWindup * THROW_DRAW : BLEND;
    if (this.t < blend) mixSword(this.from, out, smooth(this.t / blend), out);
    copySword(out, this.last);
    return out;
  }

  private target(charge: number, out: SwordPose) {
    const m = this.moves;
    const t = this.t;
    switch (this.move) {
      case 'ready':
        this.pathNow = 0;
        return this.ready(charge, out);
      case 'forehand': {
        // Out to the left, then (after Slash rest, 0 by default) straight back to ready, low, below the view's middle.
        const k = easeOut(clamp01(t / m.swing()));
        this.pathNow = this.pathFrom + (1 - this.pathFrom) * k;
        slashPose(m.slash, this.pathNow, out);
        const hold = m.swing() + m.rest();
        if (t > hold) {
          const r = (t - hold) / m.recover();
          if (r >= 1) return this.toReady(charge, out);
          this.pathNow = 1 - r;
          mixSword(out, this.ready(charge, scratch), smooth(r), out);
        }
        return;
      }
      case 'backhand': {
        const k = easeOut(clamp01(t / m.swing()));
        if (k >= 1) return this.toReady(charge, out);
        this.pathNow = this.pathFrom * (1 - k);
        return slashPose(m.slash, this.pathNow, out);
      }
      case 'pierce':
      case 'toss': {
        this.pathNow = 0;
        mixSword(m.heavyReady, m.heavyOut, easeOut(clamp01(t / m.out())), out);
        const hold = m.out() + m.hold();
        if (t > hold) {
          const k = (t - hold) / m.back();
          if (k >= 1) return this.toReady(charge, out);
          mixSword(out, this.ready(charge, scratch), smooth(k), out);
        }
        return;
      }
      case 'arc': {
        this.pathNow = 0;
        const arc = m.arcs?.[this.arcStep];
        if (!arc) return this.toReady(charge, out);
        this.phase = arcAt(arc, t, this.from, this.ready(charge, scratch), out, this.lean, this.leanFrom, this.glow);
        if (this.phase === 'done') this.toReady(charge, out);
        return;
      }
      case 'guard': {
        this.pathNow = 0;
        if (t >= GUARD_UP + GUARD_DOWN) return this.toReady(charge, out);
        const up = t < GUARD_UP ? t / GUARD_UP : 1 - (t - GUARD_UP) / GUARD_DOWN;
        mixSword(this.ready(charge, scratch), m.guard ?? m.heavyReady, smooth(up), out);
        return;
      }
      case 'thrust': {
        this.pathNow = 0;
        const to = m.thrust ?? m.heavyOut;
        const hold = THRUST_OUT + DEMON.v.lungeTime;
        if (t < THRUST_OUT) mixSword(this.from, to, smooth(t / THRUST_OUT), out);
        else if (t < hold) copySword(to, out);
        else if (t < hold + THRUST_BACK) mixSword(to, this.ready(charge, scratch), smooth((t - hold) / THRUST_BACK), out);
        else this.toReady(charge, out);
        return;
      }
      case 'plant': {
        this.pathNow = 0;
        const to = m.plant ?? m.heavyOut;
        const hold = PLANT_IN + DEMON.v.plantFor;
        if (t < PLANT_IN) mixSword(this.from, to, smooth(t / PLANT_IN), out);
        else if (t < hold) copySword(to, out);
        else if (t < hold + PLANT_BACK) mixSword(to, this.ready(charge, scratch), smooth((t - hold) / PLANT_BACK), out);
        else this.toReady(charge, out);
        return;
      }
      case 'throw': {
        // Drawn back (blended in from where it was), then thrust: the sword leaves the hand at the end.
        this.pathNow = 0;
        const draw = WEAPONS.v.throwWindup * THROW_DRAW;
        const thrust = Math.max(1e-3, WEAPONS.v.throwWindup - draw);
        mixSword(m.heavyReady, m.heavyOut, t <= draw ? 0 : easeIn(clamp01((t - draw) / thrust)), out);
        return;
      }
    }
  }

  /** Ready, drawn towards the charged blow's pose by the charge. */
  private ready(charge: number, out: SwordPose) {
    return mixSword(this.moves.ready, this.moves.heavyReady, smooth(clamp01(charge)), out);
  }

  /** The move is over: ready again. */
  private toReady(charge: number, out: SwordPose) {
    this.move = 'ready';
    this.pathNow = 0;
    this.ready(charge, out);
  }
}
