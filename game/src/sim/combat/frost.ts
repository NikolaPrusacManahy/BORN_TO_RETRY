// Update 0.3.22 — floor 7's warband's frost (MD/FLOOR7_WARBAND_PLAN.md): the chill in you (a Draugr's touch, a rime
// burst: each takes Chill slow off your speed, up to Chill most at once, for Chill for after the last) and the patches
// of rime on the floor (the Völva's bolts, Haugbui's stomp and his blocks of ice: ice as the floor's own sheets are,
// for you and for them, until they thaw). Pure.
import type { EventQueue } from '../../core/eventQueue';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { FROZEN_KNOBS } from '../../tuning/frozen';
import type { CombatEvent } from './state';

/** A patch of rime: its middle, how far across, its life left and whole (s). */
export interface Rime {
  alive: boolean;
  x: number;
  z: number;
  size: number;
  life: number;
  full: number;
}

export interface Frost {
  /** Chills in you, and how long they last yet (s). */
  chill: number;
  chillFor: number;
  rime: Rime[];
}

export const RIME_POOL = 16;
/** Above the floor this far (m) you're off the rime. */
const OFF = 0.3;

export const createFrost = (): Frost => ({ chill: 0, chillFor: 0, rime: Array.from({ length: RIME_POOL }, () => ({ alive: false, x: 0, z: 0, size: 0, life: 0, full: 0 })) });

export function clearFrost(f: Frost) {
  f.chill = f.chillFor = 0;
  for (const r of f.rime) r.alive = false;
}

/** One more chill in you ('chilled', value: how many now). */
export function chillYou(f: Frost, events: EventQueue<CombatEvent>, x: number, y: number, z: number) {
  const v = FOES_NORSE.v;
  f.chill = Math.min(Math.round(v.chillMax), f.chill + 1);
  f.chillFor = v.chillFor;
  events.push('chilled', f.chill, x, y, z);
}

/** Your speed's share with the chill in you (1: none). */
export const chillSlow = (f: Frost | undefined) => (f ? Math.max(0, 1 - FOES_NORSE.v.chillSlow * f.chill) : 1);

/** A patch of rime `size` across at (x, z), lasting `life` (the oldest gives way when every one is in use). */
export function addRime(f: Frost, x: number, z: number, size: number, life: number) {
  let r = f.rime.find((p) => !p.alive);
  if (!r) r = f.rime.reduce((a, b) => (b.life < a.life ? b : a));
  r.alive = true;
  r.x = x;
  r.z = z;
  r.size = size;
  r.life = r.full = life;
}

/** Feet on the floor over a patch of rime. */
export function onRime(f: Frost | undefined, x: number, y: number, z: number): boolean {
  if (!f || y > OFF) return false;
  for (const r of f.rime) if (r.alive && Math.hypot(x - r.x, z - r.z) <= r.size / 2) return true;
  return false;
}

/** Your grip with your feet at (x, y, z): on rime as on the floor's ice (Ice grip), else 1. */
export const rimeGrip = (f: Frost, x: number, y: number, z: number) => (onRime(f, x, y, z) ? FROZEN_KNOBS.v.iceGrip : 1);

/** Each tick: the chill wears off, the rime thaws. */
export function stepFrost(f: Frost, dt: number) {
  f.chillFor = Math.max(0, f.chillFor - dt);
  if (f.chillFor === 0) f.chill = 0;
  for (const r of f.rime) {
    if (!r.alive) continue;
    r.life -= dt;
    if (r.life <= 0) r.alive = false;
  }
}
