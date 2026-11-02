// Update 0.2.4 — quicksand (floor 4's desert; the designer: rooms that give the player a hard time): standing in it,
// you move at Quicksand of your speed (the floor's flat areas: DungeonLevel.sand). Pure.
// Update 0.2.23 — floor 2's webs (DungeonLevel.webs): in one, Web slow of your speed (a dash keeps its own: dash out).
// Update 0.3.11 — floor 7's ice (DungeonLevel.ice): on it, Ice grip of your grip.
import type { ArenaBox } from '../../world/arena';
import { GARDEN } from '../../tuning/garden';
import { ROOMS } from '../../tuning/rooms';
import { FROZEN_KNOBS } from '../../tuning/frozen';
import type { PlayerState } from '../player/state';

/** Your feet in quicksand (on the floor, over one of its areas). */
export function inQuicksand(p: PlayerState, sand: readonly ArenaBox[]): boolean {
  if (p.pos.y > 0.3) return false;
  for (const b of sand) if (Math.abs(p.pos.x - b.x) <= b.w / 2 && Math.abs(p.pos.z - b.z) <= b.d / 2) return true;
  return false;
}

/** Your speed's share here (1: none of it). */
export const sandSlow = (p: PlayerState, sand: readonly ArenaBox[]) => (inQuicksand(p, sand) ? ROOMS.v.quicksand : 1);

/** Update 0.2.23 — your speed's share in a web (1: none of it). */
export const webSlow = (p: PlayerState, webs: readonly ArenaBox[]) => (inQuicksand(p, webs) ? GARDEN.v.web : 1);

/** Update 0.3.11 — your grip here (1: stone; on ice, Ice grip). */
export const iceGrip = (p: PlayerState, ice: readonly ArenaBox[]) => (inQuicksand(p, ice) ? FROZEN_KNOBS.v.iceGrip : 1);

/** Update 0.3.11 — a body standing on ice (its feet on the floor, over one of its areas). */
export function onIce(x: number, y: number, z: number, ice: readonly ArenaBox[] | undefined): boolean {
  if (!ice || y > 0.3) return false;
  for (const b of ice) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2) return true;
  return false;
}
