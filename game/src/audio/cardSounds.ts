// Update 0.2.15 — the Scars' sounds. Update 0.2.16 — the Fate Cards' (sim/cards/), made in code until recorded ones are
// picked: a shuffle as a chest deals, a deep cut and a ringing chord as one is taken; a dull shove for Shoulder Charge
// and Bowling, a spring for Pogo, a knock for Iron Knuckles, a whistle for Ricochet, a boom for Bloodbath, a rising
// growl as Killing Spree or Giant Killer comes on, a jingle for Blood Money. (The deal's cards make their own: the
// deal screen.) Update 0.2.18 — wave 2's: a blast's boom, lightning's crack (Storm Heart's rumble first), Pyre's and a
// fire ring's whoosh, a frost ring's chime, Spirit Knives' rising whistle, Splinter's ring. Bleeds and burns tick quiet.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playCards(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'dealStart':
      for (let k = 0; k < value; k++) noise(a, { dur: 0.06, gain: 0.12, filter: 'bandpass', from: 3200 - 300 * k, to: 1800, q: 2, delay: 0.25 + 0.16 * k });
      tone(a, { from: 180, to: 360, dur: 0.6, gain: 0.07, type: 'sine' });
      return true;
    case 'cardTaken':
      noise(a, { dur: 0.22, gain: 0.3, filter: 'highpass', from: 5000, to: 1200 });
      tone(a, { from: 110, to: 55, dur: 0.6, gain: 0.3 });
      for (const f of [220, 277, 330]) tone(a, { from: f, to: f, dur: 1.1, gain: 0.06, type: 'triangle' });
      return true;
    case 'cardBump':
      tone(a, { from: 160, to: 60, dur: 0.16, gain: 0.35 * far });
      noise(a, { dur: 0.14, gain: 0.25 * far, filter: 'lowpass', from: 1800, to: 300 });
      return true;
    case 'cardPogo':
      tone(a, { from: 220, to: 660, dur: 0.22, gain: 0.18, type: 'triangle' });
      return true;
    case 'cardStall':
      tone(a, { from: 900, to: 500, dur: 0.07, gain: 0.2 * far, type: 'square' });
      return true;
    case 'cardBlast':
      tone(a, { from: 90, to: 35, dur: 0.6, gain: 0.4 * far });
      noise(a, { dur: 0.5, gain: 0.3 * far, filter: 'lowpass', from: 900, to: 120 });
      return true;
    case 'cardRicochet':
      tone(a, { from: 1800, to: 3200, dur: 0.18, gain: 0.12 * far, type: 'triangle' });
      noise(a, { dur: 0.12, gain: 0.1 * far, filter: 'highpass', from: 3000, to: 6000 });
      return true;
    case 'cardSpree':
    case 'cardGiant':
      tone(a, { from: 70, to: 140, dur: 0.5, gain: 0.25, type: 'sawtooth' });
      tone(a, { from: 140, to: 280, dur: 0.5, gain: 0.08, type: 'triangle' });
      return true;
    // Update 0.2.18 — wave 2's.
    case 'cardBoom':
      tone(a, { from: 80, to: 30, dur: 0.7, gain: 0.45 * far });
      noise(a, { dur: 0.6, gain: 0.4 * far, filter: 'lowpass', from: 1400, to: 100 });
      return true;
    case 'cardZap':
      noise(a, { dur: 0.09, gain: 0.18 * far, filter: 'highpass', from: 4000, to: 9000 });
      tone(a, { from: 2400, to: 600, dur: 0.08, gain: 0.07 * far, type: 'square' });
      return true;
    case 'cardStorm':
      noise(a, { dur: 0.5, gain: 0.15, filter: 'lowpass', from: 600, to: 80 });
      return true;
    case 'cardPyre':
      noise(a, { dur: 0.45, gain: 0.22 * far, filter: 'bandpass', from: 500, to: 1600, q: 1 });
      return true;
    case 'cardRing':
      if (value === 1) noise(a, { dur: 0.5, gain: 0.3 * far, filter: 'bandpass', from: 400, to: 1800, q: 1 });
      else for (const f of [1760, 2350, 3140]) tone(a, { from: f, to: f * 0.98, dur: 0.6, gain: 0.05 * far, type: 'sine' });
      return true;
    case 'cardSpirit':
      tone(a, { from: 600, to: 1500, dur: 0.35, gain: 0.06 * far, type: 'sine' });
      return true;
    case 'cardSplinter':
      tone(a, { from: 1900, to: 1200, dur: 0.15, gain: 0.08, type: 'triangle' });
      return true;
    case 'cardDot':
    case 'cardBlastHit':
      return true;
    case 'cardCoins':
      for (let k = 0; k < 3; k++) tone(a, { from: 1500 + 200 * k, to: 1700 + 200 * k, dur: 0.08, gain: 0.07, type: 'triangle', delay: 0.05 * k });
      return true;
    default:
      return false;
  }
}
