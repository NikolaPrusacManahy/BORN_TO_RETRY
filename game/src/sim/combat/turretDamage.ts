// M1 step 6 — damaging a turret (its own file so orbs and punches can use it without importing the turret's
// firing rules).
import { TARGETS } from '../../tuning/combat';
import { HIT_FLASH } from './dummy';
import type { Turret } from './targets';

/** Damages a turret. Returns true if this hit broke it. */
export function hitTurret(t: Turret, damage: number): boolean {
  if (t.broken) return false;
  t.flash = HIT_FLASH;
  t.hp -= damage;
  if (t.hp > 0) return false;
  t.hp = 0;
  t.broken = true;
  t.telegraph = 0;
  t.respawn = TARGETS.v.turretRespawn;
  return true;
}
