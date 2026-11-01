// Update 0.2.23 — floor 2's wasps' hives, made in code: a hive letting a wasp out (an angry buzz rising out of it) and a
// hive falling (papery crunch, then the thud as it hits the floor).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playGarden(a: AudioEngine, kind: CombatEvent, far: number): boolean {
  switch (kind) {
    case 'hiveOut':
      tone(a, { from: 150, to: 230, dur: 0.45, gain: 0.12 * far, type: 'sawtooth' });
      tone(a, { from: 156, to: 238, dur: 0.45, gain: 0.08 * far, type: 'square' });
      return true;
    case 'hiveDown':
      noise(a, { dur: 0.22, gain: 0.35 * far, filter: 'bandpass', from: 2400, to: 700, q: 0.8 });
      tone(a, { from: 140, to: 50, dur: 0.3, gain: 0.3 * far, delay: 0.35 });
      noise(a, { dur: 0.2, gain: 0.25 * far, filter: 'lowpass', from: 900, to: 120, delay: 0.35 });
      return true;
    default:
      return false;
  }
}
