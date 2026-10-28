// Update 0.0.18 — the Dragon as placeholder synth sounds (real samples replace them in M4): each warning its own (a
// rising inhale before the beam, a crackle before the fireballs, a growl before the swoop, air gathering before the
// wing, a rattle before the tail), the beam's roar for as long as it burns, the fireball's whoosh, the wing's blast of
// air, the tail's crack, its scream, and an enemy sizzling away in the beam.
import type { CombatEvent } from '../sim/combat/state';
import { BREATH, CLAWS, FIREBALLS, WING } from '../sim/enemies/dragonMoves';
import { DRAGON } from '../tuning/dragon';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** `far`: 1 close by, falling off with distance. Returns false for events it doesn't know. */
export function playDragon(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const v = DRAGON.v;
  // A boss is heard from across its room.
  const loud = Math.max(0.45, far);
  switch (kind) {
    case 'dragonWindup':
      if (value === BREATH) {
        noise(a, { dur: v.breathWindup, gain: 0.35 * loud, filter: 'bandpass', from: 300, to: 2200, q: 1.5 });
        tone(a, { from: 80, to: 210, dur: v.breathWindup, gain: 0.3 * loud, type: 'sawtooth' });
      } else if (value === FIREBALLS) {
        noise(a, { dur: v.fireWindup, gain: 0.3 * loud, filter: 'highpass', from: 1500, to: 5000 });
        tone(a, { from: 200, to: 420, dur: v.fireWindup, gain: 0.16 * loud, type: 'square' });
      } else if (value === CLAWS) {
        tone(a, { from: 55, to: 120, dur: v.clawWindup, gain: 0.45 * loud, type: 'sawtooth' });
        noise(a, { dur: v.clawWindup, gain: 0.2 * loud, filter: 'bandpass', from: 250, to: 800, q: 2 });
      } else if (value === WING) noise(a, { dur: v.wingWindup, gain: 0.35 * loud, filter: 'bandpass', from: 300, to: 1300, q: 1 });
      else {
        noise(a, { dur: v.tailWindup, gain: 0.25 * loud, filter: 'highpass', from: 2500, to: 5000 });
        tone(a, { from: 130, to: 90, dur: v.tailWindup, gain: 0.2 * loud, type: 'square' });
      }
      return true;
    case 'dragonBreath':
      noise(a, { dur: v.beamTime, gain: 0.6 * loud, filter: 'lowpass', from: 2200, to: 700 });
      tone(a, { from: 75, to: 55, dur: v.beamTime, gain: 0.35 * loud, type: 'sawtooth' });
      return true;
    case 'dragonFireball':
      tone(a, { from: 340, to: 110, dur: 0.3, gain: 0.3 * loud, type: 'sawtooth' });
      noise(a, { dur: 0.3, gain: 0.35 * loud, filter: 'lowpass', from: 3200, to: 400 });
      return true;
    case 'dragonWing':
      noise(a, { dur: 0.45, gain: 0.7 * loud, filter: 'lowpass', from: 1000, to: 80 });
      tone(a, { from: 65, to: 28, dur: 0.4, gain: 0.5 * loud });
      return true;
    case 'dragonTail':
      noise(a, { dur: 0.22, gain: 0.55 * loud, filter: 'bandpass', from: 3200, to: 700, q: 1.5 });
      tone(a, { from: 220, to: 55, dur: 0.3, gain: 0.45 * loud });
      return true;
    case 'dragonScream':
      tone(a, { from: 300, to: 760, dur: v.screamTime, gain: 0.4 * loud, type: 'sawtooth' });
      tone(a, { from: 312, to: 730, dur: v.screamTime, gain: 0.25 * loud, type: 'square' });
      noise(a, { dur: v.screamTime, gain: 0.4 * loud, filter: 'bandpass', from: 800, to: 3200, q: 1 });
      return true;
    case 'burnt':
      noise(a, { dur: 0.35, gain: 0.3 * far, filter: 'highpass', from: 3500, to: 1500 });
      return true;
    default:
      return false;
  }
}
