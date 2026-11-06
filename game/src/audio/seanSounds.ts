// Update 0.3.81 — Gravity Sean's sounds. **(placeholders)**: recordings already in the game, and made sounds under them. No gravity library's been chosen.
// Returns true if `kind` is one of his.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

export function playSean(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'seanUnstable':
      tone(a, { from: 70, to: 210, dur: 0.28, gain: 0.2, type: 'sawtooth' });
      noise(a, { dur: 0.22, gain: 0.14, filter: 'highpass', from: 1400, to: 4200 });
      return true;
    case 'seanVent':
      tone(a, { from: 210, to: 55, dur: 0.3 + 0.2 * value, gain: 0.2 });
      noise(a, { dur: 0.3, gain: 0.16 + 0.12 * value, filter: 'lowpass', from: 2200, to: 300 });
      return true;
    case 'seanOverload':
      a.clips.play('demonSlam', 1, 0.8);
      tone(a, { from: 420, to: 38, dur: 0.7, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: 0.6, gain: 0.34, filter: 'lowpass', from: 3400, to: 180 });
      return true;
    case 'seanSlam':
      a.clips.play('demonSlam', 0.8, 1.15);
      return true;
    case 'seanBlast':
      tone(a, { from: 120, to: 44, dur: 0.24, gain: 0.16 * far });
      return true;
    case 'seanPull':
      tone(a, { from: 180, to: 520, dur: 0.16, gain: 0.12, type: 'triangle' });
      return true;
    case 'seanRipple':
      tone(a, { from: 300, to: 140, dur: 0.12, gain: 0.07, type: 'triangle' });
      return true;
    case 'seanUltReady':
      tone(a, { from: 180, to: 720, dur: 0.45, gain: 0.1, type: 'triangle' });
      return true;
    default:
      return false;
  }
}
