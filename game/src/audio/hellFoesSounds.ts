// Update 0.5.4 — floor 10's own fighters, heard (made in code until recorded ones are picked from the Sonniss library, as floor 8's are:
// shrineSounds.ts): the Imp's mace whooshing (heavier for its combo), its fireball's roar as it swells and its whoomp away; a Puglin's club (a
// short, quick whoosh), its rush; the Bone Axeman's chop (a deep one), its leap (a growl rising under it), its axe splitting the floor (a boom
// and the fire's roar), its spin; you burned on the line (a hiss); the Bone Guard's cuts, a blow turned on its guard (steel ringing), its guard
// broken (a crack, a clatter), its riposte.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { kegBoom } from './soundLayers';
import { noise, tone } from './synth';

const whoosh = (a: AudioEngine, far: number, low = 1, long = 1) => noise(a, { dur: 0.16 * long, gain: 0.2 * far, filter: 'bandpass', from: 700 / low, to: 2200 / low, q: 1.2 });
const ring = (a: AudioEngine, far: number) => {
  tone(a, { from: 1500, to: 1320, dur: 0.22, gain: 0.12 * far, type: 'triangle' });
  tone(a, { from: 2250, to: 2100, dur: 0.16, gain: 0.06 * far, type: 'sine' });
  noise(a, { dur: 0.05, gain: 0.16 * far, filter: 'bandpass', from: 3200, to: 2400, q: 2 });
};
const roar = (a: AudioEngine, far: number, long = 1) => noise(a, { dur: 0.6 * long, gain: 0.2 * far, filter: 'lowpass', from: 1400, to: 300 });

/** Returns false for events it doesn't know. */
export function playHellFoes(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'impSwing':
    case 'guardCut':
      whoosh(a, far, 1.1);
      return true;
    case 'impCombo':
    case 'guardCombo':
      whoosh(a, far, 1.4, 1.4);
      return true;
    case 'impFireWindup':
      tone(a, { from: 120, to: 220, dur: 0.3, gain: 0.12 * far, type: 'sawtooth' });
      roar(a, far * 0.6, 0.5);
      return true;
    case 'impFire':
      tone(a, { from: 200, to: 80, dur: 0.25, gain: 0.2 * far, type: 'sine' });
      roar(a, far, 0.6);
      return true;
    case 'puglinClub':
      whoosh(a, far, 0.8, 0.7);
      return true;
    case 'puglinRush':
      noise(a, { dur: 0.35, gain: 0.16 * far, filter: 'lowpass', from: 900, to: 300 });
      return true;
    case 'axeChop':
    case 'axeSpin':
      whoosh(a, far, 1.9, kind === 'axeSpin' ? 1.8 : 1.4);
      return true;
    case 'axeSplitWarn':
      tone(a, { from: 55, to: 110, dur: 0.6, gain: 0.24 * Math.max(0.6, far), type: 'sawtooth' });
      return true;
    case 'axeSplit':
      kegBoom(a);
      roar(a, Math.max(0.6, far), 1.6);
      return true;
    case 'splitBurn':
      noise(a, { dur: 0.25, gain: 0.18, filter: 'highpass', from: 2500, to: 1200 });
      void value;
      return true;
    case 'guardTurn':
      ring(a, Math.max(0.5, far));
      return true;
    case 'guardBreak':
      ring(a, Math.max(0.6, far));
      noise(a, { dur: 0.3, gain: 0.24 * far, filter: 'bandpass', from: 1200, to: 400, q: 0.8 });
      tone(a, { from: 160, to: 60, dur: 0.18, gain: 0.26 * far });
      return true;
    case 'guardRiposte':
      whoosh(a, far, 1.6, 1.6);
      return true;
    default:
      return false;
  }
}
