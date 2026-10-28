// Update 0.0.18 — floor 2's enemies as placeholder synth sounds (real samples replace them in M4). Every warning has
// its own: the slime bubbling as it swells, the frog's croak, the snake's hiss, the wasp's buzz, the spider's chitter,
// the Blue Demon's growl (a charge) or crackle (a fireball). Then the blow: the slime's wet burst, the tongue's thwip,
// the bite's snap, the sting's dart, the spider's leap and thud, the fireball's whoosh.
import type { CombatEvent } from '../sim/combat/state';
import { BLUE_CHARGE } from '../sim/enemies/blueDemon';
import { FOES2 } from '../tuning/foes2';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** `far`: 1 close by, falling off with distance. Returns false for events it doesn't know. */
export function playFoes2(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const v = FOES2.v;
  switch (kind) {
    case 'slimeWindup':
      noise(a, { dur: v.slimeFuse, gain: 0.25 * far, filter: 'bandpass', from: 250, to: 1300, q: 6 });
      tone(a, { from: 160, to: 520, dur: v.slimeFuse, gain: 0.14 * far, type: 'triangle' });
      return true;
    case 'slimeBlast':
      noise(a, { dur: 0.4, gain: 0.65 * far, filter: 'lowpass', from: 2200, to: 120 });
      tone(a, { from: 130, to: 35, dur: 0.35, gain: 0.6 * far });
      return true;
    case 'frogWindup':
      tone(a, { from: 120, to: 85, dur: v.frogWindup * 0.45, gain: 0.22 * far, type: 'square' });
      tone(a, { from: 150, to: 95, dur: v.frogWindup, gain: 0.14 * far, type: 'square' });
      return true;
    case 'frogTongue':
      noise(a, { dur: 0.14, gain: 0.3 * far, filter: 'bandpass', from: 700, to: 3600, q: 2 });
      return true;
    case 'snakeWindup':
      noise(a, { dur: v.snakeWindup, gain: 0.22 * far, filter: 'highpass', from: 3000, to: 6500 });
      return true;
    case 'snakeBite':
    case 'spiderBite':
      noise(a, { dur: 0.08, gain: 0.35 * far, filter: 'bandpass', from: 2600, to: 800, q: 2 });
      tone(a, { from: 420, to: 140, dur: 0.1, gain: 0.2 * far, type: 'square' });
      return true;
    case 'waspWindup':
      tone(a, { from: 220, to: 310, dur: v.waspWindup, gain: 0.14 * far, type: 'sawtooth' });
      tone(a, { from: 227, to: 318, dur: v.waspWindup, gain: 0.1 * far, type: 'square' });
      return true;
    case 'waspSting':
      noise(a, { dur: 0.12, gain: 0.25 * far, filter: 'bandpass', from: 3600, to: 1500, q: 2 });
      return true;
    case 'spiderWindup':
      tone(a, { from: 600, to: 950, dur: v.spiderWindup, gain: 0.1 * far, type: 'square' });
      noise(a, { dur: v.spiderWindup, gain: 0.18 * far, filter: 'highpass', from: 2000, to: 4500 });
      return true;
    case 'spiderLeap':
      noise(a, { dur: 0.25, gain: 0.3 * far, filter: 'bandpass', from: 500, to: 2000, q: 1.2 });
      return true;
    case 'spiderLand':
      tone(a, { from: 95, to: 30, dur: 0.35, gain: 0.7 * far });
      noise(a, { dur: 0.3, gain: 0.45 * far, filter: 'lowpass', from: 1800, to: 120 });
      return true;
    case 'blueWindup':
      if (value === BLUE_CHARGE) {
        tone(a, { from: 65, to: 140, dur: v.blueChargeWindup, gain: 0.4 * far, type: 'sawtooth' });
        noise(a, { dur: v.blueChargeWindup, gain: 0.2 * far, filter: 'bandpass', from: 300, to: 900, q: 2 });
      } else {
        noise(a, { dur: v.blueFireWindup, gain: 0.3 * far, filter: 'highpass', from: 1200, to: 5000 });
        tone(a, { from: 200, to: 420, dur: v.blueFireWindup, gain: 0.15 * far, type: 'square' });
      }
      return true;
    case 'blueFireball':
      tone(a, { from: 320, to: 110, dur: 0.3, gain: 0.25 * far, type: 'sawtooth' });
      noise(a, { dur: 0.3, gain: 0.3 * far, filter: 'lowpass', from: 3000, to: 400 });
      return true;
    default:
      return false;
  }
}
