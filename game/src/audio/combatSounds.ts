// M1 step 6 — placeholder combat sounds made in code: punch whooshes, impacts by weight, breaking targets, and
// the turret's warning, shot and orb pops. Real samples replace them in M4.
// M2 — sword swings and hits, throws and breaks, pickups, and the grunts: the growl that warns of a swing (every
// attack is telegraphed by a sound), the swing itself, and their arrival.
import type { CombatEvent } from '../sim/combat/state';
import { FISTS } from '../tuning/combat';
import { ENEMIES } from '../tuning/enemies';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Sounds from far targets are quieter (m at which they're half as loud). */
const HALF_DISTANCE = 12;

export class CombatSounds {
  constructor(private a: AudioEngine) {}

  /** `dist`: metres from the listener, for target sounds. */
  play(kind: CombatEvent, value: number, dist: number) {
    const a = this.a;
    const far = HALF_DISTANCE / (HALF_DISTANCE + dist);
    switch (kind) {
      case 'jabL':
      case 'jabR':
      case 'quick':
        noise(a, { dur: 0.09, gain: 0.12, filter: 'bandpass', from: 900, to: 2600, q: 1.4 });
        break;
      case 'heavy':
        noise(a, { dur: 0.16, gain: 0.25 + 0.2 * value, filter: 'bandpass', from: 500, to: 2200, q: 1.1 });
        break;
      case 'chargeStart':
        tone(a, { from: 110, to: 240, dur: FISTS.v.chargeTime, gain: 0.05, type: 'sawtooth' });
        break;
      case 'chargeReady':
        tone(a, { from: 880, to: 1320, dur: 0.12, gain: 0.14, type: 'triangle' });
        break;
      case 'chargeCancel':
        tone(a, { from: 240, to: 90, dur: 0.14, gain: 0.06, type: 'sawtooth' });
        break;
      case 'hitJab':
      case 'hitQuick':
        tone(a, { from: 180, to: 60, dur: 0.09, gain: 0.45 });
        noise(a, { dur: 0.05, gain: 0.3, filter: 'lowpass', from: 2500, to: 400 });
        break;
      case 'hitFinisher':
        tone(a, { from: 160, to: 45, dur: 0.14, gain: 0.6 });
        noise(a, { dur: 0.09, gain: 0.4, filter: 'lowpass', from: 3000, to: 300 });
        break;
      case 'hitHeavy':
        tone(a, { from: 140, to: 32, dur: 0.24, gain: 0.7 + 0.3 * value });
        noise(a, { dur: 0.16, gain: 0.5 + 0.2 * value, filter: 'lowpass', from: 3500, to: 200 });
        break;
      case 'kill':
        noise(a, { dur: 0.3, gain: 0.55, filter: 'lowpass', from: 2400, to: 150 });
        tone(a, { from: 90, to: 30, dur: 0.3, gain: 0.6 });
        break;
      case 'telegraph':
        tone(a, { from: 300, to: 900, dur: 0.45, gain: 0.12 * far, type: 'square' });
        break;
      case 'orbFire':
        tone(a, { from: 700, to: 200, dur: 0.18, gain: 0.18 * far, type: 'sawtooth' });
        break;
      case 'orbPop':
        noise(a, { dur: 0.08, gain: 0.15 * far, filter: 'bandpass', from: 1800, to: 600, q: 2 });
        break;
      // (An orb hitting you sounds through the player's 'hurt' since M1 step 8.)
      case 'respawn':
        tone(a, { from: 400, to: 800, dur: 0.12, gain: 0.08 * far, type: 'triangle' });
        break;
      case 'slashL':
      case 'slashR':
        noise(a, { dur: 0.16, gain: 0.2, filter: 'bandpass', from: 2400, to: 700, q: 1.3 });
        break;
      case 'cleave':
        noise(a, { dur: 0.26, gain: 0.32, filter: 'bandpass', from: 1800, to: 400, q: 1.1 });
        break;
      case 'hitSlash':
        tone(a, { from: 620, to: 210, dur: 0.1, gain: 0.22, type: 'square' });
        noise(a, { dur: 0.08, gain: 0.35, filter: 'highpass', from: 3000, to: 1200 });
        tone(a, { from: 170, to: 60, dur: 0.1, gain: 0.35 });
        break;
      case 'hitCleave':
        tone(a, { from: 480, to: 140, dur: 0.18, gain: 0.25, type: 'square' });
        tone(a, { from: 130, to: 32, dur: 0.26, gain: 0.8 });
        noise(a, { dur: 0.18, gain: 0.55, filter: 'lowpass', from: 3800, to: 200 });
        break;
      case 'hitThrown':
        tone(a, { from: 150, to: 28, dur: 0.3, gain: 0.85 });
        noise(a, { dur: 0.22, gain: 0.6, filter: 'lowpass', from: 4000, to: 180 });
        break;
      case 'throw':
        noise(a, { dur: 0.22, gain: 0.3, filter: 'bandpass', from: 900, to: 3200, q: 1.2 });
        break;
      case 'thrownBreak':
      case 'weaponBroken':
        noise(a, { dur: 0.2, gain: 0.35 * (kind === 'thrownBreak' ? far : 1), filter: 'highpass', from: 5000, to: 1500 });
        tone(a, { from: 900, to: 300, dur: 0.12, gain: 0.12, type: 'square' });
        break;
      case 'pickup':
        tone(a, { from: 600, to: 1200, dur: 0.1, gain: 0.14, type: 'triangle' });
        noise(a, { dur: 0.06, gain: 0.15, filter: 'highpass', from: 4000, to: 2500 });
        break;
      case 'weaponDrop':
      case 'standRespawn':
        tone(a, { from: 1100, to: 700, dur: 0.08, gain: 0.1 * far, type: 'triangle' });
        break;
      case 'gruntSpawn':
        noise(a, { dur: 0.4, gain: 0.25 * far, filter: 'lowpass', from: 500, to: 120 });
        break;
      case 'gruntWindup':
        // The warning: a growl rising over the whole wind-up.
        tone(a, { from: 85, to: 170, dur: ENEMIES.v.gruntWindup, gain: 0.3 * far, type: 'sawtooth' });
        noise(a, { dur: ENEMIES.v.gruntWindup, gain: 0.12 * far, filter: 'bandpass', from: 300, to: 700, q: 2 });
        break;
      case 'gruntStrike':
        noise(a, { dur: 0.2, gain: 0.3 * far, filter: 'bandpass', from: 700, to: 250, q: 1.2 });
        break;
      default:
        break;
    }
  }
}
