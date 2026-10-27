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
  /** Right click (charged): the pierce, and the uses it takes. */
  pierceDamage: number;
  pierceKnock: number;
  pierceReach: number;
  pierceWidth: number;
  pierceUses: number;
  /** Uses of one picked up (from a stand or a drop). */
  uses: number;
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
      pierceDamage: v.swordPierceDamage,
      pierceKnock: v.swordPierceKnock,
      pierceReach: v.swordPierceReach,
      pierceWidth: v.swordPierceWidth,
      pierceUses: v.swordPierceUses,
      uses: v.swordUses,
    };
  },
};
