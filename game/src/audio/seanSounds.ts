// Update 0.3.81 — Gravity Sean's sounds. **(placeholders)**: recordings already in the game, and made sounds under them. No gravity library's been chosen.
// Returns true if `kind` is one of his.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

export function playSean(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'seanUnstable':
      tone(a, { from: 70, to: 210, dur: 0.28, gain: 0.2, type: 'sawtooth' });
      noise(a, { dur: 0.22, gain: 0.14, filter: 'highpass', from: 1400, to: 4200 });
      return true;
    case 'seanVent':
      tone(a, { from: 210, to: 55, dur: 0.3 + 0.2 * value, gain: 0.2 });
      noise(a, { dur: 0.3, gain: 0.16 + 0.12 * value, filter: 'lowpass', from: 2200, to: 300 });
      return true;
    case 'seanOverload':
      a.clips.play('demonSlam', 1, 0.8);
      tone(a, { from: 420, to: 38, dur: 0.7, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: 0.6, gain: 0.34, filter: 'lowpass', from: 3400, to: 180 });
      return true;
    case 'seanSlam':
      a.clips.play('demonSlam', 0.8, 1.15);
      return true;
    case 'seanBlast':
      tone(a, { from: 120, to: 44, dur: 0.24, gain: 0.16 * far });
      return true;
    case 'seanPull':
      tone(a, { from: 180, to: 520, dur: 0.16, gain: 0.12, type: 'triangle' });
      return true;
    case 'seanRipple':
      tone(a, { from: 300, to: 140, dur: 0.12, gain: 0.07, type: 'triangle' });
      return true;
    case 'seanGrab':
      a.clips.play('demonSlam', value === 1 ? 0.7 : 0.35, value === 1 ? 0.9 : 1.5);
      noise(a, { dur: 0.25, gain: 0.14, filter: 'lowpass', from: 900, to: 2400 });
      return true;
    case 'seanThrow':
      a.clips.play('hellWhoosh', value === 1 ? 0.7 : 0.5, value === 1 ? 0.8 : 1.4);
      return true;
    case 'seanShatter':
      noise(a, { dur: value === 1 ? 0.45 : 0.22, gain: (value === 1 ? 0.34 : 0.2) * far, filter: 'lowpass', from: 2600, to: 300 });
      return true;
    case 'seanBlock':
      noise(a, { dur: 0.12, gain: 0.2, filter: 'highpass', from: 1200, to: 3000 });
      return true;
    case 'seanHoleCharge':
      tone(a, { from: 60, to: 240, dur: 0.3, gain: 0.16, type: 'sawtooth' });
      return true;
    case 'seanHoleThrow':
      a.clips.play('hellWhoosh', 0.7, 1.2);
      return true;
    case 'seanHoleOpen':
      a.clips.play('bossBurst', 0.6 * far, 0.7);
      tone(a, { from: 90, to: 34, dur: 1, gain: 0.26 * far });
      return true;
    case 'seanShockUp':
      tone(a, { from: 90, to: 260, dur: 0.14, gain: 0.14, type: 'sawtooth' });
      return true;
    case 'seanShock':
      a.clips.play('demonSlam', 1, 0.85);
      a.clips.play('hellWhoosh', 0.8, 0.7);
      noise(a, { dur: 0.4, gain: 0.3, filter: 'lowpass', from: 3200, to: 240 });
      return true;
    case 'seanHoleHit':
      return true;
    case 'seanHoleBurst':
      a.clips.play('bossBurst', 0.8 * far, 0.85);
      noise(a, { dur: 0.6, gain: 0.3 * far, filter: 'lowpass', from: 3000, to: 200 });
      return true;
    case 'seanMeteorCall':
      tone(a, { from: 700, to: 120, dur: 1.2, gain: 0.14, type: 'triangle' });
      return true;
    case 'seanMeteorFall':
      a.clips.play('hellWhoosh', 1, 0.55);
      return true;
    case 'seanMeteorHit':
      a.clips.play('bossDown', 1);
      a.clips.play('demonSlam', 1, 0.7);
      noise(a, { dur: 1, gain: 0.4, filter: 'lowpass', from: 2600, to: 120 });
      return true;
    case 'seanUltReady':
      tone(a, { from: 180, to: 720, dur: 0.45, gain: 0.1, type: 'triangle' });
      return true;
    default:
      return false;
  }
}
