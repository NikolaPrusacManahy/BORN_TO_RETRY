// Update 0.1.1 — an execution as placeholder synth sounds (real samples replace them in M4): the grab (a grunt and a
// scuffle), each slam into the floor (a deep thud and a crack, the second harder), the throw (a rising whoosh), the
// landing (a wet crunch).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playExec(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'execGrab':
      tone(a, { from: 160, to: 110, dur: 0.18, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: 0.15, gain: 0.25, filter: 'bandpass', from: 900, to: 2200, q: 1.5 });
      return true;
    case 'execSlam': {
      const k = value >= 2 ? 1.25 : 1;
      tone(a, { from: 120 * k, to: 30, dur: 0.35, gain: 0.85 });
      noise(a, { dur: 0.3, gain: 0.6 * k, filter: 'lowpass', from: 3000, to: 120 });
      noise(a, { dur: 0.08, gain: 0.35 * k, filter: 'highpass', from: 3500, to: 2000 });
      return true;
    }
    case 'execThrow':
      noise(a, { dur: 0.35, gain: 0.35, filter: 'bandpass', from: 400, to: 2600, q: 1.2 });
      return true;
    case 'execLand':
      noise(a, { dur: 0.3, gain: 0.55 * far, filter: 'lowpass', from: 1800, to: 150 });
      tone(a, { from: 90, to: 35, dur: 0.25, gain: 0.5 * far });
      return true;
    default:
      return false;
  }
}
