// Update 0.0.15 — the Demon and its room, as placeholder synth sounds (real samples replace them in M4): each warning
// has its own sound (a growl before the charge, a rising roar before the leap, fire crackling before the volley), the
// charge's thunder and crash, the landing's boom, the roar; the show's grinding walls and the portal; the boss's
// death, its burst, the wooden gate creaking open.
import type { CombatEvent } from '../sim/combat/state';
import { BOSS } from '../tuning/boss';
import { CINEMA } from '../tuning/cinema';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** `far`: 1 close by, falling off with distance. Returns false for events it doesn't know. */
export function playBoss(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const v = BOSS.v;
  // A boss is heard from across its room.
  const loud = Math.max(0.45, far);
  switch (kind) {
    case 'demonWindup':
      if (value === 0) {
        tone(a, { from: 60, to: 130, dur: v.chargeWindup, gain: 0.45 * loud, type: 'sawtooth' });
        noise(a, { dur: v.chargeWindup, gain: 0.25 * loud, filter: 'bandpass', from: 300, to: 900, q: 2 });
      } else if (value === 1) {
        tone(a, { from: 90, to: 260, dur: v.leapWindup, gain: 0.4 * loud, type: 'sawtooth' });
        noise(a, { dur: v.leapWindup, gain: 0.2 * loud, filter: 'bandpass', from: 400, to: 1800, q: 1.5 });
      } else {
        noise(a, { dur: v.volleyWindup, gain: 0.35 * loud, filter: 'highpass', from: 1200, to: 5000 });
        tone(a, { from: 200, to: 420, dur: v.volleyWindup, gain: 0.18 * loud, type: 'square' });
      }
      return true;
    case 'demonCharge':
      noise(a, { dur: 1.4, gain: 0.55 * loud, filter: 'lowpass', from: 500, to: 120 });
      tone(a, { from: 55, to: 40, dur: 1.4, gain: 0.4 * loud, type: 'sawtooth' });
      return true;
    case 'demonCrash':
      tone(a, { from: 90, to: 25, dur: 0.9, gain: 0.95 * loud });
      noise(a, { dur: 0.8, gain: 0.8 * loud, filter: 'lowpass', from: 4000, to: 100 });
      return true;
    case 'demonGore':
      tone(a, { from: 130, to: 35, dur: 0.4, gain: 0.85 });
      noise(a, { dur: 0.3, gain: 0.6, filter: 'lowpass', from: 3000, to: 200 });
      return true;
    case 'demonLeap':
      noise(a, { dur: 0.6, gain: 0.45 * loud, filter: 'bandpass', from: 300, to: 1500, q: 1.2 });
      return true;
    case 'demonSlam':
      tone(a, { from: 80, to: 22, dur: 1.1, gain: 1 * loud });
      noise(a, { dur: 1, gain: 0.85 * loud, filter: 'lowpass', from: 2500, to: 80 });
      return true;
    case 'demonVolley':
      for (let k = 0; k < 3; k++) noise(a, { dur: 0.25 + k * 0.08, gain: 0.3 * loud, filter: 'bandpass', from: 2400 - k * 500, to: 500, q: 1.5 });
      tone(a, { from: 500, to: 120, dur: 0.35, gain: 0.25 * loud, type: 'sawtooth' });
      return true;
    case 'demonRoar':
      tone(a, { from: 110, to: 60, dur: v.roarTime, gain: 0.6, type: 'sawtooth' });
      tone(a, { from: 165, to: 85, dur: v.roarTime, gain: 0.3, type: 'square' });
      noise(a, { dur: v.roarTime, gain: 0.45, filter: 'bandpass', from: 700, to: 250, q: 1.2 });
      return true;
    case 'quakeHit':
      tone(a, { from: 100, to: 40, dur: 0.35, gain: 0.7 });
      return true;
    case 'bossIntro':
      // The walls grinding back.
      noise(a, { dur: CINEMA.v.pull + CINEMA.v.walls, gain: 0.55, filter: 'lowpass', from: 260, to: 90 });
      tone(a, { from: 45, to: 38, dur: CINEMA.v.pull + CINEMA.v.walls, gain: 0.35, type: 'sawtooth' });
      return true;
    case 'bossRise':
      tone(a, { from: 120, to: 480, dur: CINEMA.v.rise, gain: 0.3, type: 'sawtooth' });
      tone(a, { from: 180, to: 720, dur: CINEMA.v.rise, gain: 0.2, type: 'triangle' });
      noise(a, { dur: CINEMA.v.rise, gain: 0.35, filter: 'bandpass', from: 300, to: 3000, q: 1 });
      return true;
    case 'bossDown':
      tone(a, { from: 220, to: 30, dur: 1.8, gain: 0.9 });
      noise(a, { dur: 1.2, gain: 0.6, filter: 'lowpass', from: 5000, to: 150 });
      return true;
    case 'bossBurst':
      noise(a, { dur: 1.8, gain: 1, filter: 'lowpass', from: 6000, to: 60 });
      tone(a, { from: 70, to: 18, dur: 1.6, gain: 1 });
      return true;
    case 'bossLoot':
      tone(a, { from: 880, to: 1760, dur: 0.3, gain: 0.12, type: 'triangle' });
      tone(a, { from: 1320, to: 2640, dur: 0.4, gain: 0.08, type: 'triangle' });
      return true;
    case 'woodGateOpen':
      noise(a, { dur: CINEMA.v.gateSwing, gain: 0.3, filter: 'bandpass', from: 260, to: 700, q: 8 });
      tone(a, { from: 140, to: 210, dur: CINEMA.v.gateSwing, gain: 0.12, type: 'sawtooth' });
      tone(a, { from: 70, to: 40, dur: 0.5, gain: 0.5 });
      return true;
    default:
      return false;
  }
}
