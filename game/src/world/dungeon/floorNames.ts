// Update 0.3.21 — each floor's name, for the lobby's floor selector and its collection's rows (the floors' own starts
// still say "FLOOR n"). The Venom Garden, the Drowned Temple, Skull Cove, Frozen Depths, the Moon, the Rift and the Last
// Floor are the designs' (MD/DESIGN.md, MD/FLOORS_7_10_PLAN.md); floors 1, 3 and 4 had none: **(placeholder names)**.
// Pure.
import { Realm, REALMS } from './floorOrder';

// Update 0.3.25 — the floors reordered (floorOrder.ts), and the designer's new names: the Shrine Dimension (8, a Japan floor
// to come), Hell on Earth (10).
const NAMES: Readonly<Record<Realm, string>> = { dungeon: 'THE DUNGEON', garden: 'THE VENOM GARDEN', keep: 'THE BONE KEEP', frozen: 'FROZEN DEPTHS', temple: 'THE DROWNED TEMPLE', desert: 'THE DESERT', cove: 'SKULL COVE', shrine: 'SHRINE DIMENSION', moon: 'THE MOON', hell: 'HELL ON EARTH' };
export const FLOOR_NAMES: readonly string[] = REALMS.map((r) => NAMES[r]);

/** Floor `floor`'s name (1: the first). */
export const floorName = (floor: number) => FLOOR_NAMES[Math.max(1, Math.min(floor, FLOOR_NAMES.length)) - 1];
