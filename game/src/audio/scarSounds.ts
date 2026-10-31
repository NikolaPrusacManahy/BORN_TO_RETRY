// Update 0.2.15 — the Scars' sounds (sim/scars/), made in code until recorded ones are picked: a low shimmer as each
// comes out of a chest, a soft thud and a ring as it lands, a deep cut and a ringing chord as one is taken, a breath as the rest fade; a dull shove for
// Shoulder Charge and Bowling, a spring for Pogo, a knock for Iron Knuckles, a whistle for Ricochet, a boom for Bloodbath.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playScars(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'scarOffer':
      tone(a, { from: 180 + 30 * (value % 3), to: 360 + 60 * (value % 3), dur: 0.7, gain: 0.07, type: 'sine' });
      noise(a, { dur: 0.5, gain: 0.05, filter: 'bandpass', from: 2400, to: 900, q: 3 });
      return true;
    case 'scarLand':
      tone(a, { from: 140, to: 70, dur: 0.12, gain: 0.18 });
      tone(a, { from: 660 + 80 * (value % 3), to: 660 + 80 * (value % 3), dur: 0.35, gain: 0.04, type: 'triangle' });
      return true;
    case 'scar':
      noise(a, { dur: 0.22, gain: 0.3, filter: 'highpass', from: 5000, to: 1200 });
      tone(a, { from: 110, to: 55, dur: 0.6, gain: 0.3 });
      for (const f of [220, 277, 330]) tone(a, { from: f, to: f, dur: 1.1, gain: 0.06, type: 'triangle' });
      return true;
    case 'scarGone':
      noise(a, { dur: 0.45, gain: 0.08, filter: 'bandpass', from: 1400, to: 300, q: 1.5 });
      return true;
    case 'scarBump':
      tone(a, { from: 160, to: 60, dur: 0.16, gain: 0.35 * far });
      noise(a, { dur: 0.14, gain: 0.25 * far, filter: 'lowpass', from: 1800, to: 300 });
      return true;
    case 'scarPogo':
      tone(a, { from: 220, to: 660, dur: 0.22, gain: 0.18, type: 'triangle' });
      return true;
    case 'scarStall':
      tone(a, { from: 900, to: 500, dur: 0.07, gain: 0.2 * far, type: 'square' });
      return true;
    case 'scarBlast':
      tone(a, { from: 90, to: 35, dur: 0.6, gain: 0.4 * far });
      noise(a, { dur: 0.5, gain: 0.3 * far, filter: 'lowpass', from: 900, to: 120 });
      return true;
    case 'scarRicochet':
      tone(a, { from: 1800, to: 3200, dur: 0.18, gain: 0.12 * far, type: 'triangle' });
      noise(a, { dur: 0.12, gain: 0.1 * far, filter: 'highpass', from: 3000, to: 6000 });
      return true;
    default:
      return false;
  }
}
