// Update 0.2.4 — the Pistol's sounds, made in code (no gunshots in the designer's library): a shot (a sharp crack, a
// punch of low end, the room's tail, the slide's clack, the case tinkling down a moment later); a bullet in a wall (a
// short spit) or in a body (a thud); the reload's beats: the magazine's catch and slide out (and hitting the floor), the
// new one sliding in to a click, from empty the slide slamming home.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playGun(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'gunShot':
      noise(a, { dur: 0.05, gain: 0.55, filter: 'highpass', from: 7000, to: 2500 });
      noise(a, { dur: 0.22, gain: 0.7, filter: 'lowpass', from: 4200, to: 180 });
      tone(a, { from: 130, to: 38, dur: 0.2, gain: 0.75 });
      noise(a, { dur: 0.55, gain: 0.12, filter: 'bandpass', from: 1000, to: 250, q: 0.8, delay: 0.03 });
      tone(a, { from: 2600, to: 1500, dur: 0.02, gain: 0.05, type: 'square', delay: 0.025 });
      // The case on the floor.
      tone(a, { from: 3300, to: 3050, dur: 0.06, gain: 0.025, type: 'triangle', delay: 0.5 + Math.random() * 0.1 });
      tone(a, { from: 3600, to: 3400, dur: 0.04, gain: 0.014, type: 'triangle', delay: 0.68 + Math.random() * 0.1 });
      return true;
    case 'gunTrace':
      if (value !== 0) return true;
      noise(a, { dur: 0.06, gain: 0.14 * far, filter: 'bandpass', from: 3200, to: 1400, q: 1.5 });
      tone(a, { from: 2400, to: 1700, dur: 0.07, gain: 0.03 * far, type: 'triangle' });
      return true;
    case 'hitShot':
      tone(a, { from: 210, to: 70, dur: 0.08, gain: 0.35 * far });
      noise(a, { dur: 0.06, gain: 0.28 * far, filter: 'lowpass', from: 2200, to: 300 });
      return true;
    case 'reloadStart':
      noise(a, { dur: 0.12, gain: 0.06, filter: 'lowpass', from: 1300, to: 400 });
      return true;
    case 'magOut':
      tone(a, { from: 1900, to: 1250, dur: 0.016, gain: 0.08, type: 'square' });
      noise(a, { dur: 0.09, gain: 0.1, filter: 'bandpass', from: 2600, to: 1200, q: 1.4, delay: 0.01 });
      tone(a, { from: 950, to: 620, dur: 0.05, gain: 0.05, type: 'triangle', delay: 0.45 });
      noise(a, { dur: 0.05, gain: 0.05, filter: 'bandpass', from: 3000, to: 1800, delay: 0.45 });
      return true;
    case 'magIn':
      noise(a, { dur: 0.08, gain: 0.1, filter: 'bandpass', from: 1500, to: 3200, q: 1.4 });
      tone(a, { from: 2300, to: 1500, dur: 0.018, gain: 0.12, type: 'square', delay: 0.08 });
      tone(a, { from: 300, to: 140, dur: 0.05, gain: 0.15, delay: 0.08 });
      return true;
    case 'slideHome':
      noise(a, { dur: 0.04, gain: 0.25, filter: 'highpass', from: 4200, to: 2000 });
      tone(a, { from: 1500, to: 700, dur: 0.03, gain: 0.12, type: 'square' });
      tone(a, { from: 220, to: 90, dur: 0.06, gain: 0.2 });
      return true;
    case 'reloadDone':
      return true;
    default:
      return false;
  }
}
