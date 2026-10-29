// Update 0.1.19 — floor 3's enemies as placeholder synth sounds (recorded clips can replace them: clipPicks.ts). Every
// warning has its own: the Skeleton's bones rattling, the Mushnub's squeak, the Ninja's blade drawn with a ring. Then
// the blow: a swing's whoosh, a bite's snap, a slash. A Skeleton clatters to pieces and rattles as it rises; the Ninja
// vanishes and appears with a soft puff.
import type { CombatEvent } from '../sim/combat/state';
import { FOES3 } from '../tuning/foes3';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playFoes3(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  const v = FOES3.v;
  switch (kind) {
    case 'skeletonWindup':
      for (let k = 0; k < 3; k++) noise(a, { dur: 0.05 + k * 0.03, gain: 0.18 * far, filter: 'bandpass', from: 2600 - k * 400, to: 1800, q: 4 });
      tone(a, { from: 220, to: 330, dur: v.skeletonWindup, gain: 0.08 * far, type: 'square' });
      return true;
    case 'skeletonStrike':
      noise(a, { dur: 0.18, gain: 0.28 * far, filter: 'bandpass', from: 2200, to: 600, q: 1.3 });
      return true;
    case 'skeletonCollapse':
      for (let k = 0; k < 5; k++) noise(a, { dur: 0.06 + k * 0.05, gain: 0.25 * far, filter: 'bandpass', from: 3200 - k * 350, to: 900, q: 3 });
      tone(a, { from: 180, to: 70, dur: 0.3, gain: 0.25 * far });
      return true;
    case 'skeletonRise':
      noise(a, { dur: v.skeletonRise, gain: 0.16 * far, filter: 'bandpass', from: 900, to: 3000, q: 3 });
      tone(a, { from: 120, to: 260, dur: v.skeletonRise, gain: 0.1 * far, type: 'sawtooth' });
      return true;
    case 'mushnubWindup':
      tone(a, { from: 520, to: 900, dur: v.mushnubWindup, gain: 0.12 * far, type: 'triangle' });
      return true;
    case 'mushnubBite':
      noise(a, { dur: 0.07, gain: 0.32 * far, filter: 'bandpass', from: 2400, to: 900, q: 2 });
      tone(a, { from: 380, to: 140, dur: 0.09, gain: 0.18 * far, type: 'square' });
      return true;
    case 'ninjaWindup':
      noise(a, { dur: v.ninjaWindup, gain: 0.16 * far, filter: 'highpass', from: 3000, to: 6500 });
      tone(a, { from: 1600, to: 2400, dur: v.ninjaWindup, gain: 0.06 * far, type: 'triangle' });
      return true;
    case 'ninjaStrike':
      noise(a, { dur: 0.16, gain: 0.35 * far, filter: 'bandpass', from: 4200, to: 1200, q: 1.6 });
      return true;
    case 'ninjaVanish':
    case 'ninjaAppear':
      noise(a, { dur: 0.25, gain: 0.3 * far, filter: 'lowpass', from: 1800, to: 300 });
      tone(a, { from: kind === 'ninjaVanish' ? 700 : 300, to: kind === 'ninjaVanish' ? 300 : 700, dur: 0.18, gain: 0.08 * far, type: 'sine' });
      return true;
    default:
      return false;
  }
}
