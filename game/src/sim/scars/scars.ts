// Update 0.2.15 — the Scars (the designer: "Yes, build Scars", from Claude's proposal: "after each boss and each
// challenge room, the chest offers 3 Scars and you take 1. Each Scar changes one of your moves for the rest of the
// run"). Which there are, what each changes (its card), the ones you carry (one bit each, with your keys and rings:
// lost when you die), and taking one: the rest of its offer fades. No Scar adds damage or healing (the designer's rule
// for items). The offer itself is scarOffer.ts; what each does is where its move is. Pure.
import { SCARS } from '../../tuning/scars';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS, WeaponKind } from '../weapons/catalog';

export type ScarKind = 'shoulderCharge' | 'secondWind' | 'bowling' | 'slingshot' | 'crater' | 'pogo' | 'hairTrigger' | 'ironKnuckles' | 'collector' | 'ricochet' | 'bloodbath' | 'adrenaline' | 'airButcher' | 'hoarder';
export const SCAR_KINDS: readonly ScarKind[] = ['shoulderCharge', 'secondWind', 'bowling', 'slingshot', 'crater', 'pogo', 'hairTrigger', 'ironKnuckles', 'collector', 'ricochet', 'bloodbath', 'adrenaline', 'airButcher', 'hoarder'];

/** The move each changes (its card says so). */
export const SCAR_MOVE: Record<ScarKind, string> = {
  shoulderCharge: 'Dash',
  secondWind: 'Dash',
  bowling: 'Slide',
  slingshot: 'Slide',
  crater: 'Slam',
  pogo: 'Slam',
  hairTrigger: 'Fists',
  ironKnuckles: 'Fists',
  collector: 'Weapons',
  ricochet: 'Weapons',
  bloodbath: 'Executions',
  adrenaline: 'Executions',
  airButcher: 'Executions',
  hoarder: 'Bonuses',
};

export const SCAR_NAME: Record<ScarKind, string> = {
  shoulderCharge: 'Shoulder Charge',
  secondWind: 'Second Wind',
  bowling: 'Bowling',
  slingshot: 'Slingshot',
  crater: 'Crater',
  pogo: 'Pogo',
  hairTrigger: 'Hair Trigger',
  ironKnuckles: 'Iron Knuckles',
  collector: 'Collector',
  ricochet: 'Ricochet',
  bloodbath: 'Bloodbath',
  adrenaline: 'Adrenaline',
  airButcher: 'Air Butcher',
  hoarder: 'Hoarder',
};

const pct = (share: number) => `${Math.round(share * 100)}%`;
const times = (n: number) => (n === 2 ? 'twice' : `${n} times`);

/** One line on what it does, with the numbers as they're set now. */
export const SCAR_DOES: Record<ScarKind, () => string> = {
  shoulderCharge: () => 'Dashing into an enemy throws it back and staggers it.',
  secondWind: () => 'A wall run gives you back a dash.',
  bowling: () => 'Sliding into an enemy knocks it back and staggers it.',
  slingshot: () => `A jump out of a slide carries ${pct(SCARS.v.slingshot - 1)} more speed.`,
  crater: () => `The higher you slam from, the wider its ring: up to ${times(SCARS.v.craterGrowth)} as wide.`,
  pogo: () => 'A slam that kills bounces you back up, high enough to slam again.',
  hairTrigger: () => 'Your charged punch is ready in half the time, for a dash.',
  // (Any hit already staggers the rest: only a mini boss shrugs a jab off.)
  ironKnuckles: () => 'A punch on a mini boss winding up makes it start over.',
  collector: () => `Weapons you find have ${pct(SCARS.v.collector)} more uses.`,
  ricochet: () => 'A thrown weapon bounces on to the nearest enemy.',
  bloodbath: () => `An execution's blast reaches ${SCARS.v.bloodbath} m.`,
  adrenaline: () => `An execution refills your dashes; you're untouchable for ${SCARS.v.adrenaline} s after.`,
  airButcher: () => `Kills while you're in the air count ${times(SCARS.v.airButcher)} on the execution meter.`,
  hoarder: () => `Kill bonuses last ${times(SCARS.v.hoarder)} as long.`,
};

const bit = (kind: ScarKind) => 1 << SCAR_KINDS.indexOf(kind);

/** Is `kind` among the Scars in `mask` (an Inventory's or a PlayerState's `scars`)? */
export const hasScar = (mask: number, kind: ScarKind) => (mask & bit(kind)) !== 0;
export const isScar = (kind: string): kind is ScarKind => (SCAR_KINDS as readonly string[]).includes(kind);
/** The Scars in `mask`, in their order. */
export const scarsIn = (mask: number) => SCAR_KINDS.filter((k) => hasScar(mask, k));
/** Does the run carry `kind`? */
export const scarred = (state: CombatState, kind: ScarKind) => hasScar(state.items.scars, kind);

/** Collector: the uses a new `kind` you get comes with (drops, chests, the shop). */
export function newUses(state: CombatState, kind: WeaponKind): number {
  const uses = WEAPON_STATS[kind]().uses;
  return scarred(state, 'collector') ? Math.round(uses * (1 + SCARS.v.collector)) : uses;
}

/** Takes Scar `kind` (E at one on offer, or walking over one the Lab dropped): it's yours for the rest of the run, and
 *  the rest of its offer (`offer`: its chest; −1 none) fades. */
export function takeScar(state: CombatState, player: PlayerState, kind: ScarKind, offer: number) {
  state.items.scars |= bit(kind);
  player.scars = state.items.scars;
  state.events.push('scar', SCAR_KINDS.indexOf(kind), player.pos.x, player.pos.y + 1, player.pos.z);
  if (offer < 0) return;
  for (const d of state.drops) {
    if (!d.alive || d.offer !== offer || !isScar(d.kind)) continue;
    d.alive = false;
    state.events.push('scarGone', SCAR_KINDS.indexOf(d.kind), d.pos.x, d.pos.y + 0.6, d.pos.z);
  }
}
