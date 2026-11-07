// M2 — the weapon catalog (design §6). One entry per weapon kind; the numbers live in tuning/weapons.ts. A new weapon
// is a new kind here (the compiler then asks for its stats everywhere) plus its model.
// Update 0.0.13 — the Gold Sword (the designer: a sword that lasts 40 hits; from the shop): the sword's moves and
// numbers, its own uses.
// Update 0.1.4 — the Grimoire (the designer): an open book in the right hand, fire in the left; it casts fireballs
// (weapons/fireballs.ts) instead of swinging. `CASTS` says which kinds cast.
// Update 0.1.5 — the Gold Axe (the designer: swings like the sword, thrown it comes back to you when you hold right
// click, like Thor's hammer: `RETURNS`, weapons/recall.ts) and the Hammer (heavy and slow, both hands; its charged
// blow smashes the floor and a shockwave rolls across the room: `SMASHES`, weapons/smashWaves.ts).
// Update 0.1.6 — the axe's right click charges its throw (weapons/axeThrow.ts), so it has no charged blow of its own.
// Update 0.1.10 — the Gold Hammer and the Gold Daggers (the designer gave them uses: 35 and 90): the hammer's and the
// daggers' moves and numbers, more uses, the pack's gold models.
// Update 0.1.9 — the Dual Daggers (the designer: one in each hand, very fast hits, they last very long, +15% move speed
// while held: `HASTE`). Their cuts are the sword's swing with their own numbers; right click held throws a volley of
// them (`VOLLEYS`, weapons/knives.ts).
// Update 0.3.91 — the Pistol's gone, and `SHOOTS` with it (the designer: "scrap every guns").
import { ITEMS } from '../../tuning/items';
import { WEAPONS } from '../../tuning/weapons';

export type WeaponKind = 'sword' | 'goldSword' | 'grimoire' | 'goldAxe' | 'hammer' | 'daggers' | 'goldHammer' | 'goldDaggers';
export const WEAPON_KINDS: readonly WeaponKind[] = ['sword', 'goldSword', 'grimoire', 'goldAxe', 'hammer', 'daggers', 'goldHammer', 'goldDaggers'];

/** What the HUD calls each weapon. */
export const WEAPON_NAME: Record<WeaponKind, string> = { sword: 'Sword', goldSword: 'Gold Sword', grimoire: 'Grimoire', goldAxe: 'Gold Axe', hammer: 'Hammer', daggers: 'Dual Daggers', goldHammer: 'Gold Hammer', goldDaggers: 'Gold Daggers' };
/** Update 0.1.4 — it casts fire (left click a fireball, right click held a charged one) rather than swinging. */
export const CASTS: Record<WeaponKind, boolean> = { sword: false, goldSword: false, grimoire: true, goldAxe: false, hammer: false, daggers: false, goldHammer: false, goldDaggers: false };
/** Update 0.1.5 — thrown with right click, it stays where it lands (it doesn't break) and right click calls it back. */
export const RETURNS: Record<WeaponKind, boolean> = { sword: false, goldSword: false, grimoire: false, goldAxe: true, hammer: false, daggers: false, goldHammer: false, goldDaggers: false };
/** Update 0.1.5 — its charged blow smashes the floor: a shockwave rolls out across the room. */
export const SMASHES: Record<WeaponKind, boolean> = { sword: false, goldSword: false, grimoire: false, goldAxe: false, hammer: true, daggers: false, goldHammer: true, goldDaggers: false };
/** Update 0.1.9 — right click held charges a volley of thrown daggers (knives.ts) rather than a charged blow. */
export const VOLLEYS: Record<WeaponKind, boolean> = { sword: false, goldSword: false, grimoire: false, goldAxe: false, hammer: false, daggers: true, goldHammer: false, goldDaggers: true };
/** Update 0.1.9 — extra run speed while it's in your hand (0.15: +15%). */
export const HASTE: Record<WeaponKind, () => number> = { sword: () => 0, goldSword: () => 0, grimoire: () => 0, goldAxe: () => 0, hammer: () => 0, daggers: () => WEAPONS.v.daggerSpeed, goldHammer: () => 0, goldDaggers: () => WEAPONS.v.daggerSpeed };

