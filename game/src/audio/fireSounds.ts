// Update 0.1.4 — the Grimoire's fire as placeholder synth sounds (real samples replace them in M4): a cast (a rushing
// whoosh), a fireball's burst (a soft whoomp); a charge kindling, a rising note for each charge of it, and for a charged
// cast and burst a deeper roar and boom that grow with the charge (a full charge's a long rumble).
import type { CombatEvent } from '../sim/combat/state';
import { kiFull } from '../sim/weapons/kiCharge';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playFire(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  // How far the charge came (0 … 1).
  const c = Math.min(1, value / Math.max(1e-3, kiFull()));
  switch (kind) {
    case 'kiStart':
      noise(a, { dur: 0.3, gain: 0.25, filter: 'bandpass', from: 300, to: 1400, q: 1.2 });
      return true;
    case 'kiCharge':
      // value: the charges so far (each a little higher).
      tone(a, { from: 160 + 45 * value, to: 220 + 45 * value, dur: 0.22, gain: 0.16, type: 'triangle' });
      noise(a, { dur: 0.2, gain: 0.12, filter: 'bandpass', from: 800 + 120 * value, to: 2400, q: 1.5 });
      return true;
    case 'cast':
      noise(a, { dur: 0.25 + 0.4 * c, gain: 0.4 + 0.3 * c, filter: 'bandpass', from: 600 - 400 * c, to: 2600 - 1200 * c, q: 1.1 });
      tone(a, { from: 200 - 120 * c, to: 110 - 70 * c, dur: 0.18 + 0.4 * c, gain: 0.2 + 0.3 * c, type: 'sawtooth' });
      return true;
    case 'fireballBurst':
      noise(a, { dur: 0.3 + 1.2 * c, gain: (0.5 + 0.5 * c) * Math.max(far, c), filter: 'lowpass', from: 3200 - 1600 * c, to: 120 - 80 * c });
      tone(a, { from: 140 - 90 * c, to: 30 - 10 * c, dur: 0.25 + 1.1 * c, gain: (0.45 + 0.5 * c) * Math.max(far, c) });
      return true;
    default:
      return false;
  }
}
