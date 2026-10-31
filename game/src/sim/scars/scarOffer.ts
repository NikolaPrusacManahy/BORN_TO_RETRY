// Update 0.2.15 — a chest's offer of Scars (scars.ts): as a boss's chest (not the run's last) or a challenge room's
// gives its loot, Scars you don't carry yet come out with it, three of them. The designer: "it does not get picked up
// automatically, when opening a chest it bounces out and land on the floor, 3 of them and if you pick one, the other 2
// dissapears": each is thrown out of the chest and lands on the floor in an arc before it (nearer and narrower if
// something stands in the way; never in a pit), then waits for E. Seeded (the run's RNG). Pure.
import { Vector3 } from 'three';
import { SCARS } from '../../tuning/scars';
import { freeAt, wallBetween } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { dropItem } from '../items/drops';
import { hasScar, ScarKind, SCAR_KINDS } from './scars';

/** A Scar flies out of the chest's top this high (m), for this long (s) before it's down. */
export const SCAR_FROM = 0.9;
export const SCAR_FLIGHT = 0.9;
/** The arcs tried in turn: how far before the chest (m), and the angle between two Scars (rad). Far enough out that
 *  the chest's own item (over it) is nearer when you stand up from it. */
const ARCS = [
  { r: 3, a: 0.95 },
  { r: 2.4, a: 0.8 },
  { r: 1.9, a: 0.65 },
];

const at = new Vector3();

/** Scars to offer, at most `n`: ones you don't carry and none already on offer, shuffled. */
export function drawScars(state: CombatState, n: number): ScarKind[] {
  const out = SCAR_KINDS.filter((k) => !hasScar(state.items.scars, k) && !state.drops.some((d) => d.alive && d.kind === k));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

/** Where the `k`th of `n` Scars hangs on `arc`, before (x, z) facing (fx, fz). */
function spot(arc: (typeof ARCS)[number], k: number, n: number, x: number, z: number, fx: number, fz: number): Vector3 {
  const ang = (k - (n - 1) / 2) * arc.a;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return at.set(x + (fx * c - fz * s) * arc.r, 0, z + (fx * s + fz * c) * arc.r);
}

/** Offers Scars before the chest at (x, z) whose front faces (fx, fz): they fly out of it to the floor. `offer`: the
 *  chest's index (taking one fades the rest). Returns how many came out. */
export function offerScars(state: CombatState, x: number, z: number, fx: number, fz: number, offer: number): number {
  const kinds = drawScars(state, Math.round(SCARS.v.offered));
  const n = kinds.length;
  if (n === 0) return 0;
  const nav = state.nav.small;
  const clear = (arc: (typeof ARCS)[number]) =>
    kinds.every((_, k) => {
      const p = spot(arc, k, n, x, z, fx, fz);
      return freeAt(nav, p.x, p.z) && !wallBetween(nav, x, z, p.x, p.z);
    });
  const arc = ARCS.find(clear) ?? ARCS[ARCS.length - 1];
  kinds.forEach((kind, k) => {
    const d = dropItem(state.drops, kind, spot(arc, k, n, x, z, fx, fz), state.events, true, 0, offer);
    d.land = SCAR_FLIGHT;
    d.from.set(x, SCAR_FROM, z);
  });
  return n;
}
