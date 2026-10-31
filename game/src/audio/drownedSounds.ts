// Update 0.2.10 — floor 5's sounds (the Drowned Temple), made in code until recorded ones are picked: the tide's horn as
// the water starts to rise (a low call heard across the floor, whatever room you're in), and its draining (a gurgle);
// its enemies' warnings (each its own: a Snapper's gathering, the water bubbling where something will come up, an
// Urchin's spikes rattling out, a Jelly's rising hum, a Glub's gulp, a Squidle's shriek, the Deep One's tentacle
// crackling, the Bog Brute's grunt) and their blows (bites, splashes, a shock's zap, bolts, bubbles popping, ink).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';
import { playDrownedKing } from './drownedKingSounds';

/** A splash: a burst of filtered noise and a low thud (`big` scales it). */
function splash(a: AudioEngine, far: number, big = 1) {
  noise(a, { dur: 0.35 * big, gain: 0.32 * far * Math.min(1.5, big), filter: 'lowpass', from: 2600, to: 300 });
  tone(a, { from: 140 / big, to: 50, dur: 0.25 * big, gain: 0.25 * far });
}

/** Bubbling where something will come up. */
const bubbles = (a: AudioEngine, far: number, dur: number) => noise(a, { dur, gain: 0.2 * far, filter: 'bandpass', from: 400, to: 1400, q: 5 });

