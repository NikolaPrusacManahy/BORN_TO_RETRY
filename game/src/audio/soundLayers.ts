// Update 0.3.1 — the sounds a punch and a kill play, layer by layer (the designer: "there is one sound that I hate on
// the punches, show me the sounds in sounds on F8 … I need to remove it, punches and kill sound"): the Lab's Sounds
// (F8) lists them, each heard alone and each turned off and on. Off lasts till the page reloads (the designer says
// which to take out for good, as with the clip picks).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import type { ClipSound } from './clipPicks';
import { noise, tone } from './synth';
import { FINISHER_LOUDER, FINISHER_LOWER } from './clipRoutes';

export type SoundLayer = 'jab' | 'heavy' | 'hitJab' | 'hitFinisher' | 'hitHeavy' | 'thump' | 'kill' | 'killThump' | 'killCrack' | 'crunch';

export interface LayerInfo {
  id: SoundLayer;
  name: string;
  /** A recorded clip (the one picked), or made in code. */
  clip: boolean;
}

export const LAYERS: readonly LayerInfo[] = [
  { id: 'jab', name: 'Punch: swing (whoosh)', clip: true },
  { id: 'hitJab', name: 'Punch: jab hit', clip: true },
  { id: 'hitFinisher', name: 'Punch: finisher hit (the jab’s, lower)', clip: true },
  { id: 'heavy', name: 'Punch: charged swing', clip: true },
  { id: 'hitHeavy', name: 'Punch: charged hit', clip: true },
  { id: 'thump', name: 'Punch: deep thump (0.3.1)', clip: false },
  { id: 'kill', name: 'Kill: sound', clip: true },
  { id: 'killThump', name: 'Kill: deep thump (0.3.1)', clip: false },
  { id: 'killCrack', name: 'Kill: crack (0.3.1)', clip: false },
  { id: 'crunch', name: 'Execution: bone crunch (0.3.2)', clip: false },
];

/** Layers turned off. */
export const OFF = new Set<SoundLayer>();

/** The layer a combat event's own sound is (null: not one of these). */
export function layerOf(kind: CombatEvent): SoundLayer | null {
  switch (kind) {
    case 'jabL':
    case 'jabR':
      return 'jab';
    case 'heavy':
    case 'hitJab':
    case 'hitFinisher':
    case 'hitHeavy':
    case 'kill':
      return kind;
    default:
      return null;
  }
}

/** The thump (the 0.3.1 layer under a blow). */
export const thump = (a: AudioEngine, gain: number, dur: number) => tone(a, { from: 95, to: 36, dur, gain, type: 'sine' });
/** A kill's crack. */
export const crack = (a: AudioEngine) => noise(a, { dur: 0.06, gain: 0.3, filter: 'highpass', from: 2200, to: 1200 });

/** Update 0.3.2 — an execution's bone crunch: a few quick cracks over a dull thud (`k`: how big, 0–1). */
export function crunch(a: AudioEngine, k: number) {
  thump(a, 0.45 * k + 0.2, 0.14 + 0.1 * k);
  for (let i = 0; i < 3; i++) noise(a, { dur: 0.035, gain: (0.22 + 0.12 * k) * (1 - i * 0.2), filter: 'bandpass', from: 2600 - i * 500, to: 900, q: 2.5, delay: i * 0.035 });
}

/** Plays one layer alone (the Lab). False: a clip with none loaded. */
export function playLayer(a: AudioEngine, id: SoundLayer): boolean {
  switch (id) {
    case 'thump':
      thump(a, 0.48, 0.11);
      return true;
    case 'killThump':
      thump(a, 0.7, 0.24);
      return true;
    case 'killCrack':
      crack(a);
      return true;
    case 'hitFinisher':
      return a.clips.play('hitJab', FINISHER_LOUDER, FINISHER_LOWER);
    case 'crunch':
      crunch(a, 1);
      return true;
    default:
      return a.clips.play(id as ClipSound);
  }
}
