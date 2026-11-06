// Update 0.3.87 — what Gravity Sean's HUD shows of his waits (the designer: "his UI needs to correspond better since there is a lot of cooldown on his kit"): for each key, how long it's got left and how far it's filled back,
// by the stance he's in, and how long the moves of the stance he isn't in have left, so he knows what he'd be switching to. In tenths of a second, so it only changes when what you'd read does. Pure.
import { SEAN } from '../../tuning/sean';
import { gatherK, type GravityState } from './gravityMeter';

/** A wait: seconds left (0: ready), and how far it's filled back (0 … 1). */
export interface SeanWait {
  left: number;
  fill: number;
}

export interface SeanHud {
  /** Right click and Ctrl, in this stance; E, after an overload. */
  rmb: SeanWait;
  ctrl: SeanWait;
  e: SeanWait;
  /** Seconds left on right click and on Ctrl in the other stance (0: ready). */
  otherRmb: number;
  otherCtrl: number;
  /** Holding a piece: how far it's gathered (0 … 1). */
  gather: number;
  /** Time Stop running: seconds left (0: it isn't), and how much of it's left (0 … 1). */
  stopLeft: number;
  stopFill: number;
}

const wait = (): SeanWait => ({ left: 0, fill: 1 });

export const createSeanHud = (): SeanHud => ({ rmb: wait(), ctrl: wait(), e: wait(), otherRmb: 0, otherCtrl: 0, gather: 0, stopLeft: 0, stopFill: 0 });

/** Up to the next tenth: never says 0 while there's still some to go. */
const tenths = (s: number) => (s <= 0 ? 0 : Math.ceil(s * 10) / 10);

function setWait(w: SeanWait, left: number, full: number) {
  w.left = tenths(left);
  w.fill = left <= 0 ? 1 : Math.round((1 - left / Math.max(0.01, full)) * 40) / 40;
}

/** This frame's (into `out`). Grab's own wait is too short to read, so it's not shown. */
export function seanHud(g: GravityState, inAir: boolean, out: SeanHud): SeanHud {
  const v = SEAN.v;
  // (In the air, normal mode's Ctrl is a plunge, which doesn't wait for Ground Slam.)
  if (g.unstable) {
    setWait(out.rmb, g.holeWait, v.holeWait);
    setWait(out.ctrl, g.shockWait, v.shockWait);
    out.otherRmb = 0;
    out.otherCtrl = tenths(g.slamWait);
  } else {
    setWait(out.rmb, 0, 1);
    setWait(out.ctrl, inAir ? 0 : g.slamWait, v.slamWait);
    out.otherRmb = tenths(g.holeWait);
    out.otherCtrl = tenths(g.shockWait);
  }
  setWait(out.e, g.switchWait, v.overloadWait);
  out.gather = g.held ? Math.round(gatherK(g.held) * 40) / 40 : 0;
  const left = g.stop ? v.stopTime - g.stop.t : 0;
  out.stopLeft = tenths(left);
  out.stopFill = g.stop ? Math.round((left / Math.max(0.01, v.stopTime)) * 40) / 40 : 0;
  return out;
}

const sameWait = (a: SeanWait, b: SeanWait) => a.left === b.left && a.fill === b.fill;

/** The HUD shows these already. */
export const sameSeanHud = (a: SeanHud, b: SeanHud) =>
  sameWait(a.rmb, b.rmb) && sameWait(a.ctrl, b.ctrl) && sameWait(a.e, b.e) && a.otherRmb === b.otherRmb && a.otherCtrl === b.otherCtrl && a.gather === b.gather && a.stopLeft === b.stopLeft && a.stopFill === b.stopFill;

/** A copy to hand on. */
export const copySeanHud = (h: SeanHud): SeanHud => ({ ...h, rmb: { ...h.rmb }, ctrl: { ...h.ctrl }, e: { ...h.e } });
