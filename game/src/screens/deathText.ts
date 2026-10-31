// Update 0.1.14 — the death screen's words: what killed you by its name in the game, and the time played. Pure.
import type { Cause } from '../sim/player/state';

export const CAUSE_NAMES: Record<Cause, string> = {
  grunt: 'Grunt',
  spitter: 'Spitter',
  brute: 'Yeti',
  leaper: 'Leaper',
  stinger: 'Stinger',
  wraith: 'Wraith',
  demon: 'The Demon',
  slime: 'Slime',
  frog: 'Frog',
  snake: 'Snake',
  wasp: 'Wasp',
  spider: 'Spider',
  blueDemon: 'Blue Demon',
  dragon: 'The Dragon',
  skeleton: 'Skeleton',
  mushnub: 'Mushnub',
  ninja: 'Ninja',
  boneKing: 'The Bone King',
  tribal: 'Tribal',
  cactoro: 'Cactoro',
  cactoroBig: 'Big Cactoro',
  hywirl: 'Hywirl',
  dino: 'The Velociraptor',
  dinoBlob: 'Dino',
  lizard: 'Lizard',
  greenBlob: 'Green Blob',
  blobling: 'Blobling',
  maskTribal: 'Flying Tribal',
  skullOrc: 'Skull Orc',
  dragonling: 'Dragonling',
  skullWraith: 'Skull Wraith',
  rabbit: 'White Rabbit',
  bigMushnub: 'Big Mushnub',
  snapper: 'Snapper',
  urchin: 'Urchin',
  jelly: 'Jelly',
  glub: 'Glub',
  bigGlub: 'Big Glub',
  squidle: 'Squidle',
  spawnling: 'Spawnling',
  deepOne: 'The Deep One',
  bogBrute: 'Bog Brute',
  drownedKing: 'The Drowned King',
  turret: 'Turret',
  spikes: 'Spikes',
  lava: 'Lava',
  fall: 'The fall',
};

export const causeName = (by: Cause | null) => (by ? CAUSE_NAMES[by] : 'Unknown');

/** Seconds as m:ss (h:mm:ss from an hour). */
export function clockText(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