export interface WeaponStats {
  name: string;
  /** Left click: a swing, every `interval` s while held. */
  damage: number;
  knock: number;
  reach: number;
  /** The sweep's radius (m). */
  width: number;
  interval: number;
  /** Right click (charged): the pierce (the axe's chop, the hammer's smash), and the uses it takes. */
  pierceDamage: number;
  pierceKnock: number;
  pierceReach: number;
  pierceWidth: number;
  pierceUses: number;
  /** Uses of a new one (from a stand, a drop or the shop). */
  uses: number;
}

function swordStats(name: string, uses: number): WeaponStats {
  const v = WEAPONS.v;
  return {
    name,
    damage: v.swordDamage,
    knock: v.swordKnock,
    reach: v.swordReach,
    width: v.swordWidth,
    interval: v.swordInterval,
    pierceDamage: v.swordPierceDamage,
    pierceKnock: v.swordPierceKnock,
    pierceReach: v.swordPierceReach,
    pierceWidth: v.swordPierceWidth,
    pierceUses: v.swordPierceUses,
    uses,
  };
}

export const WEAPON_STATS: Record<WeaponKind, () => WeaponStats> = {
  sword: () => swordStats(WEAPON_NAME.sword, WEAPONS.v.swordUses),
  goldSword: () => swordStats(WEAPON_NAME.goldSword, ITEMS.v.goldSwordUses),
  // (Its swing numbers are never used: it casts.)
  grimoire: () => ({ ...swordStats(WEAPON_NAME.grimoire, WEAPONS.v.grimoireUses), interval: WEAPONS.v.castInterval }),
  goldAxe: () => {
    const v = WEAPONS.v;
    // (Its right click throws it: the pierce numbers are never used.)
    return { name: WEAPON_NAME.goldAxe, damage: v.axeDamage, knock: v.axeKnock, reach: v.axeReach, width: v.axeWidth, interval: v.axeInterval, pierceDamage: v.axeDamage, pierceKnock: v.axeKnock, pierceReach: v.axeReach, pierceWidth: v.axeWidth, pierceUses: 1, uses: v.axeUses };
  },
  hammer: () => hammerStats(WEAPON_NAME.hammer, WEAPONS.v.hammerUses),
  daggers: () => daggerStats(WEAPON_NAME.daggers, WEAPONS.v.daggerUses),
  goldHammer: () => hammerStats(WEAPON_NAME.goldHammer, WEAPONS.v.goldHammerUses),
  goldDaggers: () => daggerStats(WEAPON_NAME.goldDaggers, WEAPONS.v.goldDaggerUses),
};

function hammerStats(name: string, uses: number): WeaponStats {
  const v = WEAPONS.v;
  return { name, damage: v.hammerDamage, knock: v.hammerKnock, reach: v.hammerReach, width: v.hammerWidth, interval: v.hammerInterval, pierceDamage: v.smashDamage, pierceKnock: v.smashKnock, pierceReach: v.hammerReach, pierceWidth: v.smashWidth, pierceUses: v.smashUses, uses };
}

function daggerStats(name: string, uses: number): WeaponStats {
  const v = WEAPONS.v;
  // (Right click throws a volley: the pierce numbers are never used.)
  return { name, damage: v.daggerDamage, knock: v.daggerKnock, reach: v.daggerReach, width: v.daggerWidth, interval: v.daggerInterval, pierceDamage: v.daggerDamage, pierceKnock: v.daggerKnock, pierceReach: v.daggerReach, pierceWidth: v.daggerWidth, pierceUses: 1, uses };
}
