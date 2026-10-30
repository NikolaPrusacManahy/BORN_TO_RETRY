// Update 0.2.7 — floor 3's newcomers' sounds, made in code: the Dragonling puffing up (a rising hiss; a squeak before it
// spits in your face), each fireball's spit, its dart off; the White Rabbit's wind-up, its bonk, a carrot whooshing off;
// the Big Mushnub's arms going up (a groan), its smash (a deep thud), its spin (a whirl), its split (a wet pop).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playFoes3b(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'bratWindup':
      if (value === 1) tone(a, { from: 900, to: 1700, dur: 0.15, gain: 0.12 * far, type: 'square' });
      else noise(a, { dur: 0.4, gain: 0.16 * far, filter: 'bandpass', from: 600, to: 2400, q: 2 });
      return true;
    case 'bratSpit':
      noise(a, { dur: 0.12, gain: 0.22 * far, filter: 'lowpass', from: 2600, to: 500 });
      tone(a, { from: 380, to: 160, dur: 0.08, gain: 0.1 * far, type: 'sawtooth' });
      return true;
    case 'bratFlit':
      noise(a, { dur: 0.2, gain: 0.14 * far, filter: 'bandpass', from: 1500, to: 400, q: 1.5 });
      return true;
    case 'rabbitWindup':
      noise(a, { dur: 0.18, gain: 0.08 * far, filter: 'bandpass', from: 900, to: 2000, q: 1.4 });
      return true;
    case 'rabbitBonk':
      tone(a, { from: 520, to: 260, dur: 0.07, gain: 0.25 * far, type: 'triangle' });
      noise(a, { dur: 0.05, gain: 0.15 * far, filter: 'lowpass', from: 2400, to: 600 });
      return true;
    case 'rabbitThrow':
      noise(a, { dur: 0.2, gain: 0.18 * far, filter: 'bandpass', from: 800, to: 2600, q: 1.3 });
      return true;
    case 'mushWindup':
      tone(a, { from: 140, to: value === 1 ? 220 : 90, dur: 0.5, gain: 0.25 * far, type: 'sawtooth' });
      return true;
    case 'mushSmash':
      tone(a, { from: 110, to: 30, dur: 0.35, gain: 0.7 * far });
      noise(a, { dur: 0.4, gain: 0.45 * far, filter: 'lowpass', from: 1800, to: 120 });
      return true;
    case 'mushSpin':
      noise(a, { dur: 0.35, gain: 0.3 * far, filter: 'bandpass', from: 500, to: 1600, q: 1.2 });
      tone(a, { from: 160, to: 60, dur: 0.25, gain: 0.35 * far });
      return true;
    case 'mushSplit':
      tone(a, { from: 300, to: 90, dur: 0.18, gain: 0.35 * far });
      noise(a, { dur: 0.22, gain: 0.3 * far, filter: 'lowpass', from: 1400, to: 200 });
      return true;
    default:
      return false;
  }
}
