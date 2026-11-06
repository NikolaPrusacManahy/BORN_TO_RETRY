// Update 0.2.9 — the credits on the lobby's south wall (the designer: "a credits area with all the assets credits"):
// every pack and library the shipped game uses, one board each. Sounds: the Sonniss GDC 2026 bundle's publishers whose
// clips are in public/sounds/manifest.json (royalty-free, no credit required; named all the same). Pure data.
// Update 0.2.12 — the designer: "no need to credit font and code in general please in the lobby": the fonts' and code's
// board is gone (their licences don't ask for it on screen).
// Update 0.3.19 — the fights' music (the designer: "Yes, on the board"): Polarnyne's Izakaya Funes' Metal Pack (its
// licence asks for a credit) and Intersonic Sound's Replica.
// Update 0.3.21 — the packs since: the Pirate Kit (floor 6), the Ultimate Space Kit (floor 8); two packs a line. The
// boards hang upstairs now, in the bestiary.

export interface CreditBoard {
  title: string;
  lines: readonly string[];
}

export const CREDITS: readonly CreditBoard[] = [
  {
    title: 'MODELS',
    lines: ['Quaternius (CC0)', 'Modular Dungeon Pack · Ultimate Nature Pack', 'Ultimate RPG Pack · Ultimate Monsters', 'Pirate Kit · Ultimate Space Kit', 'Characters: Adventurer, Spacesuit, Swat', 'Guns: Pistol'],
  },
  {
    title: 'SOUND',
    lines: ['Sonniss #GameAudioGDC 2026', '344 Audio · Alexander Kopeikin', 'Cinematic Sound Design', 'David Dumais Audio · Epic Stock Media', 'Federico Soler · InMotionAudio', 'Ivo Vicic · Jake Fielding', 'SoundBits · The Noisery'],
  },
  {
    title: 'MUSIC',
    lines: ['Polarnyne', 'Izakaya Funes’ Metal Pack', 'Intersonic Sound', 'Replica · Extreme Cyber Metal'],
  },
];
