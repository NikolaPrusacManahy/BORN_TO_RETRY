// Update 0.2.9 — the credits on the lobby's south wall (the designer: "a credits area with all the assets credits"):
// every pack and library the shipped game uses, one board each. Sounds: the Sonniss GDC 2026 bundle's publishers whose
// clips are in public/sounds/manifest.json (royalty-free, no credit required; named all the same). Fonts: index.html's
// Google Fonts (SIL Open Font License). Pure data.

export interface CreditBoard {
  title: string;
  lines: readonly string[];
}

export const CREDITS: readonly CreditBoard[] = [
  {
    title: 'MODELS',
    lines: ['Quaternius (CC0)', 'Modular Dungeon Pack', 'Ultimate Nature Pack', 'Ultimate RPG Pack', 'Ultimate Monsters', 'Characters: Adventurer, King, Suit, Swat', 'Guns: Pistol'],
  },
  {
    title: 'SOUND',
    lines: ['Sonniss #GameAudioGDC 2026', '344 Audio · Alexander Kopeikin', 'Cinematic Sound Design', 'David Dumais Audio · Epic Stock Media', 'Federico Soler · InMotionAudio', 'Ivo Vicic · SoundBits · The Noisery'],
  },
  {
    title: 'FONTS & CODE',
    lines: ['Anton by Vernon Adams', 'Chakra Petch by Cadson Demak', 'IBM Plex Mono by IBM', 'Three.js · React · Vite', 'Rapier by Dimforge'],
  },
];
