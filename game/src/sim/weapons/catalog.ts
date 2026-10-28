// M2 — the weapon catalog (design §6). One entry per weapon kind; the numbers live in tuning/weapons.ts. A new weapon
// is a new kind here (the compiler then asks for its stats everywhere) plus its model.
// Update 0.0.13 — the Gold Sword (the designer: a sword that lasts 40 hits; from the shop): the sword's moves and
// numbers, its own uses.
import { ITEMS } from '../../tuning/items';
import { WEAPONS } from '../../tuning/weapons';

export type WeaponKind = 'sword' | 'goldSword';
export const WEAPON_KINDS: readonly WeaponKind[] = ['sword', 'goldSword'];

/** What the HUD calls each weapon. */
export const WEAPON_NAME: Record<WeaponKind, string> = { sword: 'Sword', goldSword: 'Gold Sword' };

export interface WeaponStats {
  name: string;
  /** Left click: a swing, every `interval` s while held. */
  damage: number;
  knock: number;
  reach: number;
  /** The sweep's radius (m). */
  width: number;
  interval: number;
  /** Right click (charged): the pierce, and the uses it takes. */
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
};
