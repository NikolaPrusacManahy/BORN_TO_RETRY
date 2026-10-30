// Update 0.0.8 — the character roster (the designer). Only Joseph is playable for now; the others stand in the select
// screen's cells to show the roster, locked. Unlocking comes with runs (M5). Ids are the Quaternius models' names and
// the node names in the prison scene (tools/blender/build_prison_scene.py); the order here is the order of the cells.
// Update 0.2.9 — the select screen is gone: the roster stands on the lobby's dais in this order (left to right as you
// face it), the locked ones as dark silhouettes (the designer: "dark silhouette - no other characters available").
// The node names are the lobby kit's now (tools/blender/build_lobby_kit.py: Char_<id>).

export type CharacterId = 'adventurer' | 'king' | 'suit' | 'swat';

export interface Character {
  id: CharacterId;
  name: string;
  /** What they start with, in a few words. */
  kit: string;
  /** Can be played now. */
  available: boolean;
}

export const ROSTER: readonly Character[] = [
  { id: 'adventurer', name: 'Joseph', kit: 'Fists only. Picks up used weapons.', available: true },
  { id: 'king', name: 'Fallen King', kit: '', available: false },
  { id: 'suit', name: 'William Rich', kit: '', available: false },
  { id: 'swat', name: 'Alpha Team', kit: '', available: false },
];
