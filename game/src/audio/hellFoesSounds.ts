// Update 0.5.4 — floor 10's own fighters, heard (made in code until recorded ones are picked from the Sonniss library, as floor 8's are:
// shrineSounds.ts): the Imp's mace whooshing (heavier for its combo), its fireball's roar as it swells and its whoomp away; a Puglin's club (a
// short, quick whoosh), its rush; the Bone Axeman's chop (a deep one), its leap (a growl rising under it), its axe splitting the floor (a boom
// and the fire's roar), its spin; you burned on the line (a hiss); the Bone Guard's cuts, a blow turned on its guard (steel ringing), its guard
// broken (a crack, a clatter), its riposte.
// Update 0.5.5 — the second batch: the Cinder Chicken's squawk, its fuse hissing up, a sputter as a blow lights it, its burst; the Brimstone
// Bee's buzz as it rears, the bomb's whistle down; the Pit Fiend's as the old Demon's were at 0.3.40 (a growl before the charge, a rising roar
// before the leap, fire crackling before the volley; its landing's boom, its fan's whoosh, its roar); the Spore Lord's rustle and puff, its
// slam, its bite; a spore cloud blowing, its burn.
import type { CombatEvent } from '../sim/combat/state';
import { FIEND_CHARGE, FIEND_LEAP } from '../sim/enemies/hellShared';
import { FOES_HELL_B } from '../tuning/foesHellB';
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
    case 'chickenSquawk':
      tone(a, { from: 900, to: 1500, dur: 0.08, gain: 0.1 * far, type: 'square' });
      tone(a, { from: 1400, to: 700, dur: 0.14, gain: 0.08 * far, type: 'square', delay: 0.08 });
      return true;
    case 'chickenFuse':
      noise(a, { dur: FOES_HELL_B.v.chickenFuse, gain: 0.2 * Math.max(0.5, far), filter: 'highpass', from: 1500, to: 5000 });
      tone(a, { from: 300, to: 900, dur: FOES_HELL_B.v.chickenFuse, gain: 0.08 * far, type: 'sawtooth' });
      return true;
    case 'chickenLit':
      noise(a, { dur: 0.25, gain: 0.16 * far, filter: 'bandpass', from: 2500, to: 900, q: 1.5 });
      return true;
    case 'chickenBurst':
    case 'sporeBlast':
      kegBoom(a);
      roar(a, Math.max(0.6, far), 1.2);
      return true;
    case 'sporeBurn':
      noise(a, { dur: 0.25, gain: 0.16, filter: 'highpass', from: 2500, to: 1200 });
      return true;
    case 'beeWindup':
      tone(a, { from: 180, to: 240, dur: 0.45, gain: 0.08 * far, type: 'sawtooth' });
      return true;
    case 'beeBomb':
      tone(a, { from: 1400, to: 500, dur: 0.6, gain: 0.08 * far, type: 'sine' });
      return true;
    case 'fiendWindup': {
      const loud = Math.max(0.45, far);
      const d = value === FIEND_CHARGE ? FOES_HELL_B.v.fiendChargeWindup : value === FIEND_LEAP ? FOES_HELL_B.v.fiendLeapWindup : FOES_HELL_B.v.fiendVolleyWindup;
      if (value === FIEND_CHARGE) {
        tone(a, { from: 60, to: 130, dur: d, gain: 0.45 * loud, type: 'sawtooth' });
        noise(a, { dur: d, gain: 0.25 * loud, filter: 'bandpass', from: 300, to: 900, q: 2 });
      } else if (value === FIEND_LEAP) {
        tone(a, { from: 90, to: 260, dur: d, gain: 0.4 * loud, type: 'sawtooth' });
        noise(a, { dur: d, gain: 0.2 * loud, filter: 'bandpass', from: 400, to: 1800, q: 1.5 });
      } else {
        noise(a, { dur: d, gain: 0.35 * loud, filter: 'highpass', from: 1200, to: 5000 });
        tone(a, { from: 200, to: 420, dur: d, gain: 0.18 * loud, type: 'square' });
      }
      return true;
    }
    case 'fiendLeap':
      noise(a, { dur: 0.6, gain: 0.45 * Math.max(0.45, far), filter: 'bandpass', from: 300, to: 1500, q: 1.2 });
      return true;
    case 'fiendSlam':
      tone(a, { from: 80, to: 22, dur: 1.1, gain: Math.max(0.45, far) });
      noise(a, { dur: 1, gain: 0.85 * Math.max(0.45, far), filter: 'lowpass', from: 2500, to: 80 });
      return true;
    case 'fiendVolley':
      for (let k = 0; k < 3; k++) noise(a, { dur: 0.25 + k * 0.08, gain: 0.3 * Math.max(0.45, far), filter: 'bandpass', from: 2400 - k * 500, to: 500, q: 1.5 });
      tone(a, { from: 500, to: 120, dur: 0.35, gain: 0.25 * Math.max(0.45, far), type: 'sawtooth' });
      return true;
    case 'fiendRoar': {
      const d = FOES_HELL_B.v.fiendRoar;
      tone(a, { from: 110, to: 60, dur: d, gain: 0.6, type: 'sawtooth' });
      tone(a, { from: 165, to: 85, dur: d, gain: 0.3, type: 'square' });
      noise(a, { dur: d, gain: 0.45, filter: 'bandpass', from: 700, to: 250, q: 1.2 });
      return true;
    }
    case 'sporeWindup':
      noise(a, { dur: 0.6, gain: 0.14 * far, filter: 'bandpass', from: 500, to: 1500, q: 0.8 });
      return true;
    case 'sporePuff':
      noise(a, { dur: 0.9, gain: 0.24 * Math.max(0.5, far), filter: 'lowpass', from: 900, to: 200 });
      tone(a, { from: 140, to: 70, dur: 0.3, gain: 0.2 * far });
      return true;
    case 'sporeSlam':
      kegBoom(a);
      tone(a, { from: 100, to: 35, dur: 0.6, gain: 0.5 * Math.max(0.5, far) });
      return true;
    case 'sporeBite':
      tone(a, { from: 300, to: 120, dur: 0.12, gain: 0.25 * far, type: 'square' });
      noise(a, { dur: 0.1, gain: 0.2 * far, filter: 'bandpass', from: 1200, to: 600, q: 1.5 });
      return true;
    default:
      return false;
  }
}
