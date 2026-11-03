// Update 0.3.25 — the floors' order (the designer: "Let's do floors swaps, cause Floor 7 is an easier Floor than 4, 5 and
// 6": 1 The Dungeon, 2 The Venom Garden, 3 The Bone Keep, 4 Frozen Depths, 5 the Drowned Temple, 6 the Desert, 7 Skull
// Cove, 8 Shrine Dimension (a Japan floor, to come), 9 the Moon, 10 Hell on Earth): which floor each place is. Every
// floor's own things follow it (its look, its rooms, its enemies, its boss and boss room, its percher, its name); a
// floor's number is how deep it is (how many rooms, how many enemies). To reorder the floors, reorder this. Pure.

/** The places the floors are. */
export type Realm = 'dungeon' | 'garden' | 'keep' | 'frozen' | 'temple' | 'desert' | 'cove' | 'shrine' | 'moon' | 'hell';

/** Each place's floor. */
export const FLOOR: Readonly<Record<Realm, number>> = { dungeon: 1, garden: 2, keep: 3, frozen: 4, temple: 5, desert: 6, cove: 7, shrine: 8, moon: 9, hell: 10 };

/** The places, floor 1 first. */
export const REALMS: readonly Realm[] = (Object.keys(FLOOR) as Realm[]).sort((a, b) => FLOOR[a] - FLOOR[b]);

/** Floor `floor`'s place (past the last, the last's). */
export const realmOf = (floor: number): Realm => REALMS[Math.max(1, Math.min(Math.round(floor), REALMS.length)) - 1];

/** Places not built yet (no rooms of their own): their floors can't be played. (Update 0.3.32 — the Shrine Dimension
 *  built: none.) */
export const UNBUILT: ReadonlySet<Realm> = new Set<Realm>([]);
