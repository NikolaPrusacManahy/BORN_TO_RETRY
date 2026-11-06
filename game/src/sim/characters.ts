// Update 0.0.8 — the character roster (the designer). Only Joseph is playable for now; the others stand in the select
// screen's cells to show the roster, locked. Unlocking comes with runs (M5). Ids are the Quaternius models' names and
// the node names in the prison scene (tools/blender/build_prison_scene.py); the order here is the order of the cells.
// Update 0.2.9 — the select screen is gone: the roster stands on the lobby's dais in this order (left to right as you
// face it), the locked ones as dark silhouettes (the designer: "dark silhouette - no other characters available").
// The node names are the lobby kit's now (tools/blender/build_lobby_kit.py: Char_<id>).
// Update 0.3.70 — the Playable Demon (enemy_bibles/Born to Retry — Playable Demon.docx; the designer: "players when beating
// the final boss, no matter the difficulty, they will unlock the boss as a playable character"): earned, not given. Its
// figure's in its own file (tools/blender/export_demon_figure.py).

export type CharacterId = 'adventurer' | 'king' | 'suit' | 'swat' | 'demon';

export interface Character {
  id: CharacterId;
  name: string;
  /** What they start with, in a few words. */
  kit: string;
  /** Can be played now. */
  available: boolean;
  /** Update 0.3.70 — can be played once you've beaten the final boss. */
  earned?: boolean;
}

export const ROSTER: readonly Character[] = [
  { id: 'adventurer', name: 'Joseph', kit: 'Fists only. Picks up used weapons.', available: true },
  { id: 'king', name: 'Fallen King', kit: '', available: false },
  { id: 'suit', name: 'William Rich', kit: '', available: false },
  { id: 'swat', name: 'Alpha Team', kit: '', available: false },
  { id: 'demon', name: 'The Demon', kit: 'The sword always in hand.', available: false, earned: true },
];

/** Update 0.3.70 — can they be played? `beaten`: you've beaten the final boss (saved: SaveData.demon). */
export const isPlayable = (c: Character, beaten: boolean) => c.available || (!!c.earned && beaten);

/** Update 0.3.70 — the character `id` can be played. */
export const canPlay = (id: unknown, beaten: boolean) => ROSTER.some((c) => c.id === id && isPlayable(c, beaten));
