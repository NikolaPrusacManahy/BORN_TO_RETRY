// Update 0.3.21 — each floor's name, for the lobby's floor selector and its collection's rows (the floors' own starts
// still say "FLOOR n"). The Venom Garden, the Drowned Temple, Skull Cove, Frozen Depths, the Moon, the Rift and the Last
// Floor are the designs' (MD/DESIGN.md, MD/FLOORS_7_10_PLAN.md); floors 1, 3 and 4 had none: **(placeholder names)**.
// Pure.

export const FLOOR_NAMES: readonly string[] = ['THE DUNGEON', 'THE VENOM GARDEN', 'THE BONE KEEP', 'THE DESERT', 'THE DROWNED TEMPLE', 'SKULL COVE', 'FROZEN DEPTHS', 'THE MOON', 'THE RIFT', 'THE LAST FLOOR'];

/** Floor `floor`'s name (1: the first). */
export const floorName = (floor: number) => FLOOR_NAMES[Math.max(1, Math.min(floor, FLOOR_NAMES.length)) - 1];
