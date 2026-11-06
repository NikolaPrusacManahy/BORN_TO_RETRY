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
import { WEAPONS } from '../../tuning/weapons';
import type { SwordPose } from './armsRig';
import { copySword, emptySword, mixSword, slashPose } from './swordPoses';
import { MoveSet, SWORD_MOVES } from './weaponMoves';

// Update 0.1.9 — a toss (the Dual Daggers' volley): the charged blow's path, quicker, a dagger gone from the hand till
// it's half-way back, and no wait for a hit.
// Update 0.3.70 — a guard (the Playable Demon's right click, its blade its parry): up to the charged blow's pose and back.
export type SwordMove = 'ready' | 'forehand' | 'backhand' | 'pierce' | 'throw' | 'toss' | 'guard';

/** A new move takes over from wherever the sword was over this long (s). */
const BLEND = 0.04;
/** Of a throw's wind-up, the part spent drawing back (the rest is the thrust that lets go). */
const THROW_DRAW = 0.6;
/** A guard goes up over this long, and back over this long (s). */
const GUARD_UP = 0.07;
const GUARD_DOWN = 0.22;
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

  /** A slash: back across if the sword rests on the left, otherwise a forehand. */
  slash() {
    this.start(this.pathNow > 0.5 ? 'backhand' : 'forehand');
  }

  /** Back to ready with no blend (a new weapon in hand, a reset). */
  reset() {
    this.move = 'ready';
    this.t = 1;
    this.pathNow = 0;
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
    this.t += this.t < this.contact() ? realDt : gameDt;
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
    const blend = this.move === 'throw' ? WEAPONS.v.throwWindup * THROW_DRAW : BLEND;
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
      case 'guard': {
        this.pathNow = 0;
        if (t >= GUARD_UP + GUARD_DOWN) return this.toReady(charge, out);
        const up = t < GUARD_UP ? t / GUARD_UP : 1 - (t - GUARD_UP) / GUARD_DOWN;
        mixSword(this.ready(charge, scratch), m.heavyReady, smooth(up), out);
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
