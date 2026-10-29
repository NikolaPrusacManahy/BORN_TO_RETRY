// Update 0.1.1 — an execution as placeholder synth sounds (real samples replace them in M4): the grab (a grunt and a
// scuffle), each slam into the floor (a deep thud and a crack, the second harder), the throw (a rising whoosh), the
// landing (a wet crunch).
// Update 0.1.2 — every enemy's blows: a punch (a dull thump), a chop (a sharp crack), a tear (a ripping scrape), a
// crush (a squelch), a smash (a deep thud); and a burst (a boom).
// Update 0.1.8 — a smash is the ground slam's landing: its thud and its blast.
// Update 0.1.12 — an enemy you can execute comes into reach: a low sting under a thin rising ring.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { BLOWS } from '../sim/combat/execMoves';
import { noise, tone } from './synth';
import { slamThud } from './moveSounds';
import { slamBlast } from './combatSounds';

/** Returns false for events it doesn't know. */
export function playExec(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'execReady':
      tone(a, { from: 95, to: 55, dur: 0.4, gain: 0.45 });
      tone(a, { from: 520, to: 880, dur: 0.22, gain: 0.08, type: 'triangle' });
      noise(a, { dur: 0.2, gain: 0.12, filter: 'bandpass', from: 1200, to: 3200, q: 3 });
      return true;
    case 'execGrab':
      tone(a, { from: 160, to: 110, dur: 0.18, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: 0.15, gain: 0.25, filter: 'bandpass', from: 900, to: 2200, q: 1.5 });
      return true;
    case 'execSlam': {
      const k = value >= 2 ? 1.25 : 1;
      tone(a, { from: 120 * k, to: 30, dur: 0.35, gain: 0.85 });
      noise(a, { dur: 0.3, gain: 0.6 * k, filter: 'lowpass', from: 3000, to: 120 });
      noise(a, { dur: 0.08, gain: 0.35 * k, filter: 'highpass', from: 3500, to: 2000 });
      return true;
    }
    case 'execThrow':
      noise(a, { dur: 0.35, gain: 0.35, filter: 'bandpass', from: 400, to: 2600, q: 1.2 });
      return true;
    case 'execLand':
      noise(a, { dur: 0.3, gain: 0.55 * far, filter: 'lowpass', from: 1800, to: 150 });
      tone(a, { from: 90, to: 35, dur: 0.25, gain: 0.5 * far });
      return true;
    case 'execBlow':
      switch (BLOWS[value]) {
        case 'punch':
          tone(a, { from: 140, to: 60, dur: 0.09, gain: 0.45 });
          noise(a, { dur: 0.06, gain: 0.3, filter: 'lowpass', from: 2500, to: 400 });
          break;
        case 'chop':
          noise(a, { dur: 0.1, gain: 0.45, filter: 'highpass', from: 3000, to: 1500 });
          tone(a, { from: 300, to: 120, dur: 0.08, gain: 0.3 });
          break;
        case 'tear':
          noise(a, { dur: 0.35, gain: 0.5, filter: 'bandpass', from: 500, to: 3000, q: 2 });
          tone(a, { from: 110, to: 50, dur: 0.25, gain: 0.4, type: 'sawtooth' });
          break;
        case 'crush':
          noise(a, { dur: 0.22, gain: 0.45, filter: 'lowpass', from: 1200, to: 200 });
          break;
        case 'smash':
          slamThud(a);
          slamBlast(a);
          break;
      }
      return true;
    case 'execBurst':
      tone(a, { from: 80, to: 25, dur: 0.6, gain: 0.9 * far });
      noise(a, { dur: 0.6, gain: 0.8 * far, filter: 'lowpass', from: 4000, to: 120 });
      return true;
    default:
      return false;
  }
}
