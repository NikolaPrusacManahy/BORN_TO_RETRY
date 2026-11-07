// Update 0.1.20 — what an item is and what it does (the designer: "walking close to an item displays an overlay near the
// object stating what it is and what it does, with the appropriate rarity if applicable"): its name, its rarity (a
// chest's tiers, loot.ts; the rest by where they stand among them: the Hammer and the normal key common, the Dual
// Daggers and the white key rare, the gold key epic; the kill bonuses have none), and one line on what it does, with
// the numbers as they're set now. For everything that can lie on the floor, stand on a shop tile or be picked up. Pure.
import { BONUS } from '../../tuning/bonus';
import { ITEMS } from '../../tuning/items';
import { WEAPONS } from '../../tuning/weapons';
import { Rarity, TIER } from '../dungeon/loot';
import { WEAPON_NAME, WEAPON_STATS, WeaponKind } from '../weapons/catalog';
import type { DropKind } from './drops';

export type InfoKind = DropKind | WeaponKind;

export interface ItemInfo {
  name: string;
  rarity: Rarity | null;
  does: string;
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

const NAME: Record<Exclude<InfoKind, WeaponKind>, string> = {
  heart: 'Heart',
  greatHeart: 'Great Heart',
  plate: 'Silver Plate',
  goldPlate: 'Gold Armour',
  redRing: 'Red Ring',
  blueRing: 'Blue Ring',
  greenRing: 'Green Ring',
  tealRing: 'Teal Ring',
  key: 'Key',
  whiteKey: 'White Key',
  goldKey: 'Gold Key',
  snowflake: 'Snowflake',
  goldIngots: 'Gold Ingots',
  bluePotion: 'Blue Potion',
};

const DOES: Record<InfoKind, () => string> = {
  heart: () => `Heals ${pct(ITEMS.v.heartHeal)} of your health.`,
  greatHeart: () => (ITEMS.v.greatHeartHeal >= 1 ? 'Heals all your health.' : `Heals ${pct(ITEMS.v.greatHeartHeal)} of your health.`),
  plate: () => `+${ITEMS.v.silverShield} armour.`,
  goldPlate: () => `+${ITEMS.v.goldShield} armour.`,
  redRing: () => `+${ITEMS.v.redRingHp} max health.`,
  blueRing: () => `+${pct(ITEMS.v.blueRing)} run speed.`,
  greenRing: () => `+${pct(ITEMS.v.greenRing)} attack speed.`,
  tealRing: () => `+${ITEMS.v.tealRingHp} max health.`,
  key: () => 'Opens a chest.',
  whiteKey: () => 'Opens a chest: rare loot or better.',
  goldKey: () => 'Opens a chest: epic or mythic loot.',
  snowflake: () => `For ${BONUS.v.freezeFor} s your hits freeze enemies.`,
  goldIngots: () => `For ${BONUS.v.goldFor} s kills give ${pct(BONUS.v.goldBoost)} more coins.`,
  bluePotion: () => `For ${BONUS.v.potionFor} s you run faster.`,
  sword: () => 'Quick cuts.',
  goldSword: () => 'Quick cuts that last.',
  grimoire: () => 'Casts fireballs; hold to charge a big one.',
  goldAxe: () => 'Cuts; thrown, it comes back to you.',
  hammer: () => 'Heavy blows; a charged one shakes the floor.',
  goldHammer: () => 'Heavy blows; a charged one shakes the floor.',
  daggers: () => `Very fast cuts; hold to throw a volley. +${pct(WEAPONS.v.daggerSpeed)} run speed.`,
  goldDaggers: () => `Very fast cuts; hold to throw a volley. +${pct(WEAPONS.v.daggerSpeed)} run speed.`,
};

/** What isn't in a chest's tiers. */
const RARITY_ELSE: Partial<Record<InfoKind, Rarity>> = { sword: 'common', hammer: 'common', key: 'common', daggers: 'rare', whiteKey: 'rare', goldKey: 'epic' };

const BONUSES: readonly InfoKind[] = ['snowflake', 'goldIngots', 'bluePotion'];

export function rarityOf(kind: InfoKind): Rarity | null {
  if (BONUSES.includes(kind)) return null;
  for (const r of Object.keys(TIER) as Rarity[]) if ((TIER[r] as readonly string[]).includes(kind)) return r;
  return RARITY_ELSE[kind] ?? null;
}

export const isWeapon = (kind: InfoKind): kind is WeaponKind => kind in WEAPON_STATS;

/** `kind`'s card. A weapon's line ends with its uses: `uses` (one lying there), or a new one's. */
export function infoOf(kind: InfoKind, uses = -1): ItemInfo {
  if (isWeapon(kind)) {
    const n = uses >= 0 ? uses : WEAPON_STATS[kind]().uses;
    return { name: WEAPON_NAME[kind], rarity: rarityOf(kind), does: `${DOES[kind]()} ${n} uses.` };
  }
  return { name: NAME[kind], rarity: rarityOf(kind), does: DOES[kind]() };
}
