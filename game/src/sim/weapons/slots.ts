// Update 0.0.17 — weapon slots (the designer): your fists are always slot 1 (key 1); a weapon you get goes in the next
// free slot (2, then 3, 4, 5) and into your hand; the number keys swap between them. All full: the new one takes the
// place of the one in your hand (slot 2 if your fists are out), which falls at your feet. A thrown weapon leaves its
// slot empty and your fists come out. `CombatState.weapon` is always the weapon in the picked slot (null: fists).
// Update 0.2.13 — no gaps (the designer: "when you get rid of the sword in 2nd slot, then slot 3 should become slot 2
// now and key 2 should be the right key to equip that one"): the weapons after an emptied slot move down one.
// **(placeholders: five slots; a new weapon goes into your hand)** Pure.
import type { Vector3 } from 'three';
import type { CombatState } from '../combat/state';
import { HeldWeapon, placePickup } from './weapons';

/** Slots in all, fists included (slot 1 is index 0). */
export const SLOTS = 5;

export function createBag(): (HeldWeapon | null)[] {
  return new Array<HeldWeapon | null>(SLOTS).fill(null);
}

/** The hand and the slots agree: a weapon put straight into your hand finds a slot (or takes slot 2's place). */
export function settleHand(state: CombatState) {
  const w = state.weapon;
  if (!w) {
    state.slot = 0;
    return;
  }
  if (state.bag[state.slot] === w) return;
  const at = state.bag.indexOf(w);
  if (at > 0) {
    state.slot = at;
    return;
  }
  const free = state.bag.indexOf(null, 1);
  state.slot = free > 0 ? free : 1;
  state.bag[state.slot] = w;
}

/** A weapon is yours: into the next free slot and into your hand (all full: in place of the one in your hand, which
 *  falls at `at`). Returns its slot (index). */
export function giveWeapon(state: CombatState, w: HeldWeapon, at: Vector3): number {
  // (Update 0.3.70 — the Demon's sword is always in hand.)
  // (Update 0.3.81 — Gravity Sean's hands are his moves.)
  if (state.demon || state.sean) return state.slot;
  settleHand(state);
  let slot = state.bag.indexOf(null, 1);
  if (slot < 0) {
    slot = state.slot > 0 ? state.slot : 1;
    const old = state.bag[slot]!;
    placePickup(state.pickups, old.kind, old.uses, at);
  }
  state.bag[slot] = w;
  state.slot = slot;
  state.weapon = w;
  return slot;
}

/** Picks slot `slot` (index; 0: fists) if there's something in it. Returns true if the hand changed. */
export function selectSlot(state: CombatState, slot: number): boolean {
  settleHand(state);
  if (slot === state.slot || slot < 0 || slot >= SLOTS) return false;
  if (slot > 0 && !state.bag[slot]) return false;
  state.slot = slot;
  state.weapon = state.bag[slot];
  if (state.weapon) state.weapon.cooldown = 0;
  state.events.push('weaponSwap', slot);
  return true;
}

/** The weapon in your hand is gone (thrown): its slot is empty, the ones after it move down, your fists are out. */
export function emptyHand(state: CombatState) {
  if (state.slot > 0) state.bag[state.slot] = null;
  closeGaps(state.bag);
  state.slot = 0;
  state.weapon = null;
}

/** Update 0.2.13 — the weapons packed into the first slots after the fists, in their order. */
function closeGaps(bag: (HeldWeapon | null)[]) {
  let to = 1;
  for (let from = 1; from < bag.length; from++) {
    const w = bag[from];
    if (!w) continue;
    bag[from] = null;
    bag[to++] = w;
  }
}
