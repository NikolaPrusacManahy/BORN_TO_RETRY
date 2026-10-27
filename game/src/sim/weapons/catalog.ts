// M2 — the weapon catalog (design §6). One entry per weapon kind; the numbers live in tuning/weapons.ts. A new weapon
// is a new kind here (the compiler then asks for its stats everywhere) plus its model.
import { WEAPONS } from '../../tuning/weapons';

export type WeaponKind = 'sword';

/** What the HUD calls each weapon. */
export const WEAPON_NAME: Record<WeaponKind, string> = { sword: 'Sword' };

export interface WeaponStats {
  name: string;
  /** Left click: a swing, every `interval` s while held. */
  damage: number;
  knock: number;
  reach: number;
  /** The sweep's radius (m). */
  width: number;
  interval: number;
  /** Right click (charged): the heavy swing, and the uses it takes. */
  heavyDamage: number;
  heavyKnock: number;
  heavyUses: number;
  /** Uses: on the lab stand, and the range a drop has. */
  standUses: number;
  dropUses: [number, number];
}

export const WEAPON_STATS: Record<WeaponKind, () => WeaponStats> = {
  sword: () => {
    const v = WEAPONS.v;
    return {
      name: WEAPON_NAME.sword,
      damage: v.swordDamage,
      knock: v.swordKnock,
      reach: v.swordReach,
      width: v.swordWidth,
      interval: v.swordInterval,
      heavyDamage: v.swordCleaveDamage,
      heavyKnock: v.swordCleaveKnock,
      heavyUses: v.swordCleaveUses,
      standUses: v.swordStandUses,
      dropUses: [v.swordDropMin, Math.max(v.swordDropMin, v.swordDropMax)],
    };
  },
};