/** Returns false for events it doesn't know. */
export function playDrowned(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  switch (kind) {
    case 'tideRise':
      tone(a, { from: 98, to: 92, dur: 1.8, gain: 0.32, type: 'sawtooth' });
      tone(a, { from: 147, to: 138, dur: 1.6, gain: 0.16, type: 'triangle', delay: 0.08 });
      noise(a, { dur: 2.2, gain: 0.12, filter: 'lowpass', from: 400, to: 900, delay: 0.4 });
      return true;
    case 'tideFall':
      noise(a, { dur: 1.6, gain: 0.14, filter: 'bandpass', from: 700, to: 220, q: 1.4 });
      return true;
    case 'snapperWindup':
      tone(a, { from: 300, to: 520, dur: 0.3, gain: 0.12 * far, type: 'square' });
      return true;
    case 'snapperLunge':
    case 'squidleDive':
      noise(a, { dur: 0.22, gain: 0.2 * far, filter: 'bandpass', from: 700, to: 2200, q: 1.3 });
      return true;
    case 'snapperBite':
    case 'spawnBite':
      tone(a, { from: 620, to: 240, dur: 0.06, gain: 0.3 * far, type: 'square' });
      noise(a, { dur: 0.08, gain: 0.2 * far, filter: 'highpass', from: 2500, to: 900 });
      return true;
    case 'snapperDive':
    case 'bogDive':
      splash(a, far, kind === 'bogDive' ? 1.8 : 0.8);
      return true;
    case 'snapperRise':
      bubbles(a, far, 0.5);
      return true;
    case 'bogRise':
      bubbles(a, far, 0.8);
      tone(a, { from: 70, to: 110, dur: 0.7, gain: 0.25 * far, type: 'sawtooth' });
      return true;
    case 'urchinCurl':
      noise(a, { dur: 0.35, gain: 0.18 * far, filter: 'highpass', from: 3500, to: 1800 });
      tone(a, { from: 900, to: 1400, dur: 0.3, gain: 0.06 * far, type: 'square' });
      return true;
    case 'urchinRoll':
      noise(a, { dur: 0.9, gain: 0.16 * far, filter: 'bandpass', from: 300, to: 600, q: 2 });
      return true;
    case 'urchinHit':
    case 'urchinThorns':
      noise(a, { dur: 0.1, gain: 0.3 * far, filter: 'highpass', from: 4000, to: 1500 });
      tone(a, { from: 700, to: 300, dur: 0.08, gain: 0.15 * far, type: 'square' });
      return true;
    case 'urchinStop':
      tone(a, { from: 160, to: 80, dur: 0.15, gain: 0.25 * far });
      return true;
    case 'urchinOpen':
      noise(a, { dur: 0.2, gain: 0.1 * far, filter: 'lowpass', from: 1200, to: 400 });
      return true;
    case 'jellyGlow':
      tone(a, { from: 220, to: 660, dur: 0.8, gain: 0.12 * far, type: 'sine' });
      tone(a, { from: 330, to: 990, dur: 0.8, gain: 0.06 * far, type: 'triangle' });
      return true;
    case 'jellyShock':
      noise(a, { dur: 0.3, gain: 0.32 * far, filter: 'highpass', from: 5000, to: 2000 });
      tone(a, { from: 120, to: 60, dur: 0.3, gain: 0.3 * far, type: 'square' });
      return true;
    case 'glubWindup':
    case 'bubbleWindup':
      tone(a, { from: 180, to: kind === 'bubbleWindup' ? 90 : 320, dur: 0.4, gain: 0.14 * far, type: 'sine' });
      bubbles(a, far * 0.6, 0.3);
      return true;
    case 'glubSpit':
    case 'bubbleLob':
      noise(a, { dur: 0.15, gain: 0.22 * far, filter: 'lowpass', from: 2200, to: 500 });
      tone(a, { from: 420, to: 180, dur: 0.1, gain: 0.12 * far, type: 'triangle' });
      return true;
    case 'bubblePop':
      tone(a, { from: 900, to: 200, dur: 0.12, gain: 0.3 * far, type: 'sine' });
      splash(a, far, 0.9);
      return true;
    case 'squidleWindup':
      tone(a, { from: 1200, to: 1800, dur: 0.35, gain: 0.08 * far, type: 'sawtooth' });
      return true;
    case 'squidleInk':
      noise(a, { dur: 0.5, gain: 0.4, filter: 'lowpass', from: 1800, to: 200 });
      tone(a, { from: 300, to: 90, dur: 0.4, gain: 0.25 });
      return true;
    case 'spawnWindup':
      tone(a, { from: 700, to: 1100, dur: 0.15, gain: 0.07 * far, type: 'square' });
      return true;
    case 'deepClawWindup':
    case 'bogSwipeWindup':
      tone(a, { from: 90, to: 140, dur: 0.45, gain: 0.25 * far, type: 'sawtooth' });
      return true;
    case 'deepClaw':
    case 'bogSwipe':
      noise(a, { dur: 0.25, gain: 0.3 * far, filter: 'bandpass', from: 1500, to: 400, q: 1.2 });
      return true;
    case 'deepLashWindup':
      noise(a, { dur: 0.8, gain: 0.16 * far, filter: 'highpass', from: 2000, to: 6000 });
      tone(a, { from: 60, to: 180, dur: 0.8, gain: 0.2 * far, type: 'sawtooth' });
      return true;
    case 'deepLash':
      noise(a, { dur: 0.18, gain: 0.3 * far, filter: 'highpass', from: 3000, to: 900 });
      return true;
    case 'deepCatch':
      noise(a, { dur: 0.3, gain: 0.45, filter: 'bandpass', from: 1800, to: 500, q: 1 });
      tone(a, { from: 220, to: 90, dur: 0.3, gain: 0.3, type: 'square' });
      return true;
    case 'deepSlam':
    case 'bogSlam':
      tone(a, { from: 110, to: 28, dur: 0.45, gain: 0.75 * far });
      splash(a, far, 1.6);
      return true;
    case 'bogCrouch':
      tone(a, { from: 120, to: 70, dur: 0.5, gain: 0.25 * far, type: 'sawtooth' });
      return true;
    case 'bogLeap':
      noise(a, { dur: 0.4, gain: 0.2 * far, filter: 'bandpass', from: 400, to: 1200, q: 1.2 });
      return true;
    default:
      return playDrownedKing(a, kind, far);
  }
}
