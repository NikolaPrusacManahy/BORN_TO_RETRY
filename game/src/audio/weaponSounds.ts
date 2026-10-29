// Update 0.1.5 — the Gold Axe's and the Hammer's sounds as placeholder synth (real samples replace them in M4): the axe
// biting into a wall or the floor (a thunk), turning back for your hand (a rising whirr), caught (a slap of the haft in
// the palm); the hammer's smash on the floor (a deep boom and a long rumble as the shockwave rolls out).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playWeapons(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  switch (kind) {
    case 'axeStick':
      tone(a, { from: 180, to: 70, dur: 0.12, gain: 0.45 * far });
      noise(a, { dur: 0.08, gain: 0.3 * far, filter: 'bandpass', from: 1800, to: 600, q: 1.2 });
      return true;
    case 'recall':
      noise(a, { dur: 0.6, gain: 0.3, filter: 'bandpass', from: 300, to: 2200, q: 2 });
      tone(a, { from: 160, to: 420, dur: 0.5, gain: 0.15, type: 'triangle' });
      return true;
    case 'catch':
      tone(a, { from: 140, to: 60, dur: 0.1, gain: 0.5 });
      noise(a, { dur: 0.06, gain: 0.35, filter: 'lowpass', from: 2400, to: 400 });
      return true;
    case 'smash':
      tone(a, { from: 70, to: 18, dur: 0.9, gain: 0.9 });
      noise(a, { dur: 1.4, gain: 0.6, filter: 'lowpass', from: 1600, to: 40 });
      return true;
    default:
      return false;
  }
}
